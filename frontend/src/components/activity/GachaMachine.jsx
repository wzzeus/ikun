/**
 * 扭蛋机组件
 * 消耗积分随机获得积分/道具奖励
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { Gift, Coins, Sparkles, Loader2, Star, Heart, Coffee, Zap, Pizza, HelpCircle, Ticket, Award, Key, Copy, Check, Package, RefreshCw, X } from 'lucide-react'
import api from '../../services/api'
import { gachaApi } from '../../services'
import { useToast } from '../Toast'
import { trackLottery } from '../../utils/analytics'
import GameHelpModal, { HelpButton } from './GameHelpModal'

// ============== 音效模块 ==============
const AudioContextClass = window.AudioContext || window.webkitAudioContext

// 单例 AudioContext，避免频繁创建导致内存泄漏
let sharedAudioContext = null

function getAudioContext() {
  if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
    sharedAudioContext = new AudioContextClass()
  }
  // 如果 AudioContext 被暂停（浏览器策略），尝试恢复
  if (sharedAudioContext.state === 'suspended') {
    sharedAudioContext.resume().catch(() => {})
  }
  return sharedAudioContext
}

/**
 * 播放扭蛋摇晃音效
 */
function playShakeSound() {
  try {
    const ctx = getAudioContext()
    const duration = 0.08

    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.frequency.value = 300 + Math.random() * 200
        osc.type = 'sine'

        gain.gain.setValueAtTime(0.1, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration)

        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + duration)
      }, i * 100)
    }
  } catch (e) {
    console.warn('音效播放失败:', e)
  }
}

/**
 * 播放扭蛋掉落音效
 */
function playDropSound() {
  try {
    const ctx = getAudioContext()

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.frequency.setValueAtTime(600, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.3)
    osc.type = 'sine'

    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)

    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.3)

    setTimeout(() => {
      const osc2 = ctx.createOscillator()
      const gain2 = ctx.createGain()

      osc2.connect(gain2)
      gain2.connect(ctx.destination)

      osc2.frequency.value = 150
      osc2.type = 'sine'

      gain2.gain.setValueAtTime(0.2, ctx.currentTime)
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1)

      osc2.start(ctx.currentTime)
      osc2.stop(ctx.currentTime + 0.1)
    }, 300)
  } catch (e) {
    console.warn('音效播放失败:', e)
  }
}

/**
 * 播放中奖音效
 */
function playWinSound() {
  try {
    const ctx = getAudioContext()

    const notes = [523, 659, 784, 1047]
    notes.forEach((freq, i) => {
      setTimeout(() => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.frequency.value = freq
        osc.type = 'sine'

        gain.gain.setValueAtTime(0.15, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2)

        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.2)
      }, i * 100)
    })

    setTimeout(() => {
      ;[1047, 1319, 1568].forEach((freq) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.frequency.value = freq
        osc.type = 'sine'

        gain.gain.setValueAtTime(0.1, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5)

        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.5)
      })
    }, 400)
  } catch (e) {
    console.warn('音效播放失败:', e)
  }
}

// 扭蛋颜色配置
const GACHA_COLORS = [
  'from-pink-400 to-rose-500',
  'from-purple-400 to-indigo-500',
  'from-blue-400 to-cyan-500',
  'from-green-400 to-emerald-500',
  'from-yellow-400 to-orange-500',
  'from-red-400 to-pink-500',
]

// 奖励类型图标映射
const rewardIcons = {
  points: Coins,
  item: Gift,
  api_key: Key,
}

// 道具图标映射
const itemIcons = {
  cheer: Heart,
  coffee: Coffee,
  energy: Zap,
  pizza: Pizza,
  star: Star,
}

/**
 * 获取奖励描述
 */
function getRewardDescription(prizeType, prizeValue, prizeName) {
  if (prizeType === 'points') {
    return `${prizeValue?.amount || 0} 积分`
  }
  if (prizeType === 'item') {
    const itemNames = {
      cheer: '爱心',
      coffee: '咖啡',
      energy: '能量',
      pizza: '披萨',
      star: '星星',
    }
    const itemName = itemNames[prizeValue?.item_type] || prizeValue?.item_type
    return `${prizeValue?.amount || 1}个 ${itemName}`
  }
  if (prizeType === 'badge') {
    return `徽章: ${prizeName}`
  }
  if (prizeType === 'api_key') {
    const quota = prizeValue?.quota ? `$${prizeValue.quota}` : ''
    const code = prizeValue?.code ? `${String(prizeValue.code).slice(0, 8)}****` : ''
    return `兑换码 ${quota} ${code}`.trim()
  }
  return prizeName || '神秘奖励'
}

/**
 * 获取奖励图标
 */
function getRewardIcon(prizeType, prizeValue) {
  if (prizeType === 'points') {
    return Coins
  }
  if (prizeType === 'item') {
    return itemIcons[prizeValue?.item_type] || Gift
  }
  if (prizeType === 'badge') {
    return Award
  }
  if (prizeType === 'api_key') {
    return Key
  }
  return Gift
}

/**
 * 单个扭蛋球组件
 */
function GachaBall({ colorClass, delay = 0, isSpinning = false }) {
  return (
    <div
      className={`absolute w-8 h-8 rounded-full bg-gradient-to-br ${colorClass} shadow-lg transition-all duration-300 ${
        isSpinning ? 'animate-bounce' : ''
      }`}
      style={{
        animationDelay: `${delay}ms`,
        boxShadow: '0 4px 15px rgba(0,0,0,0.2), inset 0 -2px 5px rgba(0,0,0,0.1), inset 0 2px 5px rgba(255,255,255,0.3)',
      }}
    >
      <div className="absolute top-1 left-1.5 w-2 h-2 bg-white/40 rounded-full" />
    </div>
  )
}

/**
 * 扭蛋机主组件
 */
export default function GachaMachine({ onBalanceUpdate, externalBalance, userRole, refreshTrigger }) {
  // 管理员不限次数
  const isAdmin = userRole === 'admin'
  const toast = useToast()
  const machineRef = useRef(null)
  const mountedRef = useRef(true)

  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [playing, setPlaying] = useState(false)
  const [result, setResult] = useState(null)
  const [showResult, setShowResult] = useState(false)
  const [isShaking, setIsShaking] = useState(false)
  const [ballsSpinning, setBallsSpinning] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [copied, setCopied] = useState(false)
  const copyTimeoutRef = useRef(null)
  const [testDrawing, setTestDrawing] = useState(false) // 管理员测试抽奖状态

  // 复制兑换码
  const copyApiKeyCode = async () => {
    if (!result?.prize_value?.code) return
    try {
      await navigator.clipboard.writeText(result.prize_value.code)
      setCopied(true)
      toast.success('兑换码已复制到剪贴板')
      // 清除之前的 timeout 防止叠加
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current)
      }
      copyTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          setCopied(false)
        }
      }, 2000)
    } catch (e) {
      toast.error('复制失败，请手动复制')
    }
  }

  // 加载扭蛋机状态
  const loadStatus = useCallback(async () => {
    try {
      const data = await api.get('/gacha/status')
      if (mountedRef.current) {
        setStatus(data)
      }
    } catch (error) {
      console.error('加载扭蛋机状态失败:', error)
      if (mountedRef.current) {
        toast.error('加载扭蛋机状态失败')
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, [toast])

  useEffect(() => {
    mountedRef.current = true
    loadStatus()
    return () => {
      mountedRef.current = false
      // 清理复制 timeout
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current)
      }
    }
  }, [loadStatus])

  // 兑换券后刷新状态
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      loadStatus()
    }
  }, [refreshTrigger, loadStatus])

  // 当外部余额变化时，同步更新内部状态
  useEffect(() => {
    if (externalBalance === undefined || !status) return
    if (status.user_balance === externalBalance) return

    const tickets = status.gacha_tickets || 0
    // 管理员不受每日限制
    const canPlayWithPoints = externalBalance >= status.cost && (isAdmin || status.remaining_today > 0)
    setStatus(prev => ({
      ...prev,
      user_balance: externalBalance,
      can_play: tickets > 0 || canPlayWithPoints,
    }))
  }, [externalBalance, isAdmin])

  // 执行抽奖
  const handlePlay = async () => {
    // 管理员只检查积分够不够，不检查每日限制
    const adminCanPlay = isAdmin && status?.user_balance >= status?.cost
    if (playing || (!status?.can_play && !adminCanPlay)) return

    setPlaying(true)
    setResult(null)
    setShowResult(false)

    // 开始动画
    setIsShaking(true)
    setBallsSpinning(true)

    playShakeSound()
    const shakeInterval = setInterval(() => {
      if (mountedRef.current) playShakeSound()
    }, 400)

    await new Promise((resolve) => setTimeout(resolve, 2000))

    clearInterval(shakeInterval)

    if (!mountedRef.current) return

    try {
      // 如果有扭蛋券，优先使用券
      const hasTicket = (status?.gacha_tickets || 0) > 0
      const data = await api.post('/gacha/play', { use_ticket: hasTicket })

      if (!mountedRef.current) return

      setResult(data)

      // 更新状态（包含次数和券数量）
      setStatus((prev) => {
        const newTickets = data.used_ticket ? Math.max(0, (prev.gacha_tickets || 0) - 1) : prev.gacha_tickets
        // 用券不消耗每日次数（后端只统计消耗积分的次数）
        const newTodayCount = data.used_ticket ? prev.today_count : (prev.today_count || 0) + 1
        // 使用 ?? 避免 remaining_today === 0 时错误地使用 daily_limit
        const newRemainingToday = data.used_ticket
          ? (prev.remaining_today ?? prev.daily_limit)
          : Math.max(0, (prev.remaining_today ?? prev.daily_limit) - 1)
        // can_play 逻辑：有券可以玩（不受每日限制），或者积分够且未达每日限制（管理员不受限）
        const canPlayWithPoints = data.remaining_balance >= prev.cost && (isAdmin || newRemainingToday > 0)
        return {
          ...prev,
          user_balance: data.remaining_balance,
          gacha_tickets: newTickets,
          today_count: newTodayCount,
          remaining_today: newRemainingToday,
          can_play: newTickets > 0 || canPlayWithPoints,
        }
      })

      // 通知父组件更新余额
      if (onBalanceUpdate) {
        onBalanceUpdate(data.remaining_balance)
      }

      // 刷新状态
      loadStatus()

      // 停止摇晃
      setIsShaking(false)
      setBallsSpinning(false)

      playDropSound()

      setTimeout(() => {
        if (mountedRef.current) {
          setShowResult(true)
          playWinSound()
        }
      }, 400)

      const rewardDesc = getRewardDescription(data.prize_type, data.prize_value, data.prize_name)
      toast.success(`恭喜获得：${rewardDesc}`, {
        title: '扭蛋成功',
        duration: 5000,
      })

      trackLottery('gacha', status?.cost || 50, rewardDesc)
    } catch (error) {
      if (!mountedRef.current) return

      setIsShaking(false)
      setBallsSpinning(false)

      const message =
        error?.response?.data?.detail ||
        (error?.response ? '抽奖失败' : '网络错误，请稍后重试')
      toast.error(message)

      if ([400, 404, 409].includes(error?.response?.status)) {
        loadStatus()
      }
    } finally {
      if (mountedRef.current) {
        setPlaying(false)
      }
    }
  }

  // 关闭结果弹窗
  const handleCloseResult = () => {
    setShowResult(false)
    setResult(null)
    setCopied(false)
    // 清除复制 timeout
    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current)
      copyTimeoutRef.current = null
    }
  }

  // 再抽一次
  const handlePlayAgain = () => {
    setShowResult(false)
    setResult(null)
    setCopied(false)
    // 清除复制 timeout
    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current)
      copyTimeoutRef.current = null
    }
    handlePlay()
  }

  // 管理员测试：直接抽中 API Key
  const handleTestDraw = async () => {
    if (!isAdmin || testDrawing) return
    setTestDrawing(true)
    try {
      const result = await gachaApi.adminTestDrawApiKey()
      if (result.success) {
        // 构造一个和普通抽奖类似的奖品对象并显示
        setResult({
          prize_type: 'api_key',
          prize_name: result.prize_name,
          prize_value: { code: result.api_key_code, quota: result.api_key_quota },
          is_rare: true,
          remaining_balance: status?.user_balance || 0,
        })
        setShowResult(true)
        playWinSound()
        toast.success(`测试成功！${result.message}`)
      } else {
        toast.warning(result.message || 'API Key 库存不足')
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || '测试失败')
    } finally {
      setTestDrawing(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 overflow-hidden">
      {/* 标题区 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl">
            <Gift className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white">神秘扭蛋机</h3>
            <p className="text-sm text-slate-500">
              {(status?.gacha_tickets || 0) > 0 ? (
                <span className="text-green-600 dark:text-green-400">免费券×{status.gacha_tickets}</span>
              ) : (
                <>{status?.cost || 50}积分/次</>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {status?.daily_limit > 0 && !isAdmin && (
            <div className="text-sm text-slate-500">
              今日: {status?.today_count || 0}/{status?.daily_limit}
            </div>
          )}
          {isAdmin && (
            <div className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
              ∞ 无限
            </div>
          )}
          <HelpButton onClick={() => setShowHelp(true)} />
        </div>
      </div>

      {/* 扭蛋机帮助弹窗 */}
      <GameHelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} title="扭蛋机玩法">
        <div className="space-y-4">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
            <h4 className="font-bold text-indigo-700 dark:text-indigo-300 mb-2 flex items-center gap-2">
              <Gift className="w-4 h-4" /> 基本规则
            </h4>
            <ul className="text-sm text-indigo-600 dark:text-indigo-400 space-y-1">
              <li>• 每次扭蛋消耗 <span className="font-bold">{status?.cost || 50}</span> 积分</li>
              <li>• 每日限玩 <span className="font-bold">{status?.daily_limit || 30}</span> 次</li>
              <li>• 点击"开始扭蛋"按钮进行游戏</li>
            </ul>
          </div>
          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
            <h4 className="font-bold text-purple-700 dark:text-purple-300 mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> 奖品说明
            </h4>
            <ul className="text-sm text-purple-600 dark:text-purple-400 space-y-1">
              <li>• <span className="font-bold">积分奖励(65%)</span>：10-500积分</li>
              <li>• <span className="font-bold">道具奖励(19%)</span>：爱心、咖啡、能量、披萨、星星</li>
              <li>• <span className="font-bold">徽章奖励(16%)</span>：六级徽章可兑换积分</li>
            </ul>
          </div>
          {/* 徽章概率说明 */}
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
            <h4 className="font-bold text-yellow-700 dark:text-yellow-300 mb-2 flex items-center gap-2">
              <Award className="w-4 h-4" /> 徽章概率与兑换
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between items-center p-1.5 bg-amber-100 dark:bg-amber-900/30 rounded">
                <span className="text-amber-700 dark:text-amber-300">🥉 铜蛋</span>
                <span className="text-amber-600">4% · +50分</span>
              </div>
              <div className="flex justify-between items-center p-1.5 bg-slate-100 dark:bg-slate-700/50 rounded">
                <span className="text-slate-700 dark:text-slate-300">🥈 银蛋</span>
                <span className="text-slate-600 dark:text-slate-400">2% · +100分</span>
              </div>
              <div className="flex justify-between items-center p-1.5 bg-yellow-100 dark:bg-yellow-900/30 rounded">
                <span className="text-yellow-700 dark:text-yellow-300">🥇 金蛋</span>
                <span className="text-yellow-600">1.5% · +200分</span>
              </div>
              <div className="flex justify-between items-center p-1.5 bg-cyan-100 dark:bg-cyan-900/30 rounded">
                <span className="text-cyan-700 dark:text-cyan-300">💎 钻蛋</span>
                <span className="text-cyan-600">0.5% · +500分</span>
              </div>
              <div className="flex justify-between items-center p-1.5 bg-pink-100 dark:bg-pink-900/30 rounded border border-pink-300 dark:border-pink-700">
                <span className="text-pink-700 dark:text-pink-300 font-medium">⭐ 星耀</span>
                <span className="text-pink-600 font-bold">5% · +1000分</span>
              </div>
              <div className="flex justify-between items-center p-1.5 bg-gradient-to-r from-red-100 to-orange-100 dark:from-red-900/30 dark:to-orange-900/30 rounded border border-red-300 dark:border-red-700">
                <span className="text-red-700 dark:text-red-300 font-medium">👑 王者</span>
                <span className="text-red-600 font-bold">3% · +2000分</span>
              </div>
            </div>
            <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">徽章可在「任务中心」兑换积分，重复获得自动转换</p>
          </div>
          <div className="p-3 bg-pink-50 dark:bg-pink-900/20 rounded-xl">
            <h4 className="font-bold text-pink-700 dark:text-pink-300 mb-2 flex items-center gap-2">
              <Heart className="w-4 h-4" /> 道具用途
            </h4>
            <div className="grid grid-cols-5 gap-1 text-center mb-2">
              <div className="p-1 bg-white/50 dark:bg-slate-800/50 rounded-lg">
                <Heart className="w-4 h-4 mx-auto text-red-500" />
                <div className="text-xs text-slate-500">爱心</div>
              </div>
              <div className="p-1 bg-white/50 dark:bg-slate-800/50 rounded-lg">
                <Coffee className="w-4 h-4 mx-auto text-amber-600" />
                <div className="text-xs text-slate-500">咖啡</div>
              </div>
              <div className="p-1 bg-white/50 dark:bg-slate-800/50 rounded-lg">
                <Zap className="w-4 h-4 mx-auto text-yellow-500" />
                <div className="text-xs text-slate-500">能量</div>
              </div>
              <div className="p-1 bg-white/50 dark:bg-slate-800/50 rounded-lg">
                <Pizza className="w-4 h-4 mx-auto text-orange-500" />
                <div className="text-xs text-slate-500">披萨</div>
              </div>
              <div className="p-1 bg-white/50 dark:bg-slate-800/50 rounded-lg">
                <Star className="w-4 h-4 mx-auto text-purple-500" />
                <div className="text-xs text-slate-500">星星</div>
              </div>
            </div>
            <p className="text-xs text-pink-600 dark:text-pink-400">道具可在选手详情页为选手打气使用</p>
          </div>
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
            <h4 className="font-bold text-green-700 dark:text-green-300 mb-2 flex items-center gap-2">
              <Coins className="w-4 h-4" /> 温馨提示
            </h4>
            <ul className="text-sm text-green-600 dark:text-green-400 space-y-1">
              <li>• 奖励即时发放到账户</li>
              <li>• 理性娱乐，适度游戏</li>
            </ul>
          </div>
        </div>
      </GameHelpModal>

      {/* 扭蛋机主体 */}
      <div className="relative flex justify-center mb-4 sm:mb-6">
        <div
          ref={machineRef}
          className={`relative w-40 h-48 sm:w-48 sm:h-56 transition-transform ${
            isShaking ? 'animate-[shake_0.1s_ease-in-out_infinite]' : ''
          }`}
        >
          {/* 机器顶部 */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 sm:w-36 h-6 sm:h-8 bg-gradient-to-b from-red-500 to-red-600 rounded-t-3xl shadow-lg">
            <div className="absolute top-1 left-1/2 -translate-x-1/2 w-16 sm:w-20 h-1.5 sm:h-2 bg-red-400 rounded-full" />
          </div>

          {/* 透明玻璃罩 */}
          <div className="absolute top-5 sm:top-6 left-1/2 -translate-x-1/2 w-32 sm:w-40 h-26 sm:h-32 bg-gradient-to-b from-sky-100/80 to-sky-50/60 dark:from-slate-700/80 dark:to-slate-600/60 rounded-[40%] border-4 border-red-400 overflow-hidden">
            <div className="absolute inset-0 flex flex-wrap justify-center items-end p-2 gap-1">
              {GACHA_COLORS.map((color, idx) => (
                <div
                  key={idx}
                  className="relative"
                  style={{
                    left: `${(idx % 3) * 12 - 12}px`,
                    bottom: `${Math.floor(idx / 3) * 10}px`,
                  }}
                >
                  <GachaBall colorClass={color} delay={idx * 100} isSpinning={ballsSpinning} />
                </div>
              ))}
            </div>
            <div className="absolute top-2 left-3 w-8 h-16 bg-white/20 rounded-full transform -rotate-12" />
          </div>

          {/* 出口部分 */}
          <div className="absolute bottom-8 sm:bottom-10 left-1/2 -translate-x-1/2 w-26 sm:w-32 h-14 sm:h-16 bg-gradient-to-b from-red-600 to-red-700 rounded-b-xl shadow-lg">
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 sm:w-14 h-8 sm:h-10 bg-slate-900 rounded-b-2xl">
              <div className="absolute inset-1 bg-gradient-to-b from-slate-800 to-slate-900 rounded-b-xl" />
            </div>
          </div>

          {/* 底座 */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-36 sm:w-44 h-10 sm:h-12 bg-gradient-to-b from-red-700 to-red-800 rounded-xl shadow-lg">
            <div className="absolute top-1.5 sm:top-2 left-1/2 -translate-x-1/2 w-28 sm:w-36 h-1.5 sm:h-2 bg-red-600 rounded-full" />
          </div>

          {/* 摇杆 */}
          <div className="absolute right-0 top-20 sm:top-24 w-5 sm:w-6 h-14 sm:h-16">
            <div className="w-2.5 sm:w-3 h-10 sm:h-12 bg-gradient-to-b from-slate-300 to-slate-400 rounded-full mx-auto" />
            <div className="w-5 sm:w-6 h-5 sm:h-6 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full shadow-lg -mt-1 flex items-center justify-center">
              <div className="w-1.5 sm:w-2 h-1.5 sm:h-2 bg-yellow-300 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* 状态信息 */}
      <div className="flex items-center justify-center gap-4 mb-4">
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <Coins className="w-4 h-4 text-yellow-500" />
          <span className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
            余额：{status?.user_balance || 0}
          </span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
          <Gift className="w-4 h-4 text-purple-500" />
          <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
            消耗：{status?.cost || 50}
          </span>
        </div>
      </div>

      {/* 抽奖按钮 */}
      <button
        onClick={handlePlay}
        disabled={playing || (!status?.can_play && !isAdmin) || (isAdmin && status?.user_balance < status?.cost && (status?.gacha_tickets || 0) === 0)}
        className={`w-full py-3.5 rounded-xl font-bold text-lg transition-all ${
          (!status?.can_play && !isAdmin) || (isAdmin && status?.user_balance < status?.cost && (status?.gacha_tickets || 0) === 0)
            ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:shadow-lg hover:shadow-purple-500/30 hover:-translate-y-0.5 active:translate-y-0'
        }`}
      >
        {playing ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            扭蛋中...
          </span>
        ) : !status?.can_play && !isAdmin ? (
          status?.daily_limit && status?.remaining_today <= 0 ? (
            '今日次数已用完'
          ) : status?.user_balance < status?.cost && (status?.gacha_tickets || 0) === 0 ? (
            '积分不足'
          ) : (
            '暂不可用'
          )
        ) : !status?.can_play && isAdmin && status?.user_balance < status?.cost && (status?.gacha_tickets || 0) === 0 ? (
          '积分不足'
        ) : (status?.gacha_tickets || 0) > 0 ? (
          <span className="flex items-center justify-center gap-2">
            <Ticket className="w-5 h-5" />
            使用免费券
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5" />
            开始扭蛋
          </span>
        )}
      </button>

      {/* 提示 */}
      <p className="text-center text-xs text-slate-400 mt-3">
        每次扭蛋随机获得积分或道具奖励，奖励即时到账
      </p>

      {/* 管理员测试按钮 */}
      {isAdmin && (
        <button
          onClick={handleTestDraw}
          disabled={testDrawing}
          className="w-full mt-3 py-2 rounded-lg text-sm font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors flex items-center justify-center gap-2"
        >
          {testDrawing ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Key className="w-4 h-4" />
              测试：直接抽中API Key
            </>
          )}
        </button>
      )}

      {/* 结果弹窗 */}
      {showResult && result && (() => {
        // 检测是否是 API Key 已发完的情况
        const prizeType = String(result.prize_type || '').toLowerCase()
        const isApiKeyOutOfStock = result.prize_name?.includes('已发完') ||
          (prizeType === 'empty' && result.prize_value?.message?.includes('抽完'))

        // API Key 已发完 - 显示友好提示
        if (isApiKeyOutOfStock) {
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleCloseResult} />
              <div className="relative bg-gradient-to-br from-slate-700 to-slate-800 rounded-2xl shadow-2xl w-full max-w-sm sm:max-w-md overflow-hidden border border-slate-600/30 animate-[scaleIn_0.3s_ease-out]">
                <div className="relative p-4 sm:p-6 text-center">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 sm:mb-4 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-full flex items-center justify-center border border-amber-400/30">
                    <Package className="w-8 h-8 sm:w-10 sm:h-10 text-amber-400" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-white mb-2">很抱歉</h3>
                  <p className="text-sm sm:text-base text-slate-300 mb-2">
                    今日 API Key 兑换码库存不足
                  </p>
                  <p className="text-xs text-slate-400 mb-4">
                    感谢您的参与，请明日再来试试运气吧～
                  </p>

                  {/* 剩余积分 */}
                  <div className="bg-black/20 rounded-lg px-3 sm:px-4 py-2 mb-3 sm:mb-4">
                    <p className="text-xs text-slate-400">剩余积分</p>
                    <p className="font-bold text-white text-base sm:text-lg">{result.remaining_balance}</p>
                  </div>

                  <div className="flex gap-2 sm:gap-3">
                    <button onClick={handleCloseResult} className="flex-1 py-2 sm:py-2.5 text-sm sm:text-base bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors">
                      我知道了
                    </button>
                    {status?.can_play && result.remaining_balance >= status?.cost && (
                      <button onClick={handlePlayAgain} className="flex-1 py-2 sm:py-2.5 text-sm sm:text-base bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-lg hover:shadow-lg transition-all">
                        再来一次
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <style>{`@keyframes scaleIn { 0% { transform: scale(0.8); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }`}</style>
            </div>
          )
        }

        // 正常中奖弹窗 - 与抽奖组件统一样式
        const isApiKeyPrize = result.prize_type === 'api_key' && result.prize_value?.code
        // 测试模式：积分未变化但有兑换码（管理员测试抽奖）
        const isTestMode = result.remaining_balance === (status?.user_balance || 0) && isApiKeyPrize
        // API Key 或稀有奖品使用黄橙色主题
        const isRareTheme = result.is_rare || isApiKeyPrize
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleCloseResult} />
            <div className={`relative bg-gradient-to-br ${isRareTheme ? 'from-yellow-600 via-orange-600 to-red-600' : 'from-purple-800 via-pink-800 to-rose-800'} rounded-2xl shadow-2xl w-full max-w-sm sm:max-w-md overflow-hidden border ${isRareTheme ? 'border-yellow-400/50' : 'border-purple-500/30'} animate-[scaleIn_0.3s_ease-out]`}>
              {/* 装饰粒子 */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(20)].map((_, i) => (
                  <div
                    key={i}
                    className={`absolute w-1.5 h-1.5 sm:w-2 sm:h-2 ${isRareTheme ? 'bg-yellow-300' : 'bg-purple-300'} rounded-full animate-ping`}
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                      animationDelay: `${Math.random() * 2}s`,
                      animationDuration: `${1 + Math.random()}s`,
                    }}
                  />
                ))}
              </div>

              <div className="relative p-4 sm:p-6 text-center">
                {/* 关闭按钮 */}
                <button onClick={handleCloseResult} className="absolute top-2 right-2 sm:top-3 sm:right-3 p-1.5 hover:bg-white/10 rounded-lg transition-colors">
                  <X className="w-4 h-4 sm:w-5 sm:h-5 text-white/70" />
                </button>

                {/* 奖励图标 */}
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-3 sm:mb-4">
                  <div className={`absolute inset-0 bg-gradient-to-br ${isRareTheme ? 'from-yellow-400 to-orange-500' : 'from-purple-400 to-pink-500'} rounded-full shadow-2xl ${isRareTheme ? 'animate-pulse' : ''}`}>
                    <div className="absolute top-2 sm:top-3 left-3 sm:left-4 w-5 sm:w-6 h-5 sm:h-6 bg-white/30 rounded-full" />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    {(() => {
                      const Icon = getRewardIcon(result.prize_type, result.prize_value)
                      return <Icon className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
                    })()}
                  </div>
                </div>

                <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
                  {isRareTheme ? '大奖来袭！' : '恭喜中奖！'}
                </h3>

                {/* 奖励展示 */}
                <div className="bg-white/10 rounded-xl p-3 sm:p-4 mb-3 sm:mb-4">
                  <div className={`text-lg sm:text-2xl font-bold ${isRareTheme ? 'text-yellow-300' : 'text-purple-200'}`}>
                    {isApiKeyPrize ? 'API Key 兑换码' : getRewardDescription(result.prize_type, result.prize_value, result.prize_name)}
                  </div>
                  {isRareTheme && (
                    <div className="flex items-center justify-center gap-1 mt-2 text-yellow-400">
                      <Star className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="text-xs sm:text-sm font-medium">稀有奖品</span>
                      <Star className="w-3 h-3 sm:w-4 sm:h-4" />
                    </div>
                  )}

                  {/* API Key 兑换码显示区 */}
                  {isApiKeyPrize && (
                    <div className="mt-2 sm:mt-3 p-2 sm:p-3 bg-black/30 rounded-lg">
                      <p className="text-xs text-yellow-400/80 mb-1 sm:mb-2">兑换码（请妥善保存）</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 bg-black/40 px-2 sm:px-3 py-1.5 sm:py-2 rounded text-xs sm:text-sm text-yellow-300 font-mono break-all select-all">
                          {result.prize_value.code}
                        </code>
                        <button
                          onClick={copyApiKeyCode}
                          className={`p-1.5 sm:p-2 rounded-lg transition-all ${
                            copied
                              ? 'bg-green-500/30 text-green-300'
                              : 'bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30'
                          }`}
                          title={copied ? '已复制' : '复制兑换码'}
                        >
                          {copied ? <Check className="w-4 h-4 sm:w-5 sm:h-5" /> : <Copy className="w-4 h-4 sm:w-5 sm:h-5" />}
                        </button>
                      </div>
                      {result.prize_value.quota > 0 && (
                        <p className="text-xs text-yellow-400/60 mt-1 sm:mt-2">额度：${result.prize_value.quota}</p>
                      )}
                      <p className="text-xs text-white/50 mt-1 sm:mt-2">可在背包中随时查看已获得的兑换码</p>
                    </div>
                  )}

                  <p className="text-purple-200 text-xs sm:text-sm mt-2">奖励已发放到您的账户</p>
                </div>

                {/* 按钮 */}
                <div className="flex gap-2 sm:gap-3">
                  <button onClick={handleCloseResult} className="flex-1 py-2 sm:py-2.5 text-sm sm:text-base bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors">
                    好的
                  </button>
                  {!isTestMode && status?.can_play && result.remaining_balance >= status?.cost && (
                    <button onClick={handlePlayAgain} className="flex-1 py-2 sm:py-2.5 text-sm sm:text-base bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-medium rounded-lg hover:shadow-lg transition-all">
                      再来一次
                    </button>
                  )}
                </div>
              </div>
            </div>
            <style>{`@keyframes scaleIn { 0% { transform: scale(0.8); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }`}</style>
          </div>
        )
      })()}

      {/* CSS 动画 */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0) rotate(0deg); }
          25% { transform: translateX(-3px) rotate(-1deg); }
          75% { transform: translateX(3px) rotate(1deg); }
        }
        @keyframes scaleIn {
          0% { transform: scale(0.8); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
