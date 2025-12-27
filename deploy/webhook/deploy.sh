#!/bin/bash
#
# 自动部署脚本
# 由 GitHub Webhook 触发执行
#
# 工作流程：
# 1. 拉取最新代码
# 2. 检查生产环境配置（.env）
# 3. 重建 Docker 容器
# 4. 执行数据库迁移（自动跟踪版本，避免重复执行）
# 5. 健康检查
# 6. 清理旧镜像
#

set -e
set -o pipefail  # 确保管道中的错误能被捕获

PROJECT_DIR="/opt/chicken-king"
LOG_FILE="/opt/chicken-king/deploy/webhook/logs/deploy.log"
MIGRATION_LOG_FILE="/opt/chicken-king/deploy/webhook/logs/migrations.log"
ENV_FILE="/opt/chicken-king/.env"
MIGRATIONS_DIR="/opt/chicken-king/backend/sql"
DB_CONTAINER="chicken_king_db"

# 微信推送 URL（从环境变量读取）
WECHAT_PUSH_URL="${WECHAT_PUSH_URL:-}"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_migration() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE" -a "$MIGRATION_LOG_FILE"
}

# 发送微信推送通知
send_wechat_notification() {
    local title="$1"
    local content="$2"
    local push_url="${WECHAT_PUSH_URL:-}"

    # 如果未配置推送 URL，跳过
    if [ -z "$push_url" ]; then
        return 0
    fi

    # 发送推送（失败不影响部署，5秒超时）
    if curl -s -X POST "$push_url" \
        -H "Content-Type: application/json" \
        -d "{\"title\":\"$title\",\"content\":\"$content\"}" \
        --max-time 5 \
        -o /dev/null -w "%{http_code}" | grep -q "200"; then
        log "微信推送发送成功"
    else
        log "微信推送发送失败（不影响部署）"
    fi
}

# SQL 字符串转义（处理单引号）
sql_escape() {
    echo "$1" | sed "s/'/''/g"
}

# 计算文件 SHA256 校验和
sha256_file() {
    local file="$1"
    if command -v sha256sum >/dev/null 2>&1; then
        sha256sum "$file" | awk '{print $1}'
        return 0
    fi
    if command -v shasum >/dev/null 2>&1; then
        shasum -a 256 "$file" | awk '{print $1}'
        return 0
    fi
    echo "unknown"
}

# 在 DB 容器内执行 MySQL 查询（返回结果）
db_query() {
    local sql="$1"
    docker exec -i "$DB_CONTAINER" sh -lc 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysql -uroot -N -B "$MYSQL_DATABASE"' <<< "$sql"
}

# 在 DB 容器内执行 MySQL 命令（不返回结果）
db_exec() {
    local sql="$1"
    docker exec -i "$DB_CONTAINER" sh -lc 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysql -uroot "$MYSQL_DATABASE"' <<< "$sql"
}

# 等待数据库就绪
wait_for_db() {
    local max_retries="${1:-30}"
    local retry=0

    log_migration "等待 MySQL 就绪..."
    while [ $retry -lt $max_retries ]; do
        if docker exec "$DB_CONTAINER" sh -lc 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysqladmin ping -h 127.0.0.1 -uroot --silent' >/dev/null 2>&1; then
            log_migration "MySQL 已就绪"
            return 0
        fi
        retry=$((retry + 1))
        log_migration "等待 MySQL 启动... ($retry/$max_retries)"
        sleep 2
    done

    log_migration "MySQL 未在预期时间内就绪"
    return 1
}

# 确保数据库存在
ensure_database_exists() {
    log_migration "确保数据库存在..."

    # 使用 mysql 系统数据库连接，创建目标数据库
    if docker exec "$DB_CONTAINER" sh -lc 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -uroot -e "CREATE DATABASE IF NOT EXISTS $MYSQL_DATABASE CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"' >/dev/null 2>&1; then
        log_migration "数据库已就绪: \$MYSQL_DATABASE"
    else
        log_migration "创建数据库失败"
        return 1
    fi
}

# 确保迁移记录表存在
ensure_migrations_table() {
    log_migration "确保迁移记录表存在..."
    db_exec "
CREATE TABLE IF NOT EXISTS schema_migrations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  version VARCHAR(255) NOT NULL COMMENT '迁移版本（如 002_github_and_cheer）',
  version_num INT UNSIGNED NOT NULL COMMENT '版本号（用于排序）',
  filename VARCHAR(255) NOT NULL COMMENT '迁移文件名',
  checksum CHAR(64) NOT NULL COMMENT '文件 SHA256 校验和',
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '执行时间',
  PRIMARY KEY (id),
  UNIQUE KEY uq_version (version),
  KEY idx_version_num (version_num)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='数据库迁移版本跟踪表';
"
    log_migration "✅ 迁移记录表就绪"
}

# 文件名白名单校验
validate_migration_filename() {
    local filename="$1"
    # 只允许格式：NNN_description.sql（数字、字母、下划线）
    if [[ ! "$filename" =~ ^[0-9]{3}_[A-Za-z0-9_]+\.sql$ ]]; then
        return 1
    fi
    return 0
}

# 执行数据库迁移
run_migrations() {
    local files
    local lock_file="/tmp/chicken_king_migrations.lock"

    if [ ! -d "$MIGRATIONS_DIR" ]; then
        log_migration "迁移目录不存在，跳过: $MIGRATIONS_DIR"
        return 0
    fi

    # 查找所有编号迁移文件（格式：NNN_*.sql）
    files="$(find "$MIGRATIONS_DIR" -maxdepth 1 -name '[0-9][0-9][0-9]_*.sql' -type f 2>/dev/null | sort || true)"
    if [ -z "$files" ]; then
        log_migration "未发现迁移文件（格式：[0-9][0-9][0-9]_*.sql），跳过"
        return 0
    fi

    wait_for_db 30
    ensure_database_exists

    # 获取文件锁，防止并发执行（使用 flock）
    log_migration "尝试获取迁移锁: $lock_file"
    exec 200>"$lock_file"
    if ! flock -n 200; then
        log_migration "获取迁移锁失败（可能有另一个部署/迁移在运行）"
        exec 200>&-
        return 1
    fi

    # 确保退出时释放锁
    trap "flock -u 200; exec 200>&-" EXIT

    # 检查是否需要执行初始数据库导入
    local table_count is_fresh_install
    table_count=$(db_query "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE();" 2>/dev/null || echo "0")
    is_fresh_install=false

    if [ "$table_count" = "0" ] || [ -z "$table_count" ]; then
        is_fresh_install=true
        log_migration "数据库为空，导入初始数据库（production_clean_db.sql）..."

        # 优先使用 production_clean_db.sql（包含完整表结构 + 配置 + 示例数据）
        if [ -f "$MIGRATIONS_DIR/production_clean_db.sql" ]; then
            if docker exec -i "$DB_CONTAINER" sh -lc 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysql -uroot "$MYSQL_DATABASE"' < "$MIGRATIONS_DIR/production_clean_db.sql" >> "$MIGRATION_LOG_FILE" 2>&1; then
                log_migration "初始数据库导入成功（包含表结构、配置数据、示例报名）"
            else
                log_migration "初始数据库导入失败（详见 $MIGRATION_LOG_FILE）"
                return 1
            fi
        # 兼容旧方式：schema.sql + seed_production_config.sql
        elif [ -f "$MIGRATIONS_DIR/schema.sql" ]; then
            log_migration "未找到 production_clean_db.sql，使用旧方式 schema.sql..."
            if docker exec -i "$DB_CONTAINER" sh -lc 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysql -uroot "$MYSQL_DATABASE"' < "$MIGRATIONS_DIR/schema.sql" >> "$MIGRATION_LOG_FILE" 2>&1; then
                log_migration "基础 schema 执行成功"

                # 导入配置数据
                if [ -f "$MIGRATIONS_DIR/seed_production_config.sql" ]; then
                    log_migration "导入配置数据..."
                    if docker exec -i "$DB_CONTAINER" sh -lc 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysql -uroot "$MYSQL_DATABASE"' < "$MIGRATIONS_DIR/seed_production_config.sql" >> "$MIGRATION_LOG_FILE" 2>&1; then
                        log_migration "配置数据导入成功"
                    else
                        log_migration "⚠️ 配置数据导入失败（非致命错误）"
                    fi
                fi
            else
                log_migration "❌ 基础 schema 执行失败"
                return 1
            fi
        else
            log_migration "❌ 未找到初始化文件（production_clean_db.sql 或 schema.sql）"
            return 1
        fi
    else
        log_migration "数据库已有 $table_count 个表，跳过初始化"
    fi

    ensure_migrations_table

    if [ "$is_fresh_install" = true ]; then
        log_migration "初始库已导入，标记历史迁移为已执行..."
        while IFS= read -r file; do
            [ -z "$file" ] && continue
            [ ! -f "$file" ] && continue

            local base version version_num checksum existing_checksum
            base="$(basename "$file")"
            if ! validate_migration_filename "$base"; then
                log_migration "跳过非法文件名: $base（仅允许：NNN_name.sql）"
                continue
            fi

            version="${base%.sql}"
            version_num="${version%%_*}"
            version_num=$((10#$version_num))
            checksum="$(sha256_file "$file")"
            if [ "$checksum" = "unknown" ]; then
                checksum="no-checksum"
            fi

            existing_checksum="$(db_query "SELECT checksum FROM schema_migrations WHERE version='$(sql_escape "$version")' LIMIT 1;")"
            if [ -n "$existing_checksum" ]; then
                continue
            fi

            db_exec "INSERT INTO schema_migrations (version, version_num, filename, checksum) VALUES ('$(sql_escape "$version")', $version_num, '$(sql_escape "$base")', '$(sql_escape "$checksum")');"
        done <<< "$files"

        log_migration "已同步迁移记录，跳过增量迁移"
        trap - EXIT
        flock -u 200 2>/dev/null || true
        exec 200>&- 2>/dev/null || true
        return 0
    fi

    log_migration "========== 开始执行数据库迁移 =========="
    while IFS= read -r file; do
        [ -z "$file" ] && continue
        [ ! -f "$file" ] && continue

        local base version version_num checksum existing_checksum
        base="$(basename "$file")"

        # 文件名白名单校验
        if ! validate_migration_filename "$base"; then
            log_migration "跳过非法文件名: $base（仅允许：NNN_name.sql）"
            continue
        fi

        version="${base%.sql}"
        version_num="${version%%_*}"
        version_num=$((10#$version_num))  # 强制十进制解析
        checksum="$(sha256_file "$file")"

        if [ "$checksum" = "unknown" ]; then
            log_migration "无法计算校验和: $base（sha256sum/shasum 不可用）"
            checksum="no-checksum"
        fi

        # 检查是否已执行
        existing_checksum="$(db_query "SELECT checksum FROM schema_migrations WHERE version='$(sql_escape "$version")' LIMIT 1;")"
        if [ -n "$existing_checksum" ]; then
            if [ "$existing_checksum" != "$checksum" ] && [ "$checksum" != "no-checksum" ]; then
                log_migration "已执行但校验和不一致（文件可能被改动）: $base"
                log_migration " 数据库: $existing_checksum"
                log_migration " 文件:   $checksum"
            else
                log_migration "跳过已执行迁移: $base"
            fi
            continue
        fi

        # 执行迁移
        log_migration "执行迁移: $base"
        {
            echo "[$(date '+%Y-%m-%d %H:%M:%S')] === APPLY $base ==="
        } >> "$MIGRATION_LOG_FILE"

        if ! docker exec -i "$DB_CONTAINER" sh -lc 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysql -uroot "$MYSQL_DATABASE"' < "$file" >> "$MIGRATION_LOG_FILE" 2>&1; then
            log_migration "迁移失败: $base（详见 $MIGRATION_LOG_FILE）"
            return 1
        fi

        # 记录迁移版本
        db_exec "INSERT INTO schema_migrations (version, version_num, filename, checksum) VALUES ('$(sql_escape "$version")', $version_num, '$(sql_escape "$base")', '$(sql_escape "$checksum")');"
        log_migration "迁移完成: $base"
    done <<< "$files"

    log_migration "========== 数据库迁移完成 =========="

    # 清除 trap 并释放锁
    trap - EXIT
    flock -u 200 2>/dev/null || true
    exec 200>&- 2>/dev/null || true
}

# 检查必要的依赖命令
for cmd in docker curl git flock find; do
    if ! command -v "$cmd" >/dev/null 2>&1; then
        echo "错误: 缺少必要命令 '$cmd'，请先安装" >&2
        exit 1
    fi
done

# 检测 docker compose 命令
if docker compose version > /dev/null 2>&1; then
    DOCKER_COMPOSE="docker compose"
else
    DOCKER_COMPOSE="docker-compose"
fi

# Compose 文件（线上部署使用生产配置）
COMPOSE_FILES="-f docker-compose.prod.yml"
COMPOSE_CMD="$DOCKER_COMPOSE $COMPOSE_FILES"

# 确保日志目录存在
mkdir -p "$(dirname "$LOG_FILE")"
mkdir -p "$(dirname "$MIGRATION_LOG_FILE")"
touch "$LOG_FILE" "$MIGRATION_LOG_FILE"

log "========== 开始部署 =========="
log "使用命令: $COMPOSE_CMD"

cd "$PROJECT_DIR"

# 1. 拉取最新代码
log "拉取最新代码..."

# 记录当前脚本的 git 版本（在 git pull 之前）
SCRIPT_VERSION_BEFORE=$(git log -1 --format=%H -- deploy/webhook/deploy.sh 2>/dev/null || echo "unknown")

git fetch origin main
git reset --hard origin/main

# 检查脚本是否被更新（对比 git 版本而非文件校验和）
SCRIPT_VERSION_AFTER=$(git log -1 --format=%H -- deploy/webhook/deploy.sh 2>/dev/null || echo "unknown")

if [ "$SCRIPT_VERSION_BEFORE" != "$SCRIPT_VERSION_AFTER" ] && [ "$SCRIPT_VERSION_AFTER" != "unknown" ]; then
    log "⚠️  部署脚本已更新 ($SCRIPT_VERSION_BEFORE -> $SCRIPT_VERSION_AFTER)"
    log "⚠️  重新执行脚本..."
    exec bash "$0" "$@"
fi

# 2. 检查生产环境配置
log "检查生产环境配置..."

EXISTING_MYSQL_ROOT_PASSWORD=""
EXISTING_MYSQL_PASSWORD=""
if [ -f "$ENV_FILE" ]; then
    EXISTING_MYSQL_ROOT_PASSWORD=$(grep "^MYSQL_ROOT_PASSWORD=" "$ENV_FILE" | cut -d'=' -f2-)
    EXISTING_MYSQL_PASSWORD=$(grep "^MYSQL_PASSWORD=" "$ENV_FILE" | cut -d'=' -f2-)
    log "已检测到 .env，跳过自动生成"
else
    if [ -f "$PROJECT_DIR/.env.production.example" ]; then
        cp "$PROJECT_DIR/.env.production.example" "$ENV_FILE"
        log "未检测到 .env，已复制 .env.production.example，请填写后重试"
    else
        log "未检测到 .env 且缺少 .env.production.example，无法继续部署"
    fi
    exit 1
fi

# 使用现有密码或默认密码（用于迁移连接）
MYSQL_ROOT_PASSWORD="${EXISTING_MYSQL_ROOT_PASSWORD:-password}"
MYSQL_PASSWORD="${EXISTING_MYSQL_PASSWORD:-password}"
AUTO_MIGRATE_FLAG="$(grep "^AUTO_MIGRATE=" "$ENV_FILE" | cut -d'=' -f2- | tr '[:upper:]' '[:lower:]')"
AUTO_MIGRATE_FLAG="${AUTO_MIGRATE_FLAG:-false}"

# 3. 重建并重启容器
log "重建并重启容器以应用最新代码..."
$COMPOSE_CMD up -d --build

# 4. 容器重启后执行数据库迁移（健康检查前）
if [ "$AUTO_MIGRATE_FLAG" = "true" ]; then
    log "检测到 AUTO_MIGRATE=true，跳过 deploy.sh 内置迁移"
else
    log "执行数据库迁移..."
    run_migrations
fi

# 5. 等待服务启动并健康检查
log "等待服务启动..."
sleep 10

log "执行健康检查..."
MAX_RETRIES=12
RETRY_COUNT=0
HEALTH_OK=false

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    # 检查后端 API
    if curl -s http://localhost:8000/docs > /dev/null 2>&1; then
        log "后端服务正常"
        HEALTH_OK=true
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    log "等待后端启动... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 5
done

if [ "$HEALTH_OK" = false ]; then
    log "后端服务可能还在启动中"
fi

# 检查前端
if curl -s http://localhost:5174/health > /dev/null 2>&1; then
    log "前端服务正常"
else
    log "前端健康检查未响应（可能正常，nginx 会代理）"
fi

# 6. 清理旧镜像
log "清理旧镜像..."
docker image prune -f

# 7. 发送部署成功通知
DEPLOY_TIME=$(date '+%Y-%m-%d %H:%M:%S')
NOTIFICATION_CONTENT="部署时间: $DEPLOY_TIME\n环境: 生产环境 (pk.ikuncode.cc)\n状态: ✅ 成功"

if [ "$HEALTH_OK" = true ]; then
    send_wechat_notification "鸡王争霸赛 - 部署成功" "$NOTIFICATION_CONTENT"
else
    send_wechat_notification "鸡王争霸赛 - 部署完成（服务启动中）" "$NOTIFICATION_CONTENT\n\n⚠️ 后端服务可能还在启动中，请稍后检查"
fi

log "========== 部署完成 =========="
log ""
