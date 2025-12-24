"""
作品部署 Worker

功能:
- 消费 Redis 队列中的提交
- 拉取镜像并启动容器
- 驱动提交状态流转并回写日志
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
from dataclasses import dataclass
from typing import Optional

import docker
import httpx
from docker.errors import NotFound
from docker.types import LogConfig
from sqlalchemy import select

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.core.redis import close_redis, get_redis
from app.models.project import Project
from app.models.project_submission import ProjectSubmission, ProjectSubmissionStatus
from app.services.project_domain import build_project_domain

logger = logging.getLogger(__name__)


def _build_status_payload(
    status: ProjectSubmissionStatus,
    message: Optional[str] = None,
    error_code: Optional[str] = None,
    log_append: Optional[str] = None,
    domain: Optional[str] = None,
) -> dict:
    """构造状态回写 payload"""
    payload: dict = {
        "status": status.value,
    }
    if message:
        payload["status_message"] = message
    if error_code:
        payload["error_code"] = error_code
    if log_append:
        payload["log_append"] = log_append
    if domain:
        payload["domain"] = domain
    return payload


def _build_status_url(submission_id: int) -> str:
    """构建状态回写 URL"""
    base = settings.WORKER_API_BASE_URL.rstrip("/")
    return f"{base}{settings.API_V1_PREFIX}/project-submissions/{submission_id}/status"


async def _update_status(
    client: httpx.AsyncClient,
    submission_id: int,
    payload: dict,
) -> None:
    """调用状态回写接口"""
    if not settings.WORKER_API_TOKEN:
        raise RuntimeError("WORKER_API_TOKEN 未配置，无法回写状态")

    headers = {"X-Worker-Token": settings.WORKER_API_TOKEN}
    url = _build_status_url(submission_id)
    response = await client.patch(url, json=payload, headers=headers, timeout=10.0)
    if response.status_code >= 400:
        raise RuntimeError(f"状态回写失败: {response.status_code} {response.text}")


async def _safe_update_status(
    client: httpx.AsyncClient,
    submission_id: int,
    payload: dict,
) -> None:
    """安全回写状态，失败仅记录日志"""
    try:
        await _update_status(client, submission_id, payload)
    except Exception as exc:
        logger.error("状态回写失败: submission_id=%s, error=%s", submission_id, exc)


@dataclass(frozen=True)
class QueueJob:
    """队列任务"""
    action: str
    submission_id: int


def _parse_queue_item(raw_value: bytes) -> Optional[QueueJob]:
    """解析队列消息"""
    if raw_value is None:
        return None

    text = raw_value.decode(errors="ignore") if isinstance(raw_value, (bytes, bytearray)) else str(raw_value)
    text = text.strip()
    if not text:
        return None

    try:
        return QueueJob(action="deploy", submission_id=int(text))
    except ValueError:
        pass

    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        logger.warning("无效的队列消息: %s", text)
        return None

    if not isinstance(data, dict):
        logger.warning("无效的队列消息: %s", text)
        return None

    action = str(data.get("action", "")).lower()
    submission_id = data.get("submission_id")
    try:
        submission_id = int(submission_id)
    except (TypeError, ValueError):
        logger.warning("无效的提交ID: %s", submission_id)
        return None

    if action not in {"deploy", "stop"}:
        logger.warning("未知队列动作: %s", action)
        return None

    return QueueJob(action=action, submission_id=submission_id)


@dataclass(frozen=True)
class DeployTarget:
    """部署目标信息"""
    submission_id: int
    project_id: int
    image_ref: str
    domain: str
    current_submission_id: Optional[int]


async def _load_deploy_target(submission_id: int) -> DeployTarget:
    """加载部署信息"""
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(ProjectSubmission, Project.current_submission_id)
            .join(Project, Project.id == ProjectSubmission.project_id)
            .where(ProjectSubmission.id == submission_id)
        )
        row = result.first()

    if not row:
        raise RuntimeError("提交记录不存在")

    submission = row[0]
    current_submission_id = row[1]
    if not submission.image_ref:
        raise RuntimeError("提交缺少镜像引用")

    return DeployTarget(
        submission_id=submission.id,
        project_id=submission.project_id,
        image_ref=submission.image_ref,
        domain=build_project_domain(submission_id),
        current_submission_id=current_submission_id,
    )


def _docker_client() -> docker.DockerClient:
    """创建 Docker 客户端"""
    return docker.DockerClient(base_url=settings.WORKER_DOCKER_HOST)


def _resolve_deploy_network(client: docker.DockerClient) -> Optional[str]:
    """解析部署网络"""
    if settings.WORKER_DEPLOY_NETWORK:
        try:
            client.networks.get(settings.WORKER_DEPLOY_NETWORK)
        except NotFound:
            logger.warning("部署网络不存在: %s", settings.WORKER_DEPLOY_NETWORK)
            return None
        return settings.WORKER_DEPLOY_NETWORK

    container_id = os.environ.get("HOSTNAME")
    if not container_id:
        return None

    try:
        container = client.containers.get(container_id)
    except NotFound:
        return None

    networks = container.attrs.get("NetworkSettings", {}).get("Networks") or {}
    if not networks:
        return None
    return next(iter(networks.keys()))


def _build_container_name(submission_id: int) -> str:
    """生成容器名"""
    return f"project-{submission_id}"


def _build_container_labels(
    target: DeployTarget,
    network_name: Optional[str],
) -> dict:
    """生成容器标签"""
    router_name = f"project-{target.submission_id}"
    labels = {
        "traefik.enable": "true",
        f"traefik.http.routers.{router_name}.rule": f"Host(`{target.domain}`)",
        f"traefik.http.routers.{router_name}.entrypoints": "web",
        f"traefik.http.services.{router_name}.loadbalancer.server.port": str(settings.WORKER_PROJECT_PORT),
        "com.ikuncode.project_submission_id": str(target.submission_id),
        "com.ikuncode.project_id": str(target.project_id),
    }
    if network_name:
        labels["traefik.docker.network"] = network_name
    return labels


def _remove_container_if_exists(client: docker.DockerClient, container_name: str) -> None:
    """删除已有同名容器"""
    try:
        container = client.containers.get(container_name)
    except NotFound:
        return
    container.remove(force=True)


def _docker_pull_sync(image_ref: str) -> None:
    client = _docker_client()
    try:
        client.images.pull(image_ref)
    finally:
        client.close()


async def _docker_pull(image_ref: str) -> None:
    """拉取镜像"""
    await asyncio.to_thread(_docker_pull_sync, image_ref)


def _start_container_sync(target: DeployTarget) -> str:
    client = _docker_client()
    try:
        network_name = _resolve_deploy_network(client)
        if not network_name:
            raise RuntimeError("未检测到部署网络，请配置 WORKER_DEPLOY_NETWORK")

        container_name = _build_container_name(target.submission_id)
        _remove_container_if_exists(client, container_name)

        log_config = LogConfig(
            type="json-file",
            config={
                "max-size": settings.WORKER_CONTAINER_LOG_MAX_SIZE,
                "max-file": str(settings.WORKER_CONTAINER_LOG_MAX_FILE),
            },
        )

        run_kwargs = {
            "name": container_name,
            "detach": True,
            "environment": {"PORT": str(settings.WORKER_PROJECT_PORT)},
            "labels": _build_container_labels(target, network_name),
            "read_only": True,
            "cap_drop": ["ALL"],
            "security_opt": ["no-new-privileges:true"],
            "tmpfs": {"/tmp": "rw,noexec,nosuid,size=64m"},
            "mem_limit": settings.WORKER_CONTAINER_MEMORY_LIMIT,
            "pids_limit": settings.WORKER_CONTAINER_PIDS_LIMIT,
            "restart_policy": {"Name": "unless-stopped"},
            "log_config": log_config,
        }
        if network_name:
            run_kwargs["network"] = network_name

        cpu_limit = settings.WORKER_CONTAINER_CPU_LIMIT
        if cpu_limit > 0:
            run_kwargs["nano_cpus"] = int(cpu_limit * 1_000_000_000)

        client.containers.run(target.image_ref, **run_kwargs)
        return container_name
    finally:
        client.close()


async def _start_container(target: DeployTarget) -> str:
    """启动容器"""
    return await asyncio.to_thread(_start_container_sync, target)


def _remove_container_sync(container_name: str) -> None:
    client = _docker_client()
    try:
        _remove_container_if_exists(client, container_name)
    finally:
        client.close()


async def _remove_container(container_name: str) -> None:
    """删除容器"""
    await asyncio.to_thread(_remove_container_sync, container_name)


async def _health_check(client: httpx.AsyncClient, container_name: str) -> bool:
    """健康检查（可选）"""
    if not settings.WORKER_HEALTHCHECK_ENABLED:
        return True

    url = f"http://{container_name}:{settings.WORKER_PROJECT_PORT}{settings.WORKER_HEALTHCHECK_PATH}"
    for _ in range(settings.WORKER_HEALTHCHECK_RETRY):
        try:
            response = await client.get(url, timeout=settings.WORKER_HEALTHCHECK_TIMEOUT_SECONDS)
            if response.status_code == 200:
                return True
        except httpx.HTTPError:
            pass
        await asyncio.sleep(settings.WORKER_HEALTHCHECK_INTERVAL_SECONDS)
    return False


async def _cleanup_old_container(current_id: Optional[int], new_id: int) -> None:
    """清理旧版本容器"""
    if not current_id or current_id == new_id:
        return
    container_name = _build_container_name(current_id)
    try:
        await _remove_container(container_name)
    except Exception as exc:
        logger.warning("清理旧容器失败: container=%s, error=%s", container_name, exc)


async def _stop_submission(submission_id: int) -> None:
    """停止运行中的容器"""
    container_name = _build_container_name(submission_id)
    try:
        await _remove_container(container_name)
        logger.info("已停止容器: submission_id=%s", submission_id)
    except Exception as exc:
        logger.warning("停止容器失败: submission_id=%s, error=%s", submission_id, exc)


async def _process_submission(client: httpx.AsyncClient, submission_id: int) -> None:
    """处理单个提交"""
    container_name = _build_container_name(submission_id)
    target = await _load_deploy_target(submission_id)

    try:
        await _update_status(
            client,
            submission_id,
            _build_status_payload(
                status=ProjectSubmissionStatus.PULLING,
                message="拉取镜像中",
                log_append=f"开始拉取镜像: {target.image_ref}",
            ),
        )
        await _docker_pull(target.image_ref)

        await _update_status(
            client,
            submission_id,
            _build_status_payload(
                status=ProjectSubmissionStatus.DEPLOYING,
                message="部署中",
                log_append="创建容器并接入网关",
            ),
        )
        await _start_container(target)

        await _update_status(
            client,
            submission_id,
            _build_status_payload(
                status=ProjectSubmissionStatus.HEALTHCHECKING,
                message="健康检查中",
                log_append="开始健康检查",
            ),
        )

        ok = await _health_check(client, container_name)
        if not ok:
            raise RuntimeError("健康检查失败")

        await _update_status(
            client,
            submission_id,
            _build_status_payload(
                status=ProjectSubmissionStatus.ONLINE,
                message="上线成功",
                log_append="健康检查通过，已上线",
                domain=target.domain,
            ),
        )
        await _cleanup_old_container(target.current_submission_id, submission_id)
    except Exception as exc:
        logger.warning("提交处理失败: submission_id=%s, error=%s", submission_id, exc)
        try:
            await _remove_container(container_name)
        except Exception as cleanup_exc:
            logger.warning("容器清理失败: container=%s, error=%s", container_name, cleanup_exc)
        await _safe_update_status(
            client,
            submission_id,
            _build_status_payload(
                status=ProjectSubmissionStatus.FAILED,
                message="部署失败",
                error_code="worker_failed",
                log_append=f"部署失败: {exc}\n已执行清理",
            ),
        )


async def _worker_loop() -> None:
    """Worker 主循环"""
    if not settings.WORKER_API_TOKEN:
        logger.error("WORKER_API_TOKEN 未配置，Worker 无法回写状态")
        return

    redis_client = None
    try:
        redis_client = await get_redis()
        async with httpx.AsyncClient() as client:
            while True:
                item = await redis_client.blpop(
                    settings.WORKER_QUEUE_KEY,
                    timeout=settings.WORKER_QUEUE_BLOCK_SECONDS,
                )
                if not item:
                    continue

                _, raw_value = item
                job = _parse_queue_item(raw_value)
                if not job:
                    continue

                if job.action == "deploy":
                    await _process_submission(client, job.submission_id)
                elif job.action == "stop":
                    await _stop_submission(job.submission_id)
    finally:
        await close_redis(redis_client)


def main() -> None:
    """启动入口"""
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    asyncio.run(_worker_loop())


if __name__ == "__main__":
    main()
