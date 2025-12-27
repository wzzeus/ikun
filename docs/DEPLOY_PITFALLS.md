# 部署踩坑记录

> 目的：记录已踩过的问题与规避方式，避免重复翻车。

## 证书相关
- Nginx 启动失败且容器不断重启，多数是证书路径不对。
- 生产配置读取路径：`/opt/chicken-king/nginx/ssl/fullchain.pem`、`/opt/chicken-king/nginx/ssl/privkey.pem`。
- 如果证书集中放在 `/opt/ssl`，需要先复制或软链到上述目录。

## Worker 回写 Token
- `WORKER_API_TOKEN` 是 Worker 回写状态接口的鉴权 Token，缺失会导致 Worker 启动后持续报错。
- 修改 `.env` 后需要 **重建** 容器（不是简单 `docker restart`）：
- `docker compose -f docker-compose.prod.yml up -d --force-recreate backend worker`

## 初始库导入与迁移
- 首次部署会导入 `backend/sql/production_clean_db.sql` 并**标记历史迁移已执行**。
- 因此 `production_clean_db.sql` 必须包含最新结构字段，否则会出现运行时字段缺失（例如 `contests.visibility`）。
- 修复方式：
  - 更新 `production_clean_db.sql` 至最新结构；或
  - 手动补执行缺失迁移文件。

## 网络创建冲突
- `docker-compose.prod.yml` 会创建 `chicken-king_chicken_king_network`。
- 不要提前手动 `docker network create chicken-king_chicken_king_network`，否则会触发 label 冲突导致 `compose up` 失败。
