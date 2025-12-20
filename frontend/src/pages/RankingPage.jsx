import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Crown, Trophy, Heart, Coffee, Zap, Pizza, Star, GitCommit, Flame, Sparkles, ThumbsUp, Code2, Clock, Target } from 'lucide-react'
import api from '../services/api'
import { cn } from '@/lib/utils'

const CONTEST_ID = 1

const TABS = [
  { key: 'cheer', label: '人气排行榜', icon: Heart },
  { key: 'github', label: '代码提交排行榜', icon: GitCommit },
  { key: 'quota', label: '额度消耗排行榜', icon: Flame },
  { key: 'lucky', label: '欧皇榜', icon: Sparkles },
  { key: 'heat', label: '热力榜', icon: ThumbsUp },
  { key: 'puzzle', label: '码神挑战榜', icon: Code2 },
]

const MEDALS = {
  1: {
    name: '金牌',
    ring: 'ring-amber-400/40 dark:ring-amber-300/30',
    badgeBg: 'bg-amber-500/15 dark:bg-amber-400/15',
    badgeText: 'text-amber-700 dark:text-amber-200',
    crown: 'text-amber-500',
    glow: 'shadow-[0_24px_80px_rgba(245,158,11,0.25)]',
  },
  2: {
    name: '银牌',
    ring: 'ring-zinc-300/60 dark:ring-zinc-700/60',
    badgeBg: 'bg-zinc-500/10 dark:bg-zinc-400/10',
    badgeText: 'text-zinc-700 dark:text-zinc-200',
    crown: 'text-zinc-400',
    glow: 'shadow-[0_20px_70px_rgba(113,113,122,0.20)]',
  },
  3: {
    name: '铜牌',
    ring: 'ring-orange-400/35 dark:ring-orange-300/25',
    badgeBg: 'bg-orange-500/10 dark:bg-orange-400/10',
    badgeText: 'text-orange-700 dark:text-orange-200',
    crown: 'text-orange-500',
    glow: 'shadow-[0_16px_64px_rgba(249,115,22,0.20)]',
  },
}

const CHEER_TYPES = [
  { key: 'cheer', Icon: Heart, color: 'text-red-500' },
  { key: 'coffee', Icon: Coffee, color: 'text-amber-600' },
  { key: 'energy', Icon: Zap, color: 'text-yellow-500' },
  { key: 'pizza', Icon: Pizza, color: 'text-orange-500' },
  { key: 'star', Icon: Star, color: 'text-purple-500' },
]

function Avatar({ user, size = 44 }) {
  const url =
    user?.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.display_name || user?.username || 'U')}&background=random`
  return (
    <img
      src={url}
      alt={user?.display_name || user?.username || 'avatar'}
      width={size}
      height={size}
      className={cn('rounded-xl object-cover ring-1 ring-zinc-200 dark:ring-zinc-800', size <= 44 ? 'shadow-sm' : '')}
      loading="lazy"
    />
  )
}

function TabButton({ active, onClick, Icon, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors border',
        active
          ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-zinc-900 dark:border-white'
          : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-800 dark:hover:bg-zinc-800/60'
      )}
    >
      <Icon className="w-4 h-4" />
      {children}
    </button>
  )
}

// 格式化用时
function formatTime(seconds) {
  if (!seconds || seconds === 0) return '-'
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  if (hours > 0) {
    return `${hours}h ${mins}m`
  }
  if (mins > 0) {
    return `${mins}m ${secs}s`
  }
  return `${secs}s`
}

function TopCard({ entry, rank, mode }) {
  if (!entry) return null

  const medal = MEDALS[rank]

  // 根据模式获取显示值和标签
  let metricValue, metricLabel, subValue, showTitle = true
  if (mode === 'cheer') {
    metricValue = entry?.stats?.total ?? 0
    metricLabel = '总打气'
  } else if (mode === 'quota') {
    metricValue = entry?.quota?.used != null ? `$${entry.quota.used.toFixed(2)}` : '-'
    metricLabel = '已消耗'
    subValue = entry?.quota?.today_used != null ? `今日 $${entry.quota.today_used.toFixed(2)}` : null
  } else if (mode === 'lucky') {
    metricValue = entry?.win_count ?? 0
    metricLabel = '中奖次数'
    showTitle = false // 欧皇榜不显示项目名
  } else if (mode === 'heat') {
    metricValue = entry?.heat_value ?? 0
    metricLabel = '热力值'
    showTitle = false // 热力榜显示用户，不显示项目名
  } else if (mode === 'puzzle') {
    metricValue = `${entry?.total_solved ?? 0}/42`
    metricLabel = '通关进度'
    showTitle = false // 码神挑战榜显示用户
  } else {
    metricValue = entry?.total ?? entry?.value ?? 0
    metricLabel = '提交数'
  }

  // 判断是否无限额度
  const isUnlimited = entry?.quota?.is_unlimited

  // 欧皇榜、热力榜、码神挑战榜直接使用 entry 上的用户信息
  const isUserMode = mode === 'lucky' || mode === 'heat' || mode === 'puzzle'
  const displayName = isUserMode
    ? (entry?.user?.display_name || entry?.user?.username || entry?.display_name || entry?.username || '匿名用户')
    : (entry?.user?.display_name || entry?.user?.username || '匿名选手')

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 ring-1',
        medal?.ring,
        medal?.glow
      )}
    >
      <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full bg-zinc-100 dark:bg-zinc-800/50 blur-2xl" />
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="relative">
            <Avatar user={isUserMode ? (entry?.user || entry) : entry?.user} size={56} />
            <div
              className={cn(
                'absolute -bottom-2 -right-2 w-7 h-7 rounded-lg flex items-center justify-center ring-2 ring-white dark:ring-zinc-900',
                medal?.badgeBg
              )}
            >
              {mode === 'lucky' ? (
                <Sparkles className={cn('w-4 h-4', medal?.crown)} />
              ) : mode === 'heat' ? (
                <Flame className={cn('w-4 h-4', medal?.crown)} />
              ) : mode === 'puzzle' ? (
                <Code2 className={cn('w-4 h-4', medal?.crown)} />
              ) : (
                <Crown className={cn('w-4 h-4', medal?.crown)} />
              )}
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={cn('px-2 py-1 rounded-lg text-xs font-bold', medal?.badgeBg, medal?.badgeText)}>
                #{rank} {medal?.name}
              </span>
            </div>
            <div className="mt-2 text-lg font-black text-zinc-900 dark:text-white truncate">
              {displayName}
            </div>
            {showTitle && (
              <div className="text-sm text-zinc-500 dark:text-zinc-400 truncate">{entry?.title || '未命名项目'}</div>
            )}
            {mode === 'lucky' && entry?.prizes_won?.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {entry.prizes_won.slice(0, 2).map((prize, idx) => (
                  <span key={idx} className="px-1.5 py-0.5 text-xs rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                    {prize}
                  </span>
                ))}
              </div>
            )}
            {mode === 'puzzle' && (
              <div className="mt-1 flex flex-wrap gap-1">
                {entry?.is_completed && (
                  <span className="px-1.5 py-0.5 text-xs rounded bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 text-amber-700 dark:text-amber-300 font-bold">
                    全程通关
                  </span>
                )}
                {entry?.is_half && !entry?.is_completed && (
                  <span className="px-1.5 py-0.5 text-xs rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                    半程达成
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="flex items-center justify-end gap-2 text-zinc-500 dark:text-zinc-400 text-xs font-semibold">
            {mode === 'lucky' ? <Sparkles className="w-4 h-4" /> : mode === 'heat' ? <ThumbsUp className="w-4 h-4" /> : mode === 'puzzle' ? <Target className="w-4 h-4" /> : <Trophy className="w-4 h-4" />}
            {metricLabel}
          </div>
          <div className="mt-1 text-3xl font-black text-zinc-900 dark:text-white tabular-nums">{metricValue}</div>
          {mode === 'quota' && (
            <div className="mt-1 space-y-0.5">
              {subValue && (
                <div className="text-xs text-blue-500 dark:text-blue-400 font-medium">
                  {subValue}
                </div>
              )}
              <div className="text-xs text-zinc-400 dark:text-zinc-500">
                剩余 {isUnlimited ? '无限' : `$${entry.quota?.remaining?.toFixed(2) || '0.00'}`}
              </div>
            </div>
          )}
        </div>
      </div>

      {(mode === 'cheer' || mode === 'heat') && (
        <div className="mt-5 flex items-center gap-3 flex-wrap">
          {CHEER_TYPES.map(({ key, Icon, color }) => (
            <div
              key={key}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700/50"
            >
              <Icon className={cn('w-4 h-4', color)} />
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-200 tabular-nums">
                {entry?.stats?.[key] ?? 0}
              </span>
            </div>
          ))}
        </div>
      )}

      {mode === 'puzzle' && (
        <div className="mt-5 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700/50">
            <Clock className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">
              用时 {formatTime(entry?.total_time)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700/50">
            <Target className="w-4 h-4 text-orange-500" />
            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">
              错误 {entry?.total_errors ?? 0} 次
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ entry, mode }) {
  // 根据模式获取显示值和标签
  let value, metricLabel, subValue, showTitle = true
  if (mode === 'cheer') {
    value = entry?.stats?.total ?? 0
    metricLabel = '总打气'
  } else if (mode === 'quota') {
    value = entry?.quota?.used != null ? `$${entry.quota.used.toFixed(2)}` : '-'
    metricLabel = '已消耗'
    subValue = entry?.quota?.today_used != null ? `今日 $${entry.quota.today_used.toFixed(2)}` : null
  } else if (mode === 'lucky') {
    value = entry?.win_count ?? 0
    metricLabel = '中奖次数'
    showTitle = false
  } else if (mode === 'heat') {
    value = entry?.heat_value ?? 0
    metricLabel = '热力值'
    showTitle = false
  } else if (mode === 'puzzle') {
    value = `${entry?.total_solved ?? 0}/42`
    metricLabel = '通关进度'
    showTitle = false
  } else {
    value = entry?.total ?? entry?.value ?? 0
    metricLabel = '提交数'
  }

  const MetricIcon = mode === 'cheer' ? Heart : mode === 'quota' ? Flame : mode === 'lucky' ? Sparkles : mode === 'heat' ? Flame : mode === 'puzzle' ? Target : GitCommit

  // 欧皇榜、热力榜、码神挑战榜使用 entry 上的用户信息
  const isUserMode = mode === 'lucky' || mode === 'heat' || mode === 'puzzle'
  const displayName = isUserMode
    ? (entry?.user?.display_name || entry?.user?.username || entry?.display_name || entry?.username || '匿名用户')
    : (entry?.user?.display_name || entry?.user?.username || '匿名选手')

  // 额度查询失败的显示特殊样式
  const isError = mode === 'quota' && entry?.status === 'error'
  // 判断是否无限额度
  const isUnlimited = entry?.quota?.is_unlimited

  return (
    <div className={cn(
      'flex items-center justify-between gap-4 p-4 rounded-xl bg-white dark:bg-zinc-900 border',
      isError
        ? 'border-red-200/60 dark:border-red-900/40'
        : 'border-zinc-200 dark:border-zinc-800'
    )}>
      <div className="flex items-center gap-4 min-w-0">
        <div className="w-12 h-10 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center font-black text-zinc-900 dark:text-white tabular-nums">
          #{entry?.rank ?? '-'}
        </div>
        <Avatar user={isUserMode ? (entry?.user || entry) : entry?.user} size={44} />
        <div className="min-w-0">
          <div className="font-bold text-zinc-900 dark:text-white truncate">
            {displayName}
          </div>
          {showTitle && (
            <div className="text-sm text-zinc-500 dark:text-zinc-400 truncate">{entry?.title || '未命名项目'}</div>
          )}
          {mode === 'lucky' && entry?.prizes_won?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-0.5">
              {entry.prizes_won.slice(0, 3).map((prize, idx) => (
                <span key={idx} className="px-1.5 py-0.5 text-xs rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 truncate max-w-[100px]">
                  {prize}
                </span>
              ))}
            </div>
          )}
          {mode === 'heat' && entry?.stats && (
            <div className="flex flex-wrap gap-1.5 mt-0.5">
              {CHEER_TYPES.map(({ key, Icon, color }) => entry?.stats?.[key] > 0 && (
                <div key={key} className="flex items-center gap-0.5">
                  <Icon className={cn('w-3 h-3', color)} />
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">{entry.stats[key]}</span>
                </div>
              ))}
            </div>
          )}
          {mode === 'puzzle' && (
            <div className="flex flex-wrap gap-1.5 mt-0.5">
              {entry?.is_completed && (
                <span className="px-1.5 py-0.5 text-xs rounded bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 text-amber-700 dark:text-amber-300 font-bold">
                  全程通关
                </span>
              )}
              {entry?.is_half && !entry?.is_completed && (
                <span className="px-1.5 py-0.5 text-xs rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                  半程
                </span>
              )}
              <div className="flex items-center gap-0.5">
                <Clock className="w-3 h-3 text-blue-500" />
                <span className="text-xs text-zinc-500 dark:text-zinc-400">{formatTime(entry?.total_time)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className="flex items-center justify-end gap-2 text-zinc-500 dark:text-zinc-400 text-xs font-semibold">
          <MetricIcon className="w-4 h-4" />
          {metricLabel}
        </div>
        <div className={cn(
          'mt-0.5 text-xl font-black tabular-nums',
          isError ? 'text-red-500' : 'text-zinc-900 dark:text-white'
        )}>
          {isError ? '查询失败' : value}
        </div>
        {mode === 'quota' && !isError && (
          <div className="space-y-0.5">
            {subValue && (
              <div className="text-xs text-blue-500 dark:text-blue-400 font-medium">
                {subValue}
              </div>
            )}
            <div className="text-xs text-zinc-400 dark:text-zinc-500">
              剩余 {isUnlimited ? '无限' : `$${entry.quota?.remaining?.toFixed(2) || '0.00'}`}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function RankingPage() {
  const [searchParams] = useSearchParams()
  const initialTab = searchParams.get('tab') || 'cheer'
  const validTabs = TABS.map(t => t.key)
  const [activeTab, setActiveTab] = useState(validTabs.includes(initialTab) ? initialTab : 'cheer')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [data, setData] = useState({ items: [], total: 0 })

  // 用于防止竞态条件
  const requestIdRef = useRef(0)

  const title = useMemo(() => {
    if (activeTab === 'cheer') return '人气排行榜'
    if (activeTab === 'github') return '代码提交排行榜'
    if (activeTab === 'quota') return '额度消耗排行榜'
    if (activeTab === 'lucky') return '欧皇榜'
    if (activeTab === 'heat') return '热力榜'
    if (activeTab === 'puzzle') return '码神挑战榜'
    return '排行榜'
  }, [activeTab])

  const fetchLeaderboard = useCallback(async (tab) => {
    // 递增请求 ID，用于忽略过期响应
    const currentRequestId = ++requestIdRef.current

    setLoading(true)
    setError(null)
    try {
      let res
      if (tab === 'cheer') {
        res = await api.get(`/contests/${CONTEST_ID}/cheer-leaderboard`, { params: { limit: 50 } })
      } else if (tab === 'github') {
        res = await api.get(`/contests/${CONTEST_ID}/github-leaderboard`, {
          params: { leaderboard_type: 'commits', limit: 50 },
        })
      } else if (tab === 'quota') {
        res = await api.get(`/contests/${CONTEST_ID}/quota-leaderboard`, { params: { limit: 50 } })
      } else if (tab === 'lucky') {
        res = await api.get('/lottery/leaderboard', { params: { limit: 50 } })
      } else if (tab === 'heat') {
        res = await api.get('/votes/leaderboard', { params: { contest_id: CONTEST_ID, limit: 50 } })
      } else if (tab === 'puzzle') {
        res = await api.get('/puzzle/leaderboard', { params: { limit: 50 } })
      }

      // 忽略过期响应
      if (currentRequestId !== requestIdRef.current) return

      setData({ items: res?.items || [], total: res?.total || 0 })
    } catch (e) {
      // 忽略过期响应
      if (currentRequestId !== requestIdRef.current) return

      setError(e?.response?.data?.detail || '加载失败，请稍后重试')
      setData({ items: [], total: 0 })
    } finally {
      // 忽略过期响应
      if (currentRequestId === requestIdRef.current) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    fetchLeaderboard(activeTab)
  }, [activeTab, fetchLeaderboard])

  const items = data?.items || []
  const top3 = items.slice(0, 3)

  return (
    <div className="min-h-screen pt-24 pb-20 bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200">
                <Trophy className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold">排行榜</span>
              </div>
              <h1 className="mt-4 text-3xl md:text-4xl font-black tracking-tight text-zinc-900 dark:text-white">
                {title}
              </h1>
              <p className="mt-2 text-zinc-500 dark:text-zinc-400 font-medium">
                Top 3 高亮展示，完整排名在下方列表
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {TABS.map(({ key, label, icon: Icon }) => (
                <TabButton key={key} active={activeTab === key} onClick={() => setActiveTab(key)} Icon={Icon}>
                  {label}
                </TabButton>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                <p className="text-zinc-500 dark:text-zinc-400 font-medium animate-pulse">加载排行榜中...</p>
              </div>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200/60 dark:border-red-900/40 bg-white dark:bg-zinc-900 p-10 text-center">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200/60 dark:border-red-900/40 flex items-center justify-center">
                <Trophy className="w-7 h-7 text-red-500 rotate-180" />
              </div>
              <h3 className="mt-5 text-xl font-black text-zinc-900 dark:text-white">加载失败</h3>
              <p className="mt-2 text-zinc-500 dark:text-zinc-400 font-medium">{error}</p>
              <button
                type="button"
                onClick={() => fetchLeaderboard(activeTab)}
                className="mt-6 inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-semibold"
              >
                重试
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-10 text-center">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center">
                <Trophy className="w-7 h-7 text-zinc-400" />
              </div>
              <h3 className="mt-5 text-xl font-black text-zinc-900 dark:text-white">暂无数据</h3>
              <p className="mt-2 text-zinc-500 dark:text-zinc-400 font-medium">还没有选手上榜</p>
            </div>
          ) : (
            <>
              {/* Top 3 Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {top3[0] && <TopCard entry={top3[0]} rank={1} mode={activeTab} />}
                {top3[1] && <TopCard entry={top3[1]} rank={2} mode={activeTab} />}
                {top3[2] && <TopCard entry={top3[2]} rank={3} mode={activeTab} />}
              </div>

              {/* Full List Header */}
              <div className="flex items-end justify-between gap-4 mt-2">
                <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                  完整排名 <span className="text-zinc-400 dark:text-zinc-500">({data.total || items.length})</span>
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  {activeTab === 'cheer'
                    ? '基于总打气数'
                    : activeTab === 'quota'
                      ? `基于已消耗额度${data.failed_queries ? `（${data.failed_queries} 条查询失败）` : ''}`
                      : activeTab === 'lucky'
                        ? '基于稀有奖品中奖次数'
                        : activeTab === 'heat'
                          ? '基于用户打赏消耗的道具积分'
                          : activeTab === 'puzzle'
                            ? '基于通关关卡数，同关卡数按用时排序'
                            : '基于累计提交数'}
                </div>
              </div>

              {/* Full List */}
              <div className="grid grid-cols-1 gap-3">
                {items.map((entry) => (
                  <Row key={`${activeTab}-${entry?.registration_id ?? entry?.user_id ?? entry?.submission_id ?? entry?.rank}`} entry={entry} mode={activeTab} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
