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

    # 数据库配置 (MySQL)
    DATABASE_URL: str = "mysql+aiomysql://root:password@localhost:3306/chicken_king"

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

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
