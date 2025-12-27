# 鸡王争霸赛 - ikuncode 开发者实战大赏

> 第一届 ikuncode "鸡王争霸赛" 活动平台
>
> 你干嘛～ 嗨嗨哟～

## 功能特性

- **本地账号** - 注册/登录/找回密码
- **第三方登录/绑定** - Linux.do / GitHub OAuth
- **账号安全** - 修改/设置密码、绑定冲突提示
- **比赛报名** - 选手报名与审核
- **作品提交** - 支持附件上传
- **投票系统** - 为喜欢的作品投票
- **积分系统** - 签到、抽奖、扭蛋、刮刮乐、老虎机
- **竞猜市场** - 用积分下注，赢取奖励
- **积分商城** - 兑换抽奖券等道具
- **应援系统** - 为选手打气加油
- **成就系统** - 解锁徽章与成就
- **彩蛋系统** - 神秘兑换码
- **排行榜** - 人气榜、积分榜
- **管理后台** - 比赛管理、用户管理
- **评审中心** - 评委评审作品
- **数据统计** - Umami 网站分析

## 项目结构

```
鸡王争霸赛/
├── frontend/              # React 前端
│   ├── src/
│   │   ├── components/    # 组件库
│   │   │   └── activity/  # 活动组件（扭蛋、刮刮乐等）
│   │   ├── pages/         # 页面
│   │   ├── services/      # API 服务
│   │   ├── stores/        # Zustand 状态管理
│   │   └── utils/         # 工具函数（含 analytics）
│   └── package.json
│
├── backend/               # FastAPI 后端
│   ├── app/
│   │   ├── api/v1/        # API 路由
│   │   ├── core/          # 核心配置
│   │   ├── models/        # SQLAlchemy 模型
│   │   └── services/      # 业务逻辑
│   ├── sql/               # 数据库迁移脚本
│   └── requirements.txt
│
├── deploy/                # 部署脚本与 Webhook 服务
│   └── webhook/           # GitHub Webhook 自动部署
├── nginx/                 # Nginx 生产反代
├── docs/                  # 项目文档
├── docker-compose.yml     # 本地开发编排
├── docker-compose.prod.yml # 生产环境编排
└── .env.production.example # 生产环境变量模板
```

## 技术栈

### 前端
| 技术 | 用途 |
|------|------|
| React 18 + Vite | 框架 |
| Tailwind CSS | 样式 |
| React Router | 路由 |
| Zustand | 状态管理 |
| TanStack Query | 数据请求 |
| Lucide React | 图标 |

### 后端
| 技术 | 用途 |
|------|------|
| FastAPI | Web 框架 |
| SQLAlchemy Async | ORM |
| MySQL 8.0 | 数据库 |
| Redis | 缓存 |
| APScheduler | 定时任务 |
| JWT | 认证 |

### 运维
| 技术 | 用途 |
|------|------|
| Docker Compose | 容器编排 |
| Umami | 网站统计分析 |

## 快速开始

### 环境要求
- Node.js 18+
- Python 3.10+
- MySQL 8.0
- Redis
- Docker (可选)

### 1. 数据库初始化

```bash
# 创建数据库并执行迁移
mysql -u root -proot -P 3306 < backend/sql/schema.sql
mysql -u root -proot -P 3306 chicken_king < backend/sql/002_github_and_cheer.sql
# ... 依次执行到最新的迁移脚本
```

### 2. 后端启动

```bash
cd backend

# 创建虚拟环境
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt

# 配置环境变量
cp .env.example .env
# 编辑 .env 填写配置

# 启动服务
uvicorn app.main:app --reload
```

访问 API 文档：http://localhost:8000/docs

### 3. 前端启动

```bash
cd frontend

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 填写配置

# 启动开发服务器
npm run dev
```

访问：http://127.0.0.1:5173

### 4. Docker 一键启动

```bash
# 复制环境变量模板到项目根目录（Docker Compose 会读取此 .env）
cp .env.production.example .env
# 编辑 .env 填写真实配置（如 MySQL/SECRET_KEY/OAuth 等）

docker-compose up -d
```

生产环境可使用（与自动部署保持一致）：

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

> 说明：生产环境只使用 `docker-compose.prod.yml`，避免与开发配置互相覆盖。
> `.env` 由 Compose 自动读取并注入到容器中，`DATABASE_URL/REDIS_URL` 由 Compose 组合生成，无需在 `.env` 中重复填写。
> 后端容器启动时会自动执行迁移（`AUTO_MIGRATE=true`）。

> 生产环境建议使用 GitHub Webhook 自动部署，详见 `docs/AUTO_DEPLOY.md`。

## 网站统计（Umami）

### 部署 Umami

```bash
# 启动 Umami 服务
docker-compose up -d umami umami-db

# 等待 30 秒初始化
docker-compose ps
```

### 配置 Umami

1. 访问 `http://服务器IP:3001`
2. 默认账号：`admin` / `umami`（请立即修改密码）
3. 添加网站，获取 Website ID
4. 配置前端环境变量：

```bash
# frontend/.env
VITE_UMAMI_SCRIPT_URL=http://服务器IP:3001
VITE_UMAMI_WEBSITE_ID=你的网站ID
```

5. 重新构建前端：`npm run build`

### 已集成的统计事件

| 事件 | 说明 |
|------|------|
| `user_login` | 用户登录 |
| `daily_signin` | 每日签到 |
| `lottery_play` | 抽奖/扭蛋/刮刮乐/老虎机 |
| `points_exchange` | 积分兑换 |
| `prediction_bet` | 竞猜下注 |
| `cheer_sent` | 应援打气 |
| `achievement_unlocked` | 成就解锁 |

## 环境变量

### Docker Compose（项目根目录 `.env`）

- 适用于 `docker-compose.yml` / `docker-compose.prod.yml`
- 入口文件：项目根目录 `.env`（可从 `.env.production.example` 复制并填写）
- 由 Compose 注入到 backend/worker 容器
- `DATABASE_URL/REDIS_URL` 已在 Compose 中拼接，无需在 `.env` 里写

### 后端 (`backend/.env`)

> 仅用于本地非 Docker 启动（如 `uvicorn` 直接运行）

```bash
DEBUG=true
SECRET_KEY=your-secret-key
DATABASE_URL=mysql+aiomysql://root:root@localhost:3306/chicken_king
REDIS_URL=redis://localhost:6379/0
FRONTEND_URL=http://127.0.0.1:5173

# Linux.do OAuth
LINUX_DO_CLIENT_ID=xxx
LINUX_DO_CLIENT_SECRET=xxx
LINUX_DO_REDIRECT_URI=http://127.0.0.1:8000/api/v1/auth/linuxdo/callback

# GitHub OAuth (可选)
GITHUB_CLIENT_ID=xxx
GITHUB_CLIENT_SECRET=xxx
GITHUB_TOKEN=xxx
```

> 其他配置项（如 SMTP、触发式安全挑战、上传配额、Worker 等）详见 `backend/.env.example`。

### 前端 (`frontend/.env`)

```bash
VITE_API_URL=http://localhost:8000/api/v1

# Umami 统计（可选）
VITE_UMAMI_SCRIPT_URL=
VITE_UMAMI_WEBSITE_ID=
```

## 常用命令

```bash
# 前端
npm run dev          # 开发模式
npm run build        # 构建生产版本
npm run preview      # 预览生产版本

# 后端
uvicorn app.main:app --reload  # 开发模式
pytest                         # 运行测试
pytest -v tests/test_xxx.py    # 单个测试文件

# Docker
docker-compose up -d                # 启动所有服务
docker-compose up -d umami umami-db # 仅启动 Umami
docker-compose logs -f backend      # 查看后端日志
docker-compose down                 # 停止所有服务
```

## API 模块

| 模块 | 前缀 | 功能 |
|------|------|------|
| auth | `/auth` | 本地注册/登录/刷新/找回密码 + Linux.do/GitHub OAuth 绑定 |
| users | `/users` | 用户信息、成就 |
| contests | `/contests` | 比赛管理 |
| submissions | `/submissions` | 作品提交 |
| votes | `/votes` | 投票 |
| points | `/points` | 积分、签到 |
| lottery | `/lottery` | 抽奖、刮刮乐 |
| prediction | `/prediction` | 竞猜市场 |
| exchange | `/exchange` | 积分商城 |
| easter-egg | `/easter-egg` | 彩蛋兑换 |
| admin | `/admin` | 管理后台 |
| review-center | `/review-center` | 评审中心 |

## 开发规范

- 前端组件使用 PascalCase
- API 路由使用 snake_case
- 提交信息遵循 Conventional Commits
- 新增 API 需在 `app/api/v1/__init__.py` 注册路由
- 数据库变更需编写迁移脚本到 `backend/sql/`

## License

MIT
