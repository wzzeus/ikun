/**
 * 刮刮乐组件
 * 使用 Canvas 实现刮刮乐效果
 */
import { useState, useRef, useEffect, useCallback } from 'react'
import { Ticket, Sparkles, Gift, RefreshCw, Coins, Star, AlertCircle, Key, Heart, Coffee, Zap, Pizza, X, HelpCircle, Copy, CheckCircle, Package } from 'lucide-react'
import { lotteryApi } from '../../services'
import { useToast } from '../Toast'
import { trackLottery } from '../../utils/analytics'
import GameHelpModal, { HelpButton } from './GameHelpModal'

// 中奖庆祝弹窗组件
function WinCelebrationModal({ prize, onClose, onPlayAgain, canPlayAgain }) {
  const [copied, setCopied] = useState(false)

  // 检测是否是 API Key 库存不足的情况
  const prizeName = prize?.prize_name || ''
  const prizeType = String(prize?.prize_type || '').toLowerCase()
  const isOutOfStock = prizeName.includes('已发完')
  const isEmptyPrize = prizeType === 'empty'

  // 奖品图标映射
  const getPrizeIcon = () => {
    if (prize.prize_type === 'API_KEY') return Key
    if (prize.prize_type === 'POINTS') return Coins
    const itemType = prize.prize_value?.toLowerCase() || ''
    if (itemType.includes('cheer') || itemType.includes('heart')) return Heart
    if (itemType.includes('coffee')) return Coffee
    if (itemType.includes('energy')) return Zap
    if (itemType.includes('pizza')) return Pizza
    if (itemType.includes('star')) return Star
    return Gift
  }

  const Icon = getPrizeIcon()

  // 复制兑换码到剪贴板
  const handleCopyCode = async () => {
    if (!prize.api_key_code) return
    try {
      await navigator.clipboard.writeText(prize.api_key_code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('复制失败:', err)
    }
  }

  // 播放音效
  useEffect(() => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      if (prize.is_rare) {
        // 大奖音效
        oscillator.frequency.value = 523
        gainNode.gain.value = 0.25
        oscillator.start()
        setTimeout(() => oscillator.frequency.value = 659, 100)
        setTimeout(() => oscillator.frequency.value = 784, 200)
        setTimeout(() => oscillator.frequency.value = 1047, 300)
        oscillator.stop(audioContext.currentTime + 0.6)
      } else if (!isEmptyPrize && !isOutOfStock) {
        // 普通奖励音效
        oscillator.frequency.value = 523
        gainNode.gain.value = 0.15
        oscillator.start()
        setTimeout(() => oscillator.frequency.value = 659, 100)
        oscillator.stop(audioContext.currentTime + 0.3)
      }
    } catch (e) {
      // 音频播放失败静默处理
    }
  }, [prize, isEmptyPrize, isOutOfStock])

  // 处理"已发完"或"未中奖"的情况
  if (isOutOfStock || isEmptyPrize) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-gradient-to-br from-slate-700 to-slate-800 rounded-2xl shadow-2xl w-full max-w-sm sm:max-w-md overflow-hidden border border-slate-600/30 animate-[scaleIn_0.3s_ease-out]">
          <div className="relative p-4 sm:p-6 text-center">
            {isOutOfStock ? (
              <>
                {/* API Key 库存不足的友好提示 */}
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
              </>
            ) : (
              <>
                {/* 普通未中奖 */}
                <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 sm:mb-4 bg-slate-600 rounded-full flex items-center justify-center">
                  <Gift className="w-8 h-8 sm:w-10 sm:h-10 text-slate-400" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-2">很遗憾</h3>
                <p className="text-sm sm:text-base text-slate-400 mb-4">这张刮刮乐没有中奖</p>
              </>
            )}
            <div className="flex gap-2 sm:gap-3">
              <button onClick={onClose} className="flex-1 py-2 sm:py-2.5 text-sm sm:text-base bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors">
                {isOutOfStock ? '我知道了' : '好的'}
              </button>
              {canPlayAgain && (
                <button onClick={onPlayAgain} className="flex-1 py-2 sm:py-2.5 text-sm sm:text-base bg-gradient-to-r from-orange-500 to-red-500 text-white font-medium rounded-lg hover:shadow-lg transition-all">
                  再来一张
                </button>
              )}
            </div>
          </div>
        </div>
        <style>{`@keyframes scaleIn { 0% { transform: scale(0.8); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }`}</style>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-gradient-to-br ${prize.is_rare ? 'from-yellow-600 via-orange-600 to-red-600' : 'from-orange-800 via-red-800 to-pink-800'} rounded-2xl shadow-2xl w-full max-w-sm sm:max-w-md overflow-hidden border ${prize.is_rare ? 'border-yellow-400/50' : 'border-orange-500/30'} animate-[scaleIn_0.3s_ease-out]`}>
        {/* 装饰粒子 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className={`absolute w-1.5 h-1.5 sm:w-2 sm:h-2 ${prize.is_rare ? 'bg-yellow-300' : 'bg-orange-300'} rounded-full animate-ping`}
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
          <button onClick={onClose} className="absolute top-2 right-2 sm:top-3 sm:right-3 p-1.5 hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-4 h-4 sm:w-5 sm:h-5 text-white/70" />
          </button>

          {/* 奖励图标 */}
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-3 sm:mb-4">
            <div className={`absolute inset-0 bg-gradient-to-br ${prize.is_rare ? 'from-yellow-400 to-orange-500' : 'from-orange-400 to-red-500'} rounded-full shadow-2xl ${prize.is_rare ? 'animate-pulse' : ''}`}>
              <div className="absolute top-2 sm:top-3 left-3 sm:left-4 w-5 sm:w-6 h-5 sm:h-6 bg-white/30 rounded-full" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Icon className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
            </div>
          </div>

          <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
            {prize.is_rare ? '大奖来袭！' : '恭喜中奖！'}
          </h3>

          {/* 奖励展示 */}
          <div className="bg-white/10 rounded-xl p-3 sm:p-4 mb-3 sm:mb-4">
            <div className={`text-lg sm:text-2xl font-bold ${prize.is_rare ? 'text-yellow-300' : 'text-orange-200'}`}>
              {prize.prize_name}
            </div>
            {prize.is_rare && (
              <div className="flex items-center justify-center gap-1 mt-2 text-yellow-400">
                <Star className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="text-xs sm:text-sm font-medium">稀有奖品</span>
                <Star className="w-3 h-3 sm:w-4 sm:h-4" />
              </div>
            )}

            {/* API Key 兑换码显示区 */}
            {prize.prize_type === 'API_KEY' && prize.api_key_code && (
              <div className="mt-2 sm:mt-3 p-2 sm:p-3 bg-black/30 rounded-lg">
                <p className="text-xs text-yellow-400/80 mb-1 sm:mb-2">兑换码（请妥善保存）</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-black/40 px-2 sm:px-3 py-1.5 sm:py-2 rounded text-xs sm:text-sm text-yellow-300 font-mono break-all select-all">
                    {prize.api_key_code}
                  </code>
                  <button
                    onClick={handleCopyCode}
                    className={`p-1.5 sm:p-2 rounded-lg transition-all ${
                      copied
                        ? 'bg-green-500/30 text-green-300'
                        : 'bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30'
                    }`}
                    title={copied ? '已复制' : '复制兑换码'}
                  >
                    {copied ? <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" /> : <Copy className="w-4 h-4 sm:w-5 sm:h-5" />}
                  </button>
                </div>
                <p className="text-xs text-white/50 mt-1 sm:mt-2">可在背包中随时查看已获得的兑换码</p>
              </div>
            )}

            <p className="text-orange-200 text-xs sm:text-sm mt-2">奖励已发放到您的账户</p>
          </div>

          {/* 按钮 */}
          <div className="flex gap-2 sm:gap-3">
            <button onClick={onClose} className="flex-1 py-2 sm:py-2.5 text-sm sm:text-base bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors">
              好的
            </button>
            {canPlayAgain && (
              <button onClick={onPlayAgain} className="flex-1 py-2 sm:py-2.5 text-sm sm:text-base bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-medium rounded-lg hover:shadow-lg transition-all">
                再来一张
              </button>
            )}
          </div>
        </div>
      </div>
      <style>{`@keyframes scaleIn { 0% { transform: scale(0.8); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }`}</style>
    </div>
  )
}

// 骨架屏
function ScratchCardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="animate-pulse w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-xl" />
          <div>
            <div className="animate-pulse w-20 h-5 bg-slate-200 dark:bg-slate-700 rounded mb-1" />
            <div className="animate-pulse w-16 h-4 bg-slate-200 dark:bg-slate-700 rounded" />
          </div>
        </div>
        <div className="animate-pulse w-16 h-5 bg-slate-200 dark:bg-slate-700 rounded" />
      </div>
      <div className="animate-pulse w-full h-40 bg-slate-200 dark:bg-slate-700 rounded-xl mb-4" />
      <div className="animate-pulse w-full h-12 bg-slate-200 dark:bg-slate-700 rounded-xl" />
    </div>
  )
}

// 刮刮乐卡片 Canvas
function ScratchCanvas({ cardId, onReveal, revealed, prize, revealFailed }) {
  const canvasRef = useRef(null)
  const [isScratching, setIsScratching] = useState(false)
  const [scratchPercent, setScratchPercent] = useState(0)
  const [autoRevealed, setAutoRevealed] = useState(false)

  // 使用 ref 防止重复触发 reveal
  const revealedRef = useRef(false)
  const lastCalcTime = useRef(0)
  const rafRef = useRef(null)

  // 一键开奖
  const handleQuickReveal = useCallback(() => {
    if (revealedRef.current || revealed || autoRevealed) return
    revealedRef.current = true
    setAutoRevealed(true)
    setScratchPercent(100)
    onReveal()
  }, [revealed, autoRevealed, onReveal])

  // 初始化 canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || revealed || autoRevealed) return

    const ctx = canvas.getContext('2d')
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * 2
    canvas.height = rect.height * 2
    ctx.scale(2, 2)

    // 绘制刮刮乐涂层
    const gradient = ctx.createLinearGradient(0, 0, rect.width, rect.height)
    gradient.addColorStop(0, '#f59e0b')
    gradient.addColorStop(0.5, '#f97316')
    gradient.addColorStop(1, '#ef4444')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, rect.width, rect.height)

    // 添加文字
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
    ctx.font = 'bold 16px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('刮一刮', rect.width / 2, rect.height / 2 - 10)
    ctx.font = '12px sans-serif'
    ctx.fillText('试试手气', rect.width / 2, rect.height / 2 + 10)

    // 添加装饰
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * rect.width
      const y = Math.random() * rect.height
      const size = Math.random() * 8 + 2
      ctx.beginPath()
      ctx.arc(x, y, size, 0, Math.PI * 2)
      ctx.fill()
    }

    // 重置状态
    revealedRef.current = false
  }, [revealed, autoRevealed])

  // 清理 RAF
  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [])

  // 计算刮开百分比（采样优化）
  const calculateScratchPercent = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return 0

    const ctx = canvas.getContext('2d')
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const pixels = imageData.data
    let transparentPixels = 0
    const totalPixels = pixels.length / 4
    const step = 4 // 减小采样步长，提高精度

    for (let i = 3; i < pixels.length; i += 4 * step) {
      if (pixels[i] < 128) { // alpha < 128 视为透明
        transparentPixels++
      }
    }

    const percent = (transparentPixels / (totalPixels / step)) * 100
    return percent
  }, [])

  // 刮开效果
  const scratch = useCallback((x, y) => {
    const canvas = canvasRef.current
    if (!canvas || revealedRef.current) return

    const ctx = canvas.getContext('2d')
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    ctx.globalCompositeOperation = 'destination-out'
    ctx.beginPath()
    ctx.arc(
      (x - rect.left) * scaleX / 2,
      (y - rect.top) * scaleY / 2,
      20,
      0,
      Math.PI * 2
    )
    ctx.fill()

    // 节流计算百分比（每 50ms 计算一次）
    const now = Date.now()
    if (now - lastCalcTime.current > 50) {
      lastCalcTime.current = now

      const percent = calculateScratchPercent()
      setScratchPercent(percent)

      // 刮开超过 40% 自动揭晓（使用 ref 防止重复触发）
      if (percent > 40 && !revealedRef.current) {
        revealedRef.current = true
        setAutoRevealed(true)
        onReveal()
      }
    }
  }, [calculateScratchPercent, onReveal])

  // 强制检查并揭晓
  const forceCheckAndReveal = useCallback(() => {
    if (revealedRef.current) return

    const percent = calculateScratchPercent()
    setScratchPercent(percent)

    // 降低到 40%
    if (percent > 40 && !revealedRef.current) {
      revealedRef.current = true
      setAutoRevealed(true)
      onReveal()
    }
  }, [calculateScratchPercent, onReveal])

  // 鼠标/触摸事件
  const handleStart = (e) => {
    if (revealed || autoRevealed || revealedRef.current) return
    setIsScratching(true)
    const point = e.touches ? e.touches[0] : e
    scratch(point.clientX, point.clientY)
  }

  const handleMove = (e) => {
    if (!isScratching || revealed || autoRevealed || revealedRef.current) return
    e.preventDefault()
    const point = e.touches ? e.touches[0] : e
    scratch(point.clientX, point.clientY)
  }

  const handleEnd = () => {
    setIsScratching(false)
    // 松开时强制检查一次是否达到揭晓条件
    if (!revealedRef.current) {
      forceCheckAndReveal()
    }
  }

  return (
    <div className="relative w-full h-32 sm:h-40 rounded-xl overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700">
      {/* 底层奖品显示 */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {revealed || autoRevealed ? (
          revealFailed ? (
            // 揭晓失败状态
            <>
              <AlertCircle className="w-8 h-8 sm:w-10 sm:h-10 mb-2 text-red-500" />
              <p className="font-bold text-base sm:text-lg text-red-600">揭晓失败</p>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">请重试或重新购买</p>
            </>
          ) : prize ? (
            <>
              <Gift className={`w-8 h-8 sm:w-10 sm:h-10 mb-2 ${prize.is_rare ? 'text-yellow-500' : 'text-purple-500'}`} />
              <p className={`font-bold text-base sm:text-lg ${prize.is_rare ? 'text-yellow-600' : 'text-purple-600'}`}>
                {prize.prize_name}
              </p>
              {prize.is_rare && (
                <div className="flex items-center gap-1 mt-1 text-yellow-500">
                  <Star className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="text-xs sm:text-sm font-medium">稀有奖品</span>
                </div>
              )}
            </>
          ) : (
            <>
              <RefreshCw className="w-6 h-6 sm:w-8 sm:h-8 text-slate-400 animate-spin mb-2" />
              <p className="text-sm text-slate-500">揭晓中...</p>
            </>
          )
        ) : (
          <div className="text-center text-slate-400">
            <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2" />
            <p className="text-xs sm:text-sm">刮开查看奖品</p>
          </div>
        )}
      </div>

      {/* 刮刮乐涂层 */}
      {!revealed && !autoRevealed && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-pointer touch-none"
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
        />
      )}

      {/* 进度提示和一键开奖按钮 */}
      {!revealed && !autoRevealed && (
        <div className="absolute bottom-2 right-2 flex items-center gap-2">
          {scratchPercent > 0 && scratchPercent < 40 && (
            <div className="px-2 py-1 bg-black/50 text-white text-xs rounded">
              {Math.round(scratchPercent)}% - 继续刮
            </div>
          )}
          <button
            onClick={handleQuickReveal}
            className="px-3 py-1.5 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white text-xs font-medium rounded-lg shadow-lg hover:shadow-xl transition-all flex items-center gap-1"
          >
            <Sparkles className="w-3 h-3" />
            一键开奖
          </button>
        </div>
      )}
    </div>
  )
}

// 主组件
export default function ScratchCard({ onBalanceUpdate, externalBalance, userRole, refreshTrigger }) {
  // 管理员不限次数
  const isAdmin = userRole === 'admin'
  const toast = useToast()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [scratchInfo, setScratchInfo] = useState(null)
  const [buying, setBuying] = useState(false)
  const [currentCard, setCurrentCard] = useState(null)
  const [prize, setPrize] = useState(null)
  const [showCelebration, setShowCelebration] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [testDrawing, setTestDrawing] = useState(false) // 管理员测试抽奖状态

  // 管理员测试：直接抽中 API Key
  const handleTestDraw = async () => {
    if (!isAdmin || testDrawing) return
    setTestDrawing(true)
    try {
      const result = await lotteryApi.adminTestScratchDrawApiKey()
      if (result.success) {
        // 构造一个和刮刮乐类似的奖品对象并显示
        setPrize({
          prize_type: 'API_KEY',
          prize_name: result.prize_name,
          api_key_code: result.api_key_code,
          is_rare: true,
        })
        setShowCelebration(true)
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

  // 加载刮刮乐信息
  const loadScratchInfo = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await lotteryApi.getScratchInfo()
      setScratchInfo(data)
    } catch (err) {
      console.error('加载刮刮乐信息失败:', err)
      setError('加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadScratchInfo()
  }, [loadScratchInfo])

  // 兑换券后刷新状态
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      loadScratchInfo()
    }
  }, [refreshTrigger, loadScratchInfo])

  // 当外部余额变化时，同步更新内部状态
  useEffect(() => {
    if (externalBalance !== undefined && scratchInfo) {
      setScratchInfo(prev => {
        if (!prev || prev.balance === externalBalance) return prev
        const tickets = prev.scratch_tickets || 0
        // 管理员不受每日限制
        const canDrawWithPoints = externalBalance >= prev.cost_points && (
          isAdmin || prev.daily_limit === null || prev.today_count < prev.daily_limit
        )
        return {
          ...prev,
          balance: externalBalance,
          can_draw: tickets > 0 || canDrawWithPoints,
        }
      })
    }
  }, [externalBalance, isAdmin])

  // 购买刮刮乐
  const handleBuy = async () => {
    // 管理员只检查积分够不够，不检查每日限制
    const adminCanBuy = isAdmin && scratchInfo?.balance >= scratchInfo?.cost_points
    if (buying || (!scratchInfo?.can_draw && !adminCanBuy)) return
    setBuying(true)
    setPrize(null)
    try {
      // 优先使用刮刮乐券
      const hasTicket = (scratchInfo?.scratch_tickets || 0) > 0
      const result = await lotteryApi.buyScratchCard(hasTicket)
      setCurrentCard({ id: result.card_id, revealed: false })
      setScratchInfo((prev) => {
        // 如果使用了券，扣减券数量
        const newTickets = result.used_ticket ? Math.max(0, (prev?.scratch_tickets || 0) - 1) : prev?.scratch_tickets
        const newTodayCount = (prev?.today_count || 0) + 1
        // can_draw 逻辑：有券可以玩（不受每日限制），或者积分够且未达每日限制（管理员不受限）
        const canDrawWithPoints = result.remaining_balance >= prev?.cost_points && (
          isAdmin || prev?.daily_limit === null || newTodayCount < prev?.daily_limit
        )
        return {
          ...prev,
          today_count: newTodayCount,
          balance: result.remaining_balance,
          scratch_tickets: newTickets,
          can_draw: newTickets > 0 || canDrawWithPoints,
        }
      })
      onBalanceUpdate?.(result.remaining_balance)
      if (result.used_ticket) {
        toast.success('使用刮刮乐券成功，快来刮一刮！')
      } else {
        toast.success('刮刮乐已购买，快来刮一刮！')
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || '购买失败')
    } finally {
      setBuying(false)
    }
  }

  // 揭晓奖品
  const [revealing, setRevealing] = useState(false)

  const handleReveal = async () => {
    if (!currentCard || currentCard.revealed || revealing) return
    setRevealing(true)
    try {
      const result = await lotteryApi.revealScratchCard(currentCard.id)
      setPrize(result)
      setCurrentCard((prev) => ({ ...prev, revealed: true }))
      // 显示庆祝弹窗
      setShowCelebration(true)
      trackLottery('scratch', scratchInfo?.cost_points || 30, result.prize_name)
    } catch (err) {
      const errorMsg = err.response?.data?.detail || '揭晓失败'
      toast.error(errorMsg)
      // 揭晓失败时，提供重置选项让用户可以重试
      // 如果是"卡片不存在"等严重错误，直接重置
      if (errorMsg.includes('不存在') || errorMsg.includes('不属于')) {
        setCurrentCard(null)
        setPrize(null)
        toast.info('请重新购买刮刮乐')
      }
      // 其他错误：标记已揭晓以显示重置按钮，让用户可以重新开始
      else {
        setCurrentCard((prev) => ({ ...prev, revealed: true, revealFailed: true }))
      }
    } finally {
      setRevealing(false)
    }
  }

  // 关闭庆祝弹窗
  const handleCloseCelebration = () => {
    setShowCelebration(false)
  }

  // 再来一张（从弹窗触发）
  const handlePlayAgainFromModal = () => {
    setShowCelebration(false)
    handleReset()
    // 延迟一点再购买，让UI有时间更新
    setTimeout(() => {
      if (scratchInfo?.can_draw) {
        handleBuy()
      }
    }, 100)
  }

  // 重新开始
  const handleReset = () => {
    setCurrentCard(null)
    setPrize(null)
  }

  if (loading) {
    return <ScratchCardSkeleton />
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-red-200 dark:border-red-800 p-6">
        <div className="flex flex-col items-center justify-center py-8">
          <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
          <h3 className="font-medium text-slate-900 dark:text-white mb-1">刮刮乐加载失败</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{error}</p>
          <button
            onClick={loadScratchInfo}
            className="flex items-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            重试
          </button>
        </div>
      </div>
    )
  }

  if (!scratchInfo?.active) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl">
            <Ticket className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white">神秘刮刮乐</h3>
            <p className="text-sm text-slate-500">刮出神秘兑换码</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-8">
          <Ticket className="w-16 h-16 text-slate-300 dark:text-slate-600 mb-4" />
          <p className="text-slate-500 dark:text-slate-400">暂无进行中的刮刮乐活动</p>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">敬请期待...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
      {/* 标题 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl">
            <Ticket className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white">神秘刮刮乐</h3>
            <p className="text-sm text-slate-500">
              {(scratchInfo?.scratch_tickets || 0) > 0 ? (
                <span className="text-green-600 dark:text-green-400">免费券×{scratchInfo.scratch_tickets}</span>
              ) : (
                <>{scratchInfo?.cost_points || 30}积分/张</>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {scratchInfo?.daily_limit && !isAdmin && (
            <div className="text-sm text-slate-500">
              今日: {scratchInfo?.today_count || 0}/{scratchInfo?.daily_limit}
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

      {/* 刮刮乐帮助弹窗 */}
      <GameHelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} title="刮刮乐玩法">
        <div className="space-y-4">
          <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
            <h4 className="font-bold text-orange-700 dark:text-orange-300 mb-2 flex items-center gap-2">
              <Ticket className="w-4 h-4" /> 基本规则
            </h4>
            <ul className="text-sm text-orange-600 dark:text-orange-400 space-y-1">
              <li>• 每张刮刮乐消耗 <span className="font-bold">{scratchInfo?.cost_points || 30}</span> 积分</li>
              <li>• 每日限购 <span className="font-bold">{scratchInfo?.daily_limit || 5}</span> 张</li>
              <li>• 点击"购买刮刮乐"按钮获得卡片</li>
            </ul>
          </div>
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
            <h4 className="font-bold text-yellow-700 dark:text-yellow-300 mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> 操作方法
            </h4>
            <ul className="text-sm text-yellow-600 dark:text-yellow-400 space-y-1">
              <li>• 用鼠标/手指在涂层上滑动刮开</li>
              <li>• 刮开 <span className="font-bold">40%</span> 以上自动揭晓奖品</li>
              <li>• 支持触屏和鼠标操作</li>
            </ul>
          </div>
          <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl">
            <h4 className="font-bold text-red-700 dark:text-red-300 mb-2 flex items-center gap-2">
              <Key className="w-4 h-4" /> 奖品说明
            </h4>
            <ul className="text-sm text-red-600 dark:text-red-400 space-y-1">
              <li>• 约5%概率获得神秘API Key兑换码</li>
              <li>• 可获得积分奖励（10-50积分）</li>
              <li>• 奖励抽中后即时发放到账户</li>
            </ul>
          </div>
        </div>
      </GameHelpModal>

      {/* 刮刮乐区域 */}
      {currentCard ? (
        <>
          <ScratchCanvas
            cardId={currentCard.id}
            onReveal={handleReveal}
            revealed={currentCard.revealed}
            prize={prize}
            revealFailed={currentCard.revealFailed}
          />

          {/* 已揭晓后的操作 */}
          {currentCard.revealed && (
            <button
              onClick={handleReset}
              disabled={!scratchInfo?.can_draw}
              className={`w-full mt-4 py-3 rounded-xl font-bold text-lg transition-all ${
                !scratchInfo?.can_draw
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:shadow-lg hover:shadow-orange-500/30'
              }`}
            >
              {!scratchInfo?.can_draw ? (
                scratchInfo?.balance < scratchInfo?.cost_points ? '积分不足' : '今日次数已用完'
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Ticket className="w-5 h-5" />
                  再来一张
                </span>
              )}
            </button>
          )}
        </>
      ) : (
        <>
          {/* 购买提示 */}
          <div className="relative w-full h-32 sm:h-40 rounded-xl overflow-hidden bg-gradient-to-br from-orange-100 to-red-100 dark:from-orange-900/30 dark:to-red-900/30 flex flex-col items-center justify-center">
            <Ticket className="w-10 h-10 sm:w-12 sm:h-12 text-orange-500 mb-2" />
            <p className="text-sm sm:text-base text-orange-600 dark:text-orange-400 font-medium">购买刮刮乐试试手气</p>
            <p className="text-xs sm:text-sm text-orange-500/70 mt-1">有机会获得神秘兑换码</p>
          </div>

          {/* 购买按钮 */}
          <button
            onClick={handleBuy}
            disabled={buying || (!scratchInfo?.can_draw && !isAdmin) || (isAdmin && scratchInfo?.balance < scratchInfo?.cost_points && (scratchInfo?.scratch_tickets || 0) === 0)}
            className={`w-full mt-4 py-3 rounded-xl font-bold text-lg transition-all ${
              (!scratchInfo?.can_draw && !isAdmin) || (isAdmin && scratchInfo?.balance < scratchInfo?.cost_points && (scratchInfo?.scratch_tickets || 0) === 0)
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:shadow-lg hover:shadow-orange-500/30'
            }`}
          >
            {buying ? (
              <RefreshCw className="w-5 h-5 animate-spin mx-auto" />
            ) : !scratchInfo?.can_draw && !isAdmin ? (
              scratchInfo?.balance < scratchInfo?.cost_points && (scratchInfo?.scratch_tickets || 0) === 0 ? '积分不足' : '今日次数已用完'
            ) : isAdmin && scratchInfo?.balance < scratchInfo?.cost_points && (scratchInfo?.scratch_tickets || 0) === 0 ? (
              '积分不足'
            ) : (scratchInfo?.scratch_tickets || 0) > 0 ? (
              <span className="flex items-center justify-center gap-2">
                <Ticket className="w-5 h-5" />
                使用免费券
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Coins className="w-5 h-5" />
                购买刮刮乐 ({scratchInfo?.cost_points}积分)
              </span>
            )}
          </button>
        </>
      )}

      <p className="text-center text-xs text-slate-400 mt-3">
        刮开涂层揭晓奖品，有机会获得神秘兑换码
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

      {/* 中奖庆祝弹窗 */}
      {showCelebration && prize && (
        <WinCelebrationModal
          prize={prize}
          onClose={handleCloseCelebration}
          onPlayAgain={handlePlayAgainFromModal}
          canPlayAgain={scratchInfo?.can_draw}
        />
      )}
    </div>
  )
}
