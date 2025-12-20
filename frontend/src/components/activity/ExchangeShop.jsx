import { useState, useEffect, useCallback } from 'react'
import {
  ShoppingBag,
  Ticket,
  Gift,
  Key,
  Package,
  Coins,
  RefreshCw,
  ChevronRight,
  Sparkles,
  AlertCircle,
  Check,
  X,
  Clock,
  History,
  Star,
  Flame,
} from 'lucide-react'
import { exchangeApi } from '../../services'
import { useToast } from '../Toast'
import { trackExchange } from '../../utils/analytics'

// 商品图标映射
const itemIcons = {
  LOTTERY_TICKET: Ticket,
  SCRATCH_TICKET: Gift,
  GACHA_TICKET: Package,
  API_KEY: Key,
  ITEM: Star,
}

// 商品颜色映射
const itemColors = {
  LOTTERY_TICKET: {
    bg: 'from-purple-500 to-pink-500',
    light: 'bg-purple-50 dark:bg-purple-900/20',
    text: 'text-purple-600 dark:text-purple-400',
    border: 'border-purple-200 dark:border-purple-800',
    ring: 'ring-purple-500',
  },
  SCRATCH_TICKET: {
    bg: 'from-orange-500 to-red-500',
    light: 'bg-orange-50 dark:bg-orange-900/20',
    text: 'text-orange-600 dark:text-orange-400',
    border: 'border-orange-200 dark:border-orange-800',
    ring: 'ring-orange-500',
  },
  GACHA_TICKET: {
    bg: 'from-cyan-500 to-blue-500',
    light: 'bg-cyan-50 dark:bg-cyan-900/20',
    text: 'text-cyan-600 dark:text-cyan-400',
    border: 'border-cyan-200 dark:border-cyan-800',
    ring: 'ring-cyan-500',
  },
  API_KEY: {
    bg: 'from-yellow-500 to-amber-500',
    light: 'bg-yellow-50 dark:bg-yellow-900/20',
    text: 'text-yellow-600 dark:text-yellow-400',
    border: 'border-yellow-200 dark:border-yellow-800',
    ring: 'ring-yellow-500',
  },
  ITEM: {
    bg: 'from-green-500 to-emerald-500',
    light: 'bg-green-50 dark:bg-green-900/20',
    text: 'text-green-600 dark:text-green-400',
    border: 'border-green-200 dark:border-green-800',
    ring: 'ring-green-500',
  },
}

// 商品卡片组件
function ExchangeItemCard({ item, userInfo, onExchange, exchanging }) {
  const Icon = itemIcons[item.item_type] || Gift
  const colors = itemColors[item.item_type] || itemColors.ITEM
  const canAfford = userInfo?.balance >= item.cost_points
  const hasStock = item.has_stock

  return (
    <div
      className={`relative bg-white dark:bg-slate-900 rounded-xl border ${colors.border} p-4 transition-all hover:shadow-lg hover:scale-[1.02] ${
        !canAfford || !hasStock ? 'opacity-60' : ''
      }`}
    >
      {/* 热门标签 */}
      {item.is_hot && (
        <div className="absolute -top-2 -right-2 flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs font-bold rounded-full shadow-lg">
          <Flame className="w-3 h-3" />
          热门
        </div>
      )}

      {/* 图标和名称 */}
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2.5 bg-gradient-to-br ${colors.bg} rounded-xl shadow-lg`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-slate-900 dark:text-white truncate">
            {item.name}
          </h4>
          {item.description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {item.description}
            </p>
          )}
        </div>
      </div>

      {/* 价格和限购信息 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1">
          <Coins className="w-4 h-4 text-yellow-500" />
          <span className="text-lg font-bold text-yellow-600">{item.cost_points}</span>
          <span className="text-xs text-slate-400">积分</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          {item.daily_limit && (
            <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">
              每日限{item.daily_limit}
            </span>
          )}
          {item.total_limit && (
            <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">
              限购{item.total_limit}
            </span>
          )}
        </div>
      </div>

      {/* 库存状态 */}
      {item.stock !== null && (
        <div className="flex items-center justify-between text-xs mb-3">
          <span className="text-slate-500">库存</span>
          <span className={`font-medium ${item.stock > 0 ? 'text-green-600' : 'text-red-500'}`}>
            {item.stock > 0 ? `剩余 ${item.stock}` : '已售罄'}
          </span>
        </div>
      )}

      {/* 兑换按钮 */}
      <button
        onClick={() => onExchange(item)}
        disabled={exchanging || !canAfford || !hasStock}
        className={`w-full py-2.5 rounded-lg font-medium text-sm transition-all ${
          !canAfford
            ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
            : !hasStock
            ? 'bg-red-100 dark:bg-red-900/30 text-red-400 cursor-not-allowed'
            : `bg-gradient-to-r ${colors.bg} text-white hover:shadow-lg hover:shadow-${colors.ring}/30`
        }`}
      >
        {exchanging ? (
          <RefreshCw className="w-4 h-4 animate-spin mx-auto" />
        ) : !canAfford ? (
          '积分不足'
        ) : !hasStock ? (
          '已售罄'
        ) : (
          <span className="flex items-center justify-center gap-2">
            <ShoppingBag className="w-4 h-4" />
            立即兑换
          </span>
        )}
      </button>
    </div>
  )
}

// 兑换成功弹窗
function ExchangeSuccessModal({ result, onClose }) {
  if (!result) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
        {/* 成功图标 */}
        <div className="flex flex-col items-center pt-8 pb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mb-4 shadow-lg">
            <Check className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">兑换成功</h3>
        </div>

        {/* 兑换详情 */}
        <div className="px-6 pb-6">
          <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-500">商品</span>
              <span className="font-medium text-slate-900 dark:text-white">
                {result.item_name} x{result.quantity}
              </span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-500">消费积分</span>
              <span className="font-medium text-yellow-600">-{result.cost_points}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">剩余积分</span>
              <span className="font-bold text-slate-900 dark:text-white">{result.balance}</span>
            </div>
          </div>

          {result.message && (
            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 mb-4">
              <p className="text-sm text-green-600 dark:text-green-400 text-center">
                {result.message}
              </p>
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-xl hover:shadow-lg transition-all"
          >
            知道了
          </button>
        </div>
      </div>
    </div>
  )
}

// 兑换历史弹窗
function ExchangeHistoryModal({ onClose }) {
  const [loading, setLoading] = useState(true)
  const [history, setHistory] = useState([])

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const data = await exchangeApi.getHistory({ limit: 20 })
        setHistory(data)
      } catch (error) {
        console.error('加载兑换历史失败:', error)
      } finally {
        setLoading(false)
      }
    }
    loadHistory()
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl">
              <History className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white">兑换记录</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="space-y-3">
              {Array(3).fill(0).map((_, i) => (
                <div key={i} className="animate-pulse bg-slate-100 dark:bg-slate-800 rounded-xl h-20" />
              ))}
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <ShoppingBag className="w-16 h-16 text-slate-300 dark:text-slate-600 mb-4" />
              <p className="text-slate-500 dark:text-slate-400">暂无兑换记录</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((record) => {
                const Icon = itemIcons[record.item_type] || Gift
                const colors = itemColors[record.item_type] || itemColors.ITEM

                return (
                  <div
                    key={record.id}
                    className={`p-3 rounded-xl border ${colors.border} ${colors.light}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 bg-gradient-to-br ${colors.bg} rounded-lg`}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 dark:text-white truncate">
                          {record.item_name} x{record.quantity}
                        </p>
                        <p className="text-xs text-slate-500">
                          {new Date(record.created_at).toLocaleString('zh-CN')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-yellow-600">-{record.cost_points}</p>
                        <p className="text-xs text-slate-400">积分</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// 主组件
export default function ExchangeShop({ balance: externalBalance, onBalanceUpdate, onExchangeSuccess }) {
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState([])
  const [userInfo, setUserInfo] = useState(null)
  const [exchanging, setExchanging] = useState(false)
  const [exchangeResult, setExchangeResult] = useState(null)
  const [showHistory, setShowHistory] = useState(false)

  // 优先使用外部传入的余额，实现实时同步
  const currentBalance = externalBalance ?? userInfo?.balance ?? 0

  // 加载数据
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [itemsData, infoData] = await Promise.all([
        exchangeApi.getItems(),
        exchangeApi.getInfo(),
      ])
      setItems(itemsData)
      setUserInfo(infoData)
    } catch (error) {
      console.error('加载积分商城失败:', error)
      toast.error('加载失败，请重试')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  // 执行兑换
  const handleExchange = async (item) => {
    if (exchanging) return

    setExchanging(true)
    try {
      const result = await exchangeApi.redeem(item.id, 1)
      setExchangeResult(result)
      setUserInfo((prev) => ({ ...prev, balance: result.balance }))
      onBalanceUpdate?.(result.balance)
      trackExchange(item.id, item.name, item.cost_points)
      // 重新加载商品列表（更新库存）
      const itemsData = await exchangeApi.getItems()
      setItems(itemsData)
      // 通知父组件刷新券相关状态（让扭蛋机、刮刮乐等组件更新）
      onExchangeSuccess?.(item.item_type)
    } catch (error) {
      toast.error(error.response?.data?.detail || '兑换失败')
    } finally {
      setExchanging(false)
    }
  }

  // 关闭成功弹窗
  const handleCloseResult = () => {
    setExchangeResult(null)
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" />
          <div>
            <div className="w-24 h-5 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-1" />
            <div className="w-16 h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array(4).fill(0).map((_, i) => (
            <div key={i} className="h-40 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl">
            <ShoppingBag className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white">积分商城</h3>
            <p className="text-sm text-slate-500">用积分兑换好礼</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* 我的券 */}
          {userInfo && (userInfo.lottery_tickets > 0 || userInfo.scratch_tickets > 0 || userInfo.gacha_tickets > 0) && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">
              {userInfo.lottery_tickets > 0 && (
                <span className="flex items-center gap-1 text-purple-600">
                  <Ticket className="w-3 h-3" />
                  {userInfo.lottery_tickets}
                </span>
              )}
              {userInfo.scratch_tickets > 0 && (
                <span className="flex items-center gap-1 text-orange-600">
                  <Gift className="w-3 h-3" />
                  {userInfo.scratch_tickets}
                </span>
              )}
              {userInfo.gacha_tickets > 0 && (
                <span className="flex items-center gap-1 text-cyan-600">
                  <Package className="w-3 h-3" />
                  {userInfo.gacha_tickets}
                </span>
              )}
            </div>
          )}
          {/* 兑换记录 */}
          <button
            onClick={() => setShowHistory(true)}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
          >
            <History className="w-4 h-4" />
            记录
          </button>
        </div>
      </div>

      {/* 商品列表 */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Package className="w-16 h-16 text-slate-300 dark:text-slate-600 mb-4" />
          <p className="text-slate-500 dark:text-slate-400">暂无商品</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {items.map((item) => (
            <ExchangeItemCard
              key={item.id}
              item={item}
              userInfo={{ ...userInfo, balance: currentBalance }}
              onExchange={handleExchange}
              exchanging={exchanging}
            />
          ))}
        </div>
      )}

      {/* 提示信息 */}
      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
        <p className="text-xs text-blue-600 dark:text-blue-400">
          <span className="font-medium">温馨提示：</span>
          兑换的抽奖券/刮刮乐券/扭蛋券可在对应活动中免费使用一次
        </p>
      </div>

      {/* 兑换成功弹窗 */}
      {exchangeResult && (
        <ExchangeSuccessModal result={exchangeResult} onClose={handleCloseResult} />
      )}

      {/* 兑换记录弹窗 */}
      {showHistory && (
        <ExchangeHistoryModal onClose={() => setShowHistory(false)} />
      )}
    </div>
  )
}
