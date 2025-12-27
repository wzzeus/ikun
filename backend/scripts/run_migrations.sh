#!/usr/bin/env bash
set -euo pipefail

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

PROJECT_DIR="${PROJECT_DIR:-/app}"
MIGRATIONS_DIR="${MIGRATIONS_DIR:-$PROJECT_DIR/sql}"
MYSQL_HOST="${MYSQL_HOST:-db}"
MYSQL_PORT="${MYSQL_PORT:-3306}"
MYSQL_DATABASE="${MYSQL_DATABASE:-chicken_king}"
MYSQL_ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD:-}"
MIGRATION_BASELINE_VERSION="${MIGRATION_BASELINE_VERSION:-}"

if [ -z "$MYSQL_ROOT_PASSWORD" ]; then
  log "缺少 MYSQL_ROOT_PASSWORD，无法执行迁移"
  exit 1
fi

export MYSQL_PWD="$MYSQL_ROOT_PASSWORD"

sql_escape() {
  echo "$1" | sed "s/'/''/g"
}

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
  if command -v openssl >/dev/null 2>&1; then
    openssl dgst -sha256 "$file" | awk '{print $2}'
    return 0
  fi
  echo "no-checksum"
}

db_query() {
  mysql -h "$MYSQL_HOST" -P "$MYSQL_PORT" -uroot -N -B "$MYSQL_DATABASE" -e "$1"
}

db_exec() {
  mysql -h "$MYSQL_HOST" -P "$MYSQL_PORT" -uroot "$MYSQL_DATABASE" -e "$1"
}

wait_for_db() {
  local max_retries="${1:-30}"
  local retry=0

  log "等待 MySQL 就绪..."
  while [ $retry -lt $max_retries ]; do
    if mysqladmin ping -h "$MYSQL_HOST" -P "$MYSQL_PORT" -uroot --silent >/dev/null 2>&1; then
      log "MySQL 已就绪"
      return 0
    fi
    retry=$((retry + 1))
    log "等待 MySQL 启动... ($retry/$max_retries)"
    sleep 2
  done

  log "MySQL 未在预期时间内就绪"
  return 1
}

ensure_database_exists() {
  log "确保数据库存在..."
  mysql -h "$MYSQL_HOST" -P "$MYSQL_PORT" -uroot -e \
    "CREATE DATABASE IF NOT EXISTS $MYSQL_DATABASE CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" >/dev/null 2>&1
  log "数据库已就绪: $MYSQL_DATABASE"
}

ensure_migrations_table() {
  log "确保迁移记录表存在..."
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
  log "迁移记录表就绪"
}

validate_migration_filename() {
  local filename="$1"
  if [[ ! "$filename" =~ ^[0-9]{3}_[A-Za-z0-9_]+\.sql$ ]]; then
    return 1
  fi
  return 0
}

acquire_lock() {
  local lock_name="chicken_king_schema_migrations"
  local got_lock
  got_lock="$(db_query "SELECT GET_LOCK('$(sql_escape "$lock_name")', 30);")"
  if [ "$got_lock" != "1" ]; then
    log "获取迁移锁失败（可能有其他迁移在执行）"
    return 1
  fi
  trap "db_query \"SELECT RELEASE_LOCK('$(sql_escape "$lock_name")');\" >/dev/null 2>&1 || true" EXIT
  log "迁移锁已获取"
}

resolve_baseline_num() {
  local baseline="$1"
  if [ -z "$baseline" ]; then
    echo ""
    return 0
  fi
  if [[ "$baseline" =~ ^[0-9]{1,3}$ ]]; then
    printf "%d" "$((10#$baseline))"
    return 0
  fi
  if [[ "$baseline" =~ ^[0-9]{3}_.+ ]]; then
    local num="${baseline%%_*}"
    printf "%d" "$((10#$num))"
    return 0
  fi
  return 1
}

mark_migrations_as_applied() {
  local files="$1"
  local baseline_num="${2:-}"

  while IFS= read -r file; do
    [ -z "$file" ] && continue
    [ ! -f "$file" ] && continue

    local base version version_num checksum existing_checksum version_num_int
    base="$(basename "$file")"
    if ! validate_migration_filename "$base"; then
      log "跳过非法文件名: $base（仅允许：NNN_name.sql）"
      continue
    fi

    version="${base%.sql}"
    version_num="${version%%_*}"
    version_num_int=$((10#$version_num))

    if [ -n "$baseline_num" ] && [ "$version_num_int" -gt "$baseline_num" ]; then
      continue
    fi

    checksum="$(sha256_file "$file")"
    existing_checksum="$(db_query "SELECT checksum FROM schema_migrations WHERE version='$(sql_escape "$version")' LIMIT 1;")"
    if [ -n "$existing_checksum" ]; then
      continue
    fi

    db_exec "INSERT INTO schema_migrations (version, version_num, filename, checksum) VALUES ('$(sql_escape "$version")', $version_num_int, '$(sql_escape "$base")', '$(sql_escape "$checksum")');"
  done <<< "$files"
}

run_migrations() {
  if [ ! -d "$MIGRATIONS_DIR" ]; then
    log "迁移目录不存在，跳过: $MIGRATIONS_DIR"
    return 0
  fi

  local files
  files="$(find "$MIGRATIONS_DIR" -maxdepth 1 -name '[0-9][0-9][0-9]_*.sql' -type f 2>/dev/null | sort || true)"
  if [ -z "$files" ]; then
    log "未发现迁移文件（格式：[0-9][0-9][0-9]_*.sql），跳过"
    return 0
  fi

  wait_for_db 30
  ensure_database_exists
  acquire_lock

  local table_count
  table_count="$(db_query "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE();" 2>/dev/null || echo "0")"

  if [ "$table_count" = "0" ] || [ -z "$table_count" ]; then
    log "数据库为空，导入初始数据库..."
    if [ -f "$MIGRATIONS_DIR/production_clean_db.sql" ]; then
      mysql -h "$MYSQL_HOST" -P "$MYSQL_PORT" -uroot "$MYSQL_DATABASE" < "$MIGRATIONS_DIR/production_clean_db.sql"
      log "初始数据库导入成功（production_clean_db.sql）"
    elif [ -f "$MIGRATIONS_DIR/schema.sql" ]; then
      mysql -h "$MYSQL_HOST" -P "$MYSQL_PORT" -uroot "$MYSQL_DATABASE" < "$MIGRATIONS_DIR/schema.sql"
      log "基础 schema 执行成功（schema.sql）"
      if [ -f "$MIGRATIONS_DIR/seed_production_config.sql" ]; then
        mysql -h "$MYSQL_HOST" -P "$MYSQL_PORT" -uroot "$MYSQL_DATABASE" < "$MIGRATIONS_DIR/seed_production_config.sql" || true
        log "配置数据导入完成（seed_production_config.sql）"
      fi
    else
      log "未找到初始化文件（production_clean_db.sql 或 schema.sql）"
      return 1
    fi
  else
    log "数据库已有 $table_count 个表，跳过初始化"
  fi

  ensure_migrations_table

  local migrations_count
  migrations_count="$(db_query "SELECT COUNT(*) FROM schema_migrations;" 2>/dev/null || echo "0")"

  if [ "$table_count" = "0" ] || [ "$table_count" = "" ]; then
    log "初始库已导入，标记历史迁移为已执行"
    mark_migrations_as_applied "$files"
    return 0
  fi

  if [ "$migrations_count" = "0" ] && [ -n "$MIGRATION_BASELINE_VERSION" ]; then
    local baseline_num
    if ! baseline_num="$(resolve_baseline_num "$MIGRATION_BASELINE_VERSION")"; then
      log "MIGRATION_BASELINE_VERSION 格式不正确: $MIGRATION_BASELINE_VERSION"
      return 1
    fi
    log "检测到 MIGRATION_BASELINE_VERSION=$MIGRATION_BASELINE_VERSION，标记 <= $baseline_num 的迁移为已执行"
    mark_migrations_as_applied "$files" "$baseline_num"
  fi

  log "开始执行增量迁移..."
  while IFS= read -r file; do
    [ -z "$file" ] && continue
    [ ! -f "$file" ] && continue

    local base version version_num checksum existing_checksum version_num_int
    base="$(basename "$file")"
    if ! validate_migration_filename "$base"; then
      log "跳过非法文件名: $base（仅允许：NNN_name.sql）"
      continue
    fi

    version="${base%.sql}"
    version_num="${version%%_*}"
    version_num_int=$((10#$version_num))
    checksum="$(sha256_file "$file")"

    existing_checksum="$(db_query "SELECT checksum FROM schema_migrations WHERE version='$(sql_escape "$version")' LIMIT 1;")"
    if [ -n "$existing_checksum" ]; then
      if [ "$existing_checksum" != "$checksum" ] && [ "$checksum" != "no-checksum" ]; then
        log "已执行但校验和不一致: $base（请勿修改已执行迁移）"
      else
        log "跳过已执行迁移: $base"
      fi
      continue
    fi

    log "执行迁移: $base"
    if ! mysql -h "$MYSQL_HOST" -P "$MYSQL_PORT" -uroot "$MYSQL_DATABASE" < "$file"; then
      log "迁移失败: $base"
      return 1
    fi
    db_exec "INSERT INTO schema_migrations (version, version_num, filename, checksum) VALUES ('$(sql_escape "$version")', $version_num_int, '$(sql_escape "$base")', '$(sql_escape "$checksum")');"
    log "迁移完成: $base"
  done <<< "$files"

  log "数据库迁移完成"
}

run_migrations
