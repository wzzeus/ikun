"""
应用配置
"""
from typing import List, Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """应用设置"""

    # 基础配置
    PROJECT_NAME: str = "鸡王争霸赛"
    API_V1_PREFIX: str = "/api/v1"
    DEBUG: bool = True

    # 安全配置
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    RATE_LIMIT_STORAGE_URI: Optional[str] = None  # 为空则回退到 REDIS_URL
    UPLOAD_DAILY_BYTES_LIMIT: int = 3 * 1024 * 1024 * 1024  # 单用户每日上传总量上限（字节）
    SECURITY_CHALLENGE_MODE: str = "off"  # off/monitor/enforce
    SECURITY_CHALLENGE_PROVIDER: str = "pow"  # pow/captcha/js/behavior
    SECURITY_CHALLENGE_THRESHOLD: int = 20  # 触发挑战的请求次数阈值
    SECURITY_CHALLENGE_WINDOW_SECONDS: int = 60  # 统计窗口
    SECURITY_CHALLENGE_TTL_SECONDS: int = 300  # 挑战有效期
    SECURITY_CHALLENGE_PASS_TTL_SECONDS: int = 1800  # 挑战通过后免验证时间
    SECURITY_POW_DIFFICULTY: int = 4  # PoW 前导 0 个数（十六进制）
    CAPTCHA_VERIFY_URL: Optional[str] = None
    CAPTCHA_SECRET_KEY: Optional[str] = None
    CAPTCHA_SITE_KEY: Optional[str] = None
    PASSWORD_RESET_TOKEN_TTL_MINUTES: int = 30  # 忘记密码重置链接有效期（分钟）
    SMTP_HOST: Optional[str] = None  # SMTP 服务器地址
    SMTP_PORT: int = 587  # SMTP 端口
    SMTP_USERNAME: Optional[str] = None  # SMTP 账号
    SMTP_PASSWORD: Optional[str] = None  # SMTP 密码
    SMTP_USE_TLS: bool = True  # 是否启用 STARTTLS
    SMTP_USE_SSL: bool = False  # 是否启用 SSL（如 465 端口）
    SMTP_FROM_EMAIL: Optional[str] = None  # 发件人邮箱
    SMTP_FROM_NAME: Optional[str] = None  # 发件人显示名（可选）
    TRUSTED_PROXY_ENABLED: bool = False  # TODO: 接入 CDN/WAF 后开启
    TRUSTED_PROXY_HEADERS: str = "cf-connecting-ip,x-forwarded-for,x-real-ip"

    # 数据库配置 (MySQL)
    DATABASE_URL: str = "mysql+aiomysql://root:password@localhost:3306/chicken_king?charset=utf8mb4"

    # Redis 配置
    REDIS_URL: str = "redis://localhost:6379/0"

    # CORS 配置
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5175",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://pk.ikuncode.cc",
    ]

    # 前端地址（OAuth 回跳用）
    FRONTEND_URL: str = "http://127.0.0.1:5173"

    # 媒体文件存储
    MEDIA_ROOT: str = "/app/app/uploads/media"

    # GitHub API（用于提高 API 限额，可选）
    GITHUB_TOKEN: Optional[str] = None

    # Linux.do OAuth2
    LINUX_DO_CLIENT_ID: Optional[str] = None
    LINUX_DO_CLIENT_SECRET: Optional[str] = None
    LINUX_DO_AUTHORIZE_URL: str = "https://connect.linux.do/oauth2/authorize"
    LINUX_DO_TOKEN_URL: str = "https://connect.linux.do/oauth2/token"
    LINUX_DO_USERINFO_URL: str = "https://connect.linux.do/api/user"
    LINUX_DO_REDIRECT_URI: Optional[str] = "http://127.0.0.1:8000/api/v1/auth/linuxdo/callback"
    LINUX_DO_SCOPE: str = "read"

    # GitHub OAuth2
    GITHUB_CLIENT_ID: Optional[str] = None
    GITHUB_CLIENT_SECRET: Optional[str] = None
    GITHUB_AUTHORIZE_URL: str = "https://github.com/login/oauth/authorize"
    GITHUB_TOKEN_URL: str = "https://github.com/login/oauth/access_token"
    GITHUB_USERINFO_URL: str = "https://api.github.com/user"
    GITHUB_REDIRECT_URI: Optional[str] = "http://127.0.0.1:8000/api/v1/auth/github/callback"
    GITHUB_SCOPE: str = "read:user user:email"

    # 额度查询配置
    QUOTA_BASE_URLS: List[str] = ["https://api.ikuncode.cc"]  # 支持多个 API 地址
    QUOTA_QUERY_ORDER: List[str] = ["openai", "newapi"]  # 查询策略顺序
    QUOTA_TIMEOUT_SECONDS: float = 10.0
    QUOTA_MAX_CONCURRENCY: int = 10
    QUOTA_CACHE_TTL_OK_SECONDS: int = 60  # 成功结果缓存
    QUOTA_CACHE_TTL_STALE_SECONDS: int = 300  # stale-while-revalidate 窗口
    QUOTA_CACHE_TTL_ERROR_SECONDS: int = 15  # 失败缓存
    QUOTA_CACHE_TTL_AUTH_ERROR_SECONDS: int = 120  # 认证失败缓存
    QUOTA_USAGE_LOOKBACK_DAYS: int = 90  # OpenAI usage 查询天数
    QUOTA_PER_USD: int = 500000  # NewAPI 额度换算比率

    # 选手在线状态配置（基于 API 调用日志）
    ONLINE_STATUS_WINDOW_SECONDS: int = 300  # 5 分钟内有调用视为在线
    ONLINE_STATUS_CACHE_TTL_OK_SECONDS: int = 30  # 成功结果缓存（短期）
    ONLINE_STATUS_CACHE_TTL_STALE_SECONDS: int = 60  # stale-while-revalidate 窗口
    ONLINE_STATUS_CACHE_TTL_ERROR_SECONDS: int = 10  # 失败缓存（更短）

    # 作品部署提交流程配置
    PROJECT_SUBMISSION_COOLDOWN_SECONDS: int = 600  # 每次提交最小间隔
    PROJECT_SUBMISSION_DAILY_LIMIT: int = 10  # 每日提交上限
    WORKER_API_TOKEN: Optional[str] = None  # Worker 状态回写 Token
    WORKER_API_BASE_URL: str = "http://127.0.0.1:8000"  # Worker 回写 API 基址
    WORKER_QUEUE_KEY: str = "project_submissions:queue"  # 提交队列 Key
    WORKER_QUEUE_BLOCK_SECONDS: int = 5  # 阻塞等待队列秒数
    WORKER_STEP_DELAY_SECONDS: int = 2  # 模拟部署每步等待秒数
    WORKER_HEALTHCHECK_ENABLED: bool = False  # 是否启用健康检查
    WORKER_HEALTHCHECK_PATH: str = "/healthz"  # 健康检查路径
    WORKER_HEALTHCHECK_TIMEOUT_SECONDS: int = 5  # 健康检查超时
    WORKER_HEALTHCHECK_RETRY: int = 12  # 健康检查重试次数
    WORKER_HEALTHCHECK_INTERVAL_SECONDS: int = 5  # 健康检查重试间隔
    WORKER_DOCKER_HOST: str = "unix:///var/run/docker.sock"  # Docker 连接地址
    WORKER_DEPLOY_NETWORK: Optional[str] = None  # 部署容器使用的网络（为空则自动探测）
    WORKER_PROJECT_PORT: int = 8080  # 作品容器对内端口
    WORKER_CONTAINER_MEMORY_LIMIT: str = "512m"  # 作品容器内存上限
    WORKER_CONTAINER_CPU_LIMIT: float = 0.5  # 作品容器 CPU 上限（核数）
    WORKER_CONTAINER_PIDS_LIMIT: int = 128  # 作品容器进程数上限
    WORKER_CONTAINER_LOG_MAX_SIZE: str = "10m"  # 作品容器日志单文件上限
    WORKER_CONTAINER_LOG_MAX_FILE: int = 3  # 作品容器日志文件数量

    # 作品访问域名规则
    PROJECT_DOMAIN_SUFFIX: str = "local"  # 作品域名后缀
    PROJECT_DOMAIN_TEMPLATE: str = "project-{submission_id}.{suffix}"  # 域名模板

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
