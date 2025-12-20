import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  CheckCircle2,
  Gift,
  Flame,
  Calendar,
  Target,
  RefreshCw,
  Coins,
  Sparkles,
  Award,
  Zap,
  TrendingUp,
  Trophy,
  Star,
  ChevronLeft,
  ChevronRight,
  Clock,
  Medal,
  ArrowRightLeft,
} from 'lucide-react'
import { useToast } from '../components/Toast'
import { taskApi, achievementApi } from '../services'
import { getTaskGuidePath, canNavigateToGuide } from '../utils/taskGuide'

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

// 任务类型颜色
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

// 任务项组件
function TaskItem({ item, onClaim, claiming, onNavigate }) {
  const { task, progress } = item
  const Icon = TASK_ICONS[task.task_type] || Target
  const bgColor = TASK_BG_COLORS[task.task_type] || 'bg-slate-500'

  const currentCount = progress?.progress_value || 0
  const targetCount = progress?.target_value || task.target_value || 1
  const progressPercent = progress?.progress_percent || 0
  const isCompleted = progress?.is_completed || false
  const isClaimed = progress?.is_claimed || false
  const isChainBonus = task.task_type === 'CHAIN_BONUS'

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
      className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
        isClaimed
          ? 'bg-slate-100 dark:bg-slate-800/50 opacity-60'
          : isCompleted
          ? 'bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 ring-2 ring-yellow-300 dark:ring-yellow-700'
          : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
      } ${canNavigate ? 'cursor-pointer hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500' : ''}`}
    >
      {/* 图标 */}
      <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${bgColor}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>

      {/* 任务信息 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`font-semibold ${
            isClaimed ? 'text-slate-400' : 'text-slate-900 dark:text-white'
          }`}>
            {task.name}
          </span>
          {isChainBonus && (
            <span className="px-2 py-0.5 text-xs font-bold bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded">
              BONUS
            </span>
          )}
        </div>
        {task.description && (
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">{task.description}</p>
        )}
        {/* 进度条 */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
            <div
              className={`h-full ${bgColor} rounded-full transition-all duration-500`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">
            {currentCount}/{targetCount}
          </span>
        </div>
      </div>

      {/* 奖励/领取按钮 */}
      <div className="flex-shrink-0">
        {isClaimed ? (
          <div className="flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <span className="text-sm font-medium text-green-600 dark:text-green-400">已领取</span>
          </div>
        ) : isCompleted ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onClaim(task.id)
            }}
            disabled={claiming}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white rounded-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
          >
            {claiming ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Gift className="w-5 h-5" />
                <span className="font-medium">领取 +{task.reward_points}</span>
              </>
            )}
          </button>
        ) : canNavigate ? (
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
            <span className="text-sm font-medium">去完成</span>
            <ChevronRight className="w-5 h-5" />
          </div>
        ) : (
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
            <Coins className="w-5 h-5 text-yellow-500" />
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">+{task.reward_points}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// 成就进度项
function AchievementItem({ achievement, onClaim, claiming }) {
  if (!achievement) return null

  const { key, name, description, icon, progress, target, unlocked, claimed, reward_points } = achievement
  const progressPercent = target > 0 ? Math.min(100, (progress / target) * 100) : 0

  return (
    <div
      className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
        claimed
          ? 'bg-slate-100 dark:bg-slate-800/50 opacity-60'
          : unlocked
          ? 'bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 ring-2 ring-purple-300 dark:ring-purple-700'
          : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
      }`}
    >
      {/* 图标 */}
      <div className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
        <span className="text-2xl">{icon || '🏆'}</span>
      </div>

      {/* 成就信息 */}
      <div className="flex-1 min-w-0">
        <span className={`font-semibold block mb-1 ${
          claimed ? 'text-slate-400' : 'text-slate-900 dark:text-white'
        }`}>
          {name}
        </span>
        {description && (
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">{description}</p>
        )}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">
            {progress}/{target}
          </span>
        </div>
      </div>

      {/* 状态 */}
      <div className="flex-shrink-0">
        {claimed ? (
          <div className="flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <span className="text-sm font-medium text-green-600 dark:text-green-400">已领取</span>
          </div>
        ) : unlocked ? (
          <button
            onClick={() => onClaim(key)}
            disabled={claiming}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
          >
            {claiming ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Star className="w-5 h-5" />
                <span className="font-medium">领取 +{reward_points}</span>
              </>
            )}
          </button>
        ) : (
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
            <Coins className="w-5 h-5 text-yellow-500" />
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">+{reward_points}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// 骨架屏
function TaskSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl animate-pulse">
          <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-xl" />
          <div className="flex-1">
            <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-32 mb-2" />
            <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded w-full" />
          </div>
          <div className="w-24 h-10 bg-slate-200 dark:bg-slate-700 rounded-lg" />
        </div>
      ))}
    </div>
  )
}

// 徽章兑换项
function BadgeExchangeItem({ badge, onExchange, exchanging }) {
  const tierColors = {
    bronze: 'from-amber-600 to-yellow-700',
    silver: 'from-slate-400 to-slate-500',
    gold: 'from-yellow-400 to-amber-500',
    diamond: 'from-cyan-400 to-blue-500',
    star: 'from-pink-400 to-rose-500',
    king: 'from-red-500 to-orange-500',
  }

  const tierLabels = {
    bronze: '青铜',
    silver: '白银',
    gold: '黄金',
    diamond: '钻石',
    star: '星耀',
    king: '王者',
  }

  return (
    <div className="flex items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
      <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${tierColors[badge.tier] || tierColors.bronze}`}>
        <Medal className="w-6 h-6 text-white" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold text-slate-900 dark:text-white">{badge.name}</span>
          <span className={`px-2 py-0.5 text-xs font-medium rounded bg-gradient-to-r ${tierColors[badge.tier] || tierColors.bronze} text-white`}>
            {tierLabels[badge.tier] || '青铜'}
          </span>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{badge.description}</p>
      </div>

      <button
        onClick={() => onExchange(badge.achievement_key)}
        disabled={exchanging}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
      >
        {exchanging ? (
          <RefreshCw className="w-5 h-5 animate-spin" />
        ) : (
          <>
            <ArrowRightLeft className="w-5 h-5" />
            <span className="font-medium">+{badge.exchange_points}</span>
          </>
        )}
      </button>
    </div>
  )
}

// 主页面
export default function TasksPage() {
  const toast = useToast()
  const navigate = useNavigate()
  const [dailyData, setDailyData] = useState(null)
  const [weeklyData, setWeeklyData] = useState(null)
  const [achievements, setAchievements] = useState([])
  const [exchangeableBadges, setExchangeableBadges] = useState([])
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState(null)
  const [claimingAchievement, setClaimingAchievement] = useState(null)
  const [exchangingBadge, setExchangingBadge] = useState(null)

  // 加载数据
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [daily, weekly, achievementsData, badgesData] = await Promise.all([
        taskApi.getMyTasks('DAILY'),
        taskApi.getMyTasks('WEEKLY'),
        achievementApi.getMyAchievements().catch(() => ({ achievements: [] })),
        achievementApi.getExchangeableBadges().catch(() => ({ items: [] })),
      ])
      setDailyData(daily)
      setWeeklyData(weekly)
      setExchangeableBadges(badgesData.items || [])

      // 筛选进行中的成就（未领取的）
      const inProgressAchievements = (achievementsData.achievements || [])
        .filter(a => !a.claimed && a.progress > 0)
        .sort((a, b) => {
          if (a.unlocked && !b.unlocked) return -1
          if (!a.unlocked && b.unlocked) return 1
          const aPercent = a.target > 0 ? a.progress / a.target : 0
          const bPercent = b.target > 0 ? b.progress / b.target : 0
          return bPercent - aPercent
        })
      setAchievements(inProgressAchievements)
    } catch (err) {
      console.error('加载任务失败:', err)
      toast.error('加载任务失败')
    } finally {
      setLoading(false)
    }
  }, [toast])

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
    } catch (err) {
      toast.error(err.response?.data?.detail || '领取失败')
    } finally {
      setClaimingAchievement(null)
    }
  }

  // 徽章兑换积分
  const handleExchangeBadge = async (achievementKey) => {
    if (exchangingBadge) return
    setExchangingBadge(achievementKey)
    try {
      const result = await achievementApi.exchangeBadge(achievementKey)
      toast.success(result.message || `兑换成功！+${result.points_earned} 积分`)
      await loadData()
    } catch (err) {
      toast.error(err.response?.data?.detail || '兑换失败')
    } finally {
      setExchangingBadge(null)
    }
  }

  // 跳转到任务引导页
  const handleNavigate = useCallback((path, taskName) => {
    toast.info(`前往完成「${taskName}」`)
    navigate(path)
  }, [navigate, toast])

  const dailyStats = dailyData?.stats || { total: 0, completed: 0, claimed: 0 }
  const weeklyStats = weeklyData?.stats || { total: 0, completed: 0, claimed: 0 }
  const dailyItems = dailyData?.items || []
  const weeklyItems = weeklyData?.items || []

  // 计算总可领取
  const claimableDaily = dailyItems.filter(i => i.progress?.is_completed && !i.progress?.is_claimed).length
  const claimableWeekly = weeklyItems.filter(i => i.progress?.is_completed && !i.progress?.is_claimed).length
  const claimableAchievements = achievements.filter(a => a.unlocked && !a.claimed).length
  const totalClaimable = claimableDaily + claimableWeekly + claimableAchievements

  // 计算积分
  const totalDailyRewards = dailyItems.reduce((sum, item) => sum + (item.task?.reward_points || 0), 0)
  const claimedDailyRewards = dailyItems
    .filter(item => item.progress?.is_claimed)
    .reduce((sum, item) => sum + (item.task?.reward_points || 0), 0)

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 头部 */}
        <div className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 mb-4"
          >
            <ChevronLeft className="w-5 h-5" />
            返回首页
          </Link>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl">
                <Target className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">每日任务</h1>
                <p className="text-slate-500 dark:text-slate-400">
                  完成任务获取积分奖励
                </p>
              </div>
            </div>

            <button
              onClick={loadData}
              disabled={loading}
              className="p-3 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-xl">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{dailyStats.claimed}/{dailyStats.total}</p>
                <p className="text-xs text-slate-500">今日已完成</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl">
                <Coins className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{claimedDailyRewards}/{totalDailyRewards}</p>
                <p className="text-xs text-slate-500">已领积分</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-xl">
                <Gift className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalClaimable}</p>
                <p className="text-xs text-slate-500">待领取</p>
              </div>
            </div>
          </div>
        </div>

        {/* 重置时间提示 */}
        {dailyData && (
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-6">
            <Clock className="w-4 h-4" />
            <span>每日任务于 00:00 重置 · 当前周期：{dailyData.period_start}</span>
          </div>
        )}

        {loading ? (
          <TaskSkeleton />
        ) : (
          <div className="space-y-8">
            {/* 每日任务 */}
            {dailyItems.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="w-5 h-5 text-blue-500" />
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">每日任务</h2>
                  <span className="text-sm text-slate-500">({dailyStats.claimed}/{dailyStats.total})</span>
                </div>
                <div className="space-y-3">
                  {dailyItems.map((item) => (
                    <TaskItem
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
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-purple-500" />
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">每周任务</h2>
                  <span className="text-sm text-slate-500">
                    ({weeklyStats.claimed}/{weeklyStats.total}) · {weeklyData?.period_start} ~ {weeklyData?.period_end}
                  </span>
                </div>
                <div className="space-y-3">
                  {weeklyItems.map((item) => (
                    <TaskItem
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
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-pink-500" />
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">成就进度</h2>
                    <span className="text-sm text-slate-500">({claimableAchievements} 可领取)</span>
                  </div>
                  <Link
                    to="/achievements"
                    className="text-sm text-blue-500 hover:text-blue-600"
                  >
                    查看全部成就
                  </Link>
                </div>
                <div className="space-y-3">
                  {achievements.map((achievement) => (
                    <AchievementItem
                      key={achievement.key}
                      achievement={achievement}
                      onClaim={handleClaimAchievement}
                      claiming={claimingAchievement === achievement.key}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 徽章兑换积分 */}
            {exchangeableBadges.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Medal className="w-5 h-5 text-amber-500" />
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">徽章兑换</h2>
                    <span className="text-sm text-slate-500">({exchangeableBadges.length} 个可兑换)</span>
                  </div>
                  <Link
                    to="/activity"
                    className="text-sm text-blue-500 hover:text-blue-600"
                  >
                    去扭蛋机获取更多
                  </Link>
                </div>
                <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/10 dark:to-yellow-900/10 rounded-xl p-4 mb-4 border border-amber-200 dark:border-amber-800">
                  <p className="text-sm text-amber-700 dark:text-amber-300 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    将已获得的徽章兑换为积分！稀有度越高，兑换积分越多
                  </p>
                  <div className="flex flex-wrap gap-3 mt-2 text-xs text-amber-600 dark:text-amber-400">
                    <span>青铜 +50</span>
                    <span>白银 +100</span>
                    <span>黄金 +200</span>
                    <span>钻石 +500</span>
                    <span className="text-pink-600 dark:text-pink-400">星耀 +1000</span>
                    <span className="text-red-600 dark:text-red-400">王者 +2000</span>
                  </div>
                </div>
                <div className="space-y-3">
                  {exchangeableBadges.map((badge) => (
                    <BadgeExchangeItem
                      key={badge.achievement_key}
                      badge={badge}
                      onExchange={handleExchangeBadge}
                      exchanging={exchangingBadge === badge.achievement_key}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 空状态 */}
            {dailyItems.length === 0 && weeklyItems.length === 0 && achievements.length === 0 && (
              <div className="text-center py-16">
                <Target className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                <p className="text-xl text-slate-500 dark:text-slate-400">暂无可用任务</p>
                <p className="text-sm text-slate-400 dark:text-slate-500 mt-2">敬请期待...</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
