import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  TrendingUp,
  Users,
  Coins,
  Clock,
  Trophy,
  Target,
  ChevronRight,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Filter,
} from 'lucide-react'
import { predictionApi } from '../services'

// 状态标签组件
function StatusBadge({ status }) {
  const config = {
    OPEN: { label: '进行中', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: TrendingUp },
    CLOSED: { label: '已截止', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Clock },
    SETTLED: { label: '已结算', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: CheckCircle },
    CANCELED: { label: '已取消', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
    DRAFT: { label: '草稿', color: 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400', icon: AlertCircle },
  }

  const { label, color, icon: Icon } = config[status] || config.DRAFT

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${color}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  )
}

// 竞猜卡片组件
function PredictionCard({ market }) {
  const topOptions = market.options?.slice(0, 3) || []

  return (
    <Link
      to={`/prediction/${market.id}`}
      className="block bg-white dark:bg-slate-800 rounded-2xl shadow-sm hover:shadow-lg transition-all border border-slate-200 dark:border-slate-700 overflow-hidden group"
    >
      <div className="p-5">
        {/* 头部 */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <StatusBadge status={market.status} />
              {market.is_featured && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                  <Trophy className="w-3 h-3" />
                  热门
                </span>
              )}
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors line-clamp-2">
              {market.title}
            </h3>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-purple-500 group-hover:translate-x-1 transition-all flex-shrink-0 mt-1" />
        </div>

        {/* 描述 */}
        {market.description && (
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">
            {market.description}
          </p>
        )}

        {/* 选项预览 */}
        <div className="space-y-2 mb-4">
          {topOptions.map((option) => {
            const percentage = market.total_pool > 0
              ? Math.round((option.total_stake / market.total_pool) * 100)
              : 0

            return (
              <div key={option.id} className="flex items-center gap-2">
                <div className="flex-1 h-6 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      option.is_winner === true
                        ? 'bg-green-500'
                        : option.is_winner === false
                        ? 'bg-red-300'
                        : 'bg-gradient-to-r from-purple-500 to-pink-500'
                    }`}
                    style={{ width: `${Math.max(percentage, 2)}%` }}
                  />
                </div>
                <span className="text-xs text-slate-600 dark:text-slate-400 w-20 truncate">
                  {option.label}
                </span>
                <span className="text-xs font-medium text-purple-600 dark:text-purple-400 w-10 text-right">
                  {percentage}%
                </span>
              </div>
            )
          })}
          {market.options?.length > 3 && (
            <p className="text-xs text-slate-500 text-center">
              还有 {market.options.length - 3} 个选项...
            </p>
          )}
        </div>

        {/* 统计信息 */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {market.bet_count || 0} 人参与
            </span>
            <span className="flex items-center gap-1">
              <Coins className="w-4 h-4 text-yellow-500" />
              {market.total_pool || 0} 积分池
            </span>
          </div>
          {market.closes_at && (
            <span className="text-xs text-slate-400">
              {new Date(market.closes_at).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

// 竞猜列表页面
export default function PredictionListPage() {
  const [markets, setMarkets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all') // all, OPEN, CLOSED, SETTLED

  useEffect(() => {
    const fetchMarkets = async () => {
      setLoading(true)
      setError(null)
      try {
        const params = filter !== 'all' ? { status: filter } : {}
        const data = await predictionApi.getMarkets(params)
        setMarkets(Array.isArray(data) ? data : data.markets || [])
      } catch (err) {
        console.error('获取竞猜列表失败:', err)
        setError('获取竞猜列表失败，请稍后重试')
      } finally {
        setLoading(false)
      }
    }

    fetchMarkets()
  }, [filter])

  // 按状态分组（后端返回大写状态）
  const openMarkets = markets.filter(m => m.status === 'OPEN')
  const closedMarkets = markets.filter(m => m.status === 'CLOSED')
  const settledMarkets = markets.filter(m => m.status === 'SETTLED')

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* 页面标题 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 mb-4">
            <Target className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            竞猜中心
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            参与竞猜，赢取积分奖励
          </p>
        </div>

        {/* 筛选器 */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="inline-flex items-center gap-1 p-1 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            {[
              { key: 'all', label: '全部' },
              { key: 'OPEN', label: '进行中' },
              { key: 'CLOSED', label: '已截止' },
              { key: 'SETTLED', label: '已结算' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filter === key
                    ? 'bg-purple-500 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 加载状态 */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          </div>
        )}

        {/* 错误状态 */}
        {error && !loading && (
          <div className="text-center py-20">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400">{error}</p>
          </div>
        )}

        {/* 空状态 */}
        {!loading && !error && markets.length === 0 && (
          <div className="text-center py-20">
            <Target className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">
              暂无竞猜活动
            </h3>
            <p className="text-slate-500">
              {filter === 'all' ? '敬请期待新的竞猜活动' : '当前筛选条件下没有竞猜活动'}
            </p>
          </div>
        )}

        {/* 竞猜列表 */}
        {!loading && !error && markets.length > 0 && (
          <div className="space-y-8">
            {/* 进行中的竞猜 */}
            {filter === 'all' && openMarkets.length > 0 && (
              <section>
                <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white mb-4">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                  进行中
                  <span className="text-sm font-normal text-slate-500">({openMarkets.length})</span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {openMarkets.map((market) => (
                    <PredictionCard key={market.id} market={market} />
                  ))}
                </div>
              </section>
            )}

            {/* 已截止的竞猜 */}
            {filter === 'all' && closedMarkets.length > 0 && (
              <section>
                <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white mb-4">
                  <Clock className="w-5 h-5 text-yellow-500" />
                  等待开奖
                  <span className="text-sm font-normal text-slate-500">({closedMarkets.length})</span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {closedMarkets.map((market) => (
                    <PredictionCard key={market.id} market={market} />
                  ))}
                </div>
              </section>
            )}

            {/* 已结算的竞猜 */}
            {filter === 'all' && settledMarkets.length > 0 && (
              <section>
                <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white mb-4">
                  <CheckCircle className="w-5 h-5 text-blue-500" />
                  已结算
                  <span className="text-sm font-normal text-slate-500">({settledMarkets.length})</span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {settledMarkets.map((market) => (
                    <PredictionCard key={market.id} market={market} />
                  ))}
                </div>
              </section>
            )}

            {/* 筛选模式下直接显示 */}
            {filter !== 'all' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {markets.map((market) => (
                  <PredictionCard key={market.id} market={market} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* 我的竞猜入口 */}
        <div className="mt-8 text-center">
          <Link
            to="/my-bets"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 font-medium rounded-xl shadow-sm hover:shadow-md transition-all border border-slate-200 dark:border-slate-700"
          >
            <Trophy className="w-5 h-5" />
            查看我的竞猜记录
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
