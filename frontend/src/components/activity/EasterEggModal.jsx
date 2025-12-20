/**
 * 彩蛋弹窗组件
 * 用户在 Footer 连续点击7次后触发，展示彩蛋奖励
 */
import { useState, useEffect, useCallback } from 'react'
import { X, Gift, Copy, Check, Sparkles, PartyPopper, AlertCircle } from 'lucide-react'
import { lotteryApi } from '../../services'
import { useAuthStore } from '../../stores/authStore'

// 彩蛋发现时的祝贺语
const CONGRATS_MESSAGES = [
  '哇！你发现了隐藏彩蛋！',
  '厉害了！真正的探索者！',
  '恭喜你找到了秘密宝藏！',
  '你真是太细心了！',
]

// 无库存时的安慰语
const NO_STOCK_MESSAGES = [
  '彩蛋已经被小伙伴们领完了~',
  '下次早点来哦，彩蛋已售罄！',
  '这个秘密太热门了，库存见底！',
]

// 生成随机祝贺语
const getRandomMessage = (messages) => {
  return messages[Math.floor(Math.random() * messages.length)]
}

// 彩带粒子组件
function Confetti({ active }) {
  const [particles, setParticles] = useState([])

  useEffect(() => {
    if (!active) return

    const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8']
    const newParticles = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 0.5,
      duration: 2 + Math.random() * 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 6 + Math.random() * 8,
      rotate: Math.random() * 360,
    }))
    setParticles(newParticles)

    const timer = setTimeout(() => setParticles([]), 4000)
    return () => clearTimeout(timer)
  }, [active])

  if (!active || particles.length === 0) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-[60] overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute animate-confetti-fall"
          style={{
            left: `${p.x}%`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        >
          <div
            className="rounded-sm"
            style={{
              width: p.size,
              height: p.size * 0.6,
              backgroundColor: p.color,
              transform: `rotate(${p.rotate}deg)`,
            }}
          />
        </div>
      ))}
    </div>
  )
}

export default function EasterEggModal({ isOpen, onClose }) {
  const { user, token } = useAuthStore()
  const [stage, setStage] = useState('loading') // loading | success | no_stock | error | need_login
  const [apiKey, setApiKey] = useState(null)
  const [quota, setQuota] = useState(0)
  const [message, setMessage] = useState('')
  const [copied, setCopied] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)

  // 领取彩蛋
  const claimEasterEgg = useCallback(async () => {
    if (!token) {
      setStage('need_login')
      setMessage('登录后才能领取彩蛋哦~')
      return
    }

    setStage('loading')

    try {
      const result = await lotteryApi.claimEasterEgg()

      if (result.success) {
        setApiKey(result.code)
        setQuota(result.quota || 0)
        setMessage(result.message || getRandomMessage(CONGRATS_MESSAGES))
        setStage('success')
        setShowConfetti(true)

        // 播放成功音效
        playSuccessSound()
      } else {
        if (!result.has_stock) {
          setStage('no_stock')
          setMessage(result.message || getRandomMessage(NO_STOCK_MESSAGES))
        } else {
          setStage('error')
          setMessage(result.message || '领取失败，请稍后再试')
        }
      }
    } catch (error) {
      console.error('领取彩蛋失败:', error)
      const status = error.response?.status
      const errorMsg = error.response?.data?.detail || error.message

      if (status === 401 || errorMsg?.includes('登录')) {
        setStage('need_login')
        setMessage('登录后才能领取彩蛋哦~')
      } else if (status === 429) {
        setStage('error')
        setMessage('操作太快啦，请稍等几秒再试~')
      } else if (status === 500) {
        setStage('error')
        setMessage('服务器开小差了，请稍后再试~')
        console.error('服务器错误详情:', errorMsg)
      } else {
        setStage('error')
        setMessage(errorMsg || '网络错误，请稍后再试')
      }
    }
  }, [token])

  // 打开弹窗时自动领取
  useEffect(() => {
    if (isOpen) {
      claimEasterEgg()
    } else {
      // 关闭时重置状态
      setStage('loading')
      setApiKey(null)
      setQuota(0)
      setMessage('')
      setCopied(false)
      setShowConfetti(false)
    }
  }, [isOpen, claimEasterEgg])

  // 复制到剪贴板
  const handleCopy = async () => {
    if (!apiKey) return

    try {
      await navigator.clipboard.writeText(apiKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // 降级方案
      const textArea = document.createElement('textarea')
      textArea.value = apiKey
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // 播放成功音效
  const playSuccessSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)()

      // 胜利旋律
      const notes = [523, 659, 784, 1047] // C5, E5, G5, C6
      notes.forEach((freq, i) => {
        const osc = audioCtx.createOscillator()
        const gain = audioCtx.createGain()
        osc.connect(gain)
        gain.connect(audioCtx.destination)
        osc.frequency.value = freq
        osc.type = 'triangle'
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime + i * 0.15)
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + i * 0.15 + 0.3)
        osc.start(audioCtx.currentTime + i * 0.15)
        osc.stop(audioCtx.currentTime + i * 0.15 + 0.3)
      })
    } catch {
      // 忽略音效错误
    }
  }

  if (!isOpen) return null

  return (
    <>
      <Confetti active={showConfetti} />

      {/* 遮罩层 */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* 弹窗主体 */}
        <div
          className="relative w-full max-w-md bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 dark:from-slate-800 dark:via-slate-800 dark:to-slate-900 rounded-2xl shadow-2xl overflow-hidden animate-bounce-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 顶部装饰条 */}
          <div className="h-2 bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400" />

          {/* 关闭按钮 */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/80 dark:bg-slate-700/80 hover:bg-white dark:hover:bg-slate-600 transition-colors z-10"
          >
            <X className="w-5 h-5 text-slate-600 dark:text-slate-300" />
          </button>

          {/* 内容区域 */}
          <div className="p-8">
            {/* 加载状态 */}
            {stage === 'loading' && (
              <div className="text-center py-8">
                <div className="relative w-24 h-24 mx-auto mb-6">
                  <Gift className="w-24 h-24 text-yellow-500 animate-pulse" />
                  <Sparkles className="absolute -top-2 -right-2 w-8 h-8 text-orange-400 animate-spin" />
                </div>
                <p className="text-xl font-bold text-slate-700 dark:text-slate-200 animate-pulse">
                  正在打开彩蛋...
                </p>
                <p className="text-slate-500 dark:text-slate-400 mt-2">
                  期待惊喜吧~
                </p>
              </div>
            )}

            {/* 成功状态 */}
            {stage === 'success' && (
              <div className="text-center">
                <div className="relative w-24 h-24 mx-auto mb-6">
                  <PartyPopper className="w-24 h-24 text-yellow-500 animate-wiggle" />
                  <Sparkles className="absolute -top-2 -right-2 w-8 h-8 text-orange-400 animate-ping" />
                </div>

                <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 mb-4">
                  {getRandomMessage(CONGRATS_MESSAGES)}
                </h2>

                <p className="text-slate-600 dark:text-slate-300 mb-6">
                  {message}
                </p>

                {/* API Key 展示区 */}
                <div className="bg-white/80 dark:bg-slate-700/80 rounded-xl p-4 mb-4">
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                    你的专属 API Key
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-slate-100 dark:bg-slate-600 rounded-lg text-sm font-mono text-slate-800 dark:text-slate-200 break-all">
                      {apiKey}
                    </code>
                    <button
                      onClick={handleCopy}
                      className="flex-shrink-0 p-2 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-white transition-colors"
                      title="复制"
                    >
                      {copied ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        <Copy className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  {quota > 0 && (
                    <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-2">
                      额度: ${quota.toFixed(2)}
                    </p>
                  )}
                </div>

                <p className="text-xs text-slate-400 dark:text-slate-500">
                  请妥善保管，此 Key 仅显示一次
                </p>
              </div>
            )}

            {/* 无库存状态 */}
            {stage === 'no_stock' && (
              <div className="text-center py-4">
                <div className="w-24 h-24 mx-auto mb-6 relative">
                  <Gift className="w-24 h-24 text-yellow-400 dark:text-yellow-500" />
                  <div className="absolute -top-1 -right-1">
                    <span className="text-2xl">✨</span>
                  </div>
                </div>

                <h2 className="text-xl font-bold text-slate-600 dark:text-slate-300 mb-4">
                  哇，你发现了彩蛋！
                </h2>

                <p className="text-slate-500 dark:text-slate-400 mb-4">
                  可惜这批彩蛋已经被眼尖的小伙伴们领走啦~
                </p>

                <p className="text-slate-500 dark:text-slate-400 mb-6">
                  不过能找到这里，说明你也是真正的探索者！
                </p>

                <p className="text-sm text-slate-400 dark:text-slate-500">
                  持续关注，下一波彩蛋等你来发现 🎁
                </p>
              </div>
            )}

            {/* 需要登录状态 */}
            {stage === 'need_login' && (
              <div className="text-center py-4">
                <div className="w-24 h-24 mx-auto mb-6">
                  <Gift className="w-24 h-24 text-yellow-500 opacity-50" />
                </div>

                <h2 className="text-xl font-bold text-slate-600 dark:text-slate-300 mb-4">
                  发现隐藏彩蛋！
                </h2>

                <p className="text-slate-500 dark:text-slate-400 mb-6">
                  {message}
                </p>

                <a
                  href={`${window.location.origin}/api/v1/auth/linuxdo/login`}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
                >
                  <Sparkles className="w-5 h-5" />
                  登录领取彩蛋
                </a>
              </div>
            )}

            {/* 错误状态 */}
            {stage === 'error' && (
              <div className="text-center py-4">
                <div className="w-24 h-24 mx-auto mb-6">
                  <AlertCircle className="w-24 h-24 text-red-400" />
                </div>

                <h2 className="text-xl font-bold text-slate-600 dark:text-slate-300 mb-4">
                  哎呀，出错了
                </h2>

                <p className="text-slate-500 dark:text-slate-400 mb-6">
                  {message}
                </p>

                <button
                  onClick={claimEasterEgg}
                  className="px-6 py-3 bg-slate-600 hover:bg-slate-700 text-white font-semibold rounded-xl transition-colors"
                >
                  重试一下
                </button>
              </div>
            )}
          </div>

          {/* 底部装饰 */}
          <div className="px-8 pb-6 text-center">
            <p className="text-xs text-slate-400 dark:text-slate-500">
              ikuncode 彩蛋系统
            </p>
          </div>
        </div>
      </div>

      {/* 动画样式 */}
      <style>{`
        @keyframes bounce-in {
          0% {
            opacity: 0;
            transform: scale(0.3) translateY(40px);
          }
          50% {
            transform: scale(1.05) translateY(-10px);
          }
          70% {
            transform: scale(0.95) translateY(5px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @keyframes wiggle {
          0%, 100% {
            transform: rotate(-5deg);
          }
          50% {
            transform: rotate(5deg);
          }
        }

        @keyframes confetti-fall {
          0% {
            transform: translateY(-10vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(110vh) rotate(720deg);
            opacity: 0;
          }
        }

        .animate-bounce-in {
          animation: bounce-in 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }

        .animate-wiggle {
          animation: wiggle 0.5s ease-in-out infinite;
        }

        .animate-confetti-fall {
          animation: confetti-fall linear forwards;
        }
      `}</style>
    </>
  )
}
