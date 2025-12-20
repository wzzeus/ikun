import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  TrendingUp,
  Users,
  Coins,
  Clock,
  ArrowLeft,
  Trophy,
  Check,
  X,
  RefreshCw,
  ChevronRight,
  Target,
  AlertCircle,
} from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { predictionApi, pointsApi } from '../services'

// 竞猜选项组件
function PredictionOption({ option, market, selected, onSelect, disabled }) {
  const percentage = market.total_pool > 0
    ? Math.round((option.total_stake / market.total_pool) * 100)
    : 0

  return (
    <button
      type="button"
      onClick={() => onSelect(option.id)}
      disabled={disabled}
      className={`relative w-full p-4 rounded-xl border-2 transition-all text-left overflow-hidden ${
        option.is_winner === true
          ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
          : option.is_winner === false
          ? 'border-red-300 bg-red-50/50 dark:bg-red-900/10 opacity-60'
          : selected
          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
          : 'border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-700'
      } ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
    >
      {/* 进度条背景 */}
      <div
        className={`absolute inset-y-0 left-0 transition-all ${
          option.is_winner === true
            ? 'bg-green-100 dark:bg-green-900/30'
            : option.is_winner === false
            ? 'bg-red-100 dark:bg-red-900/20'
            : 'bg-purple-100 dark:bg-purple-900/20'
        }`}
        style={{ width: `${percentage}%` }}
      />

      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* 选中指示器 */}
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
            option.is_winner === true
              ? 'border-green-500 bg-green-500'
              : option.is_winner === false
              ? 'border-red-400'
              : selected
              ? 'border-purple-500 bg-purple-500'
              : 'border-slate-300 dark:border-slate-600'
          }`}>
            {(selected || option.is_winner === true) && (
              <Check className="w-3 h-3 text-white" />
            )}
            {option.is_winner === false && (
              <X className="w-3 h-3 text-red-400" />
            )}
          </div>

          <div>
            <p className="font-medium text-slate-900 dark:text-white">{option.label}</p>
            {option.description && (
              <p className="text-sm text-slate-500">{option.description}</p>
            )}
          </div>
        </div>

        <div className="text-right">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
              {option.odds ? `${option.odds.toFixed(2)}x` : '-'}
            </span>
          </div>
          <div className="flex items-center gap-1 text-sm text-slate-500">
            <Coins className="w-3 h-3" />
            {option.total_stake}
            <span className="text-xs">({percentage}%)</span>
          </div>
        </div>
      </div>
    </button>
  )
}

// 竞猜详情页面
export default function PredictionPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)

  const [loading, setLoading] = useState(true)
  const [market, setMarket] = useState(null)
  const [stats, setStats] = useState(null)
  const [balance, setBalance] = useState(0)
  const [selectedOption, setSelectedOption] = useState(null)
  const [betAmount, setBetAmount] = useState('')
  const [placing, setPlacing] = useState(false)
  const [myBets, setMyBets] = useState([])

  useEffect(() => {
    loadData()
  }, [id])

  const loadData = async () => {
    setLoading(true)
    try {
      const [marketData, statsData] = await Promise.all([
        predictionApi.getMarket(id),
        predictionApi.getMarketStats(id),
      ])
      setMarket(marketData)
      setStats(statsData)

      if (token) {
        const [balanceData, betsData] = await Promise.all([
          pointsApi.getBalance(),
          predictionApi.getMyBets({ market_id: id }),
        ])
        setBalance(balanceData.balance)
        setMyBets(betsData)
      }
    } catch (error) {
      console.error('加载竞猜失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePlaceBet = async () => {
    if (!token) {
      navigate('/login')
      return
    }
    if (!selectedOption || !betAmount || placing) return

    const amount = parseInt(betAmount)
    if (isNaN(amount) || amount <= 0) {
      alert('请输入有效的下注金额')
      return
    }
    if (amount < market.min_bet) {
      alert(`最低下注 ${market.min_bet} 积分`)
      return
    }
    if (market.max_bet && amount > market.max_bet) {
      alert(`最高下注 ${market.max_bet} 积分`)
      return
    }
    if (amount > balance) {
      alert('积分不足')
      return
    }

    setPlacing(true)
    try {
      await predictionApi.placeBet(market.id, {
        option_id: selectedOption,
        stake_points: amount,
      })
      alert('下注成功！')
      setSelectedOption(null)
      setBetAmount('')
      loadData()
    } catch (error) {
      alert(error.response?.data?.detail || '下注失败')
    } finally {
      setPlacing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pt-24 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    )
  }

  if (!market) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pt-24 flex flex-col items-center justify-center">
        <AlertCircle className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
        <p className="text-slate-500 dark:text-slate-400">竞猜不存在</p>
        <Link to="/activity" className="mt-4 text-purple-600 hover:underline">
          返回活动中心
        </Link>
      </div>
    )
  }

  const isOpen = market.status === 'OPEN'
  const isSettled = market.status === 'SETTLED'
  const isClosed = market.status === 'CLOSED'

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pt-24 pb-8">
      <div className="max-w-3xl mx-auto px-4">
        {/* 返回按钮 */}
        <Link
          to="/activity"
          className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          返回活动中心
        </Link>

        {/* 竞猜标题 */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                  {market.title}
                </h1>
                <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${
                  isOpen
                    ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                    : isSettled
                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                    : isClosed
                    ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                }`}>
                  {isOpen ? '进行中' : isSettled ? '已结算' : isClosed ? '已截止' : market.status}
                </span>
              </div>
            </div>
          </div>

          {market.description && (
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              {market.description}
            </p>
          )}

          {/* 统计信息 */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
              <Coins className="w-5 h-5 text-yellow-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-slate-900 dark:text-white">
                {stats?.total_pool || 0}
              </p>
              <p className="text-xs text-slate-500">总奖池</p>
            </div>
            <div className="text-center p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
              <Users className="w-5 h-5 text-blue-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-slate-900 dark:text-white">
                {stats?.participant_count || 0}
              </p>
              <p className="text-xs text-slate-500">参与人数</p>
            </div>
            <div className="text-center p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
              <Trophy className="w-5 h-5 text-purple-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-slate-900 dark:text-white">
                {(100 - market.fee_rate * 100).toFixed(0)}%
              </p>
              <p className="text-xs text-slate-500">奖金比例</p>
            </div>
          </div>

          {market.closes_at && (
            <div className="flex items-center gap-1 text-sm text-slate-500 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Clock className="w-4 h-4" />
              截止时间: {new Date(market.closes_at).toLocaleString('zh-CN')}
            </div>
          )}
        </div>

        {/* 选项列表 */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 mb-6">
          <h2 className="font-bold text-slate-900 dark:text-white mb-4">选择你支持的选项</h2>
          <div className="space-y-3">
            {market.options?.map((option) => (
              <PredictionOption
                key={option.id}
                option={option}
                market={market}
                selected={selectedOption === option.id}
                onSelect={setSelectedOption}
                disabled={!isOpen}
              />
            ))}
          </div>
        </div>

        {/* 下注面板 */}
        {isOpen && token && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 mb-6">
            <h2 className="font-bold text-slate-900 dark:text-white mb-4">下注</h2>

            <div className="flex items-center gap-2 mb-4 text-sm text-slate-500">
              <span>当前余额:</span>
              <span className="font-bold text-yellow-600">{balance}</span>
              <span>积分</span>
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  placeholder={`最低 ${market.min_bet} 积分`}
                  min={market.min_bet}
                  max={market.max_bet || undefined}
                  className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={handlePlaceBet}
                disabled={placing || !selectedOption || !betAmount}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-purple-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {placing ? <RefreshCw className="w-5 h-5 animate-spin" /> : '确认下注'}
              </button>
            </div>

            {/* 快捷金额 */}
            <div className="flex gap-2 mt-3">
              {[10, 50, 100, 200, 500].map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => setBetAmount(String(amount))}
                  className="px-3 py-1 text-sm bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  {amount}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  if (balance > 0 && window.confirm(`确定要全押 ${balance} 积分吗？此操作有风险！`)) {
                    setBetAmount(String(balance))
                  }
                }}
                className="px-3 py-1 text-sm bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50"
              >
                全押
              </button>
            </div>
          </div>
        )}

        {/* 未登录提示 */}
        {isOpen && !token && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 mb-6 text-center">
            <p className="text-slate-500 dark:text-slate-400 mb-4">登录后即可参与竞猜</p>
            <Link
              to="/login"
              className="inline-block px-6 py-2 bg-purple-500 text-white font-medium rounded-lg hover:bg-purple-600"
            >
              立即登录
            </Link>
          </div>
        )}

        {/* 我的下注记录 */}
        {myBets.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
            <h2 className="font-bold text-slate-900 dark:text-white mb-4">我的下注</h2>
            <div className="space-y-3">
              {myBets.map((bet) => (
                <div
                  key={bet.id}
                  className={`p-3 rounded-xl border ${
                    bet.status === 'WON'
                      ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                      : bet.status === 'LOST'
                      ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {bet.option_label}
                      </p>
                      <p className="text-sm text-slate-500">
                        下注 {bet.stake_points} 积分
                      </p>
                    </div>
                    <div className="text-right">
                      {bet.status === 'WON' && (
                        <p className="text-green-600 font-bold">
                          +{bet.payout_points} 积分
                        </p>
                      )}
                      {bet.status === 'LOST' && (
                        <p className="text-red-500 text-sm">未中奖</p>
                      )}
                      {bet.status === 'PLACED' && (
                        <p className="text-slate-500 text-sm">等待结算</p>
                      )}
                      {bet.status === 'REFUNDED' && (
                        <p className="text-blue-500 text-sm">已退款</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
