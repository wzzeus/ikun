# 数据库迁移自动化

默认由后端容器启动时自动执行数据库迁移（`AUTO_MIGRATE=true`），确保数据库 schema 与代码保持同步。
如需仍由 `deploy/webhook/deploy.sh` 执行迁移，可设置 `AUTO_MIGRATE=false`。

## 工作原理

### 1. 首次部署自动初始化

**当数据库为空时**，自动导入 `backend/sql/production_clean_db.sql`：

- 50个表结构
- 配置数据（比赛、成就、任务、抽奖、扭蛋、积分商城等）
- 示例报名项目（API Key Tool，包含完整的 GitHub 仓库和 API Key）

**兼容性**：如果找不到 `production_clean_db.sql`，会回退到旧方式：
1. 执行 `schema.sql`（表结构）
2. 执行 `seed_production_config.sql`（配置数据）

### 2. 迁移版本跟踪

系统会自动创建 `schema_migrations` 表来跟踪已执行的迁移：

```sql
CREATE TABLE schema_migrations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  version VARCHAR(255) UNIQUE NOT NULL,      -- 如：002_github_and_cheer
  version_num INT UNSIGNED NOT NULL,         -- 如：2（用于排序）
  filename VARCHAR(255) NOT NULL,            -- 如：002_github_and_cheer.sql
  checksum CHAR(64) NOT NULL,                -- 文件 SHA256 校验和
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3. 执行流程（AUTO_MIGRATE=true）

后端容器 entrypoint 在启动时自动执行，部署脚本仅负责触发重建并等待健康检查：

1. 等待 MySQL 就绪（最多 30 秒）
2. 检查数据库表数量
   - **如果为 0** → 导入 `production_clean_db.sql`（首次部署）
   - **如果 > 0** → 跳过初始化
3. 创建 `schema_migrations` 表（如果不存在）
4. 获取文件锁（防止并发执行）
5. **若为首次初始化**：导入完成后自动将现有迁移标记为已执行，跳过增量迁移
6. 按文件序号顺序扫描 `backend/sql/[0-9][0-9][0-9]_*.sql`
7. 对每个迁移文件：
   - 计算 SHA256 校验和
   - 检查是否已执行（查询 `schema_migrations` 表）
   - 如已执行且校验和一致 → 跳过
   - 如已执行但校验和不一致 → 告警（文件可能被改动）
   - 如未执行 → 执行 SQL 并记录版本
8. 释放文件锁

### 4. 安全特性

- **幂等性**：已执行的迁移不会重复执行
- **并发保护**：使用文件锁（`flock`）防止并发部署冲突
- **文件名白名单**：仅允许 `NNN_name.sql` 格式，防止异常文件名导致的安全问题
- **密码安全**：使用 `MYSQL_PWD` 环境变量，不在命令行暴露密码
- **校验和验证**：SHA256 校验和检测迁移文件是否被篡改
- **事务隔离**：每个迁移文件单独执行，失败时中止部署

## 日志查看

### 迁移专用日志
```bash
# 查看迁移日志
cat /opt/chicken-king/deploy/webhook/logs/migrations.log

# 实时监控迁移
tail -f /opt/chicken-king/deploy/webhook/logs/migrations.log
```

### 部署总日志
```bash
# 查看部署日志（包含迁移摘要）
cat /opt/chicken-king/deploy/webhook/logs/deploy.log

# 或通过 Web 接口
curl https://<your-domain>/logs
```

### 查询已执行的迁移
```sql
-- 连接到数据库
docker exec -it chicken_king_db mysql -uroot -p chicken_king

-- 查看所有已执行的迁移
SELECT version, filename, applied_at
FROM schema_migrations
ORDER BY version_num;

-- 查看最近执行的迁移
SELECT version, filename, applied_at
FROM schema_migrations
ORDER BY applied_at DESC
LIMIT 10;
```

## 添加新迁移

### 命名规范
迁移文件必须遵循格式：`NNN_description.sql`

- `NNN`：三位数字序号（如 `026`、`027`）
- `description`：简短描述（用下划线分隔）
- 示例：`026_add_new_feature.sql`

### 创建迁移
```bash
# 1. 确定序号（查看最新迁移）
ls -1 backend/sql/[0-9][0-9][0-9]_*.sql | tail -1

# 2. 创建新迁移文件（假设最新是 025）
cat > backend/sql/026_add_new_feature.sql << 'EOF'
-- 迁移：添加新功能表
-- 日期：2025-12-22

ALTER TABLE users ADD COLUMN new_field VARCHAR(100);

CREATE TABLE new_feature (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
EOF

# 3. 提交并推送
git add backend/sql/026_add_new_feature.sql
git commit -m "feat: add new feature migration"
git push
```

### 自动执行
推送后，webhook 会自动触发部署，迁移会自动执行。

## 故障排查

### 迁移失败
```bash
# 1. 查看详细错误
tail -100 /opt/chicken-king/deploy/webhook/logs/migrations.log

# 2. 检查 MySQL 容器状态
docker logs chicken_king_db --tail 50

# 3. 手动连接数据库排查
docker exec -it chicken_king_db mysql -uroot -p chicken_king
```

### 迁移锁超时
如果看到 "获取迁移锁失败" 错误：

```bash
# 检查是否有其他部署正在运行
ps aux | grep deploy.sh

# 检查锁文件
ls -la /tmp/chicken_king_migrations.lock
lsof /tmp/chicken_king_migrations.lock  # 查看哪个进程持有锁

# 等待其他部署完成，或者终止挂起的进程
# 注意：不要手动删除锁文件，flock 机制下这样做是危险的
```

### 校验和不一致
如果看到 "校验和不一致" 告警：

**这意味着迁移文件在执行后被修改了！**

正确做法：
1. 不要修改已执行的迁移文件
2. 如需修改数据库，创建新的迁移文件
3. 如必须修复错误的迁移，需要手动操作：
   ```sql
   -- 删除错误的迁移记录
   DELETE FROM schema_migrations WHERE version = 'XXX_wrong_migration';

   -- 手动执行修复 SQL
   -- ...

   -- 重新部署以记录正确的校验和
   ```

### 手动执行迁移
```bash
# 进入项目目录
cd /opt/chicken-king

# 手动执行迁移脚本（查看源码了解更多）
# 注意：默认由后端容器启动时自动执行；如需强制手动执行，请先临时将 AUTO_MIGRATE=false
bash deploy/webhook/deploy.sh
```

## 最佳实践

1. **迁移应该是增量的**：每个迁移只做一件事情
2. **使用事务**：对于复杂迁移，使用 `START TRANSACTION` 和 `COMMIT`
3. **可回滚**：设计迁移时考虑如何回滚（虽然系统不自动支持）
4. **测试本地**：推送前在本地测试迁移脚本
5. **避免数据迁移**：尽量只做 schema 变更，大量数据迁移另行处理
6. **不要修改已执行的迁移**：总是创建新的迁移文件

## 示例：处理同序号文件

注意：目前代码库中存在同序号的迁移文件（如 `004_*.sql`、`012_*.sql`），系统会按文件名排序执行它们：

```bash
# 这些文件都会被执行（按字母序）
004_add_api_key.sql
004_announcements.sql

012_request_logs.sql
012_submission_reviews.sql
```

建议：未来新增迁移时避免序号冲突，使用递增序号。
