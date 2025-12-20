# 自动部署配置文档

## 概述

本项目已配置 GitHub Webhook 自动部署功能。当你 `git push` 到 `main` 分支时，服务器会自动拉取最新代码并重新部署所有服务。

## 架构图

```
┌─────────────┐     push      ┌─────────────┐
│   本地开发   │ ───────────▶ │   GitHub    │
└─────────────┘               └──────┬──────┘
                                     │ webhook
                                     ▼
┌────────────────────────────────────────────────────────┐
│                    服务器 (Ubuntu)                      │
│  ┌─────────────────────────────────────────────────┐  │
│  │              Docker 容器                          │  │
│  │                                                   │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐       │  │
│  │  │  nginx   │  │ backend  │  │ frontend │       │  │
│  │  │  :80/443 │  │  :8000   │  │  :5174   │       │  │
│  │  └────┬─────┘  └──────────┘  └──────────┘       │  │
│  │       │                                          │  │
│  │  ┌────┴─────┐  ┌──────────┐  ┌──────────┐       │  │
│  │  │ webhook  │  │   mysql  │  │  redis   │       │  │
│  │  │  :9000   │  │  :3306   │  │  :6379   │       │  │
│  │  └──────────┘  └──────────┘  └──────────┘       │  │
│  └─────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

## 工作流程

1. **开发者推送代码** → `git push origin main`
2. **GitHub 发送 Webhook** → `POST https://pk.ikuncode.cc/webhook`
3. **Webhook 服务验证签名** → 使用 HMAC-SHA256 验证请求来源
4. **执行部署脚本** → 生成 `.env` 生产配置 + 重建容器
5. **拉取最新代码** → `git fetch && git reset --hard origin/main`
6. **重建 Docker 容器** → `docker compose build --no-cache && docker compose up -d`
7. **健康检查** → 等待后端服务启动并验证
8. **清理旧镜像** → `docker image prune -f`

---

## 首次部署步骤

### 1. 服务器准备

```bash
# 克隆代码
cd /opt
git clone https://github.com/deijing/ikun.git chicken-king
cd chicken-king
```

### 2. 创建生产环境配置

```bash
nano /opt/chicken-king/.env
```

粘贴以下内容：

```bash
MYSQL_ROOT_PASSWORD=password
MYSQL_DATABASE=chicken_king
MYSQL_USER=chicken
MYSQL_PASSWORD=password
SECRET_KEY=a3f8c9d2e5b7a1f4c8d0e3b6a9f2c5d8e1b4a7f0c3d6e9b2a5f8c1d4e7b0a3f6
FRONTEND_URL=https://pk.ikuncode.cc
LINUX_DO_CLIENT_ID=ZFdemXAFDfy9mQfCI1tsOTyzBEKJYXT1
LINUX_DO_CLIENT_SECRET=xSAW4rhOyz6ejc9xrflf4XeRYY39Etex
LINUX_DO_REDIRECT_URI=https://pk.ikuncode.cc/api/v1/auth/linuxdo/callback
GITHUB_CLIENT_ID=Ov23liWnv2Zcv4FPoi3H
GITHUB_CLIENT_SECRET=205aa31cc830ea3ed5f9f5cc5edbe9b61c9c59ca
GITHUB_REDIRECT_URI=https://pk.ikuncode.cc/api/v1/auth/github/callback
VITE_API_URL=/api/v1
```

按 `Ctrl+O` 保存，`Ctrl+X` 退出。

### 3. 启动 Webhook 服务

```bash
# 创建 webhook 网络
docker network create chicken-king_chicken_king_network

# 配置 webhook 密钥
nano /opt/chicken-king/deploy/webhook/.env
# 填入：WEBHOOK_SECRET=你的64字符密钥

# 启动 webhook
cd /opt/chicken-king/deploy/webhook
docker compose up -d --build
```

### 4. 启动主项目

```bash
cd /opt/chicken-king
docker compose build --no-cache
docker compose up -d
```

### 5. 初始化数据库

```bash
# 等待 MySQL 启动
sleep 20

# 导入数据库（如有备份）
docker exec -i chicken_king_db mysql -uroot -ppassword chicken_king < /opt/chicken-king/chicken_king_dump.sql

# 或导入初始结构
docker exec -i chicken_king_db mysql -uroot -ppassword chicken_king < /opt/chicken-king/backend/sql/schema.sql
```

### 6. 配置 GitHub Webhook

1. 访问 `https://github.com/deijing/ikun/settings/hooks`
2. 点击 "Add webhook"
3. 配置：
   - **Payload URL**: `https://pk.ikuncode.cc/webhook`
   - **Content type**: `application/json`（必须！）
   - **Secret**: 与服务器 `.env` 中的 `WEBHOOK_SECRET` 一致
   - **Events**: Just the push event
4. 保存

---

## 今晚遇到的问题及解决方案

### 问题 1: React Hook "Invalid hook call" 错误

**原因**: 前端使用 Vite 开发模式运行，导致 React 被加载多次

**解决方案**:
- 修改 `frontend/Dockerfile` 为多阶段构建，生产环境使用 nginx 提供静态文件
- 修改 `docker-compose.yml` 端口映射为 `5174:80`
- 修改 `nginx/nginx.prod.conf` upstream 端口从 5174 改为 80

### 问题 2: MySQL 连接被拒绝 (Access denied)

**原因**: MySQL 数据卷保存了旧密码，与新配置不一致

**解决方案**:
```bash
docker compose down
docker volume rm chicken-king_mysql_data
docker compose up -d
# 重新导入数据库
docker exec -i chicken_king_db mysql -uroot -ppassword chicken_king < chicken_king_dump.sql
```

### 问题 3: CORS 跨域错误

**原因**: 前端 API URL 使用 `localhost:8000`，生产环境无法访问

**解决方案**:
- 修改 `frontend/src/services/api.js` 默认使用相对路径 `/api/v1`
- nginx 会将 `/api/` 请求代理到后端

### 问题 4: OAuth 登录跳转到本地

**原因**: 前端登录页面使用相对路径做 `window.location.href` 跳转不正确

**解决方案**:
- 修改 `frontend/src/pages/LoginPage.jsx` 使用 `window.location.origin + /api/v1`
- 添加 `frontend/vite.config.js` 代理配置支持本地开发

### 问题 5: OAuth 页面显示错误的应用信息

**原因**: Linux.do OAuth 应用配置缓存 或 浏览器缓存

**解决方案**:
- 清除浏览器缓存，使用无痕模式测试
- 在 Linux.do 后台重新保存应用配置

---

## 目录结构

```
/opt/chicken-king/
├── .env                        # 生产环境配置（自动生成）
├── docker-compose.yml          # 主项目容器编排
├── chicken_king_dump.sql       # 数据库备份
├── backend/                    # FastAPI 后端
├── frontend/                   # React 前端（生产模式用 nginx）
├── nginx/
│   ├── nginx.prod.conf         # Nginx 生产配置
│   ├── ssl/                    # SSL 证书
│   └── logs/                   # Nginx 日志
└── deploy/
    └── webhook/
        ├── app.py              # Webhook Flask 服务
        ├── deploy.sh           # 部署脚本（含生产配置生成）
        ├── .env                # Webhook 密钥
        ├── Dockerfile
        ├── docker-compose.yml
        └── logs/
            ├── webhook.log
            └── deploy.log
```

---

## 常用运维命令

### 查看服务状态

```bash
docker ps
cd /opt/chicken-king && docker compose ps
```

### 查看日志

```bash
# 部署日志
tail -f /opt/chicken-king/deploy/webhook/logs/deploy.log

# 后端日志
docker logs chicken_king_backend -f --tail 50

# 前端日志
docker logs chicken_king_frontend -f

# Nginx 日志
tail -f /opt/chicken-king/nginx/logs/access.log
tail -f /opt/chicken-king/nginx/logs/error.log
```

### 手动部署

```bash
cd /opt/chicken-king
git pull
docker compose build --no-cache
docker compose up -d
```

### 重启单个服务

```bash
docker restart chicken_king_backend
docker restart chicken_king_frontend
docker restart chicken_king_nginx
```

### 数据库操作

```bash
# 进入 MySQL
docker exec -it chicken_king_db mysql -uroot -ppassword chicken_king

# 查看用户表
docker exec -it chicken_king_db mysql -uroot -ppassword chicken_king -e "SELECT id, username, role FROM users;"

# 修改用户角色
docker exec -it chicken_king_db mysql -uroot -ppassword chicken_king -e "UPDATE users SET role='admin', original_role='admin' WHERE username='xxx';"

# 备份数据库
docker exec chicken_king_db mysqldump -uroot -ppassword chicken_king > chicken_king_dump.sql

# 恢复数据库
docker exec -i chicken_king_db mysql -uroot -ppassword chicken_king < chicken_king_dump.sql
```

---

## 故障排查

### 502 Bad Gateway

```bash
docker ps  # 检查容器是否运行
docker logs chicken_king_backend --tail 30  # 查看后端日志
docker compose up -d  # 重启服务
```

### Webhook 返回 403

```bash
# 检查密钥
cat /opt/chicken-king/deploy/webhook/.env

# 确保 GitHub Webhook Content-Type 是 application/json
```

### 后端无法连接数据库

```bash
# 检查环境变量
docker exec chicken_king_backend env | grep DATABASE

# 检查 MySQL 状态
docker exec -it chicken_king_db mysql -uroot -ppassword -e "SELECT 1"
```

### OAuth 登录失败

```bash
# 检查后端 OAuth 配置
docker exec chicken_king_backend env | grep -E "LINUX_DO|GITHUB|FRONTEND"

# 测试登录 URL
curl -v "http://localhost:8000/api/v1/auth/linuxdo/login" 2>&1 | grep "location:"
```

---

## 部署时间

| 阶段 | 预计时间 |
|------|----------|
| Git 拉取 | 2-5 秒 |
| Docker 构建 | 30-120 秒 |
| 容器启动 | 10-30 秒 |
| 健康检查 | 5-60 秒 |
| **总计** | **1-3 分钟** |

部署期间网站可能短暂不可用（约 10-30 秒），这是正常现象。

---

## 相关文件

| 文件 | 说明 |
|------|------|
| `deploy/webhook/deploy.sh` | 部署脚本，含生产配置自动生成 |
| `deploy/webhook/app.py` | Webhook 接收服务 |
| `docker-compose.yml` | 主项目容器编排 |
| `nginx/nginx.prod.conf` | Nginx 反向代理配置 |
| `frontend/vite.config.js` | 前端 Vite 配置（含代理） |
| `frontend/src/services/api.js` | 前端 API 配置 |
| `backend/app/core/config.py` | 后端配置（CORS、OAuth） |
