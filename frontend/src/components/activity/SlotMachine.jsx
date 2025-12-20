import { useState, useEffect, useCallback, useRef } from 'react'
import { Zap, Coins, RefreshCw, Volume2, VolumeX, Trophy, Star, X, HelpCircle, Shield } from 'lucide-react'
import api from '../../services/api'
import { pointsApi } from '../../services'
import { useToast } from '../Toast'
import { trackLottery } from '../../utils/analytics'
import GameHelpModal, { HelpButton } from './GameHelpModal'

// 音效文件
import spinSound from '../../assets/sounds/mixkit-slot-machine-win-1928.wav'
import winSound from '../../assets/sounds/mixkit-coin-win-notification-1992.wav'
import loseSound from '../../assets/sounds/ngmhhy.mp3'  // 你干嘛嗨嗨呦 - 没中奖/律师函

// 蔡徐坤梗图片 - iKun转转乐符号（8个）
import imgJ from '../../assets/j.png'       // 鸡
import imgN from '../../assets/n.png'       // 你干嘛
import imgT from '../../assets/t.png'       // 铁山靠
import imgM from '../../assets/m.png'       // man/坤
import imgBj from '../../assets/bj.jpg'     // 背景
import imgBdk from '../../assets/bdk.jpg'   // 背带裤
import imgLsh from '../../assets/lsh.png'   // 律师函
import imgMan from '../../assets/man.png'   // Man! - 特殊符号，出现就有奖励

// 符号配置（8个符号）
const LOCAL_SYMBOLS = [
  { key: 'j', img: imgJ, name: '鸡', emoji: '🐔' },
  { key: 'n', img: imgN, name: '你干嘛', emoji: '❓' },
  { key: 't', img: imgT, name: '铁山靠', emoji: '🏔️' },
  { key: 'm', img: imgM, name: '坤', emoji: '👨' },
  { key: 'bj', img: imgBj, name: '背景', emoji: '🎬' },
  { key: 'bdk', img: imgBdk, name: '背带裤', emoji: '👖' },
  { key: 'lsh', img: imgLsh, name: '律师函', emoji: '📜' },
  { key: 'man', img: imgMan, name: 'Man!', emoji: '🕺' },  // 新增：Man! 特殊符号
]

// 符号索引映射
const SYMBOL_INDEX = LOCAL_SYMBOLS.reduce((acc, s, i) => { acc[s.key] = i; return acc }, {})

// 中奖规则现在从后端数据库读取
// 前端只负责显示，所有中奖计算都在后端完成

// iKun转转乐中奖庆祝弹窗
function SlotWinModal({ result, symbols, onClose, onPlayAgain, canPlayAgain }) {
  // 获取实际的4个滚轴符号
  const getReelSymbols = () => {
    if (result.reels && result.reels.length === 4) {
      return result.reels.map(idx => LOCAL_SYMBOLS[idx] || LOCAL_SYMBOLS[0])
    }
    // 兜底：返回4个默认符号
    return [LOCAL_SYMBOLS[0], LOCAL_SYMBOLS[0], LOCAL_SYMBOLS[0], LOCAL_SYMBOLS[0]]
  }

  const isJackpot = result.isJackpot
  const reelSymbols = getReelSymbols()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-gradient-to-br ${isJackpot ? 'from-yellow-500 via-orange-500 to-red-500' : 'from-green-600 via-emerald-600 to-teal-600'} rounded-2xl shadow-2xl w-full max-w-xs sm:max-w-sm overflow-hidden border-2 ${isJackpot ? 'border-yellow-300' : 'border-green-400'} animate-[scaleIn_0.3s_ease-out]`}>
        {/* 装饰粒子/闪光 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(isJackpot ? 30 : 15)].map((_, i) => (
            <div
              key={i}
              className={`absolute w-1.5 h-1.5 sm:w-2 sm:h-2 ${isJackpot ? 'bg-yellow-200' : 'bg-green-200'} rounded-full animate-ping`}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${0.8 + Math.random() * 0.5}s`,
              }}
            />
          ))}
        </div>

        <div className="relative p-4 sm:p-6 text-center">
          {/* 关闭按钮 */}
          <button onClick={onClose} className="absolute top-2 right-2 sm:top-3 sm:right-3 p-1.5 hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-4 h-4 sm:w-5 sm:h-5 text-white/70" />
          </button>

          {/* 中奖图案展示 - 显示实际的4个滚轴结果 */}
          <div className="flex justify-center gap-1 sm:gap-1.5 mb-3 sm:mb-4">
            {reelSymbols.map((symbol, i) => (
              <div
                key={i}
                className={`w-11 h-11 sm:w-14 sm:h-14 ${isJackpot ? 'bg-yellow-400/30' : 'bg-green-400/30'} rounded-xl flex items-center justify-center border-2 ${isJackpot ? 'border-yellow-300' : 'border-green-300'} ${isJackpot ? 'animate-bounce' : ''} overflow-hidden`}
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <img src={symbol.img} alt={symbol.name} className="w-9 h-9 sm:w-12 sm:h-12 object-cover rounded-lg" />
              </div>
            ))}
          </div>

          {/* 奖励图标 */}
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 sm:mb-4">
            <div className={`absolute inset-0 bg-gradient-to-br ${isJackpot ? 'from-yellow-300 to-orange-400' : 'from-green-300 to-emerald-400'} rounded-full shadow-2xl ${isJackpot ? 'animate-pulse' : ''}`}>
              <div className="absolute top-1.5 sm:top-2 left-2 sm:left-3 w-4 sm:w-5 h-4 sm:h-5 bg-white/30 rounded-full" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              {isJackpot ? (
                <Trophy className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              ) : (
                <Coins className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              )}
            </div>
          </div>

          <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            {isJackpot ? '🎉 JACKPOT! 🎉' : '恭喜中奖！'}
          </h3>

          {/* 奖励展示 */}
          <div className="bg-white/15 rounded-xl p-3 sm:p-4 mb-3 sm:mb-4">
            <div className="text-sm sm:text-lg text-white/80 mb-1">{result.message}</div>
            <div className={`text-2xl sm:text-4xl font-bold ${isJackpot ? 'text-yellow-200' : 'text-green-200'}`}>
              +{result.points} 积分
            </div>
            {result.apiKeyCode && (
              <div className="mt-2 sm:mt-3 p-2 sm:p-3 bg-white/10 rounded-lg border border-yellow-300/50">
                <div className="text-xs sm:text-sm text-yellow-200 mb-1">🎁 额外奖励：兑换码</div>
                <div className="text-xs text-white/90 font-mono break-all select-all">
                  {result.apiKeyCode}
                </div>
                {result.apiKeyQuota && (
                  <div className="text-xs text-yellow-300 mt-1">额度：${result.apiKeyQuota}</div>
                )}
              </div>
            )}
            {isJackpot && (
              <div className="flex items-center justify-center gap-1 mt-2 text-yellow-300">
                <Star className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="text-xs sm:text-sm font-medium">{result.multiplier}倍奖励！</span>
                <Star className="w-3 h-3 sm:w-4 sm:h-4" />
              </div>
            )}
          </div>

          {/* 按钮 */}
          <div className="flex gap-2 sm:gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 sm:py-3 text-sm sm:text-base bg-white/15 hover:bg-white/25 text-white font-medium rounded-xl transition-colors">
              好的
            </button>
            {canPlayAgain && (
              <button onClick={onPlayAgain} className={`flex-1 py-2.5 sm:py-3 text-sm sm:text-base ${isJackpot ? 'bg-gradient-to-r from-yellow-400 to-orange-400' : 'bg-gradient-to-r from-green-400 to-emerald-400'} text-white font-bold rounded-xl hover:shadow-lg transition-all`}>
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

// 单个滚轴组件
function Reel({ spinning, targetIndex, delay }) {
  const [displayIndex, setDisplayIndex] = useState(0)
  const intervalRef = useRef(null)
  const timeoutRef = useRef(null)
  const targetRef = useRef(targetIndex)

  useEffect(() => {
    targetRef.current = targetIndex
  }, [targetIndex])

  useEffect(() => {
    if (spinning && LOCAL_SYMBOLS.length > 0) {
      // 开始滚动
      let index = 0
      intervalRef.current = setInterval(() => {
        index = (index + 1) % LOCAL_SYMBOLS.length
        setDisplayIndex(index)
      }, 80)

      // 延迟后停止到目标位置
      timeoutRef.current = setTimeout(() => {
        clearInterval(intervalRef.current)
        setDisplayIndex(targetRef.current || 0)
      }, 1500 + delay)
    }

    return () => {
      clearInterval(intervalRef.current)
      clearTimeout(timeoutRef.current)
    }
  }, [spinning, delay])

  const symbol = LOCAL_SYMBOLS[displayIndex] || LOCAL_SYMBOLS[0]

  return (
    <div className="relative w-16 h-20 sm:w-20 sm:h-24 bg-gradient-to-b from-slate-800 to-slate-900 rounded-xl overflow-hidden border-2 sm:border-4 border-yellow-500 shadow-inner">
      {/* 上方阴影 */}
      <div className="absolute inset-x-0 top-0 h-4 sm:h-6 bg-gradient-to-b from-black/60 to-transparent z-10" />
      {/* 下方阴影 */}
      <div className="absolute inset-x-0 bottom-0 h-4 sm:h-6 bg-gradient-to-t from-black/60 to-transparent z-10" />

      {/* 符号显示 - 使用图片 */}
      <div className="flex items-center justify-center h-full p-1">
        <img
          src={symbol.img}
          alt={symbol.name}
          className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-lg"
        />
      </div>

      {/* 滚动时的模糊效果 */}
      {spinning && (
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/10 to-transparent animate-pulse" />
      )}
    </div>
  )
}

// 中奖规则现在完全由后端计算，前端不再需要判定函数

// 主组件
export default function SlotMachine({ onBalanceUpdate, externalBalance, userRole, refreshTrigger }) {
  // 管理员不限次数
  const isAdmin = userRole === 'admin'
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [balance, setBalance] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [results, setResults] = useState([0, 0, 0, 0]) // 4个滚轴
  const [lastWin, setLastWin] = useState(null)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [showWinModal, setShowWinModal] = useState(false)
  const [winModalData, setWinModalData] = useState(null)
  const [showHelp, setShowHelp] = useState(false)

  // 从后端获取的配置
  const [config, setConfig] = useState(null)
  const [symbols, setSymbols] = useState([])
  const [todayCount, setTodayCount] = useState(0)
  const [dailyLimit, setDailyLimit] = useState(null)
  const costPoints = config?.cost_points ?? 30

  // 加载iKun转转乐配置（包含余额和次数）
  const loadConfig = useCallback(async () => {
    try {
      const data = await api.get('/slot-machine/config')
      setConfig(data.config || null)
      setSymbols(data.symbols || [])
      setBalance(data.balance || 0)
      setTodayCount(data.today_count || 0)
      setDailyLimit(data.config?.daily_limit || null)
    } catch (e) {
      console.error('加载iKun转转乐配置失败:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  // 兑换券后刷新状态
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      loadConfig()
    }
  }, [refreshTrigger, loadConfig])

  // 当外部余额变化时，同步更新内部余额
  // 使用 ref 避免依赖 balance 导致循环更新
  const balanceRef = useRef(balance)
  balanceRef.current = balance

  useEffect(() => {
    if (externalBalance !== undefined && externalBalance !== balanceRef.current) {
      setBalance(externalBalance)
    }
  }, [externalBalance])

  // 音频引用
  const spinAudioRef = useRef(null)
  const winAudioRef = useRef(null)
  const loseAudioRef = useRef(null)

  // 初始化音频
  useEffect(() => {
    spinAudioRef.current = new Audio(spinSound)
    winAudioRef.current = new Audio(winSound)
    loseAudioRef.current = new Audio(loseSound)
    spinAudioRef.current.volume = 0.5
    winAudioRef.current.volume = 0.6
    loseAudioRef.current.volume = 0.7  // 你干嘛音效稍大声
  }, [])

  // 播放音效
  const playSound = useCallback((type) => {
    if (!soundEnabled) return

    try {
      if (type === 'spin') {
        // 拉动音效
        if (spinAudioRef.current) {
          spinAudioRef.current.currentTime = 0
          spinAudioRef.current.play().catch(() => {})
        }
      } else if (type === 'win' || type === 'jackpot') {
        // 中奖音效
        if (winAudioRef.current) {
          winAudioRef.current.currentTime = 0
          winAudioRef.current.play().catch(() => {})
        }
      } else if (type === 'lose') {
        // 你干嘛音效 - 没中奖或律师函惩罚
        if (loseAudioRef.current) {
          loseAudioRef.current.currentTime = 0
          loseAudioRef.current.play().catch(() => {})
        }
      }
    } catch (e) {
      // 音频播放失败时静默处理
    }
  }, [soundEnabled])

  // iKun转转乐 - 调用后端API进行抽奖，所有结果由后端计算
  const handleSpin = useCallback(async () => {
    if (spinning || balance < costPoints) return
    // 管理员不限次数
    if (!isAdmin && dailyLimit && todayCount >= dailyLimit) return

    // 开始转动动画
    setSpinning(true)
    setLastWin(null)
    playSound('spin')

    // 保存原始余额用于回滚
    const originalBalance = balance

    // 先扣除积分（乐观更新）
    const newBalance = balance - costPoints
    setBalance(newBalance)

    // 调用后端API
    let response = null
    try {
      response = await api.post('/slot-machine/spin')
    } catch (e) {
      console.error('iKun转转乐请求失败:', e)
      // 请求失败时回滚余额
      setBalance(originalBalance)
      onBalanceUpdate?.(originalBalance)
      setSpinning(false)
      toast.error(e?.response?.data?.detail || '网络异常，请重试')
      return
    }

    // 根据后端返回的符号key设置滚轴结果（用于动画显示）
    const reelKeys = response.reels || []
    const newResults = reelKeys.map(key => {
      const idx = LOCAL_SYMBOLS.findIndex(s => s.key === key)
      return idx >= 0 ? idx : 0
    })
    // 确保有4个结果
    while (newResults.length < 4) {
      newResults.push(Math.floor(Math.random() * LOCAL_SYMBOLS.length))
    }
    setResults(newResults)

    // 等待动画完成后显示结果
    const totalDuration = 1500 + 900 + 300 // 4个滚轴需要更长时间
    setTimeout(() => {
      setSpinning(false)

      // 从后端响应获取结果
      const payout = response.payout_points || 0
      const totalMultiplier = response.multiplier || 0
      const isWin = payout > 0
      const isJackpot = response.is_jackpot || false
      const isLoss = payout < 0  // 惩罚导致额外扣除
      const winName = response.win_name || ''
      const matchedRules = response.matched_rules || []

      // 检查是否有惩罚规则
      const hasPenalty = matchedRules.some(r => r.rule_type === 'penalty')

      // 构建消息
      let message = '再接再厉！'
      if (hasPenalty && isLoss) {
        message = `律师函警告！额外扣除 ${Math.abs(payout)} 积分`
      } else if (hasPenalty && payout === 0) {
        message = `律师函抵消了奖励！`
      } else if (hasPenalty && isWin) {
        message = `${winName}！（被律师函削减）获得 ${payout} 积分`
      } else if (isWin) {
        message = `${winName}！${totalMultiplier}x 获得 ${payout} 积分！`
      }

      // 更新余额（使用后端返回的余额）
      const finalBalance = response.balance
      setBalance(finalBalance)
      onBalanceUpdate?.(finalBalance)
      setTodayCount(prev => prev + 1)

      setLastWin({
        win: isWin,
        loss: isLoss,
        multiplier: totalMultiplier,
        points: payout,
        message,
        isJackpot,
        hasPenalty,
        banHours: 0,
        freePlay: false,
        winNames: winName ? [winName] : [],
        reelKeys,
        apiKeyCode: response.api_key_code,
        apiKeyQuota: response.api_key_quota,
      })

      if (isWin && !hasPenalty) {
        // 纯中奖（没有惩罚）- 显示中奖弹窗
        playSound(isJackpot ? 'jackpot' : 'win')
        setWinModalData({
          win: true,
          multiplier: totalMultiplier,
          points: payout,
          message,
          isJackpot,
          reels: newResults,
          winNames: winName ? [winName] : [],
          freePlay: false,
          apiKeyCode: response.api_key_code,
          apiKeyQuota: response.api_key_quota,
        })
        setShowWinModal(true)
      } else if (hasPenalty) {
        // 有惩罚 - 播放"你干嘛"音效，用 toast 显示结果
        playSound('lose')
        if (isWin) {
          toast.warning(message)
        } else if (isLoss) {
          toast.error(message)
        } else {
          toast.warning(message)
        }
      } else {
        // 没中奖 - 播放"你干嘛"音效
        playSound('lose')
      }

      trackLottery('slot', costPoints, isWin ? `${winName}:${payout}积分` : '未中奖')
    }, totalDuration)
  }, [spinning, balance, costPoints, dailyLimit, todayCount, isAdmin, onBalanceUpdate, playSound, toast])

  // 关闭中奖弹窗
  const handleCloseWinModal = () => {
    setShowWinModal(false)
    setWinModalData(null)
  }

  // 再来一次（从弹窗触发）
  const handlePlayAgainFromModal = () => {
    setShowWinModal(false)
    setWinModalData(null)
    // 延迟一点再开始
    setTimeout(() => {
      if (!spinning && balance >= costPoints && (isAdmin || dailyLimit === null || todayCount < dailyLimit)) {
        handleSpin()
      }
    }, 100)
  }

  // canSpin 需要同时检查日限（管理员不限次数）
  const canSpin = !spinning && balance >= costPoints && (isAdmin || dailyLimit === null || todayCount < dailyLimit)

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-purple-900 via-red-900 to-pink-900 rounded-2xl border border-yellow-500/50 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-yellow-500/20 rounded-xl animate-pulse" />
          <div>
            <div className="w-24 h-5 bg-yellow-500/20 rounded animate-pulse mb-1" />
            <div className="w-16 h-4 bg-yellow-500/20 rounded animate-pulse" />
          </div>
        </div>
        <div className="flex justify-center gap-3 mb-6">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-20 h-24 bg-slate-800/50 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="w-full h-12 bg-yellow-500/20 rounded-xl animate-pulse" />
      </div>
    )
  }

  // 如果配置未启用
  if (!config?.is_active) {
    return (
      <div className="bg-gradient-to-br from-purple-900 via-red-900 to-pink-900 rounded-2xl border border-yellow-500/50 p-6 text-center">
        <Zap className="w-12 h-12 text-yellow-500/50 mx-auto mb-4" />
        <p className="text-yellow-300/70">iKun转转乐暂未开放</p>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-purple-900 via-red-900 to-pink-900 rounded-2xl border-2 border-yellow-500 p-4 sm:p-6 shadow-2xl relative overflow-hidden">
      {/* 装饰灯光 */}
      <div className="absolute top-0 left-0 right-0 flex justify-around py-1.5 sm:py-2">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full transition-colors ${
              spinning
                ? i % 2 === 0
                  ? 'bg-yellow-400 animate-pulse'
                  : 'bg-red-500 animate-pulse'
                : 'bg-yellow-600'
            }`}
            style={{ animationDelay: `${i * 50}ms` }}
          />
        ))}
      </div>

      {/* 头部 */}
      <div className="flex items-center justify-between mb-4 sm:mb-6 mt-3 sm:mt-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl shadow-lg">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-white">{config?.name || 'iKun转转乐'}</h3>
            <p className="text-sm text-yellow-300">{costPoints}积分/次</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {dailyLimit > 0 && !isAdmin && (
            <div className="text-sm text-yellow-300/80 bg-black/30 px-3 py-1 rounded-lg">
              今日: <span className="font-bold text-yellow-300">{Math.min(todayCount, dailyLimit)}</span>/{dailyLimit}
            </div>
          )}
          {isAdmin && (
            <div className="text-sm text-green-300 bg-green-900/30 px-3 py-1 rounded-lg flex items-center gap-1">
              <Shield className="w-3 h-3" /> 无限
            </div>
          )}
          <button
            onClick={() => setShowHelp(true)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            title="查看玩法说明"
          >
            <HelpCircle className="w-5 h-5 text-yellow-400 hover:text-yellow-300 transition-colors" />
          </button>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            title={soundEnabled ? '关闭音效' : '开启音效'}
          >
            {soundEnabled ? (
              <Volume2 className="w-5 h-5 text-yellow-400" />
            ) : (
              <VolumeX className="w-5 h-5 text-slate-400" />
            )}
          </button>
        </div>
      </div>

      {/* iKun转转乐帮助弹窗 */}
      <GameHelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} title="iKun转转乐玩法">
        <div className="space-y-3 text-sm max-h-[60vh] overflow-y-auto">
          {/* 基本规则 */}
          <div className="p-2.5 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
            <h4 className="font-bold text-yellow-700 dark:text-yellow-300 mb-1.5 flex items-center gap-2">
              <Zap className="w-4 h-4" /> 基本规则
            </h4>
            <ul className="text-xs text-yellow-600 dark:text-yellow-400 space-y-0.5">
              <li>• 每次消耗 <span className="font-bold">{costPoints}</span> 积分，4个滚轴</li>
              <li>• 每日限玩 <span className="font-bold">{dailyLimit || 20}</span> 次</li>
            </ul>
          </div>

          {/* 大奖规则 */}
          <div className="p-2.5 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl">
            <h4 className="font-bold text-purple-700 dark:text-purple-300 mb-1.5 flex items-center gap-2">
              <Trophy className="w-4 h-4" /> 大奖组合
            </h4>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-purple-600 dark:text-purple-400">🎵 姬霓太美 (j→n→t→m顺序)</span>
                <span className="font-bold text-yellow-600">100x</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-purple-600 dark:text-purple-400">👨 4坤 (mmmm)</span>
                <span className="font-bold text-yellow-600">80x</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-purple-600 dark:text-purple-400">🐔 4🐔 (4个相同)</span>
                <span className="font-bold text-green-600">50x</span>
              </div>
            </div>
          </div>

          {/* 中奖规则 */}
          <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
            <h4 className="font-bold text-blue-700 dark:text-blue-300 mb-1.5 flex items-center gap-2">
              <Star className="w-4 h-4" /> 其他组合
            </h4>
            <div className="space-y-1 text-xs text-blue-600 dark:text-blue-400">
              <div className="flex justify-between"><span>鸡你不太美 (jntm任意顺序)</span><span className="font-bold">15x</span></div>
              <div className="flex justify-between"><span>3坤连续</span><span className="font-bold">8x</span></div>
              <div className="flex justify-between"><span>对称ABBA</span><span className="font-bold">5x</span></div>
              <div className="flex justify-between"><span>普通3🐔 (3个相同)</span><span className="font-bold">4x</span></div>
              <div className="flex justify-between"><span>2坤连续</span><span className="font-bold">3x</span></div>
              <div className="flex justify-between"><span>普通双🐔 (2个相同)</span><span className="font-bold">1.5x</span></div>
            </div>
          </div>

          {/* Man! 特殊符号 */}
          <div className="p-2.5 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl">
            <h4 className="font-bold text-green-700 dark:text-green-300 mb-1.5 flex items-center gap-2">
              🕺 Man! 特殊符号（出现就有奖励）
            </h4>
            <div className="space-y-1 text-xs text-green-600 dark:text-green-400">
              <div className="flex justify-between"><span>1个Man!</span><span className="font-bold">2x + 抵消1个律师函</span></div>
              <div className="flex justify-between"><span>2个Man!</span><span className="font-bold">5x + 抵消2个律师函</span></div>
              <div className="flex justify-between"><span>3个Man!</span><span className="font-bold">12x + 抵消3个律师函</span></div>
              <div className="flex justify-between"><span>4个Man!</span><span className="font-bold">30x + 完全免疫律师函</span></div>
            </div>
            <p className="text-[10px] text-green-500 mt-1">💡 Man! 是你的保护神，可以抵消律师函的惩罚！</p>
          </div>

          {/* 律师函惩罚 */}
          <div className="p-2.5 bg-red-50 dark:bg-red-900/20 rounded-xl">
            <h4 className="font-bold text-red-700 dark:text-red-300 mb-1.5 flex items-center gap-2">
              ⚖️ 律师函惩罚（会额外扣积分！）
            </h4>
            <div className="space-y-1 text-xs text-red-600 dark:text-red-400">
              <div className="flex justify-between"><span>1个律师函</span><span className="font-bold">-0.5x（额外扣15积分）</span></div>
              <div className="flex justify-between"><span>2个律师函</span><span className="font-bold">-1.5x（额外扣45积分）</span></div>
              <div className="flex justify-between"><span>3个律师函</span><span className="font-bold">-3x（额外扣90积分）</span></div>
              <div className="flex justify-between"><span>4个律师函</span><span className="font-bold">-5x 🔒封禁1小时</span></div>
            </div>
            <p className="text-[10px] text-red-500 mt-1">⚠️ 律师函会与中奖叠加计算，可能导致亏损！但 Man! 可以抵消！</p>
          </div>

          {/* 符号列表 */}
          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
            <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-1.5">符号图鉴</h4>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-1 text-center">
              {LOCAL_SYMBOLS.map((symbol) => (
                <div key={symbol.key} className="p-1 bg-white/50 dark:bg-slate-700/50 rounded">
                  <img src={symbol.img} alt={symbol.name} className="w-6 h-6 mx-auto object-cover rounded" />
                  <div className="text-[10px] text-slate-500 truncate">{symbol.name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </GameHelpModal>

      {/* iKun转转乐主体 - 4个滚轴 */}
      <div className="bg-gradient-to-b from-slate-700 to-slate-800 rounded-xl p-3 sm:p-4 mb-3 sm:mb-4 border-2 sm:border-4 border-yellow-600 shadow-inner">
        {/* 滚轴区域 - 4个 */}
        <div className="flex justify-center gap-1.5 sm:gap-2 mb-3 sm:mb-4">
          <Reel spinning={spinning} targetIndex={results[0]} delay={0} />
          <Reel spinning={spinning} targetIndex={results[1]} delay={300} />
          <Reel spinning={spinning} targetIndex={results[2]} delay={600} />
          <Reel spinning={spinning} targetIndex={results[3]} delay={900} />
        </div>

        {/* 中奖线 */}
        <div className="relative h-1 bg-gradient-to-r from-transparent via-yellow-400 to-transparent rounded-full" />
      </div>

      {/* 中奖提示 */}
      {lastWin && (
        <div
          className={`mb-4 p-3 rounded-xl text-center transition-all ${
            lastWin.loss
              ? 'bg-gradient-to-r from-red-600 to-red-800 animate-pulse'
              : lastWin.hasPenalty && !lastWin.win
              ? 'bg-gradient-to-r from-orange-600 to-red-700'
              : lastWin.win
              ? lastWin.isJackpot
                ? 'bg-gradient-to-r from-yellow-500 to-orange-500 animate-pulse'
                : 'bg-green-500/80'
              : 'bg-slate-700/80'
          }`}
        >
          <p className={`font-bold ${lastWin.win || lastWin.hasPenalty || lastWin.loss ? 'text-white' : 'text-slate-300'}`}>
            {lastWin.message}
          </p>
          {lastWin.win && (
            <p className="text-sm text-white/80 mt-1">
              获得 <span className="font-bold text-yellow-300">+{lastWin.points}</span> 积分
              {lastWin.freePlay && <span className="ml-2 text-green-300">🎁 +1次免费</span>}
            </p>
          )}
          {lastWin.loss && (
            <p className="text-sm text-red-200 mt-1">
              额外扣除 <span className="font-bold text-red-300">{Math.abs(lastWin.points)}</span> 积分
            </p>
          )}
          {lastWin.hasPenalty && lastWin.banHours > 0 && (
            <p className="text-sm text-red-200 mt-1">
              🔒 封禁 {lastWin.banHours} 小时
            </p>
          )}
        </div>
      )}

      {/* 余额显示 */}
      <div className="flex items-center justify-center gap-2 mb-3 sm:mb-4 py-2 bg-black/30 rounded-lg">
        <Coins className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
        <span className="text-lg sm:text-xl font-bold text-yellow-400">{balance}</span>
        <span className="text-xs sm:text-sm text-yellow-300/80">积分</span>
      </div>

      {/* 拉杆按钮 */}
      <button
        onClick={handleSpin}
        disabled={!canSpin}
        className={`w-full py-3 sm:py-4 rounded-xl font-bold text-base sm:text-lg transition-all relative overflow-hidden ${
          !canSpin
            ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 text-white hover:shadow-lg hover:shadow-orange-500/50 hover:scale-[1.02] active:scale-[0.98]'
        }`}
      >
        {spinning ? (
          <span className="flex items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin" />
            转动中...
          </span>
        ) : !isAdmin && dailyLimit && todayCount >= dailyLimit ? (
          '今日次数已用完'
        ) : balance < costPoints ? (
          '积分不足'
        ) : (
          <span className="flex items-center justify-center gap-2">
            <Zap className="w-5 h-5" />
            拉动拉杆
          </span>
        )}

        {/* 按钮光效 */}
        {canSpin && !spinning && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-shimmer" />
        )}
      </button>

      {/* 奖励说明 - 显示8个蔡徐坤梗符号，两行每行4个 */}
      <div className="mt-3 sm:mt-4 grid grid-cols-4 gap-1 sm:gap-1.5 text-center text-xs">
        {LOCAL_SYMBOLS.map((symbol) => (
          <div key={symbol.key} className={`p-1 sm:p-1.5 rounded-lg ${symbol.key === 'man' ? 'bg-green-500/30 ring-1 ring-green-400' : symbol.key === 'lsh' ? 'bg-red-500/30' : 'bg-black/30'}`}>
            <img src={symbol.img} alt={symbol.name} className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-0.5 object-cover rounded" />
            <div className={`text-[10px] sm:text-xs truncate ${symbol.key === 'man' ? 'text-green-400' : symbol.key === 'lsh' ? 'text-red-400' : 'text-yellow-400'}`}>{symbol.name}</div>
          </div>
        ))}
      </div>

      {/* 底部装饰灯光 */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-around py-1.5 sm:py-2">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full transition-colors ${
              spinning
                ? i % 2 === 1
                  ? 'bg-yellow-400 animate-pulse'
                  : 'bg-red-500 animate-pulse'
                : 'bg-yellow-600'
            }`}
            style={{ animationDelay: `${i * 50}ms` }}
          />
        ))}
      </div>

      {/* 添加 shimmer 动画样式 */}
      <style>{`
        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>

      {/* 中奖庆祝弹窗 */}
      {showWinModal && winModalData && (
        <SlotWinModal
          result={winModalData}
          symbols={symbols}
          onClose={handleCloseWinModal}
          onPlayAgain={handlePlayAgainFromModal}
          canPlayAgain={balance >= costPoints}
        />
      )}
    </div>
  )
}
