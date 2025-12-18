import { useState, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Calendar,
  Gift,
  TrendingUp,
  Coins,
  Check,
  Flame,
  Star,
  Sparkles,
  RefreshCw,
  ChevronRight,
  Trophy,
  Clock,
  Users,
  Target,
  Zap,
  Heart,
  Coffee,
  Pizza,
  Award,
  AlertCircle,
  Backpack,
  X,
  Package,
  Key,
  HelpCircle,
  Copy,
  CheckCircle,
  Info,
  Shield,
  Ticket,
} from 'lucide-react'
import GameHelpModal, { HelpButton } from '../components/activity/GameHelpModal'
import BackpackModal from '../components/activity/BackpackModal'

// 抽奖中奖庆祝弹窗组件
function LotteryWinModal({ prize, onClose, onPlayAgain, canPlayAgain }) {
  const [copied, setCopied] = useState(false)

  // 奖品图标映射
  const getPrizeIcon = () => {
    if (prize.prize_type === 'API_KEY') return Key
    if (prize.prize_type === 'POINTS') return Coins
    const name = prize.prize_name?.toLowerCase() || ''
    if (name.includes('heart') || name.includes('爱心') || name.includes('cheer')) return Heart
    if (name.includes('coffee') || name.includes('咖啡')) return Coffee
    if (name.includes('energy') || name.includes('能量')) return Zap
    if (name.includes('pizza') || name.includes('披萨')) return Pizza
    if (name.includes('star') || name.includes('星星')) return Star
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
        oscillator.frequency.value = 523
        gainNode.gain.value = 0.25
        oscillator.start()
        setTimeout(() => oscillator.frequency.value = 659, 100)
        setTimeout(() => oscillator.frequency.value = 784, 200)
        setTimeout(() => oscillator.frequency.value = 1047, 300)
        oscillator.stop(audioContext.currentTime + 0.6)
      } else if (prize.prize_type !== 'EMPTY') {
        oscillator.frequency.value = 523
        gainNode.gain.value = 0.15
        oscillator.start()
        setTimeout(() => oscillator.frequency.value = 659, 100)
        oscillator.stop(audioContext.currentTime + 0.3)
      }
    } catch (e) {
      // 音频播放失败静默处理
    }
  }, [prize])

  if (prize.prize_type === 'EMPTY') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-gradient-to-br from-slate-700 to-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-600/30 animate-[scaleIn_0.3s_ease-out]">
          <div className="relative p-6 text-center">
            <div className="w-20 h-20 mx-auto mb-4 bg-slate-600 rounded-full flex items-center justify-center">
              <Gift className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">很遗憾</h3>
            <p className="text-slate-400 mb-4">本次抽奖未中奖</p>
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors">
                好的
              </button>
              {canPlayAgain && (
                <button onClick={onPlayAgain} className="flex-1 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-lg hover:shadow-lg transition-all">
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-gradient-to-br ${prize.is_rare ? 'from-yellow-600 via-orange-600 to-red-600' : 'from-purple-800 via-pink-800 to-rose-800'} rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border ${prize.is_rare ? 'border-yellow-400/50' : 'border-purple-500/30'} animate-[scaleIn_0.3s_ease-out]`}>
        {/* 装饰粒子 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className={`absolute w-2 h-2 ${prize.is_rare ? 'bg-yellow-300' : 'bg-purple-300'} rounded-full animate-ping`}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${1 + Math.random()}s`,
              }}
            />
          ))}
        </div>

        <div className="relative p-6 text-center">
          {/* 关闭按钮 */}
          <button onClick={onClose} className="absolute top-3 right-3 p-1.5 hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-5 h-5 text-white/70" />
          </button>

          {/* 奖励图标 */}
          <div className="relative w-24 h-24 mx-auto mb-4">
            <div className={`absolute inset-0 bg-gradient-to-br ${prize.is_rare ? 'from-yellow-400 to-orange-500' : 'from-purple-400 to-pink-500'} rounded-full shadow-2xl ${prize.is_rare ? 'animate-pulse' : ''}`}>
              <div className="absolute top-3 left-4 w-6 h-6 bg-white/30 rounded-full" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Icon className="w-12 h-12 text-white" />
            </div>
          </div>

          <h3 className="text-2xl font-bold text-white mb-2">
            {prize.is_rare ? '大奖来袭！' : '恭喜中奖！'}
          </h3>

          {/* 奖励展示 */}
          <div className="bg-white/10 rounded-xl p-4 mb-4">
            <div className={`text-2xl font-bold ${prize.is_rare ? 'text-yellow-300' : 'text-purple-200'}`}>
              {prize.prize_name}
            </div>
            {prize.is_rare && (
              <div className="flex items-center justify-center gap-1 mt-2 text-yellow-400">
                <Star className="w-4 h-4" />
                <span className="text-sm font-medium">稀有奖品</span>
                <Star className="w-4 h-4" />
              </div>
            )}

            {/* API Key 兑换码显示区 */}
            {prize.prize_type === 'API_KEY' && prize.api_key_code && (
              <div className="mt-3 p-3 bg-black/30 rounded-lg">
                <p className="text-xs text-yellow-400/80 mb-2">兑换码（请妥善保存）</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-black/40 px-3 py-2 rounded text-sm text-yellow-300 font-mono break-all select-all">
                    {prize.api_key_code}
                  </code>
                  <button
                    onClick={handleCopyCode}
                    className={`p-2 rounded-lg transition-all ${
                      copied
                        ? 'bg-green-500/30 text-green-300'
                        : 'bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30'
                    }`}
                    title={copied ? '已复制' : '复制兑换码'}
                  >
                    {copied ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-white/50 mt-2">可在背包中随时查看已获得的兑换码</p>
              </div>
            )}

            <p className="text-purple-200 text-sm mt-2">奖励已发放到您的账户</p>
          </div>

          {/* 按钮 */}
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors">
              好的
            </button>
            {canPlayAgain && (
              <button onClick={onPlayAgain} className="flex-1 py-2.5 bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-medium rounded-lg hover:shadow-lg transition-all">
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
import { useAuthStore } from '../stores/authStore'
import { useToast } from '../components/Toast'
import { pointsApi, lotteryApi, predictionApi } from '../services'
import { trackSignin, trackLottery } from '../utils/analytics'
import GachaMachine from '../components/activity/GachaMachine'
import ScratchCard from '../components/activity/ScratchCard'
import ExchangeShop from '../components/activity/ExchangeShop'
import SlotMachine from '../components/activity/SlotMachine'

// 骨架屏组件
function Skeleton({ className = '' }) {
  return (
    <div className={`animate-pulse bg-slate-200 dark:bg-slate-700 rounded ${className}`} />
  )
}

// 签到日历骨架
function SigninCalendarSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <div>
            <Skeleton className="w-20 h-5 mb-1" />
            <Skeleton className="w-16 h-4" />
          </div>
        </div>
        <Skeleton className="w-16 h-6" />
      </div>
      <div className="grid grid-cols-7 gap-1 mb-6">
        {Array(35).fill(0).map((_, i) => (
          <Skeleton key={i} className="h-10" />
        ))}
      </div>
      <Skeleton className="w-full h-12 rounded-xl" />
    </div>
  )
}

// 抽奖骨架
function LotterySkeleton() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <div>
            <Skeleton className="w-20 h-5 mb-1" />
            <Skeleton className="w-16 h-4" />
          </div>
        </div>
        <Skeleton className="w-16 h-5" />
      </div>
      <div className="grid grid-cols-5 gap-2 mb-6">
        {Array(10).fill(0).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
      <Skeleton className="w-full h-12 rounded-xl" />
    </div>
  )
}

// 错误提示组件
function ErrorCard({ title, message, onRetry }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-red-200 dark:border-red-800 p-6">
      <div className="flex flex-col items-center justify-center py-8">
        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <h3 className="font-medium text-slate-900 dark:text-white mb-1">{title}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            重试
          </button>
        )}
      </div>
    </div>
  )
}

// 签到日历组件
function SigninCalendar({ signinStatus, onSignin, signing }) {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  const startingDay = firstDay.getDay()

  const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']

  const signedDates = new Set(signinStatus?.monthly_signins || [])
  const todayStr = today.toISOString().split('T')[0]

  const days = []
  for (let i = 0; i < startingDay; i++) {
    days.push(<div key={`empty-${i}`} className="h-10" />)
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const isSigned = signedDates.has(dateStr)
    const isToday = dateStr === todayStr
    const isPast = new Date(dateStr) < new Date(todayStr)

    days.push(
      <div
        key={day}
        className={`h-10 flex items-center justify-center rounded-lg text-sm font-medium transition-all ${
          isSigned
            ? 'bg-green-500 text-white'
            : isToday
            ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 ring-2 ring-yellow-500'
            : isPast
            ? 'text-slate-300 dark:text-slate-600'
            : 'text-slate-600 dark:text-slate-400'
        }`}
      >
        {isSigned ? <Check className="w-4 h-4" /> : day}
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white">每日签到</h3>
            <p className="text-sm text-slate-500">{monthNames[month]} {year}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 text-orange-500">
            <Flame className="w-4 h-4" />
            <span className="font-bold">{signinStatus?.streak_display || 0}</span>
            <span className="text-sm text-slate-500">天连签</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {['日', '一', '二', '三', '四', '五', '六'].map((d) => (
          <div key={d} className="h-8 flex items-center justify-center text-xs text-slate-400">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 mb-6">
        {days}
      </div>

      {signinStatus?.milestones && (
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          {signinStatus.milestones.map((m) => (
            <div
              key={m.day}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium ${
                m.reached
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
              }`}
            >
              {m.day}天 +{m.bonus}
            </div>
          ))}
        </div>
      )}

      <button
        onClick={onSignin}
        disabled={signing || signinStatus?.signed_today}
        className={`w-full py-3 rounded-xl font-bold text-lg transition-all ${
          signinStatus?.signed_today
            ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:shadow-lg hover:shadow-green-500/30'
        }`}
      >
        {signing ? (
          <RefreshCw className="w-5 h-5 animate-spin mx-auto" />
        ) : signinStatus?.signed_today ? (
          <span className="flex items-center justify-center gap-2">
            <Check className="w-5 h-5" />
            今日已签到
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5" />
            立即签到 +100积分
          </span>
        )}
      </button>

      {signinStatus?.next_milestone && !signinStatus?.signed_today && (
        <p className="text-center text-sm text-slate-500 mt-3">
          再签到 {signinStatus.days_to_milestone} 天，额外获得 {signinStatus.next_milestone_bonus} 积分
        </p>
      )}
    </div>
  )
}

// 抽奖转盘组件
function LotteryWheel({ lotteryInfo, onDraw, drawing, lastPrize }) {
  const [showHelp, setShowHelp] = useState(false)
  const prizes = lotteryInfo?.prizes || []
  const tickets = lotteryInfo?.lottery_tickets || 0

  const prizeIcons = {
    'cheer': Heart,
    'coffee': Coffee,
    'energy': Zap,
    'pizza': Pizza,
    'star': Star,
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
            <Gift className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white">幸运抽奖</h3>
            <p className="text-sm text-slate-500">
              {tickets > 0 ? (
                <span className="text-green-600 dark:text-green-400">免费券×{tickets}</span>
              ) : (
                <>{lotteryInfo?.cost_points || 20}积分/次</>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {lotteryInfo?.daily_limit && (
            <div className="text-sm text-slate-500">
              今日: {lotteryInfo?.today_count || 0}/{lotteryInfo?.daily_limit}
            </div>
          )}
          <HelpButton onClick={() => setShowHelp(true)} />
        </div>
      </div>

      {/* 幸运转盘帮助弹窗 */}
      <GameHelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} title="幸运转盘玩法">
        <div className="space-y-4">
          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
            <h4 className="font-bold text-purple-700 dark:text-purple-300 mb-2 flex items-center gap-2">
              <Gift className="w-4 h-4" /> 基本规则
            </h4>
            <ul className="text-sm text-purple-600 dark:text-purple-400 space-y-1">
              <li>• 每次抽奖消耗 <span className="font-bold">{lotteryInfo?.cost_points || 20}</span> 积分</li>
              <li>• 每日限抽 <span className="font-bold">{lotteryInfo?.daily_limit || 20}</span> 次</li>
              <li>• 点击"立即抽奖"按钮进行抽奖</li>
            </ul>
          </div>
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
            <h4 className="font-bold text-yellow-700 dark:text-yellow-300 mb-2 flex items-center gap-2">
              <Star className="w-4 h-4" /> 奖品说明
            </h4>
            <ul className="text-sm text-yellow-600 dark:text-yellow-400 space-y-1">
              <li>• 可获得积分、道具等多种奖励</li>
              <li>• 稀有奖品包含神秘API Key兑换码</li>
              <li>• 道具可在选手详情页为选手打气使用</li>
            </ul>
          </div>
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
            <h4 className="font-bold text-green-700 dark:text-green-300 mb-2 flex items-center gap-2">
              <Coins className="w-4 h-4" /> 温馨提示
            </h4>
            <ul className="text-sm text-green-600 dark:text-green-400 space-y-1">
              <li>• 奖励抽中后即时发放到账户</li>
              <li>• 理性娱乐，适度游戏</li>
            </ul>
          </div>
        </div>
      </GameHelpModal>

      <div className="grid grid-cols-5 gap-2 mb-6">
        {prizes.slice(0, 10).map((prize, idx) => {
          const Icon = prizeIcons[prize.name?.toLowerCase()] || Gift
          return (
            <div
              key={idx}
              className={`p-2 rounded-lg text-center ${
                prize.is_rare
                  ? 'bg-gradient-to-br from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30 ring-1 ring-yellow-400'
                  : 'bg-slate-50 dark:bg-slate-800'
              }`}
            >
              <Icon className={`w-5 h-5 mx-auto mb-1 ${prize.is_rare ? 'text-yellow-500' : 'text-slate-400'}`} />
              <span className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1">{prize.name}</span>
            </div>
          )
        })}
      </div>

      {lastPrize && (
        <div className={`mb-4 p-3 rounded-xl text-center ${
          lastPrize.is_rare
            ? 'bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30'
            : 'bg-green-50 dark:bg-green-900/20'
        }`}>
          <p className={`font-medium ${lastPrize.is_rare ? 'text-yellow-600' : 'text-green-600'}`}>
            {lastPrize.is_rare ? '恭喜获得稀有奖品！' : '恭喜获得：'}
            <span className="font-bold ml-1">{lastPrize.prize_name}</span>
          </p>
        </div>
      )}

      <button
        onClick={onDraw}
        disabled={drawing || !lotteryInfo?.can_draw}
        className={`w-full py-3 rounded-xl font-bold text-lg transition-all ${
          !lotteryInfo?.can_draw
            ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg hover:shadow-purple-500/30'
        }`}
      >
        {drawing ? (
          <RefreshCw className="w-5 h-5 animate-spin mx-auto" />
        ) : !lotteryInfo?.can_draw ? (
          lotteryInfo?.balance < lotteryInfo?.cost_points && (lotteryInfo?.lottery_tickets || 0) === 0 ? '积分不足' : '今日次数已用完'
        ) : (lotteryInfo?.lottery_tickets || 0) > 0 ? (
          <span className="flex items-center justify-center gap-2">
            <Ticket className="w-5 h-5" />
            使用免费券
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <Gift className="w-5 h-5" />
            立即抽奖
          </span>
        )}
      </button>

      <p className="text-center text-xs text-slate-400 mt-3">
        10%概率获得稀有API Key兑换码
      </p>
    </div>
  )
}

// 竞猜卡片组件
function PredictionCard({ market }) {
  const totalPool = market.total_pool || 0

  return (
    <Link
      to={`/prediction/${market.id}`}
      className="block bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 hover:border-purple-300 dark:hover:border-purple-700 transition-colors"
    >
      <div className="flex items-start justify-between mb-3">
        <h4 className="font-semibold text-slate-900 dark:text-white line-clamp-2">
          {market.title}
        </h4>
        <span className={`flex-shrink-0 ml-2 px-2 py-0.5 rounded text-xs font-medium ${
          market.status === 'OPEN'
            ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
        }`}>
          {market.status === 'OPEN' ? '进行中' : market.status === 'CLOSED' ? '已截止' : '已结算'}
        </span>
      </div>

      <div className="flex items-center gap-4 text-sm text-slate-500 mb-3">
        <span className="flex items-center gap-1">
          <Coins className="w-4 h-4" />
          {totalPool} 奖池
        </span>
        <span className="flex items-center gap-1">
          <Users className="w-4 h-4" />
          {market.options?.length || 0} 选项
        </span>
      </div>

      <div className="space-y-2">
        {market.options?.slice(0, 3).map((opt) => (
          <div key={opt.id} className="flex items-center justify-between">
            <span className="text-sm text-slate-600 dark:text-slate-400 truncate">
              {opt.label}
            </span>
            <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
              {opt.odds ? `${opt.odds.toFixed(2)}x` : '-'}
            </span>
          </div>
        ))}
      </div>

      {market.closes_at && (
        <div className="flex items-center gap-1 text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Clock className="w-3 h-3" />
          截止: {new Date(market.closes_at).toLocaleString('zh-CN')}
        </div>
      )}
    </Link>
  )
}


// 主页面
export default function ActivityCenterPage() {
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)
  const toast = useToast()

  // 独立的加载状态
  const [balanceLoading, setBalanceLoading] = useState(true)
  const [signinLoading, setSigninLoading] = useState(true)
  const [lotteryLoading, setLotteryLoading] = useState(true)
  const [marketsLoading, setMarketsLoading] = useState(true)

  // 独立的错误状态
  const [balanceError, setBalanceError] = useState(null)
  const [signinError, setSigninError] = useState(null)
  const [lotteryError, setLotteryError] = useState(null)
  const [marketsError, setMarketsError] = useState(null)

  // 数据状态
  const [balance, setBalance] = useState(0)
  const [signinStatus, setSigninStatus] = useState(null)
  const [lotteryInfo, setLotteryInfo] = useState(null)
  const [openMarkets, setOpenMarkets] = useState([])

  // 操作状态
  const [signing, setSigning] = useState(false)
  const [drawing, setDrawing] = useState(false)
  const [lastPrize, setLastPrize] = useState(null)
  const [showLotteryWinModal, setShowLotteryWinModal] = useState(false)

  // 背包数据
  const [itemsLoading, setItemsLoading] = useState(true)
  const [items, setItems] = useState([])
  const [showBackpack, setShowBackpack] = useState(false)

  // 竞猜帮助弹窗
  const [showPredictionHelp, setShowPredictionHelp] = useState(false)

  // 加载余额
  const loadBalance = useCallback(async () => {
    setBalanceLoading(true)
    setBalanceError(null)
    try {
      const data = await pointsApi.getBalance()
      setBalance(data.balance)
    } catch (error) {
      console.error('加载余额失败:', error)
      setBalanceError('加载失败')
      setBalance(0)
    } finally {
      setBalanceLoading(false)
    }
  }, [])

  // 加载签到状态
  const loadSignin = useCallback(async () => {
    setSigninLoading(true)
    setSigninError(null)
    try {
      const data = await pointsApi.getSigninStatus()
      setSigninStatus(data)
    } catch (error) {
      console.error('加载签到状态失败:', error)
      setSigninError('加载失败')
    } finally {
      setSigninLoading(false)
    }
  }, [])

  // 加载抽奖信息
  const loadLottery = useCallback(async () => {
    setLotteryLoading(true)
    setLotteryError(null)
    try {
      const data = await lotteryApi.getInfo()
      setLotteryInfo(data)
    } catch (error) {
      console.error('加载抽奖信息失败:', error)
      setLotteryError('加载失败')
    } finally {
      setLotteryLoading(false)
    }
  }, [])

  // 加载竞猜市场
  const loadMarkets = useCallback(async () => {
    setMarketsLoading(true)
    setMarketsError(null)
    try {
      const data = await predictionApi.getOpenMarkets()
      setOpenMarkets(data)
    } catch (error) {
      console.error('加载竞猜市场失败:', error)
      setMarketsError('加载失败')
      setOpenMarkets([])
    } finally {
      setMarketsLoading(false)
    }
  }, [])

  // 加载背包道具
  const loadItems = useCallback(async () => {
    setItemsLoading(true)
    try {
      const data = await lotteryApi.getItems()
      setItems(data)
    } catch (error) {
      console.error('加载背包失败:', error)
    } finally {
      setItemsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!token) {
      navigate('/login')
      return
    }
    // 并行加载所有数据
    loadBalance()
    loadSignin()
    loadLottery()
    loadMarkets()
    loadItems()
  }, [token, navigate, loadBalance, loadSignin, loadLottery, loadMarkets, loadItems])

  const handleSignin = async () => {
    if (signing || signinStatus?.signed_today) return
    setSigning(true)
    try {
      const result = await pointsApi.signin()
      setBalance(result.balance)
      setSigninStatus((prev) => ({
        ...prev,
        signed_today: true,
        streak_days: result.streak_day,
        streak_display: result.streak_day,
        monthly_signins: [...(prev?.monthly_signins || []), result.signin_date],
      }))
      toast.success(
        result.is_milestone
          ? result.milestone_message
          : `获得 ${result.total_points} 积分`,
        { title: '签到成功', duration: 4000 }
      )
      trackSignin(result.streak_day)
    } catch (error) {
      toast.error(error.response?.data?.detail || '签到失败')
    } finally {
      setSigning(false)
    }
  }

  const handleDraw = async () => {
    if (drawing || !lotteryInfo?.can_draw) return
    setDrawing(true)
    setLastPrize(null)
    try {
      // 如果有抽奖券，优先使用券
      const hasTicket = (lotteryInfo?.lottery_tickets || 0) > 0
      const result = await lotteryApi.draw(null, hasTicket)
      setLastPrize(result)
      setBalance(result.balance)
      // 更新券数量和状态
      setLotteryInfo((prev) => {
        const newTickets = result.used_ticket ? Math.max(0, (prev?.lottery_tickets || 0) - 1) : prev?.lottery_tickets
        const newTodayCount = (prev?.today_count || 0) + 1
        // can_draw 逻辑：有券可以抽（不受每日限制），或者积分够且未达每日限制
        const canDrawWithPoints = result.balance >= prev?.cost_points && (
          prev?.daily_limit === null || newTodayCount < prev?.daily_limit
        )
        return {
          ...prev,
          today_count: newTodayCount,
          balance: result.balance,
          lottery_tickets: newTickets,
          can_draw: newTickets > 0 || canDrawWithPoints,
        }
      })
      // 显示中奖庆祝弹窗
      setShowLotteryWinModal(true)
      trackLottery('normal', result.used_ticket ? 0 : (lotteryInfo?.cost_points || 20), result.prize_name)
      // 刷新背包
      loadItems()
    } catch (error) {
      toast.error(error.response?.data?.detail || '抽奖失败')
    } finally {
      setDrawing(false)
    }
  }

  // 关闭抽奖弹窗
  const handleCloseLotteryWinModal = () => {
    setShowLotteryWinModal(false)
  }

  // 再抽一次（从弹窗触发）
  const handleDrawAgainFromModal = () => {
    setShowLotteryWinModal(false)
    setTimeout(() => {
      if (lotteryInfo?.can_draw) {
        handleDraw()
      }
    }, 100)
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pt-24 pb-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* 页面标题 */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl shadow-lg">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">疯狂娱乐城</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm">签到、抽奖、竞猜，只因你太美</p>
            </div>
          </div>

          {/* 积分和背包 */}
          <div className="flex items-center gap-3">
            {/* 背包按钮 */}
            <button
              onClick={() => setShowBackpack(true)}
              className="relative flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 rounded-xl hover:shadow-md transition-all"
            >
              <Backpack className="w-5 h-5 text-amber-600" />
              <span className="text-sm font-medium text-amber-600">背包</span>
              {items.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {items.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              )}
            </button>

            {/* 积分显示 */}
            <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30 rounded-xl">
              <Coins className="w-5 h-5 text-yellow-600" />
              {balanceLoading ? (
                <Skeleton className="w-12 h-6" />
              ) : balanceError ? (
                <span className="text-sm text-red-500">--</span>
              ) : (
                <>
                  <span className="text-lg font-bold text-yellow-600">{balance}</span>
                  <span className="text-sm text-yellow-600/80">积分</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 主要内容区 */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* 签到 */}
          {signinLoading ? (
            <SigninCalendarSkeleton />
          ) : signinError ? (
            <ErrorCard
              title="签到加载失败"
              message={signinError}
              onRetry={loadSignin}
            />
          ) : (
            <SigninCalendar
              signinStatus={signinStatus}
              onSignin={handleSignin}
              signing={signing}
            />
          )}

          {/* 抽奖 */}
          {lotteryLoading ? (
            <LotterySkeleton />
          ) : lotteryError ? (
            <ErrorCard
              title="抽奖加载失败"
              message={lotteryError}
              onRetry={loadLottery}
            />
          ) : (
            <LotteryWheel
              lotteryInfo={lotteryInfo}
              onDraw={handleDraw}
              drawing={drawing}
              lastPrize={lastPrize}
            />
          )}

          {/* 扭蛋机 */}
          <GachaMachine onBalanceUpdate={setBalance} />
        </div>

        {/* 刮刮乐区域 */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* 刮刮乐 */}
          <ScratchCard onBalanceUpdate={setBalance} />

          {/* 刮刮乐说明 */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl">
                <Gift className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white">刮刮乐奖池 · 30积分/张</h3>
            </div>

            {/* 奖励概率表格 */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-700 dark:text-yellow-400">神秘兑换码</span>
                  <span className="text-xs px-1.5 py-0.5 bg-yellow-200 dark:bg-yellow-800 text-yellow-700 dark:text-yellow-300 rounded">稀有</span>
                </div>
                <span className="text-sm font-bold text-yellow-600">5%</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-purple-500" />
                  <span className="text-sm text-slate-700 dark:text-slate-300">幸运积分 +50</span>
                </div>
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">20%</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-blue-500" />
                  <span className="text-sm text-slate-700 dark:text-slate-300">小额积分 +20</span>
                </div>
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">30%</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-700 dark:text-slate-300">微量积分 +10</span>
                </div>
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">35%</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <X className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-500">谢谢参与</span>
                </div>
                <span className="text-sm font-medium text-slate-400">10%</span>
              </div>
            </div>

            <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
              <p className="text-xs text-orange-600 dark:text-orange-400">
                <span className="font-medium">玩法：</span>刮开40%涂层自动揭晓奖品，每日限购5张
              </p>
            </div>
          </div>
        </div>

        {/* 老虎机区域 */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* 老虎机 */}
          <SlotMachine onBalanceUpdate={setBalance} />

          {/* 老虎机说明 */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-gradient-to-br from-red-500 to-pink-500 rounded-xl">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white">老虎机奖池 · 30积分/次</h3>
            </div>

            {/* 奖励倍率表格 */}
            <div className="space-y-2 mb-4">
              {/* 头奖 - 7️⃣ */}
              <div className="flex items-center justify-between p-2 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/30 dark:to-amber-900/30 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-center gap-2">
                  <span className="text-xl">7️⃣7️⃣7️⃣</span>
                  <span className="text-sm font-medium text-yellow-700 dark:text-yellow-400">头奖</span>
                </div>
                <span className="text-sm font-bold text-yellow-600 dark:text-yellow-400">100倍 · 约1.7%</span>
              </div>
              {/* 大奖 - 🍒 */}
              <div className="flex items-center justify-between p-2 bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🍒🍒🍒</span>
                  <span className="text-sm font-medium text-red-700 dark:text-red-400">大奖</span>
                </div>
                <span className="text-sm font-bold text-red-600 dark:text-red-400">50倍 · 约3.4%</span>
              </div>
              {/* 中奖 - 🔔 */}
              <div className="flex items-center justify-between p-2 bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🔔🔔🔔</span>
                  <span className="text-sm text-orange-700 dark:text-orange-400">中奖</span>
                </div>
                <span className="text-sm font-medium text-orange-600 dark:text-orange-400">20倍 · 约6.9%</span>
              </div>
              {/* 小奖们 */}
              <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🍋🍋🍋</span>
                  <span className="text-sm text-slate-600 dark:text-slate-400">小奖</span>
                </div>
                <span className="text-sm text-slate-500">10倍 · 约10%</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🍇🍇🍇</span>
                  <span className="text-sm text-slate-600 dark:text-slate-400">小奖</span>
                </div>
                <span className="text-sm text-slate-500">5倍 · 约14%</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🍉🍉🍉</span>
                  <span className="text-sm text-slate-600 dark:text-slate-400">小奖</span>
                </div>
                <span className="text-sm text-slate-500">3倍 · 约17%</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-xl">⭐⭐⭐</span>
                  <span className="text-sm text-slate-600 dark:text-slate-400">安慰</span>
                </div>
                <span className="text-sm text-slate-500">2倍 · 约21%</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🎰🎰🎰</span>
                  <span className="text-sm text-slate-600 dark:text-slate-400">保底</span>
                </div>
                <span className="text-sm text-slate-500">1倍 · 约26%</span>
              </div>
            </div>

            {/* 特殊规则提示 */}
            <div className="p-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl mb-3">
              <p className="text-xs text-purple-600 dark:text-purple-400">
                <span className="font-medium">🎁 两图相同奖励：</span>任意两个相同图案可获得 <span className="font-bold">1.5倍</span> 奖励！
              </p>
            </div>

            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl">
              <p className="text-xs text-red-600 dark:text-red-400">
                <span className="font-medium">玩法：</span>每次30积分，每日限玩20次，祝你好运！
              </p>
            </div>
          </div>
        </div>

        {/* 积分兑换商城 */}
        <div className="mb-8">
          <ExchangeShop balance={balance} onBalanceUpdate={setBalance} />
        </div>

        {/* 竞猜区 */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">热门竞猜</h3>
                <p className="text-sm text-slate-500">用积分下注，赢取更多奖励</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <HelpButton onClick={() => setShowPredictionHelp(true)} />
              <Link
                to="/prediction"
                className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                查看全部
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* 竞猜帮助弹窗 */}
          <GameHelpModal isOpen={showPredictionHelp} onClose={() => setShowPredictionHelp(false)} title="竞猜玩法">
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <h4 className="font-bold text-blue-700 dark:text-blue-300 mb-2 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> 基本规则
                </h4>
                <ul className="text-sm text-blue-600 dark:text-blue-400 space-y-1">
                  <li>• 选择一个竞猜话题进行下注</li>
                  <li>• 用积分押注你认为正确的选项</li>
                  <li>• 最低下注 <span className="font-bold">10</span> 积分</li>
                </ul>
              </div>
              <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
                <h4 className="font-bold text-indigo-700 dark:text-indigo-300 mb-2 flex items-center gap-2">
                  <Trophy className="w-4 h-4" /> 赔率说明
                </h4>
                <ul className="text-sm text-indigo-600 dark:text-indigo-400 space-y-1">
                  <li>• 每个选项有对应的赔率（如2.0x）</li>
                  <li>• 中奖后获得：下注金额 × 赔率</li>
                  <li>• 赔率根据下注情况动态变化</li>
                </ul>
              </div>
              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                <h4 className="font-bold text-purple-700 dark:text-purple-300 mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4" /> 结算规则
                </h4>
                <ul className="text-sm text-purple-600 dark:text-purple-400 space-y-1">
                  <li>• 竞猜截止后等待官方公布结果</li>
                  <li>• 结果公布后系统自动结算</li>
                  <li>• 中奖积分自动发放到账户</li>
                </ul>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
                <h4 className="font-bold text-green-700 dark:text-green-300 mb-2 flex items-center gap-2">
                  <Coins className="w-4 h-4" /> 温馨提示
                </h4>
                <ul className="text-sm text-green-600 dark:text-green-400 space-y-1">
                  <li>• 下注后不可撤销，请谨慎选择</li>
                  <li>• 可在"我的竞猜"查看下注记录</li>
                  <li>• 理性参与，适度游戏</li>
                </ul>
              </div>
            </div>
          </GameHelpModal>

          {marketsLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array(3).fill(0).map((_, i) => (
                <div key={i} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
                  <Skeleton className="w-3/4 h-5 mb-3" />
                  <Skeleton className="w-1/2 h-4 mb-3" />
                  <Skeleton className="w-full h-4 mb-2" />
                  <Skeleton className="w-full h-4 mb-2" />
                  <Skeleton className="w-full h-4" />
                </div>
              ))}
            </div>
          ) : marketsError ? (
            <div className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
              <p className="text-slate-500 dark:text-slate-400 mb-4">{marketsError}</p>
              <button
                onClick={loadMarkets}
                className="flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                重试
              </button>
            </div>
          ) : openMarkets.length === 0 ? (
            <div className="text-center py-12">
              <Target className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <p className="text-slate-500 dark:text-slate-400">暂无进行中的竞猜</p>
              <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">敬请期待...</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {openMarkets.slice(0, 6).map((market) => (
                <PredictionCard key={market.id} market={market} />
              ))}
            </div>
          )}
        </div>

        {/* 快捷入口 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <Link
            to="/achievements"
            className="flex items-center gap-3 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-700 transition-colors"
          >
            <Award className="w-8 h-8 text-purple-500" />
            <div>
              <p className="font-medium text-slate-900 dark:text-white">我的成就</p>
              <p className="text-xs text-slate-500">查看徽章</p>
            </div>
          </Link>
          <Link
            to="/ranking"
            className="flex items-center gap-3 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-yellow-300 dark:hover:border-yellow-700 transition-colors"
          >
            <Trophy className="w-8 h-8 text-yellow-500" />
            <div>
              <p className="font-medium text-slate-900 dark:text-white">排行榜</p>
              <p className="text-xs text-slate-500">查看人气榜</p>
            </div>
          </Link>
          <Link
            to="/participants"
            className="flex items-center gap-3 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-red-300 dark:hover:border-red-700 transition-colors"
          >
            <Heart className="w-8 h-8 text-red-500" />
            <div>
              <p className="font-medium text-slate-900 dark:text-white">为TA打气</p>
              <p className="text-xs text-slate-500">支持选手</p>
            </div>
          </Link>
          <Link
            to="/my-bets"
            className="flex items-center gap-3 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
          >
            <Target className="w-8 h-8 text-blue-500" />
            <div>
              <p className="font-medium text-slate-900 dark:text-white">我的竞猜</p>
              <p className="text-xs text-slate-500">查看下注</p>
            </div>
          </Link>
        </div>
      </div>

      {/* 背包弹窗 */}
      {showBackpack && (
        <BackpackModal
          items={items}
          loading={itemsLoading}
          onClose={() => setShowBackpack(false)}
        />
      )}

      {/* 抽奖中奖庆祝弹窗 */}
      {showLotteryWinModal && lastPrize && (
        <LotteryWinModal
          prize={lastPrize}
          onClose={handleCloseLotteryWinModal}
          onPlayAgain={handleDrawAgainFromModal}
          canPlayAgain={lotteryInfo?.can_draw}
        />
      )}
    </div>
  )
}
