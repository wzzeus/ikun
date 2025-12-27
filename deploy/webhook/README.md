# GitHub Webhook 自动部署

当你 `git push` 到 `main` 分支时，服务器会自动拉取代码、执行数据库迁移并重新部署；如配置 `WECHAT_PUSH_URL` 则发送微信通知。

## 服务器配置步骤

### 1. 生成 Webhook 密钥

```bash
# 生成随机密钥
openssl rand -hex 32
```

记住这个密钥，后面要用。

### 2. 配置 Webhook 环境变量

```bash
cd /opt/chicken-king/deploy/webhook
cp .env.example .env

# 编辑 .env，填入刚才生成的密钥
nano .env
```

可选配置：
- `WECHAT_PUSH_URL`：部署完成后的微信推送地址（不配置则不推送）

### 3. 配置主项目 .env

```bash
cd /opt/chicken-king
cp .env.production.example .env
nano .env
```

> `deploy/webhook/deploy.sh` 部署时会检查 `.env`，缺失则复制模板并中断，请先填写真实配置。

### 4. 启动 Webhook 服务

```bash
cd /opt/chicken-king/deploy/webhook

# 创建日志目录
mkdir -p logs

# 启动服务
docker compose up -d

# 查看日志
docker compose logs -f
```

### 5. 配置 Nginx 反向代理

在 Nginx 配置中添加：

```nginx
# Webhook 端点
location /webhook {
    proxy_pass http://localhost:9000/webhook;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Hub-Signature-256 $http_x_hub_signature_256;
    proxy_set_header X-GitHub-Event $http_x_github_event;
}
```

重载 Nginx：
```bash
sudo nginx -t && sudo systemctl reload nginx
```

## GitHub 配置步骤

1. 打开仓库：https://github.com/deijing/ikun
2. 进入 **Settings** → **Webhooks** → **Add webhook**
3. 填写配置：
   - **Payload URL**: `https://<your-domain>/webhook`
   - **Content type**: `application/json`
   - **Secret**: 填入你生成的密钥（与服务器 .env 中的一致）
   - **Which events**: 选择 `Just the push event`
   - **Active**: ✅ 勾选
4. 点击 **Add webhook**

## 验证

1. 检查 Webhook 服务状态：
```bash
curl https://<your-domain>/webhook/health
```

2. 查看部署日志：
```bash
curl https://<your-domain>/logs
# 或者
cat /opt/chicken-king/deploy/webhook/logs/deploy.log
```

3. 推送代码测试：
```bash
git commit --allow-empty -m "test: trigger deploy"
git push
```

## 故障排查

### 查看 Webhook 容器日志
```bash
docker logs chicken-king-webhook -f
```

### 查看部署日志
```bash
tail -f /opt/chicken-king/deploy/webhook/logs/deploy.log
```

### 手动执行部署
```bash
cd /opt/chicken-king
bash deploy/webhook/deploy.sh
```

### GitHub Webhook 投递记录
在 GitHub 仓库的 Settings → Webhooks → 点击你的 webhook → Recent Deliveries
可以看到每次推送的投递状态和响应。

## 功能特性

### 自动数据库初始化与迁移

#### 首次部署（数据库为空）
自动导入 `backend/sql/production_clean_db.sql`，包含：
- ✅ 50个表结构
- ✅ 配置数据（比赛、成就、任务、抽奖、扭蛋、积分商城等）
- ✅ 示例报名项目（API Key Tool）

#### 增量迁移
- 自动执行 `backend/sql/NNN_*.sql` 迁移文件
- 版本跟踪，避免重复执行
- 文件锁防止并发冲突
- SHA256 校验确保文件完整性
- 详细迁移日志：`logs/migrations.log`
- 详见：[MIGRATIONS.md](./MIGRATIONS.md)

### 微信推送通知（可选）
配置 `WECHAT_PUSH_URL` 后才会推送，包含：
- 部署时间
- 环境信息
- 健康检查状态

---

## 补充说明

- 主项目 `.env` 需要配置 `WORKER_API_TOKEN`，用于 Worker 回写状态鉴权。
- 生产 Nginx 证书需放在 `/opt/chicken-king/nginx/ssl`（`fullchain.pem` + `privkey.pem`）。
- 首次部署会导入 `production_clean_db.sql` 并跳过增量迁移，请保证该文件为最新结构。

