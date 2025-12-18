import { useState, useEffect, useCallback, useRef } from 'react'
import { Zap, Coins, RefreshCw, Volume2, VolumeX, Trophy, Star, X, HelpCircle } from 'lucide-react'
import api from '../../services/api'
import { pointsApi } from '../../services'
import { useToast } from '../Toast'
import { trackLottery } from '../../utils/analytics'
import GameHelpModal, { HelpButton } from './GameHelpModal'

// 老虎机中奖庆祝弹窗
function SlotWinModal({ result, symbols, onClose, onPlayAgain, canPlayAgain }) {
  // 获取中奖符号的emoji
  const getWinEmoji = () => {
    if (result.reels && result.reels.length > 0) {
      const symbolKey = result.reels[0]
      const symbol = symbols.find(s => s.symbol_key === symbolKey)
      return symbol?.emoji || '🎰'
    }
    return '🎰'
  }

  const isJackpot = result.isJackpot
  const winEmoji = getWinEmoji()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-gradient-to-br ${isJackpot ? 'from-yellow-500 via-orange-500 to-red-500' : 'from-green-600 via-emerald-600 to-teal-600'} rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border-2 ${isJackpot ? 'border-yellow-300' : 'border-green-400'} animate-[scaleIn_0.3s_ease-out]`}>
        {/* 装饰粒子/闪光 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(isJackpot ? 30 : 15)].map((_, i) => (
            <div
              key={i}
              className={`absolute w-2 h-2 ${isJackpot ? 'bg-yellow-200' : 'bg-green-200'} rounded-full animate-ping`}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${0.8 + Math.random() * 0.5}s`,
              }}
            />
          ))}
        </div>

        <div className="relative p-6 text-center">
          {/* 关闭按钮 */}
          <button onClick={onClose} className="absolute top-3 right-3 p-1.5 hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-5 h-5 text-white/70" />
          </button>

          {/* 中奖图案展示 */}
          <div className="flex justify-center gap-2 mb-4">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`w-16 h-16 ${isJackpot ? 'bg-yellow-400/30' : 'bg-green-400/30'} rounded-xl flex items-center justify-center text-4xl border-2 ${isJackpot ? 'border-yellow-300' : 'border-green-300'} ${isJackpot ? 'animate-bounce' : ''}`}
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                {winEmoji}
              </div>
            ))}
          </div>

          {/* 奖励图标 */}
          <div className="relative w-20 h-20 mx-auto mb-4">
            <div className={`absolute inset-0 bg-gradient-to-br ${isJackpot ? 'from-yellow-300 to-orange-400' : 'from-green-300 to-emerald-400'} rounded-full shadow-2xl ${isJackpot ? 'animate-pulse' : ''}`}>
              <div className="absolute top-2 left-3 w-5 h-5 bg-white/30 rounded-full" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              {isJackpot ? (
                <Trophy className="w-10 h-10 text-white" />
              ) : (
                <Coins className="w-10 h-10 text-white" />
              )}
            </div>
          </div>

          <h3 className="text-3xl font-bold text-white mb-2">
            {isJackpot ? '🎉 JACKPOT! 🎉' : '恭喜中奖！'}
          </h3>

          {/* 奖励展示 */}
          <div className="bg-white/15 rounded-xl p-4 mb-4">
            <div className="text-lg text-white/80 mb-1">{result.message}</div>
            <div className={`text-4xl font-bold ${isJackpot ? 'text-yellow-200' : 'text-green-200'}`}>
              +{result.points} 积分
            </div>
            {result.apiKeyCode && (
              <div className="mt-3 p-3 bg-white/10 rounded-lg border border-yellow-300/50">
                <div className="text-sm text-yellow-200 mb-1">🎁 额外奖励：兑换码</div>
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
                <Star className="w-4 h-4" />
                <span className="text-sm font-medium">{result.multiplier}倍奖励！</span>
                <Star className="w-4 h-4" />
              </div>
            )}
          </div>

          {/* 按钮 */}
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 bg-white/15 hover:bg-white/25 text-white font-medium rounded-xl transition-colors">
              好的
            </button>
            {canPlayAgain && (
              <button onClick={onPlayAgain} className={`flex-1 py-3 ${isJackpot ? 'bg-gradient-to-r from-yellow-400 to-orange-400' : 'bg-gradient-to-r from-green-400 to-emerald-400'} text-white font-bold rounded-xl hover:shadow-lg transition-all`}>
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
function Reel({ spinning, targetIndex, delay, symbols }) {
  const [displayIndex, setDisplayIndex] = useState(0)
  const intervalRef = useRef(null)
  const timeoutRef = useRef(null)
  const targetRef = useRef(targetIndex)

  useEffect(() => {
    targetRef.current = targetIndex
  }, [targetIndex])

  useEffect(() => {
    if (spinning && symbols?.length > 0) {
      // 开始滚动
      let index = 0
      intervalRef.current = setInterval(() => {
        index = (index + 1) % symbols.length
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
  }, [spinning, delay, symbols?.length])

  const symbol = symbols?.[displayIndex]

  return (
    <div className="relative w-20 h-24 bg-gradient-to-b from-slate-800 to-slate-900 rounded-xl overflow-hidden border-4 border-yellow-500 shadow-inner">
      {/* 上方阴影 */}
      <div className="absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-black/60 to-transparent z-10" />
      {/* 下方阴影 */}
      <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-black/60 to-transparent z-10" />

      {/* 符号显示 */}
      <div className="flex items-center justify-center h-full text-5xl">
        {symbol?.emoji || '🎰'}
      </div>

      {/* 滚动时的模糊效果 */}
      {spinning && (
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/10 to-transparent animate-pulse" />
      )}
    </div>
  )
}

// 主组件
export default function SlotMachine({ onBalanceUpdate }) {
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [balance, setBalance] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [results, setResults] = useState([0, 0, 0])
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

  // 加载老虎机配置（包含余额和次数）
  const loadConfig = useCallback(async () => {
    try {
      const data = await api.get('/slot-machine/config')
      setConfig(data.config || null)
      setSymbols(data.symbols || [])
      setBalance(data.balance || 0)
      setTodayCount(data.today_count || 0)
      setDailyLimit(data.config?.daily_limit || null)
    } catch (e) {
      console.error('加载老虎机配置失败:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  // 播放音效
  const playSound = useCallback((type) => {
    if (!soundEnabled) return

    try {
      // 使用 Web Audio API 生成简单音效
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      if (type === 'spin') {
        oscillator.frequency.value = 200
        gainNode.gain.value = 0.1
        oscillator.start()
        oscillator.stop(audioContext.currentTime + 0.1)
      } else if (type === 'win') {
        oscillator.frequency.value = 523 // C5
        gainNode.gain.value = 0.2
        oscillator.start()
        setTimeout(() => {
          oscillator.frequency.value = 659 // E5
        }, 100)
        setTimeout(() => {
          oscillator.frequency.value = 784 // G5
        }, 200)
        oscillator.stop(audioContext.currentTime + 0.4)
      } else if (type === 'jackpot') {
        oscillator.frequency.value = 523
        gainNode.gain.value = 0.3
        oscillator.start()
        setTimeout(() => oscillator.frequency.value = 659, 100)
        setTimeout(() => oscillator.frequency.value = 784, 200)
        setTimeout(() => oscillator.frequency.value = 1047, 300)
        oscillator.stop(audioContext.currentTime + 0.6)
      } else if (type === 'lose') {
        oscillator.frequency.value = 200
        gainNode.gain.value = 0.1
        oscillator.start()
        oscillator.stop(audioContext.currentTime + 0.2)
      }
    } catch (e) {
      // 音频播放失败时静默处理
    }
  }, [soundEnabled])

  // 拉老虎机 - 调用后端 API
  const handleSpin = useCallback(async () => {
    if (spinning || balance < costPoints || symbols.length === 0) return

    // 开始转动动画
    setSpinning(true)
    setLastWin(null)
    playSound('spin')

    let spinResult = null
    try {
      // 调用后端 API 进行抽奖
      spinResult = await api.post('/slot-machine/spin')

      // 将后端返回的 symbol_key 转换为索引
      const keyToIndex = new Map(symbols.map((s, i) => [s.symbol_key, i]))
      const newResults = (spinResult.reels || []).map((k) => keyToIndex.get(k) ?? 0)
      while (newResults.length < 3) newResults.push(0)
      setResults(newResults.slice(0, 3))
    } catch (error) {
      setSpinning(false)
      toast.error(error?.response?.data?.detail || '抽取失败')
      loadBalance()
      return
    }

    // 等待动画完成后显示结果
    const totalDuration = 1500 + 600 + 300
    setTimeout(() => {
      setSpinning(false)

      const win = spinResult.win_type !== 'none'
      const payout = spinResult.payout_points || 0
      const isJackpot = !!spinResult.is_jackpot
      const multiplier = spinResult.multiplier || 0

      // 构建中奖消息
      let message = '再接再厉！'
      if (win) {
        if (isJackpot) {
          message = `大奖！${multiplier}倍奖励！`
        } else if (spinResult.win_type === 'three') {
          message = `三连！${multiplier}倍奖励！`
        } else {
          message = `两个相同！${multiplier}倍奖励！`
        }
      }

      setLastWin({
        win,
        multiplier,
        points: payout,
        message,
        isJackpot,
        apiKeyCode: spinResult.api_key_code,
        apiKeyQuota: spinResult.api_key_quota,
      })

      // 更新余额和次数（使用后端返回的最新余额）
      setBalance(spinResult.balance)
      setTodayCount(prev => prev + 1)
      onBalanceUpdate?.(spinResult.balance)

      if (win) {
        playSound(isJackpot ? 'jackpot' : 'win')
        // 显示中奖弹窗
        setWinModalData({
          win,
          multiplier,
          points: payout,
          message,
          isJackpot,
          reels: spinResult.reels,
          apiKeyCode: spinResult.api_key_code,
          apiKeyQuota: spinResult.api_key_quota,
        })
        setShowWinModal(true)
      } else {
        playSound('lose')
      }
      trackLottery('slot', costPoints, win ? (spinResult.api_key_code ? `中奖+兑换码` : `${payout}积分`) : '未中奖')
    }, totalDuration)
  }, [spinning, balance, costPoints, symbols, onBalanceUpdate, playSound, dailyLimit, todayCount])

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
      if (!spinning && balance >= costPoints && symbols.length > 0 && (dailyLimit === null || todayCount < dailyLimit)) {
        handleSpin()
      }
    }, 100)
  }

  // canSpin 需要同时检查日限
  const canSpin = !spinning && balance >= costPoints && symbols.length > 0 && (dailyLimit === null || todayCount < dailyLimit)

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

  // 如果配置未启用或符号为空
  if (!config?.is_active || symbols.length === 0) {
    return (
      <div className="bg-gradient-to-br from-purple-900 via-red-900 to-pink-900 rounded-2xl border border-yellow-500/50 p-6 text-center">
        <Zap className="w-12 h-12 text-yellow-500/50 mx-auto mb-4" />
        <p className="text-yellow-300/70">老虎机暂未开放</p>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-purple-900 via-red-900 to-pink-900 rounded-2xl border-2 border-yellow-500 p-6 shadow-2xl relative overflow-hidden">
      {/* 装饰灯光 */}
      <div className="absolute top-0 left-0 right-0 flex justify-around py-2">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full transition-colors ${
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
      <div className="flex items-center justify-between mb-6 mt-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl shadow-lg">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-white">{config?.name || '幸运老虎机'}</h3>
            <p className="text-sm text-yellow-300">{costPoints}积分/次</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {dailyLimit > 0 && (
            <div className="text-sm text-yellow-300/80 bg-black/30 px-3 py-1 rounded-lg">
              今日: <span className="font-bold text-yellow-300">{Math.min(todayCount, dailyLimit)}</span>/{dailyLimit}
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

      {/* 老虎机帮助弹窗 */}
      <GameHelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} title="老虎机玩法">
        <div className="space-y-4">
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
            <h4 className="font-bold text-yellow-700 dark:text-yellow-300 mb-2 flex items-center gap-2">
              <Zap className="w-4 h-4" /> 基本规则
            </h4>
            <ul className="text-sm text-yellow-600 dark:text-yellow-400 space-y-1">
              <li>• 每次消耗 <span className="font-bold">{costPoints}</span> 积分</li>
              <li>• 每日限玩 <span className="font-bold">{dailyLimit || 20}</span> 次</li>
              <li>• 点击"拉动拉杆"开始游戏</li>
            </ul>
          </div>
          <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl">
            <h4 className="font-bold text-red-700 dark:text-red-300 mb-2 flex items-center gap-2">
              <Trophy className="w-4 h-4" /> 中奖规则
            </h4>
            <ul className="text-sm text-red-600 dark:text-red-400 space-y-1">
              <li>• <span className="font-bold">三个相同</span>：获得对应倍率奖励</li>
              <li>• <span className="font-bold">两个相同</span>：获得1.5倍基础奖励</li>
              <li>• 7️⃣7️⃣7️⃣ 头奖：<span className="font-bold text-yellow-600">100倍</span></li>
              <li>• 🍒🍒🍒 大奖：<span className="font-bold">50倍</span></li>
            </ul>
          </div>
          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
            <h4 className="font-bold text-purple-700 dark:text-purple-300 mb-2 flex items-center gap-2">
              <Star className="w-4 h-4" /> 符号倍率
            </h4>
            <div className="grid grid-cols-4 gap-2 text-center">
              {symbols.slice(0, 8).map((symbol) => (
                <div key={symbol.symbol_key} className="p-1.5 bg-white/50 dark:bg-slate-800/50 rounded-lg">
                  <div className="text-lg">{symbol.emoji}</div>
                  <div className="text-xs font-bold text-purple-600 dark:text-purple-400">{symbol.multiplier}x</div>
                </div>
              ))}
            </div>
          </div>
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
            <h4 className="font-bold text-green-700 dark:text-green-300 mb-2 flex items-center gap-2">
              <Coins className="w-4 h-4" /> 温馨提示
            </h4>
            <ul className="text-sm text-green-600 dark:text-green-400 space-y-1">
              <li>• 奖励积分即时发放到账户</li>
              <li>• 可点击音量图标开关音效</li>
              <li>• 理性娱乐，适度游戏</li>
            </ul>
          </div>
        </div>
      </GameHelpModal>

      {/* 老虎机主体 */}
      <div className="bg-gradient-to-b from-slate-700 to-slate-800 rounded-xl p-4 mb-4 border-4 border-yellow-600 shadow-inner">
        {/* 滚轴区域 */}
        <div className="flex justify-center gap-3 mb-4">
          <Reel spinning={spinning} targetIndex={results[0]} delay={0} symbols={symbols} />
          <Reel spinning={spinning} targetIndex={results[1]} delay={300} symbols={symbols} />
          <Reel spinning={spinning} targetIndex={results[2]} delay={600} symbols={symbols} />
        </div>

        {/* 中奖线 */}
        <div className="relative h-1 bg-gradient-to-r from-transparent via-yellow-400 to-transparent rounded-full" />
      </div>

      {/* 中奖提示 */}
      {lastWin && (
        <div
          className={`mb-4 p-3 rounded-xl text-center transition-all ${
            lastWin.win
              ? lastWin.isJackpot
                ? 'bg-gradient-to-r from-yellow-500 to-orange-500 animate-pulse'
                : 'bg-green-500/80'
              : 'bg-slate-700/80'
          }`}
        >
          <p className={`font-bold ${lastWin.win ? 'text-white' : 'text-slate-300'}`}>
            {lastWin.message}
          </p>
          {lastWin.win && (
            <p className="text-sm text-white/80 mt-1">
              获得 <span className="font-bold text-yellow-300">{lastWin.points}</span> 积分
            </p>
          )}
        </div>
      )}

      {/* 余额显示 */}
      <div className="flex items-center justify-center gap-2 mb-4 py-2 bg-black/30 rounded-lg">
        <Coins className="w-5 h-5 text-yellow-400" />
        <span className="text-xl font-bold text-yellow-400">{balance}</span>
        <span className="text-sm text-yellow-300/80">积分</span>
      </div>

      {/* 拉杆按钮 */}
      <button
        onClick={handleSpin}
        disabled={!canSpin}
        className={`w-full py-4 rounded-xl font-bold text-lg transition-all relative overflow-hidden ${
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
        ) : dailyLimit && todayCount >= dailyLimit ? (
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

      {/* 奖励说明 - 显示前4个高倍率符号 */}
      <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs">
        {symbols.slice(0, 4).map((symbol) => (
          <div key={symbol.symbol_key} className="p-2 bg-black/30 rounded-lg">
            <div className="text-2xl mb-1">{symbol.emoji}</div>
            <div className="text-yellow-400 font-bold">{symbol.multiplier}x</div>
          </div>
        ))}
      </div>

      {/* 底部装饰灯光 */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-around py-2">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full transition-colors ${
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
