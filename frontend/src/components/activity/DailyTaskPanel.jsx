import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  CheckCircle2,
  Gift,
  Flame,
  Calendar,
  Target,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Coins,
  Sparkles,
  Award,
  Zap,
  TrendingUp,
  Trophy,
  Star,
} from 'lucide-react'
import { useToast } from '../Toast'
import { taskApi, achievementApi } from '../../services'
import { getTaskGuidePath, canNavigateToGuide } from '../../utils/taskGuide'

// 任务类型图标映射
const TASK_ICONS = {
  SIGNIN: Calendar,
  BROWSE_PROJECT: Target,
  CHEER: Flame,
  VOTE: TrendingUp,
  COMMENT: Award,
  PREDICTION: Zap,
  LOTTERY: Gift,
  GACHA: Sparkles,
  EXCHANGE: Coins,
  CHAIN_BONUS: Trophy,
}

// 任务类型颜色（紧凑版用背景色）
const TASK_BG_COLORS = {
  SIGNIN: 'bg-green-500',
  BROWSE_PROJECT: 'bg-blue-500',
  CHEER: 'bg-orange-500',
  VOTE: 'bg-purple-500',
  COMMENT: 'bg-indigo-500',
  PREDICTION: 'bg-yellow-500',
  LOTTERY: 'bg-pink-500',
  GACHA: 'bg-violet-500',
  EXCHANGE: 'bg-amber-500',
  CHAIN_BONUS: 'bg-gradient-to-r from-yellow-500 to-orange-500',
}

// 紧凑任务项
function CompactTaskItem({ item, onClaim, claiming, onNavigate }) {
  const { task, progress } = item
  const Icon = TASK_ICONS[task.task_type] || Target
  const bgColor = TASK_BG_COLORS[task.task_type] || 'bg-slate-500'

  const currentCount = progress?.progress_value || 0
  const targetCount = progress?.target_value || task.target_value || 1
  const progressPercent = progress?.progress_percent || 0
  const isCompleted = progress?.is_completed || false
  const isClaimed = progress?.is_claimed || false

  // 使用共享函数判断是否可跳转
  const canNavigate = canNavigateToGuide({
    taskType: task.task_type,
    isCompleted,
    isClaimed,
  })
  const guidePath = getTaskGuidePath(task.task_type)

  const handleClick = () => {
    if (canNavigate && onNavigate && guidePath) {
      onNavigate(guidePath, task.name || task.task_type)
    }
  }

  const handleKeyDown = (e) => {
    if (canNavigate && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault()
      handleClick()
    }
  }

  return (
    <div
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role={canNavigate ? 'button' : undefined}
      tabIndex={canNavigate ? 0 : undefined}
      className={`relative flex items-center gap-2 p-2 rounded-lg transition-all ${
        isClaimed
          ? 'bg-slate-100 dark:bg-slate-800/50 opacity-50'
          : isCompleted
          ? 'bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 ring-1 ring-yellow-300 dark:ring-yellow-700'
          : 'bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700/80'
      } ${canNavigate ? 'cursor-pointer hover:ring-1 hover:ring-blue-300 dark:hover:ring-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500' : ''}`}
    >
      {/* 图标 */}
      <div className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${bgColor}`}>
        <Icon className="w-3.5 h-3.5 text-white" />
      </div>

      {/* 任务名称和进度 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={`text-xs font-medium truncate ${
            isClaimed ? 'text-slate-400' : 'text-slate-700 dark:text-slate-200'
          }`}>
            {task.name}
          </span>
          {isChainBonus && (
            <span className="px-1 py-0.5 text-[9px] font-bold bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded">
              BONUS
            </span>
          )}
        </div>
        {/* 进度条 */}
        <div className="flex items-center gap-1.5 mt-0.5">
          <div className="flex-1 h-1 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
            <div
              className={`h-full ${bgColor} rounded-full transition-all duration-300`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-400 whitespace-nowrap">
            {currentCount}/{targetCount}
          </span>
        </div>
      </div>

      {/* 领取按钮/状态 */}
      <div className="flex-shrink-0 flex items-center gap-1">
        {isClaimed ? (
          <CheckCircle2 className="w-4 h-4 text-green-500" />
        ) : isCompleted ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onClaim(task.id)
            }}
            disabled={claiming}
            className="flex items-center gap-0.5 px-2 py-1 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white rounded text-[10px] font-medium transition-all disabled:opacity-50"
          >
            {claiming ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : (
              <>
                <Gift className="w-3 h-3" />
                <span>+{task.reward_points}</span>
              </>
            )}
          </button>
        ) : canNavigate ? (
          <div className="flex items-center gap-1 text-blue-500">
            <span className="text-[10px]">+{task.reward_points}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        ) : (
          <span className="text-[10px] text-slate-400">+{task.reward_points}</span>
        )}
      </div>
    </div>
  )
}

// 成就进度项
function AchievementProgress({ achievement, onClaim, claiming }) {
  if (!achievement) return null

  const { key, name, icon, progress, target, unlocked, claimed, reward_points } = achievement
  const progressPercent = target > 0 ? Math.min(100, (progress / target) * 100) : 0

  return (
    <div
      className={`flex items-center gap-2 p-2 rounded-lg transition-all ${
        claimed
          ? 'bg-slate-100 dark:bg-slate-800/50 opacity-50'
          : unlocked
          ? 'bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 ring-1 ring-purple-300 dark:ring-purple-700'
          : 'bg-slate-50 dark:bg-slate-800/80'
      }`}
    >
      {/* 图标 */}
      <div className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
        <span className="text-sm">{icon || '🏆'}</span>
      </div>

      {/* 名称和进度 */}
      <div className="flex-1 min-w-0">
        <span className={`text-xs font-medium truncate block ${
          claimed ? 'text-slate-400' : 'text-slate-700 dark:text-slate-200'
        }`}>
          {name}
        </span>
        <div className="flex items-center gap-1.5 mt-0.5">
          <div className="flex-1 h-1 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-400 whitespace-nowrap">
            {progress}/{target}
          </span>
        </div>
      </div>

      {/* 状态 */}
      <div className="flex-shrink-0">
        {claimed ? (
          <CheckCircle2 className="w-4 h-4 text-green-500" />
        ) : unlocked ? (
          <button
            onClick={() => onClaim(key)}
            disabled={claiming}
            className="flex items-center gap-0.5 px-2 py-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded text-[10px] font-medium transition-all disabled:opacity-50"
          >
            {claiming ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : (
              <>
                <Star className="w-3 h-3" />
                <span>+{reward_points}</span>
              </>
            )}
          </button>
        ) : (
          <span className="text-[10px] text-slate-400">+{reward_points}</span>
        )}
      </div>
    </div>
  )
}

// 骨架屏
function TaskSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-2">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-2 p-2 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse">
          <div className="w-7 h-7 bg-slate-200 dark:bg-slate-700 rounded-lg" />
          <div className="flex-1">
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-16 mb-1" />
            <div className="h-1 bg-slate-200 dark:bg-slate-700 rounded w-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

// 任务面板主组件
export default function DailyTaskPanel({ onBalanceUpdate }) {
  const toast = useToast()
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)
  const [dailyData, setDailyData] = useState(null)
  const [weeklyData, setWeeklyData] = useState(null)
  const [achievements, setAchievements] = useState([])
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState(null)
  const [claimingAchievement, setClaimingAchievement] = useState(null)

  // 加载数据
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [daily, weekly, achievementsData] = await Promise.all([
        taskApi.getMyTasks('DAILY'),
        taskApi.getMyTasks('WEEKLY'),
        achievementApi.getMyAchievements().catch(() => ({ achievements: [] })),
      ])
      setDailyData(daily)
      setWeeklyData(weekly)

      // 筛选进行中的成就（未领取且有进度的）
      const inProgressAchievements = (achievementsData.achievements || [])
        .filter(a => !a.claimed && a.progress > 0)
        .sort((a, b) => {
          // 优先显示可领取的
          if (a.unlocked && !b.unlocked) return -1
          if (!a.unlocked && b.unlocked) return 1
          // 然后按进度百分比排序
          const aPercent = a.target > 0 ? a.progress / a.target : 0
          const bPercent = b.target > 0 ? b.progress / b.target : 0
          return bPercent - aPercent
        })
        .slice(0, 4) // 最多显示4个
      setAchievements(inProgressAchievements)
    } catch (err) {
      console.error('加载任务失败:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // 领取任务奖励
  const handleClaimTask = async (taskId) => {
    if (claiming) return
    setClaiming(taskId)
    try {
      const result = await taskApi.claimReward(taskId)
      toast.success(`领取成功！+${result.reward_points || 0} 积分`)
      await loadData()
      onBalanceUpdate?.()
    } catch (err) {
      toast.error(err.response?.data?.detail || '领取失败')
    } finally {
      setClaiming(null)
    }
  }

  // 领取成就奖励
  const handleClaimAchievement = async (key) => {
    if (claimingAchievement) return
    setClaimingAchievement(key)
    try {
      const result = await achievementApi.claimAchievement(key)
      toast.success(`成就达成！+${result.reward_points || 0} 积分`)
      await loadData()
      onBalanceUpdate?.()
    } catch (err) {
      toast.error(err.response?.data?.detail || '领取失败')
    } finally {
      setClaimingAchievement(null)
    }
  }

  // 跳转到任务引导页
  const handleNavigate = useCallback((path, taskName) => {
    toast.info(`前往完成「${taskName}」`)
    navigate(path)
  }, [navigate, toast])

  // 计算统计
  const dailyStats = dailyData?.stats || { total: 0, completed: 0, claimed: 0 }
  const weeklyStats = weeklyData?.stats || { total: 0, completed: 0, claimed: 0 }
  const dailyItems = dailyData?.items || []
  const weeklyItems = weeklyData?.items || []

  // 可领取数量
  const claimableDaily = dailyItems.filter(i => i.progress?.is_completed && !i.progress?.is_claimed).length
  const claimableWeekly = weeklyItems.filter(i => i.progress?.is_completed && !i.progress?.is_claimed).length
  const claimableAchievements = achievements.filter(a => a.unlocked && !a.claimed).length
  const totalClaimable = claimableDaily + claimableWeekly + claimableAchievements

  // 总可得积分
  const totalDailyRewards = dailyItems.reduce((sum, item) => sum + (item.task?.reward_points || 0), 0)
  const claimedDailyRewards = dailyItems
    .filter(item => item.progress?.is_claimed)
    .reduce((sum, item) => sum + (item.task?.reward_points || 0), 0)

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      {/* 可折叠头部 */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl">
            <Target className="w-4 h-4 text-white" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">每日任务</h3>
              {totalClaimable > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded-full animate-pulse">
                  {totalClaimable}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              已领 {claimedDailyRewards}/{totalDailyRewards} 积分 · {dailyStats.claimed}/{dailyStats.total} 任务
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              loadData()
            }}
            disabled={loading}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </button>

      {/* 可折叠内容 */}
      {expanded && (
        <div className="px-3 pb-3 space-y-3">
          {loading ? (
            <TaskSkeleton />
          ) : (
            <>
              {/* 每日任务 - 双列网格 */}
              {dailyItems.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">每日</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {dailyItems.map((item) => (
                      <CompactTaskItem
                        key={item.task.id}
                        item={item}
                        onClaim={handleClaimTask}
                        claiming={claiming === item.task.id}
                        onNavigate={handleNavigate}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* 每周任务 */}
              {weeklyItems.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <TrendingUp className="w-3 h-3 text-slate-400" />
                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">每周</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {weeklyItems.map((item) => (
                      <CompactTaskItem
                        key={item.task.id}
                        item={item}
                        onClaim={handleClaimTask}
                        claiming={claiming === item.task.id}
                        onNavigate={handleNavigate}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* 成就进度 */}
              {achievements.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <Award className="w-3 h-3 text-slate-400" />
                      <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">成就进度</span>
                    </div>
                    <Link
                      to="/achievements"
                      className="text-[10px] text-blue-500 hover:text-blue-600"
                    >
                      查看全部
                    </Link>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {achievements.map((achievement) => (
                      <AchievementProgress
                        key={achievement.key}
                        achievement={achievement}
                        onClaim={handleClaimAchievement}
                        claiming={claimingAchievement === achievement.key}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* 空状态 */}
              {dailyItems.length === 0 && weeklyItems.length === 0 && achievements.length === 0 && (
                <div className="text-center py-6">
                  <Target className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">暂无可用任务</p>
                </div>
              )}

              {/* 完成提示 */}
              {totalClaimable > 0 && (
                <div className="p-2 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-yellow-500" />
                    <span className="text-xs font-medium text-yellow-700 dark:text-yellow-400">
                      有 {totalClaimable} 个奖励待领取！
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* 折叠时显示快捷领取按钮 */}
      {!expanded && totalClaimable > 0 && (
        <div className="px-3 pb-3">
          <button
            onClick={() => setExpanded(true)}
            className="w-full py-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all"
          >
            <Gift className="w-4 h-4" />
            领取 {totalClaimable} 个奖励
          </button>
        </div>
      )}
    </div>
  )
}
