# 安全事件修复记录

## 事件概述

**时间**：2025-12-23 07:26 (UTC+8)
**类型**：勒索软件攻击
**影响**：MySQL 数据库被加密

## 攻击详情

勒索软件在服务器上加密了 MySQL 数据卷，并留下勒索信息：
- 勒索金额：0.0095 BTC
- 联系邮箱：rambler+2k6vr@onionmail.org
- 数据库代码：2K6VR
- 威胁：48小时内不支付数据将被公开并删除

## 根本原因

1. **MySQL 端口暴露到公网**：`0.0.0.0:3306` 允许任何人访问
2. **弱密码**：`MYSQL_ROOT_PASSWORD=password`
3. **缺少重启策略**：容器停止后不自动重启
4. **没有定期备份**

## 修复措施

### 1. 紧急修复（服务器端）

```bash
# 停止受感染的 MySQL 容器
docker stop chicken_king_db

# 删除被污染的数据卷
docker volume rm chicken-king_mysql_data

# 重新创建数据卷
cd /opt/chicken-king
docker compose up -d db

# 等待 MySQL 启动
sleep 10

# 导入干净数据
docker exec -i chicken_king_db sh -c 'MYSQL_PWD="password" mysql -uroot chicken_king' < /opt/chicken-king/backend/sql/production_clean_db.sql

# 重启后端服务
docker restart chicken_king_backend
```

### 2. 安全加固（已推送到 GitHub）

#### docker-compose.yml 修改

1. **所有数据库端口仅绑定本地**：
   - MySQL: `127.0.0.1:3306:3306`
   - Redis: `127.0.0.1:6379:6379`
   - Backend: `127.0.0.1:8000:8000`
   - Frontend: `127.0.0.1:5174:80`

2. **添加自动重启策略**：所有服务添加 `restart: unless-stopped`

3. **通过 Nginx 反向代理访问**：外部只能通过 80/443 端口访问

#### 后续建议

1. **修改数据库密码**：
   ```bash
   # 在 .env 中设置强密码
   MYSQL_ROOT_PASSWORD=$(openssl rand -base64 32)
   ```

2. **配置防火墙**：
   ```bash
   # 仅允许 Nginx 访问后端服务
   ufw allow 80/tcp
   ufw allow 443/tcp
   ufw deny 3306/tcp
   ufw deny 6379/tcp
   ufw deny 8000/tcp
   ufw enable
   ```

3. **定期备份数据库**：
   ```bash
   # 添加每日备份定时任务
   0 2 * * * docker exec chicken_king_db sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysqldump -uroot --all-databases | gzip' > /backup/mysql_$(date +\%Y\%m\%d).sql.gz
   ```

4. **安装入侵检测系统**：
   ```bash
   apt install fail2ban
   systemctl enable fail2ban
   systemctl start fail2ban
   ```

## 数据恢复

由于有 `production_clean_db.sql` 初始数据库文件，数据损失仅限于：
- 用户注册数据（可重新注册）
- 比赛报名数据（可重新提交）
- 积分、抽奖等动态数据

**配置数据完整保留**：
- 比赛设置
- 成就定义
- 抽奖奖品
- 积分商城
- 扭蛋配置

## 教训总结

1. ❌ **永远不要将数据库端口暴露到公网**
2. ❌ **永远不要使用弱密码**
3. ✅ **必须配置自动重启策略**
4. ✅ **必须定期备份数据**
5. ✅ **必须使用防火墙限制访问**

## 时间线

- **2025-12-23 07:26** - 勒索软件加密数据库，MySQL 容器被停止
- **2025-12-23 10:00** - 发现后端无法连接数据库
- **2025-12-23 10:15** - 确认勒索软件攻击
- **2025-12-23 10:30** - 修复 docker-compose.yml 安全配置
- **2025-12-23 10:35** - 推送安全修复到 GitHub
- **待执行** - 服务器端恢复数据库

## 额外发现的问题

### 部署脚本 Heredoc 语法错误 (2025-12-23 11:20)

**问题**: deploy.sh 使用 `<< ENVEOF` 生成 .env 文件时,如果密码包含特殊字符(`%`, `*`, `=`, `-`),bash 会将其当作通配符或操作符解析,导致语法错误。脚本会在"生成生产环境配置"步骤后静默失败,不会执行后续的容器重启和数据库迁移。

**症状**:
- 部署日志停在 `[2025-12-23 03:30:50] 启动容器...`
- 没有"重启容器以应用最新代码"日志
- 没有"执行数据库迁移"日志
- 强密码被重置为 `password`

**根本原因**:
```bash
# 错误的写法 - bash 会解析特殊字符
cat > .env << ENVEOF
MYSQL_ROOT_PASSWORD=$MYSQL_ROOT_PASSWORD  # 如果密码是 pj72-i4sQ-nA%bGD=svmZ*c9tA7%
ENVEOF                                     # bash 会尝试解析 %, *, = 等特殊字符
```

**修复方法**:
1. 使用带引号的 heredoc (`<< 'ENVEOF'`) 防止变量展开
2. 用占位符 `__MYSQL_ROOT_PASSWORD__` 在模板中
3. 使用 `sed` 安全替换密码,使用 `@` 作为分隔符避免冲突

```bash
# 正确的写法
cat > .env << 'ENVEOF'
MYSQL_ROOT_PASSWORD=__MYSQL_ROOT_PASSWORD__
ENVEOF
sed -i.bak "s@__MYSQL_ROOT_PASSWORD__@${MYSQL_ROOT_PASSWORD}@g" .env
```

**提交**: `cdf26c9` - fix: 修复部署脚本密码特殊字符处理问题

### 脚本自动重载失败 - Docker 卷挂载实时同步问题 (2025-12-23 12:00)

**问题**: 使用 `md5sum "$0"` 在 git pull 前后对比脚本变化时,由于 Docker 卷挂载的实时同步特性,两次计算的都是**更新后的文件**,导致校验和始终相同,自动重载永远不会触发。

**根本原因**:
1. Webhook 容器挂载: `宿主机 /opt/chicken-king/deploy/webhook/deploy.sh` → `容器内 /webhook/deploy.sh`
2. 脚本在容器内执行时 `$0 = /webhook/deploy.sh`
3. `git reset --hard` 更新宿主机文件后,挂载点**立即同步**
4. 在同一个 bash 进程内,`md5sum "$0"` 在 git 前后计算的都是新文件

**错误的方法**:
```bash
CHECKSUM_BEFORE=$(md5sum "$0")  # ← 计算的是即将被更新的文件
git reset --hard origin/main     # ← 文件被更新
CHECKSUM_AFTER=$(md5sum "$0")   # ← 由于挂载同步,计算的也是新文件!
# 结果: BEFORE == AFTER (都是新文件的校验和)
```

**正确的方法**:
使用 git log 对比脚本的提交历史,而不是文件内容:
```bash
# 记录当前脚本的最后提交 hash
BEFORE=$(git log -1 --format=%H -- deploy/webhook/deploy.sh)
git reset --hard origin/main
AFTER=$(git log -1 --format=%H -- deploy/webhook/deploy.sh)

if [ "$BEFORE" != "$AFTER" ]; then
    exec bash "$0" "$@"  # 重新执行
fi
```

**提交**: 待提交

## 行动清单

- [x] 分析攻击原因
- [x] 修复 docker-compose.yml 安全问题
- [x] 推送到 GitHub
- [x] 发现并修复部署脚本 heredoc 语法问题
- [ ] 等待下次自动部署验证修复
- [ ] 服务器删除被污染数据卷
- [ ] 服务器重新部署安全配置
- [ ] 服务器导入干净数据
- [ ] 修改所有数据库密码为强密码
- [ ] 配置防火墙
- [ ] 设置定期备份
- [ ] 安装入侵检测系统
