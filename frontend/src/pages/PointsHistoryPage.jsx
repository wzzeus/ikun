/**
 * 积分明细页面
 * 显示用户积分收支明细、统计信息
 */
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Coins, TrendingUp, TrendingDown, Calendar, Filter,
  ChevronLeft, ChevronRight, Loader2, ArrowUpRight, ArrowDownRight,
  Gift, Ticket, Target, Star, Coffee, Award, Zap, ShoppingBag
} from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import api from '../services/api'

// 积分类型映射
const REASON_LABELS = {
  REGISTER_BONUS: { label: '注册奖励', icon: Gift, color: 'text-green-500' },
  SIGNIN_DAILY: { label: '每日签到', icon: Calendar, color: 'text-blue-500' },
  SIGNIN_STREAK_BONUS: { label: '连续签到奖励', icon: Star, color: 'text-amber-500' },
  CHEER_GIVE: { label: '打气消耗', icon: Coffee, color: 'text-red-500' },
  CHEER_RECEIVE: { label: '收到打气', icon: Coffee, color: 'text-green-500' },
  LOTTERY_SPEND: { label: '抽奖消耗', icon: Ticket, color: 'text-red-500' },
  LOTTERY_WIN: { label: '抽奖中奖', icon: Ticket, color: 'text-green-500' },
  BET_STAKE: { label: '竞猜下注', icon: Target, color: 'text-red-500' },
  BET_PAYOUT: { label: '竞猜获胜', icon: Target, color: 'text-green-500' },
  BET_REFUND: { label: '竞猜退款', icon: Target, color: 'text-blue-500' },
  ADMIN_GRANT: { label: '管理员发放', icon: Award, color: 'text-purple-500' },
  ADMIN_DEDUCT: { label: '管理员扣除', icon: Award, color: 'text-red-500' },
  ACHIEVEMENT_CLAIM: { label: '成就奖励', icon: Award, color: 'text-amber-500' },
  EASTER_EGG_REDEEM: { label: '彩蛋兑换', icon: Gift, color: 'text-pink-500' },
  GACHA_SPEND: { label: '扭蛋消耗', icon: Zap, color: 'text-red-500' },
  GACHA_WIN: { label: '扭蛋中奖', icon: Zap, color: 'text-green-500' },
  EXCHANGE_SPEND: { label: '商城兑换', icon: ShoppingBag, color: 'text-red-500' },
  TASK_REWARD: { label: '任务奖励', icon: Target, color: 'text-green-500' },
  TASK_CHAIN_BONUS: { label: '任务链奖励', icon: Target, color: 'text-amber-500' },
  BADGE_EXCHANGE: { label: '徽章兑换', icon: Award, color: 'text-purple-500' },
  ADMIN_ADJUST: { label: '管理员调整', icon: Award, color: 'text-purple-500' },
}

// 格式化日期
function formatDate(dateStr) {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now - date

  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  if (diff < 172800000) return '昨天'

  return date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 统计卡片
function StatCard({ title, value, icon: Icon, color, subtext }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-slate-500 dark:text-slate-400">{title}</span>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div className={`text-2xl font-bold ${color}`}>{value.toLocaleString()}</div>
      {subtext && <div className="text-xs text-slate-400 mt-1">{subtext}</div>}
    </div>
  )
}

// 明细列表项
function HistoryItem({ item }) {
  const config = REASON_LABELS[item.reason] || { label: item.reason, icon: Coins, color: 'text-slate-500' }
  const Icon = config.icon
  const isIncome = item.amount > 0

  return (
    <div className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
          isIncome ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
        }`}>
          <Icon className={`w-5 h-5 ${config.color}`} />
        </div>
        <div>
          <div className="font-medium text-slate-800 dark:text-slate-200">{config.label}</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            {item.description || config.label}
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className={`font-bold ${isIncome ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
          {isIncome ? '+' : ''}{item.amount.toLocaleString()}
        </div>
        <div className="text-xs text-slate-400">{formatDate(item.created_at)}</div>
      </div>
    </div>
  )
}

export default function PointsHistoryPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)

  const [loading, setLoading] = useState(true)
  const [statistics, setStatistics] = useState(null)
  const [history, setHistory] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [filterType, setFilterType] = useState('all')
  const pageSize = 20

  // 加载统计信息
  const loadStatistics = useCallback(async () => {
    try {
      const res = await api.get('/points/statistics')
      setStatistics(res)
    } catch (err) {
      console.error('加载统计信息失败:', err)
    }
  }, [])

  // 加载历史记录
  const loadHistory = useCallback(async () => {
    setLoading(true)
    try {
      const params = {
        limit: pageSize,
        offset: (page - 1) * pageSize,
      }
      if (filterType !== 'all') {
        params.filter_type = filterType
      }
      const res = await api.get('/points/history', { params })
      setHistory(res.items || [])
      setTotal(res.total || 0)
    } catch (err) {
      console.error('加载历史记录失败:', err)
    } finally {
      setLoading(false)
    }
  }, [page, filterType])

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    loadStatistics()
  }, [user, navigate, loadStatistics])

  useEffect(() => {
    if (user) {
      loadHistory()
    }
  }, [user, loadHistory])

  const totalPages = Math.ceil(total / pageSize)

  if (!user) return null

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* 页面标题 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Coins className="w-7 h-7 text-amber-500" />
            积分明细
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">查看你的积分收支记录</p>
        </div>

        {/* 统计卡片 */}
        {statistics && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <StatCard
              title="当前余额"
              value={statistics.balance}
              icon={Coins}
              color="text-amber-500"
            />
            <StatCard
              title="累计收入"
              value={statistics.total_earned}
              icon={TrendingUp}
              color="text-green-500"
            />
            <StatCard
              title="累计支出"
              value={statistics.total_spent}
              icon={TrendingDown}
              color="text-red-500"
            />
          </div>
        )}

        {/* 收入来源分析 */}
        {statistics && statistics.income_by_type?.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 mb-6 border border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4 text-green-500" />
              收入来源
            </h3>
            <div className="space-y-2">
              {statistics.income_by_type.slice(0, 5).map((item, idx) => {
                const config = REASON_LABELS[item.type] || { label: item.type, color: 'text-slate-500' }
                const percentage = Math.round((item.total / statistics.total_earned) * 100)
                return (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-300">{config.label}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-green-600 dark:text-green-400 w-16 text-right">
                        +{item.total.toLocaleString()}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 支出去向分析 */}
        {statistics && statistics.expense_by_type?.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 mb-6 border border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
              <ArrowDownRight className="w-4 h-4 text-red-500" />
              支出去向
            </h3>
            <div className="space-y-2">
              {statistics.expense_by_type.slice(0, 5).map((item, idx) => {
                const config = REASON_LABELS[item.type] || { label: item.type, color: 'text-slate-500' }
                const percentage = Math.round((item.total / statistics.total_spent) * 100)
                return (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-300">{config.label}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-500 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-red-600 dark:text-red-400 w-16 text-right">
                        -{item.total.toLocaleString()}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 筛选和明细列表 */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          {/* 筛选栏 */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold text-slate-800 dark:text-white">交易记录</h3>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={filterType}
                onChange={(e) => { setFilterType(e.target.value); setPage(1) }}
                className="text-sm bg-slate-100 dark:bg-slate-700 border-0 rounded-lg px-3 py-1.5 text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">全部</option>
                <option value="income">仅收入</option>
                <option value="expense">仅支出</option>
              </select>
            </div>
          </div>

          {/* 列表 */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              <Coins className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>暂无记录</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {history.map((item) => (
                <HistoryItem key={item.id} item={item} />
              ))}
            </div>
          )}

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-slate-200 dark:border-slate-700">
              <span className="text-sm text-slate-500 dark:text-slate-400">
                共 {total} 条记录
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm text-slate-600 dark:text-slate-300">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
