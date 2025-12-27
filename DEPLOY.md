# 鸡王争霸赛 - 生产环境部署指南

## 目录结构

```
鸡王争霸赛/
├── docker-compose.prod.yml    # 生产环境编排
├── .env.production.example    # 环境变量模板（复制为 .env）
├── deploy/
│   └── webhook/               # GitHub Webhook 自动部署
├── nginx/
│   ├── nginx.prod.conf        # Nginx 反向代理配置
│   ├── ssl/                   # SSL 证书目录
│   └── logs/                  # Nginx 日志
├── backend/
│   ├── Dockerfile.prod        # 后端生产镜像
│   └── sql/                   # 数据库迁移脚本
└── frontend/
    ├── Dockerfile.prod        # 前端生产镜像
    └── nginx.conf             # 前端容器 Nginx 配置
```

## 快速部署

### 1. 准备服务器

```bash
# 安装 Docker 和 Docker Compose
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# 安装 Docker Compose (如果未包含)
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2. 克隆项目

```bash
git clone https://github.com/deijing/ikun.git chicken-king
cd chicken-king
```

### 3. 配置环境变量

```bash
# 复制模板
cp .env.production.example .env

# 编辑配置（重要！）
nano .env
```

**必须修改的配置项：**

| 配置项 | 说明 | 示例 |
|--------|------|------|
| `MYSQL_ROOT_PASSWORD` | MySQL root 密码 | 强随机密码 |
| `MYSQL_PASSWORD` | MySQL 应用密码 | 强随机密码 |
| `SECRET_KEY` | JWT 密钥 | `python -c "import secrets; print(secrets.token_hex(32))"` |
| `FRONTEND_URL` | 前端域名 | `https://your-domain.com` |
| `LINUX_DO_CLIENT_ID` | Linux.do OAuth | 从 connect.linux.do 获取 |
| `LINUX_DO_CLIENT_SECRET` | Linux.do OAuth | 从 connect.linux.do 获取 |
| `LINUX_DO_REDIRECT_URI` | OAuth 回调地址 | `https://your-domain.com/api/v1/auth/linuxdo/callback` |

### 3.5 数据库迁移（自动）

生产环境默认启用自动迁移（`AUTO_MIGRATE=true`），后端容器启动时会：
- 空库导入 `backend/sql/production_clean_db.sql`（或回退 `schema.sql` + `seed_production_config.sql`）
- 旧库按 `backend/sql/NNN_*.sql` 增量执行

如旧库已存在历史迁移但无 `schema_migrations`，可在 `.env` 设置 `MIGRATION_BASELINE_VERSION=XXX` 作为基线。

### 3.6 部署前检查清单

- `.env` 已更新必要配置
- Nginx 证书与域名解析已准备
- 数据库迁移脚本已执行或初始化脚本已替换

### 4. 配置域名和 SSL

#### 方式一：使用 Let's Encrypt（推荐）

```bash
# 安装 certbot
sudo apt install certbot

# 获取证书
sudo certbot certonly --standalone -d your-domain.com

# 复制证书到项目目录
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/
sudo chown $USER:$USER nginx/ssl/*.pem
```

#### 方式二：使用自签名证书（仅测试）

```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/privkey.pem \
  -out nginx/ssl/fullchain.pem \
  -subj "/CN=your-domain.com"
```

#### 启用 HTTPS

编辑 `nginx/nginx.prod.conf`，取消注释以下部分：

```nginx
# HTTP 重定向到 HTTPS
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

# 主服务器
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    # ... 其他 SSL 配置
}
```

### 5. 启动服务

```bash
# 构建并启动所有服务
docker compose -f docker-compose.prod.yml up -d --build

# 查看服务状态
docker compose -f docker-compose.prod.yml ps

# 查看日志
docker compose -f docker-compose.prod.yml logs -f
```

### 6. 验证部署

```bash
# 检查健康状态
curl http://localhost/health

# 检查 API
curl http://localhost/api/v1/contests/

# 查看各服务日志
docker compose -f docker-compose.prod.yml logs backend
docker compose -f docker-compose.prod.yml logs nginx
```

## 常用运维命令

### 服务管理

```bash
# 停止服务
docker compose -f docker-compose.prod.yml down

# 重启单个服务
docker compose -f docker-compose.prod.yml restart backend

# 更新部署
git pull
docker compose -f docker-compose.prod.yml up -d --build

# 查看资源使用
docker stats
```

### 数据库管理

```bash
# 进入 MySQL
docker exec -it chicken_king_db mysql -u root -p chicken_king

# 备份数据库
docker exec chicken_king_db mysqldump -u root -p chicken_king > backup_$(date +%Y%m%d).sql

# 恢复数据库
docker exec -i chicken_king_db mysql -u root -p chicken_king < backup.sql
```

### 日志查看

```bash
# 后端日志
docker logs -f chicken_king_backend

# Nginx 访问日志
tail -f nginx/logs/access.log

# Nginx 错误日志
tail -f nginx/logs/error.log
```

## 启用 Umami 统计（可选）

```bash
# 使用 analytics profile 启动
docker compose -f docker-compose.prod.yml --profile analytics up -d

# Umami 默认访问地址
# http://your-domain.com:3001
# 默认账号: admin / umami
```

## 安全建议

1. **防火墙配置**
   ```bash
   # 只开放必要端口
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw allow 22/tcp
   sudo ufw enable
   ```

2. **定期更新**
   ```bash
   # 更新系统
   sudo apt update && sudo apt upgrade -y

   # 更新 Docker 镜像
   docker compose -f docker-compose.prod.yml pull
   docker compose -f docker-compose.prod.yml up -d
   ```

3. **数据备份**
   ```bash
   # 设置定时备份
   crontab -e
   # 添加: 0 3 * * * /path/to/backup.sh
   ```

4. **SSL 证书续期**
   ```bash
   # Let's Encrypt 自动续期
   sudo certbot renew --quiet

   # 复制新证书
   sudo cp /etc/letsencrypt/live/your-domain.com/*.pem nginx/ssl/
   docker compose -f docker-compose.prod.yml restart nginx
   ```

## 故障排除

### 服务无法启动

```bash
# 检查端口占用
sudo netstat -tlnp | grep -E '80|443|8000|3306'

# 检查 Docker 日志
docker compose -f docker-compose.prod.yml logs --tail=100
```

### 数据库连接失败

```bash
# 检查数据库状态
docker exec chicken_king_db mysqladmin -u root -p ping

# 检查网络
docker network ls
docker network inspect chicken_king_chicken_king_network
```

### 502 Bad Gateway

```bash
# 检查后端服务
docker logs chicken_king_backend

# 检查 Nginx 配置
docker exec chicken_king_nginx nginx -t
```

## 性能优化

### MySQL 优化

在 `docker-compose.prod.yml` 中调整 MySQL 参数：
```yaml
command: >
  --innodb_buffer_pool_size=512M
  --max_connections=1000
```

### 后端优化

调整 worker 数量（根据 CPU 核心数）：
```dockerfile
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "8"]
```

### Nginx 优化

调整 `worker_connections` 和缓冲区大小。
