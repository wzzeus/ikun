import { useState, useEffect, useCallback } from 'react'
import { Heart, Coffee, Zap, Pizza, Star, MessageCircle, Sparkles, RefreshCw, ChevronLeft, ChevronRight, GitCommit, Plus, Minus, Code2, Crown, Gift, Key } from 'lucide-react'
import api from '../../services/api'
import { cn } from '@/lib/utils'

/**
 * 打气类型配置
 */
const CHEER_CONFIG = {
  cheer: { icon: Heart, label: '打气', color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20' },
  coffee: { icon: Coffee, label: '咖啡', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
  energy: { icon: Zap, label: '能量', color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
  pizza: { icon: Pizza, label: '披萨', color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20' },
  star: { icon: Star, label: '星星', color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
}

// 每页显示条数
const ITEMS_PER_PAGE = 5
// 总页数
const TOTAL_PAGES = 3
// 自动轮播间隔（毫秒）
const AUTO_SLIDE_INTERVAL = 5000

// Tab 配置
const TAB_CONFIG = {
  cheers: { color: 'bg-pink-500', label: '应援' },
  commits: { color: 'bg-blue-500', label: '提交' },
  winners: { color: 'bg-yellow-500', label: '中奖' },
}

/**
 * 计算相对时间
 */
function getRelativeTime(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now - date) / 1000)

  if (diff < 60) return '刚刚'
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`
  return `${Math.floor(diff / 86400)}天前`
}

/**
 * 应援动态项
 */
function CheerFeedItem({ item }) {
  const config = CHEER_CONFIG[item.cheer_type] || CHEER_CONFIG.cheer
  const Icon = config.icon

  const fromUser = item.from_user
  const toReg = item.to_registration

  return (
    <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
      {/* 头像 */}
      <img
        src={fromUser?.avatar_url || `https://ui-avatars.com/api/?name=${fromUser?.username || 'U'}`}
        alt={fromUser?.display_name || fromUser?.username}
        className="w-10 h-10 rounded-full flex-shrink-0"
      />

      {/* 内容 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-slate-900 dark:text-white truncate">
            {fromUser?.display_name || fromUser?.username || '匿名用户'}
          </span>
          <span className="text-slate-500 dark:text-slate-400">给</span>
          <span className="font-medium text-slate-700 dark:text-slate-300 truncate">
            {toReg?.title || '某项目'}
          </span>
          <span className="text-slate-500 dark:text-slate-400">送了</span>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
            <Icon className="w-3 h-3" />
            {config.label}
          </span>
        </div>

        {/* 留言 */}
        {item.message && (
          <div className="mt-1.5 flex items-start gap-1.5">
            <MessageCircle className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
              "{item.message}"
            </p>
          </div>
        )}

        {/* 时间 */}
        <span className="text-xs text-slate-400 mt-1 block">
          {getRelativeTime(item.created_at)}
        </span>
      </div>
    </div>
  )
}

/**
 * Git 提交动态项
 */
function CommitFeedItem({ item }) {
  const user = item.user

  return (
    <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
      {/* 头像 */}
      <img
        src={user?.avatar_url || `https://ui-avatars.com/api/?name=${user?.username || 'U'}`}
        alt={user?.display_name || user?.username}
        className="w-10 h-10 rounded-full flex-shrink-0"
      />

      {/* 内容 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-slate-900 dark:text-white truncate">
            {user?.display_name || user?.username || '匿名用户'}
          </span>
          <span className="text-slate-500 dark:text-slate-400">提交到</span>
          <span className="font-medium text-slate-700 dark:text-slate-300 truncate">
            {item.title || item.repo_name}
          </span>
        </div>

        {/* 提交信息 */}
        <div className="mt-1.5 flex items-start gap-1.5">
          <GitCommit className="w-3.5 h-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2 font-mono">
              {item.message || '(no commit message)'}
            </p>
            {/* 代码变更统计 - 修复移动端长 SHA 溢出 */}
            <div className="flex flex-wrap items-center gap-3 mt-1 min-w-0">
              <span className="inline-flex items-center gap-0.5 text-xs text-green-600 dark:text-green-400">
                <Plus className="w-3 h-3" />
                {item.additions || 0}
              </span>
              <span className="inline-flex items-center gap-0.5 text-xs text-red-500 dark:text-red-400">
                <Minus className="w-3 h-3" />
                {item.deletions || 0}
              </span>
              <code
                title={item.sha}
                className="text-xs text-slate-400 font-mono inline-block max-w-[12ch] truncate"
              >
                {item.sha}
              </code>
            </div>
          </div>
        </div>

        {/* 时间 */}
        <span className="text-xs text-slate-400 mt-1 block">
          {getRelativeTime(item.timestamp)}
        </span>
      </div>
    </div>
  )
}

/**
 * 欧皇中奖动态项
 */
function WinnerFeedItem({ item, index }) {
  // 判断是否是 API Key 奖品
  const isApiKey = item.prize_name?.toLowerCase().includes('api') || item.prize_name?.toLowerCase().includes('key')

  return (
    <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
      {/* 头像带皇冠 */}
      <div className="relative flex-shrink-0">
        <img
          src={item.avatar_url || `https://ui-avatars.com/api/?name=${item.username || 'U'}`}
          alt={item.display_name || item.username}
          className="w-10 h-10 rounded-full"
        />
        {index < 3 && (
          <div className={cn(
            "absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center",
            index === 0 ? "bg-yellow-400" : index === 1 ? "bg-slate-300" : "bg-amber-600"
          )}>
            <Crown className="w-3 h-3 text-white" />
          </div>
        )}
      </div>

      {/* 内容 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-slate-900 dark:text-white truncate">
            {item.display_name || item.username || '匿名用户'}
          </span>
          <span className="text-slate-500 dark:text-slate-400">抽中了</span>
          <span className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold",
            isApiKey
              ? "bg-gradient-to-r from-yellow-100 to-amber-100 dark:from-yellow-900/30 dark:to-amber-900/30 text-yellow-700 dark:text-yellow-400"
              : "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400"
          )}>
            {isApiKey ? <Key className="w-3 h-3" /> : <Gift className="w-3 h-3" />}
            {item.prize_name}
          </span>
        </div>

        {/* 欧皇宣言 */}
        <div className="mt-1.5 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {isApiKey ? '欧皇降临！' : '好运连连～'}
          </p>
        </div>

        {/* 时间 */}
        <span className="text-xs text-slate-400 mt-1 block">
          {getRelativeTime(item.created_at)}
        </span>
      </div>
    </div>
  )
}

/**
 * Tab 按钮
 */
function TabButton({ active, onClick, icon: Icon, children, color }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
        active
          ? `bg-gradient-to-r ${color || 'from-pink-500 to-rose-500'} text-white shadow-md`
          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
      )}
    >
      <Icon className="w-4 h-4" />
      {children}
    </button>
  )
}

/**
 * 实时动态流组件 - 分页轮播版 + Tab 切换
 */
export default function LiveFeedSection() {
  const [activeTab, setActiveTab] = useState('cheers') // 'cheers' | 'commits' | 'winners'
  const [feeds, setFeeds] = useState([])
  const [commits, setCommits] = useState([])
  const [winners, setWinners] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [currentPage, setCurrentPage] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  // 加载应援动态
  const loadCheers = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      const response = await api.get('/contests/1/cheers/today', {
        params: { limit: ITEMS_PER_PAGE * TOTAL_PAGES }
      })
      setFeeds(response.items || [])
    } catch (error) {
      console.error('加载应援动态失败:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // 加载提交动态
  const loadCommits = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      const response = await api.get('/contests/1/github-commits/recent', {
        params: { limit: ITEMS_PER_PAGE * TOTAL_PAGES }
      })
      setCommits(response.items || [])
    } catch (error) {
      console.error('加载提交动态失败:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // 加载欧皇榜（中奖记录）
  const loadWinners = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      const response = await api.get('/lottery/winners', {
        params: { limit: ITEMS_PER_PAGE * TOTAL_PAGES }
      })
      setWinners(response || [])
    } catch (error) {
      console.error('加载欧皇榜失败:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // 刷新当前 Tab 数据
  const refreshData = useCallback((isRefresh = false) => {
    if (activeTab === 'cheers') {
      loadCheers(isRefresh)
    } else if (activeTab === 'commits') {
      loadCommits(isRefresh)
    } else {
      loadWinners(isRefresh)
    }
  }, [activeTab])

  // 初始加载和自动刷新
  useEffect(() => {
    refreshData()

    // 每30秒自动刷新数据
    const interval = setInterval(() => refreshData(true), 30000)
    return () => clearInterval(interval)
  }, [activeTab])

  // Tab 切换时重置页码
  useEffect(() => {
    setCurrentPage(0)
  }, [activeTab])

  // 当前数据
  const currentData = activeTab === 'cheers' ? feeds : activeTab === 'commits' ? commits : winners

  // 计算实际页数
  const actualPages = Math.min(TOTAL_PAGES, Math.ceil(currentData.length / ITEMS_PER_PAGE))

  // 自动轮播
  useEffect(() => {
    if (isPaused || actualPages <= 1) return

    const interval = setInterval(() => {
      setCurrentPage((prev) => (prev + 1) % actualPages)
    }, AUTO_SLIDE_INTERVAL)

    return () => clearInterval(interval)
  }, [isPaused, actualPages])

  // 获取当前页的数据
  const currentItems = currentData.slice(
    currentPage * ITEMS_PER_PAGE,
    (currentPage + 1) * ITEMS_PER_PAGE
  )

  // 切换到指定页
  const goToPage = useCallback((page) => {
    setCurrentPage(page)
  }, [])

  // 上一页
  const prevPage = useCallback(() => {
    setCurrentPage((prev) => (prev - 1 + actualPages) % actualPages)
  }, [actualPages])

  // 下一页
  const nextPage = useCallback(() => {
    setCurrentPage((prev) => (prev + 1) % actualPages)
  }, [actualPages])

  // 获取副标题
  const getSubtitle = () => {
    switch (activeTab) {
      case 'cheers': return '看看大家都在为谁打气'
      case 'commits': return '参赛者的最新代码提交'
      case 'winners': return '谁是欧皇？最近抽中大奖的幸运儿'
      default: return ''
    }
  }

  return (
    <section className="py-16 bg-white dark:bg-slate-900">
      <div className="max-w-4xl mx-auto px-4">
        {/* 标题 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-pink-500 to-rose-500 rounded-xl shadow-lg">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                实时动态
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {getSubtitle()}
              </p>
            </div>
          </div>

          <button
            onClick={() => refreshData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            刷新
          </button>
        </div>

        {/* Tab 切换 */}
        <div className="flex items-center gap-2 mb-4">
          <TabButton
            active={activeTab === 'cheers'}
            onClick={() => setActiveTab('cheers')}
            icon={Heart}
            color="from-pink-500 to-rose-500"
          >
            应援动态
          </TabButton>
          <TabButton
            active={activeTab === 'commits'}
            onClick={() => setActiveTab('commits')}
            icon={Code2}
            color="from-blue-500 to-indigo-500"
          >
            提交动态
          </TabButton>
          <TabButton
            active={activeTab === 'winners'}
            onClick={() => setActiveTab('winners')}
            icon={Crown}
            color="from-yellow-500 to-amber-500"
          >
            欧皇榜
          </TabButton>
        </div>

        {/* 动态列表 */}
        <div
          className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="w-8 h-8 animate-spin text-slate-400" />
            </div>
          ) : currentData.length === 0 ? (
            <div className="text-center py-20">
              {activeTab === 'cheers' ? (
                <>
                  <Sparkles className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-500 dark:text-slate-400 font-medium">
                    今天还没有应援动态
                  </p>
                  <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                    快去给选手们打气吧！
                  </p>
                </>
              ) : activeTab === 'commits' ? (
                <>
                  <Code2 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-500 dark:text-slate-400 font-medium">
                    暂无提交动态
                  </p>
                  <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                    选手们正在努力开发中...
                  </p>
                </>
              ) : (
                <>
                  <Crown className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-500 dark:text-slate-400 font-medium">
                    暂无欧皇诞生
                  </p>
                  <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                    快去抽奖试试运气吧！
                  </p>
                </>
              )}
            </div>
          ) : (
            <>
              {/* 动态内容区 - 固定高度 */}
              <div className="divide-y divide-slate-200 dark:divide-slate-700 min-h-[340px]">
                {currentItems.map((item, index) => {
                  const globalIndex = currentPage * ITEMS_PER_PAGE + index
                  if (activeTab === 'cheers') {
                    return <CheerFeedItem key={item.id || index} item={item} />
                  } else if (activeTab === 'commits') {
                    return <CommitFeedItem key={`${item.sha}-${index}`} item={item} />
                  } else {
                    return <WinnerFeedItem key={`${item.user_id}-${item.created_at}-${index}`} item={item} index={globalIndex} />
                  }
                })}
              </div>

              {/* 分页指示器和控制 */}
              {actualPages > 1 && (
                <div className="flex items-center justify-center gap-4 py-4 border-t border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50">
                  {/* 上一页按钮 */}
                  <button
                    onClick={prevPage}
                    className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                    aria-label="上一页"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  {/* 分页点 */}
                  <div className="flex items-center gap-2">
                    {Array.from({ length: actualPages }).map((_, index) => (
                      <button
                        key={index}
                        onClick={() => goToPage(index)}
                        className={cn(
                          "w-2 h-2 rounded-full transition-all duration-300",
                          index === currentPage
                            ? `w-6 ${TAB_CONFIG[activeTab]?.color || 'bg-pink-500'}`
                            : "bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500"
                        )}
                        aria-label={`第 ${index + 1} 页`}
                      />
                    ))}
                  </div>

                  {/* 下一页按钮 */}
                  <button
                    onClick={nextPage}
                    className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                    aria-label="下一页"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* 底部提示 */}
        {currentData.length > 0 && (
          <p className="text-center text-sm text-slate-400 dark:text-slate-500 mt-4">
            共 {currentData.length} 条{TAB_CONFIG[activeTab]?.label || ''}动态 · 第 {currentPage + 1}/{actualPages} 页 · 自动轮播
          </p>
        )}
      </div>
    </section>
  )
}
