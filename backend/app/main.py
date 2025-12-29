"""
鸡王争霸赛 - FastAPI 后端入口
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.rate_limit import limiter, rate_limit_exceeded_handler
from app.api.v1 import router as api_router
from app.services.scheduler import start_scheduler, shutdown_scheduler
from app.middleware import RequestLoggerMiddleware

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 启动时检查关键配置
    _check_security_config()

    # 启动定时任务
    start_scheduler()
    yield
    # 关闭时执行
    shutdown_scheduler()


def _check_security_config():
    """检查安全相关配置"""
    # 检查 SECRET_KEY 是否为默认值
    default_keys = [
        "your-secret-key-change-in-production",
        "your-super-secret-key-change-in-production",
        "changeme",
        "secret",
    ]
    if settings.SECRET_KEY in default_keys:
        if settings.DEBUG:
            logger.warning(
                "⚠️  SECRET_KEY 使用默认值，请在生产环境中修改！"
            )
        else:
            raise RuntimeError(
                "安全错误: SECRET_KEY 不能使用默认值！"
                "请在 .env 文件中设置一个安全的随机密钥。"
                "可使用命令生成: python -c \"import secrets; print(secrets.token_urlsafe(32))\""
            )


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="ikuncode 鸡王争霸赛 API",
    version="1.0.0",
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# 速率限制
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

# 请求日志中间件（记录所有 API 请求）
# 注意：中间件按添加顺序的逆序执行，CORS 需要最后添加以确保最先执行
app.add_middleware(RequestLoggerMiddleware)

# CORS 配置（最后添加，确保最先处理请求）
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """兜底异常处理，避免直接返回 500 堆栈"""
    logger.exception("未捕获异常: %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "服务器内部错误"},
    )


@app.get("/health")
async def health_check():
    """健康检查"""
    return {"status": "ok", "message": "鸡你太美～ API 运行中"}
