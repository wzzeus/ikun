"""
API v1 路由汇总
"""
from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth, contest, submission, vote, user, registration,
    github, cheer, quota, achievement, points, lottery, prediction, admin,
    review_center, announcement, exchange, task, slot_machine, gacha, puzzle
)

router = APIRouter()

router.include_router(auth.router, prefix="/auth", tags=["认证"])
router.include_router(user.router, prefix="/users", tags=["用户"])
router.include_router(contest.router, prefix="/contests", tags=["比赛"])
router.include_router(submission.router, prefix="/submissions", tags=["作品"])
router.include_router(vote.router, prefix="/votes", tags=["投票"])
router.include_router(registration.router, tags=["报名"])
router.include_router(github.router, tags=["GitHub统计"])
router.include_router(cheer.router, tags=["打气互动"])
router.include_router(quota.router, tags=["额度消耗"])
router.include_router(achievement.router, tags=["成就系统"])
router.include_router(points.router, prefix="/points", tags=["积分系统"])
router.include_router(lottery.router, prefix="/lottery", tags=["抽奖系统"])
router.include_router(prediction.router, prefix="/prediction", tags=["竞猜系统"])
router.include_router(admin.router, prefix="/admin", tags=["管理后台"])
router.include_router(review_center.router, prefix="/review-center", tags=["评审中心"])
router.include_router(announcement.router, prefix="/announcements", tags=["公告系统"])
router.include_router(exchange.router, prefix="/exchange", tags=["积分兑换"])
router.include_router(gacha.router, prefix="/gacha", tags=["扭蛋机"])
router.include_router(task.router, prefix="/tasks", tags=["任务系统"])
router.include_router(slot_machine.router, prefix="/slot-machine", tags=["老虎机"])
router.include_router(puzzle.router, prefix="/puzzle", tags=["码神挑战"])
