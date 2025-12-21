import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, X, Clock, Trophy, Zap, Terminal, Code2, Sparkles, AlertCircle, Award, PartyPopper, RotateCcw, Gift, Heart, Copy, Check, Upload, Loader2 } from 'lucide-react'
import { useToast } from '../components/Toast'
import { useAuthStore } from '../stores/authStore'
import api from '../services/api'
import { PUZZLE_LEVELS, validateAnswer, TOTAL_LEVELS } from '../data/puzzleLevels'

// 打气鼓励语
const ENCOURAGEMENT_MESSAGES = [
  { text: '别灰心，再试试！', emoji: '💪' },
  { text: '坚持就是胜利！', emoji: '🔥' },
  { text: '你一定可以的！', emoji: '✨' },
  { text: '加油，胜利就在眼前！', emoji: '🚀' },
  { text: '不要放弃，你很棒！', emoji: '🌟' },
  { text: '这题有点难，但你能行！', emoji: '💡' },
  { text: '休息一下，灵感会来的！', emoji: '☕' },
  { text: '换个思路试试？', emoji: '🧠' },
  { text: '相信自己，你比想象中更强！', emoji: '💎' },
  { text: '每一次尝试都是进步！', emoji: '📈' },
]

// 半程/全程奖励阈值
const HALF_REWARD_THRESHOLD = 21
const FULL_REWARD_THRESHOLD = 42

// 本地存储 key
const STORAGE_KEY = 'code_challenge_progress'

// 读取本地进度
const loadProgress = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (data) {
      return JSON.parse(data)
    }
  } catch (e) {
    console.error('Failed to load progress:', e)
  }
  return {
    solvedLevels: [],
    errorCounts: {},
    totalTime: 0,
    levelTimes: {},
    currentLevel: 1,
    levelSelectorOpen: false,
  }
}

// 保存本地进度
const saveProgress = (progress) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
  } catch (e) {
    console.error('Failed to save progress:', e)
  }
}

// 格式化时间显示
const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// 添加自定义动画样式
const AnimationStyles = () => (
  <style>{`
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
      20%, 40%, 60%, 80% { transform: translateX(4px); }
    }
    .animate-shake {
      animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
    }
    @keyframes float {
      0% { transform: translateY(0px); }
      50% { transform: translateY(-10px); }
      100% { transform: translateY(0px); }
    }
    .animate-float {
      animation: float 6s ease-in-out infinite;
    }
    @keyframes shine {
      0% { background-position: 200% center; }
      100% { background-position: -200% center; }
    }
    .animate-shine {
      background-size: 200% auto;
      animation: shine 3s linear infinite;
    }
    @keyframes heartbeat {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.1); }
    }
    .animate-heartbeat {
      animation: heartbeat 0.6s ease-in-out infinite;
    }
    @keyframes confetti {
      0% { transform: translateY(0) rotate(0deg); opacity: 1; }
      100% { transform: translateY(-100px) rotate(720deg); opacity: 0; }
    }
    .animate-confetti {
      animation: confetti 1s ease-out forwards;
    }
  `}</style>
)

// 打气鼓励弹窗组件
function EncouragementModal({ isOpen, message, onClose }) {
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(onClose, 3000)
      return () => clearTimeout(timer)
    }
  }, [isOpen, onClose])

  if (!isOpen || !message) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 transform animate-in fade-in zoom-in-95 duration-300 pointer-events-auto max-w-sm">
        <div className="flex flex-col items-center text-center">
          <span className="text-5xl mb-3 animate-heartbeat">{message.emoji}</span>
          <p className="text-lg font-bold text-slate-800 dark:text-white mb-1">{message.text}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">继续加油哦~</p>
        </div>
      </div>
    </div>
  )
}

// 奖励领取弹窗组件
function RewardModal({ isOpen, rewardType, solvedCount, onClose, onClaim, isAdminDebug = false }) {
  const [claiming, setClaiming] = useState(false)
  const [claimed, setClaimed] = useState(false)
  const [reward, setReward] = useState(null)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)
  const user = useAuthStore((s) => s.user)

  const isHalf = rewardType === 'half'
  const title = isHalf ? '恭喜达成半程成就！' : '恭喜通关码神挑战！'
  const subtitle = isHalf ? '完成 21 关' : '完成全部 42 关'

  const handleClaim = async () => {
    if (!user) {
      setError('请先登录后再领取奖励')
      return
    }

    setClaiming(true)
    setError(null)
    try {
      const response = await api.post('/puzzle/claim-reward', {
        reward_type: rewardType,
        solved_count: solvedCount,
        admin_bypass: isAdminDebug,  // 管理员调试时跳过进度验证
      })
      setReward(response)
      setClaimed(true)
    } catch (err) {
      setError(err.response?.data?.detail || '领取失败，请稍后重试')
    } finally {
      setClaiming(false)
    }
  }

  const handleCopy = () => {
    if (reward?.api_key) {
      navigator.clipboard.writeText(reward.api_key)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md transform transition-all animate-in fade-in zoom-in-95 duration-300">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden">
          {/* 顶部装饰 */}
          <div className={`h-2 ${isHalf ? 'bg-gradient-to-r from-blue-500 to-cyan-500' : 'bg-gradient-to-r from-amber-500 via-orange-500 to-red-500'}`} />

          <div className="p-6">
            {/* 图标 */}
            <div className="flex justify-center mb-4">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center ${isHalf ? 'bg-blue-50 dark:bg-blue-900/30' : 'bg-amber-50 dark:bg-amber-900/30'}`}>
                {isHalf ? (
                  <Trophy className="w-10 h-10 text-blue-500" />
                ) : (
                  <PartyPopper className="w-10 h-10 text-amber-500" />
                )}
              </div>
            </div>

            {/* 标题 */}
            <div className="text-center mb-5">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-1">{title}</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm">{subtitle}</p>
            </div>

            {/* 奖励信息 */}
            {!claimed ? (
              <div className={`rounded-xl p-4 mb-4 ${isHalf ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-amber-50 dark:bg-amber-900/20'}`}>
                <div className="flex items-center gap-3">
                  <Gift className={`w-6 h-6 ${isHalf ? 'text-blue-500' : 'text-amber-500'}`} />
                  <div>
                    <p className="font-bold text-slate-800 dark:text-white">
                      {isHalf ? '半程奖励' : '全程奖励'}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      API Key 额度奖励
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Check className="w-5 h-5 text-green-500" />
                  <span className="font-bold text-green-700 dark:text-green-400">领取成功！</span>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-lg p-3 flex items-center justify-between">
                  <code className="text-sm font-mono text-slate-700 dark:text-slate-300 truncate flex-1">
                    {reward?.api_key}
                  </code>
                  <button
                    onClick={handleCopy}
                    className="ml-2 p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    title="复制"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                </div>
                {reward?.quota && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                    额度: ${reward.quota}
                  </p>
                )}
              </div>
            )}

            {/* 错误提示 */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm p-3 rounded-lg mb-4">
                {error}
              </div>
            )}

            {/* 按钮 */}
            {!claimed ? (
              <div className="space-y-2">
                <button
                  onClick={handleClaim}
                  disabled={claiming}
                  className={`w-full py-3.5 px-6 font-semibold rounded-xl transition-all duration-200 active:scale-[0.98] ${
                    isHalf
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white'
                  } ${claiming ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {claiming ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      领取中...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Gift className="w-5 h-5" />
                      领取奖励
                    </span>
                  )}
                </button>
                <button
                  onClick={onClose}
                  className="w-full py-3 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-sm transition-colors"
                >
                  稍后领取
                </button>
              </div>
            ) : (
              <button
                onClick={onClose}
                className="w-full py-3.5 px-6 bg-slate-800 dark:bg-slate-700 text-white font-semibold rounded-xl hover:bg-slate-700 dark:hover:bg-slate-600 transition-all duration-200"
              >
                太棒了！
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// 全程通关超级庆祝弹窗 - 满满情绪价值
function GrandCelebrationModal({ isOpen, onClose, totalTime, totalErrors, onSubmitToLeaderboard }) {
  const [showConfetti, setShowConfetti] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setShowConfetti(true)
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-auto">
      {/* 背景遮罩 - 点击可关闭 */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-purple-900/95 via-indigo-900/95 to-slate-900/95 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 动态光效背景 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-yellow-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-pink-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* 彩带/星星装饰 */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti-fall text-xl"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-5%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${3 + Math.random() * 2}s`,
              }}
            >
              {['🌟', '✨', '💫', '⭐', '🎉', '🎊', '👑', '💎'][Math.floor(Math.random() * 8)]}
            </div>
          ))}
        </div>
      )}

      {/* 右上角关闭按钮 */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-all"
      >
        <X className="w-6 h-6" />
      </button>

      {/* 主内容卡片 - 更宽更紧凑 */}
      <div className="relative w-full max-w-3xl transform animate-in fade-in zoom-in-95 duration-500">
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border border-white/20">
          {/* 顶部金色装饰 */}
          <div className="h-1.5 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-400" />

          <div className="p-6 text-center">
            {/* 顶部：皇冠 + 标题 横向排列 */}
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="relative w-16 h-16 flex-shrink-0">
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full blur-lg opacity-50 animate-pulse" />
                <div className="relative w-full h-full bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-500 rounded-full flex items-center justify-center shadow-xl">
                  <span className="text-3xl">👑</span>
                </div>
              </div>
              <div className="text-left">
                <h2 className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-amber-300 to-yellow-200">
                  42关全部通关，太强了！
                </h2>
                <p className="text-white/80 text-sm mt-1">
                  恭喜你完成了<span className="text-yellow-400 font-bold"> 码神挑战 </span>的全部关卡！
                </p>
              </div>
            </div>

            {/* 中间：统计数据 + 称号 横向排列 */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-xl p-3 border border-emerald-500/30">
                <div className="text-2xl font-black text-emerald-400">42</div>
                <div className="text-emerald-300/80 text-xs">关卡通关</div>
              </div>
              <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl p-3 border border-purple-500/30">
                <div className="text-2xl font-black text-purple-400">100%</div>
                <div className="text-purple-300/80 text-xs">完成度</div>
              </div>
              <div className="bg-gradient-to-r from-amber-500/20 to-yellow-500/20 rounded-xl p-3 border border-yellow-500/30">
                <div className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-amber-400">
                  码神·终极王者
                </div>
                <div className="text-yellow-400/70 text-xs">至高称号</div>
              </div>
            </div>

            {/* 赞美文案 - 更紧凑 */}
            <div className="bg-white/5 rounded-xl p-4 mb-4 border border-white/10">
              <p className="text-white/70 text-sm leading-relaxed">
                42道关卡，从基础到进阶，你一路披荆斩棘，展现了卓越的编程思维和超强的解题能力。
                你不仅通关了游戏，更证明了自己是一位<span className="text-yellow-400 font-bold">真正的代码大师</span>！
              </p>
            </div>

            {/* 底部：励志寄语 + 按钮 */}
            <div className="flex items-center justify-between gap-4">
              <div className="text-left flex-1">
                <p className="text-white/50 text-xs italic">
                  "代码改变世界，而你正在改变代码的未来。" —— ikuncode 团队
                </p>
              </div>
              <button
                onClick={() => {
                  onSubmitToLeaderboard?.()
                  onClose()
                }}
                className="flex-shrink-0 py-2.5 px-6 bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 hover:from-yellow-500 hover:via-amber-600 hover:to-orange-600 text-slate-900 font-bold text-sm rounded-lg transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-amber-500/30"
              >
                🎉 我就是码神！提交上榜
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 彩带下落动画样式 */}
      <style>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg) scale(0.5);
            opacity: 0;
          }
        }
        .animate-confetti-fall {
          animation: confetti-fall 4s linear forwards;
          font-size: 24px;
        }
      `}</style>
    </div>
  )
}

// 通关成功弹窗组件 - 商务简洁风格
function SuccessModal({
  isOpen,
  level,
  levelNumber,
  elapsedTime,
  errorCount,
  onContinue,
  onClose,
  isLastLevel
}) {
  if (!isOpen || !level) return null

  const formatTimeDisplay = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    if (mins > 0) {
      return `${mins} 分 ${secs} 秒`
    }
    return `${secs} 秒`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 弹窗内容 */}
      <div className="relative w-full max-w-md transform transition-all animate-in fade-in zoom-in-95 duration-300">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* 顶部装饰条 */}
          <div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />

          <div className="p-6">
            {/* 成功图标 */}
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center">
                <Trophy className="w-8 h-8 text-emerald-500" />
              </div>
            </div>

            {/* 标题区域 */}
            <div className="text-center mb-5">
              <h2 className="text-xl font-bold text-slate-800 mb-1">
                恭喜通过第 {levelNumber} 关
              </h2>
              <p className="text-slate-500 text-sm">继续保持，你做得很好！</p>
            </div>

            {/* 小知识卡片 */}
            <div className="bg-slate-50 rounded-xl p-4 mb-4 border border-slate-100">
              <h3 className="text-slate-700 text-sm font-semibold mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                小知识
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                {level.explanation || '这道题考察的是基础编程知识，继续加油！'}
              </p>
            </div>

            {/* 统计信息 */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-center">
                <div className="flex items-center justify-center gap-1.5 text-slate-500 text-xs mb-1">
                  <Clock className="w-3.5 h-3.5" />
                  通关时间
                </div>
                <div className="text-slate-800 font-bold text-lg">{formatTimeDisplay(elapsedTime)}</div>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-center">
                <div className="flex items-center justify-center gap-1.5 text-slate-500 text-xs mb-1">
                  <Zap className="w-3.5 h-3.5" />
                  尝试次数
                </div>
                <div className="text-slate-800 font-bold text-lg">{errorCount + 1} 次</div>
              </div>
            </div>

            {/* 称号提示（可选） */}
            {levelNumber === 1 && (
              <div className="text-center mb-4 py-3 bg-amber-50 rounded-xl border border-amber-100">
                <Award className="w-6 h-6 mx-auto mb-1 text-amber-500" />
                <p className="text-slate-700 text-sm">
                  <span>你太棒了！特授予你 </span>
                  <span className="text-amber-600 font-bold">码屌</span>
                  <span> 称号</span>
                </p>
              </div>
            )}

            {/* 继续挑战按钮 */}
            <button
              onClick={onContinue}
              className="w-full py-3.5 px-6 bg-slate-800 text-white font-semibold rounded-xl hover:bg-slate-700 transition-all duration-200 active:scale-[0.98]"
            >
              {isLastLevel ? '挑战完成！' : '继续挑战'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// 关卡选择器组件
function LevelSelector({ currentLevel, solvedLevels, onSelectLevel, isOpen, setIsOpen }) {
  const scrollContainerRef = useRef(null)

  useEffect(() => {
    if (isOpen && scrollContainerRef.current) {
      const currentElement = scrollContainerRef.current.querySelector(`[data-level="${currentLevel}"]`)
      if (currentElement) {
        currentElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [isOpen, currentLevel])

  return (
    <div className={`
      fixed inset-x-0 bottom-0 z-50 transition-transform duration-500 ease-in-out transform
      ${isOpen ? 'translate-y-0' : 'translate-y-[calc(100%-3rem)]'}
    `}>
      {/* 拖动手柄/标题栏 */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-t border-slate-200 dark:border-slate-700 h-12 flex items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/90 transition-colors relative"
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full opacity-50"></div>
        <span className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
          <Code2 className="w-4 h-4" />
          关卡地图 ({solvedLevels.length}/{TOTAL_LEVELS})
          <ChevronLeft className={`w-4 h-4 transition-transform duration-300 ${isOpen ? '-rotate-90' : 'rotate-90'}`} />
        </span>
      </div>

      {/* 关卡网格 */}
      <div
        ref={scrollContainerRef}
        className="bg-slate-50 dark:bg-slate-950/95 p-6 h-64 overflow-y-auto"
      >
        {/* 提示信息 */}
        <p className="text-center text-xs text-slate-500 dark:text-slate-400 mb-4">
          🔒 需要按顺序通关，无法跳关哦~
        </p>
        <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-3 max-w-5xl mx-auto">
          {Array.from({ length: TOTAL_LEVELS }, (_, i) => {
            const levelId = i + 1
            const isCurrent = levelId === currentLevel
            const isSolved = solvedLevels.includes(levelId)
            // 计算下一个可挑战的关卡：已完成关卡中最大的 + 1，如果没有完成任何关卡则为1
            const maxSolved = solvedLevels.length > 0 ? Math.max(...solvedLevels) : 0
            const nextLevel = maxSolved + 1
            // 只能选择已完成的关卡或下一个待挑战的关卡
            const isUnlocked = isSolved || levelId === nextLevel
            const isLocked = !isUnlocked

            return (
              <button
                key={levelId}
                data-level={levelId}
                onClick={() => {
                  if (isLocked) return
                  onSelectLevel(levelId)
                  setIsOpen(false)
                }}
                disabled={isLocked}
                className={`
                  relative group aspect-square rounded-xl flex items-center justify-center text-sm font-bold transition-all duration-300
                  ${isCurrent
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-110 ring-2 ring-blue-400 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 z-10'
                    : isSolved
                      ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700/50 hover:bg-emerald-200 dark:hover:bg-emerald-800/50 cursor-pointer'
                      : levelId === nextLevel
                        ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-2 border-amber-400 dark:border-amber-500/50 hover:bg-amber-200 dark:hover:bg-amber-800/50 cursor-pointer animate-pulse'
                        : 'bg-slate-200 dark:bg-slate-800/30 text-slate-400 dark:text-slate-600 border border-slate-300 dark:border-slate-700/50 cursor-not-allowed opacity-60'
                  }
                `}
                title={isLocked ? `需要先完成第 ${nextLevel} 关` : isSolved ? '已完成' : '待挑战'}
              >
                {isLocked ? '🔒' : levelId}
                {isSolved && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-emerald-400/20 absolute animate-pulse" />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// 主卡片组件
function ChallengeCard({
  level,
  currentLevel,
  totalLevels,
  errorCount,
  elapsedTime,
  userAnswer,
  onAnswerChange,
  onSubmit,
  onPrevLevel,
  onNextLevel,
  onResetLevel,
  isSubmitting,
  showSuccess,
  isError,
  // 提交上榜相关
  solvedCount,
  isLoggedIn,
  onSubmitToLeaderboard,
  isSubmittingToLeaderboard,
  // 关卡解锁相关
  canGoPrev,
  canGoNext,
  // 管理员相关
  isAdmin,
  onTriggerHalfReward,
  onTriggerFullReward,
  onTriggerGrandCelebration,
}) {
  const inputRef = useRef(null)
  const [timestampValue, setTimestampValue] = useState(level?.timestamp || 0)

  // 当关卡变化时重置时间戳
  useEffect(() => {
    if (level?.timestamp) {
      setTimestampValue(level.timestamp)
    }
  }, [level?.timestamp, currentLevel])

  useEffect(() => {
    if (inputRef.current && !showSuccess) {
      inputRef.current.focus()
    }
  }, [currentLevel, showSuccess])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !isSubmitting && userAnswer.trim()) {
      onSubmit()
    }
  }

  if (!level) {
    return (
      <div className="bg-white dark:bg-slate-800/70 backdrop-blur-xl rounded-2xl p-8 text-center max-w-2xl mx-auto shadow-xl border border-slate-200 dark:border-white/10">
        <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3"></div>
        <p className="text-slate-500 dark:text-slate-400 text-sm">正在解密数据...</p>
      </div>
    )
  }

  return (
    <div className="relative w-full max-w-3xl mx-auto perspective-1000">
      {/* 装饰性背景光效 - 仅暗色模式 */}
      <div className="hidden dark:block absolute -top-16 -left-16 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl animate-float pointer-events-none"></div>
      <div className="hidden dark:block absolute -bottom-16 -right-16 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl animate-float pointer-events-none" style={{ animationDelay: '2s' }}></div>

      <div className="bg-white dark:bg-slate-800/70 backdrop-blur-xl rounded-2xl shadow-xl dark:shadow-2xl overflow-hidden relative z-10 transition-all duration-500 border border-slate-200 dark:border-white/10">
        {/* 顶部导航栏 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5">
          <button
            onClick={onPrevLevel}
            disabled={!canGoPrev}
            className={`p-1.5 rounded-lg transition-all duration-300 ${
              !canGoPrev
                ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                : 'text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 active:scale-95'
            }`}
            title={!canGoPrev ? '无法返回上一关' : '上一关'}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="text-center">
            <h2 className="text-xs uppercase tracking-widest text-blue-600 dark:text-blue-400 font-semibold">
              第 {currentLevel} 关
            </h2>
            <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
              关卡 {currentLevel} / {totalLevels}
            </div>
          </div>

          <button
            onClick={onNextLevel}
            disabled={!canGoNext}
            className={`p-1.5 rounded-lg transition-all duration-300 ${
              !canGoNext
                ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                : 'text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 active:scale-95'
            }`}
            title={!canGoNext ? '需要先完成当前关卡' : '下一关'}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* 主要内容区域 - 压缩内边距 */}
        <div className="p-5 md:p-8">
          {/* 标题 */}
          <h1 className="text-xl md:text-2xl font-bold text-center mb-5 text-slate-800 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-white dark:via-blue-100 dark:to-slate-300 dark:animate-shine">
            {level.title}
          </h1>

          {/* 代码/题目显示区 - 固定高度 */}
          <div className="relative group mb-6">
            <div className="hidden dark:block absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl opacity-20 blur transition duration-1000 group-hover:opacity-40"></div>
            <div className="relative bg-slate-100 dark:bg-slate-950 rounded-xl p-6 md:p-8 border border-slate-200 dark:border-slate-800 shadow-inner min-h-[120px] flex flex-col justify-center">
              <div className="absolute top-3 left-3 flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400 dark:bg-red-500/30"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-400 dark:bg-yellow-500/30"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-green-400 dark:bg-green-500/30"></div>
              </div>

              {/* 根据内容类型渲染不同内容 */}
              {level.contentType === 'color' ? (
                <div className="flex flex-col items-center justify-center gap-4 pt-2">
                  {level.content && (
                    <pre className="font-mono text-lg text-slate-700 dark:text-slate-300 text-center">
                      {level.content}
                    </pre>
                  )}
                  <div
                    className="w-48 h-24 rounded-lg shadow-lg border-2 border-white/50"
                    style={{ backgroundColor: level.colorValue }}
                  />
                </div>
              ) : level.contentType === 'hidden' ? (
                <div className="pt-2 flex flex-col items-center justify-center relative">
                  {level.content && (
                    <pre className="font-mono text-lg md:text-xl text-slate-700 dark:text-slate-300 whitespace-pre-wrap text-center leading-relaxed">
                      {level.content}
                    </pre>
                  )}
                  {/* 隐藏的文字 - 极低透明度，选中后可见 */}
                  <span
                    className="text-center mt-4 font-mono text-lg cursor-text"
                    style={{
                      color: 'rgba(0, 0, 0, 0.01)',
                      userSelect: 'all',
                    }}
                  >
                    {level.hiddenText}
                  </span>
                </div>
              ) : level.contentType === 'timestamp' ? (
                <div className="pt-2 flex flex-col items-center justify-center gap-4">
                  <p className="text-lg text-slate-600 dark:text-slate-400 text-center">
                    {level.content}
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setTimestampValue(v => v - 1)}
                      className="w-10 h-10 rounded-lg bg-blue-500 hover:bg-blue-600 active:scale-95 text-white font-bold text-xl transition-all"
                    >
                      -
                    </button>
                    <button
                      onClick={() => setTimestampValue(v => v + 1)}
                      className="w-10 h-10 rounded-lg bg-blue-500 hover:bg-blue-600 active:scale-95 text-white font-bold text-xl transition-all"
                    >
                      +
                    </button>
                  </div>
                  <div className="font-mono text-2xl md:text-3xl text-slate-800 dark:text-slate-200 tracking-wider select-all cursor-pointer">
                    {timestampValue}
                  </div>
                </div>
              ) : level.contentType === 'image' ? (
                <div className="pt-2 flex flex-col items-center justify-center gap-4">
                  <p className="text-lg text-slate-600 dark:text-slate-400 text-center">
                    {level.content}
                  </p>
                  <img
                    src={level.imageSrc}
                    alt={level.imageAlt || '谜题图片'}
                    className="max-w-[280px] w-full rounded-lg shadow-lg"
                  />
                </div>
              ) : level.contentType === 'password' ? (
                <div className="pt-2 flex flex-col items-center justify-center gap-4">
                  <p className="text-lg text-slate-600 dark:text-slate-400 text-center">
                    {level.content}
                  </p>
                  <input
                    type="password"
                    value={level.passwordValue}
                    readOnly
                    className="w-48 px-4 py-3 text-center text-xl font-mono bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 rounded-lg cursor-not-allowed"
                  />
                </div>
              ) : level.contentType === 'cookie' ? (
                <div className="pt-2 flex flex-col items-center justify-center gap-4">
                  <p className="text-lg text-slate-600 dark:text-slate-400 text-center">
                    {level.content}
                  </p>
                  <img
                    src={level.imageSrc}
                    alt="谜题图片"
                    className="max-w-[200px] w-full"
                  />
                </div>
              ) : level.contentType === 'download' ? (
                <div className="pt-2 flex flex-col items-center justify-center gap-4">
                  <p className="text-lg text-slate-600 dark:text-slate-400 text-center">
                    {level.content}
                  </p>
                  <a
                    href={level.downloadUrl}
                    download={level.downloadName}
                    className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-medium"
                  >
                    下载文件
                  </a>
                </div>
              ) : level.contentType === 'localStorage' ? (
                <div className="pt-2 flex flex-col items-center justify-center gap-4">
                  <p className="text-lg text-slate-600 dark:text-slate-400 text-center">
                    {level.content}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-4xl">🧠</span>
                    <span className="text-slate-500 dark:text-slate-400 text-sm">浏览器的记忆...</span>
                  </div>
                </div>
              ) : level.contentType === 'dataAttr' ? (
                <div className="pt-2 flex flex-col items-center justify-center gap-4">
                  <p
                    className="text-lg text-slate-600 dark:text-slate-400 text-center"
                    data-secret={level.dataAttrValue}
                  >
                    {level.content}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-3xl">🔍</span>
                    <span className="text-slate-500 dark:text-slate-400 text-sm">仔细检查每一个元素...</span>
                  </div>
                </div>
              ) : level.contentType === 'code' || level.contentType === 'debugger' ? (
                <div className="pt-2 flex flex-col items-start justify-center gap-3 w-full">
                  <pre className="block w-full p-4 bg-slate-800 dark:bg-black rounded-lg text-green-400 font-mono text-xs sm:text-sm overflow-x-auto whitespace-pre select-all cursor-pointer leading-relaxed">
                    {level.content}
                  </pre>
                </div>
              ) : level.contentType === 'stuck-btn' ? (
                <div className="pt-2 flex flex-col items-center justify-center gap-4 relative">
                  <p className="text-lg text-slate-600 dark:text-slate-400 text-center">{level.content}</p>
                  <div className="relative" id="stuck-btn-container">
                    <button
                      id="stuck-btn-target"
                      onClick={() => alert('答案是: CLICK_ME')}
                      className="px-6 py-3 bg-blue-500 text-white rounded-lg font-medium"
                    >
                      点击我
                    </button>
                    {/* 遮罩层通过 useEffect 动态添加，避免 React 管理导致删除后崩溃 */}
                  </div>
                </div>
              ) : level.contentType === 'progress-bar' ? (
                <div className="pt-2 flex flex-col items-center justify-center gap-4">
                  <p className="text-lg text-slate-600 dark:text-slate-400 text-center">{level.content}</p>
                  <div className="w-64 h-6 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div id="progress-bar-inner" data-progress="99" className="h-full bg-blue-500 transition-all" style={{ width: '99%' }}></div>
                  </div>
                  <span id="progress-text" className="text-sm text-slate-500">99%</span>
                </div>
              ) : level.contentType === 'frozen-timer' ? (
                <div className="pt-2 flex flex-col items-center justify-center gap-4">
                  <p className="text-lg text-slate-600 dark:text-slate-400 text-center">{level.content}</p>
                  <div id="frozen-timer" className="text-4xl font-mono text-slate-700 dark:text-slate-300">00:00</div>
                </div>
              ) : level.contentType === 'collapsed' ? (
                <div className="pt-2 flex flex-col items-center justify-center gap-4">
                  <div id="collapsed-container" style={{ maxHeight: '28px', overflow: 'hidden', transition: 'max-height 0.3s' }}>
                    <p className="text-lg text-slate-600 dark:text-slate-400 text-center whitespace-nowrap">{level.content}</p>
                    <p className="text-lg text-green-500 font-bold text-center mt-2">答案: {level.collapsedAnswer}</p>
                    <p className="text-sm text-slate-400 text-center mt-1">恭喜你发现了隐藏内容！</p>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">↑ 这个区域似乎被截断了...</p>
                </div>
              ) : level.contentType === 'broken-img' ? (
                <div className="pt-2 flex flex-col items-center justify-center gap-4">
                  <p className="text-lg text-slate-600 dark:text-slate-400 text-center">{level.content}</p>
                  <div className="relative">
                    <img
                      id="broken-img"
                      src="/wrong/path/image.png"
                      data-correct-src="/src/data/image/xiaoheizi-D7tntIe0.jpeg"
                      alt="答案图片"
                      className="w-32 h-32 bg-slate-200 dark:bg-slate-700 rounded-lg object-cover"
                    />
                  </div>
                  <p className="text-xs text-slate-400">提示：正确路径藏在 data-correct-src 属性里</p>
                </div>
              ) : level.contentType === 'silent-btn' ? (
                <div className="pt-2 flex flex-col items-center justify-center gap-4">
                  <p className="text-lg text-slate-600 dark:text-slate-400 text-center">{level.content}</p>
                  <div
                    id="silent-btn-wrapper"
                    onClickCapture={(e) => {
                      e.stopPropagation()
                      e.preventDefault()
                      // 吞掉事件，按钮不会响应
                    }}
                  >
                    <button
                      id="secret-btn"
                      data-answer="VOICE_ON"
                      onClick={() => alert('🔊 答案是: VOICE_ON')}
                      className="px-6 py-3 bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-600 transition-colors"
                    >
                      点击我
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">按钮的点击事件似乎被什么拦截了...</p>
                </div>
              ) : level.contentType === 'shadow-text' ? (
                <div className="pt-2 flex flex-col items-center justify-center gap-4">
                  <p className="text-lg text-slate-600 dark:text-slate-400 text-center">{level.content}</p>
                  <div id="shadow-box" className="w-48 h-12 bg-slate-100 dark:bg-slate-800 rounded-lg relative">
                    {/* 答案藏在 ::after 伪元素里 */}
                  </div>
                  <style>{`#shadow-box::after { content: "SHADOW_KEY"; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: transparent; font-size: 18px; font-weight: bold; }`}</style>
                  <p className="text-xs text-slate-400">这个方块里好像有什么...</p>
                </div>
              ) : level.contentType === 'flipped' ? (
                <div className="pt-2 flex flex-col items-center justify-center gap-4">
                  <p
                    id="flipped-text"
                    className="text-2xl font-mono text-slate-700 dark:text-slate-300 select-all"
                    style={{ transform: 'scaleX(-1)' }}
                  >
                    {level.content}
                  </p>
                  <p className="text-xs text-slate-400">文字被镜像翻转了，倒过来念试试？</p>
                </div>
              ) : level.contentType === 'aria-hidden' ? (
                <div className="pt-2 flex flex-col items-center justify-center gap-4">
                  <p
                    id="aria-secret"
                    className="text-2xl text-slate-600 dark:text-slate-400 text-center"
                    aria-label={level.ariaAnswer}
                  >
                    {level.content}
                  </p>
                  <p className="text-xs text-slate-400">视觉上什么都没有，但屏幕阅读器能看到什么？</p>
                </div>
              ) : level.contentType === 'blocked-request' ? (
                <div className="pt-2 flex flex-col items-center justify-center gap-4">
                  <p className="text-lg text-slate-600 dark:text-slate-400 text-center">{level.content}</p>
                  <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                  <p id="request-hint" className="text-xs text-slate-400" data-secret="REQUEST_OK">请求被拦截了，查看这个元素的属性</p>
                </div>
              ) : level.contentType === 'animation-debug' ? (
                <div className="pt-2 flex flex-col items-center justify-center gap-4">
                  <p className="text-lg text-slate-600 dark:text-slate-400 text-center">{level.content}</p>
                  <div id="flash-text" className="text-2xl font-mono font-bold text-green-500 h-8"></div>
                  <p className="text-xs text-slate-400">用 DevTools 暂停 JavaScript 执行，或者设置断点</p>
                </div>
              ) : level.contentType === 'fetch' ? (
                <div className="pt-2 flex flex-col items-center justify-center gap-4">
                  <p className="text-lg text-slate-600 dark:text-slate-400 text-center">
                    {level.content}
                  </p>
                  <button
                    onClick={() => {
                      fetch(level.fetchUrl)
                        .then(res => res.json())
                        .catch(() => {})
                    }}
                    className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-medium"
                  >
                    🌐 获取答案
                  </button>
                </div>
              ) : level.contentType === 'svg-puzzle' ? (
                <div className="pt-2 flex flex-col items-center justify-center">
                  <div dangerouslySetInnerHTML={{ __html: level.content }} />
                </div>
              ) : level.contentType === 'time-travel' || level.contentType === 'final-boss' ? (
                <div className="pt-2 flex flex-col items-start justify-center gap-3 w-full">
                  {/* 第42关隐藏线索 */}
                  {level.contentType === 'final-boss' && (
                    <script dangerouslySetInnerHTML={{ __html: '// The suffix is: ikun' }} />
                  )}
                  <pre className="block w-full p-4 bg-slate-800 dark:bg-black rounded-lg text-green-400 font-mono text-xs sm:text-sm overflow-x-auto whitespace-pre select-all cursor-pointer leading-relaxed">
                    {level.content}
                  </pre>
                  {level.contentType === 'final-boss' && (
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      {/* champion_ + ??? = answer | hint: check page source */}
                    </p>
                  )}
                </div>
              ) : (
                <pre className="font-mono text-lg md:text-xl text-slate-700 dark:text-slate-300 whitespace-pre-wrap text-center leading-relaxed pt-2">
                  {level.content}
                </pre>
              )}
            </div>
          </div>

          {/* 交互区域 */}
          <div className={`transition-all duration-500 transform ${showSuccess ? 'scale-105' : ''}`}>
            {showSuccess ? (
              <div className="text-center py-4">
                <div className="inline-flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-green-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-green-500/30">
                    <Trophy className="w-6 h-6 text-white animate-bounce" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-0.5">挑战成功！</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">太棒了，继续下一个挑战吧</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className={`relative max-w-md mx-auto ${isError ? 'animate-shake' : ''}`}>
                <div className="relative flex items-center">
                  <Terminal className="absolute left-3 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={userAnswer}
                    onChange={(e) => onAnswerChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="输入代码解锁..."
                    className="w-full pl-10 pr-4 py-3 rounded-lg bg-slate-100 dark:bg-slate-900/60 backdrop-blur-sm border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all font-mono"
                  />
                </div>

                <button
                  onClick={onSubmit}
                  disabled={isSubmitting || !userAnswer.trim()}
                  className={`
                    mt-3 w-full py-3 rounded-lg font-bold tracking-wide transition-all duration-300
                    ${isSubmitting || !userAnswer.trim()
                      ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 hover:-translate-y-0.5'
                    }
                  `}
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      验证中...
                    </span>
                  ) : (
                    '提交答案'
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 底部信息栏 */}
        <div className="bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-white/5 px-4 py-2.5 flex items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-500">
          <div className="flex items-center gap-4">
            <span className={`flex items-center gap-1.5 ${errorCount > 0 ? 'text-red-500 dark:text-red-400' : ''}`}>
              {errorCount > 0 ? <AlertCircle className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
              错误: {errorCount}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              时间: {formatTime(elapsedTime)}
            </span>
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
              <Trophy className="w-3.5 h-3.5" />
              已通关: {solvedCount}/{totalLevels}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* 调试按钮 - 仅管理员可见 */}
            {isAdmin && showSuccess && (
              <button
                onClick={onResetLevel}
                className="hover:text-orange-600 dark:hover:text-orange-400 transition-colors flex items-center gap-1 group"
                title="重置此关（管理员调试）"
              >
                <RotateCcw className="w-3 h-3 group-hover:rotate-[-360deg] transition-transform duration-500" />
                重试
              </button>
            )}
            {/* 管理员快捷调试 - 半程/全程领奖 */}
            {isAdmin && (
              <>
                <button
                  onClick={onTriggerHalfReward}
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1"
                  title="触发半程奖励弹窗（管理员调试）"
                >
                  <Gift className="w-3 h-3" />
                  半程奖
                </button>
                <button
                  onClick={onTriggerFullReward}
                  className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors flex items-center gap-1"
                  title="触发全程奖励弹窗（管理员调试）"
                >
                  <Trophy className="w-3 h-3" />
                  全程奖
                </button>
                <button
                  onClick={onTriggerGrandCelebration}
                  className="hover:text-pink-600 dark:hover:text-pink-400 transition-colors flex items-center gap-1"
                  title="触发通关庆祝弹窗（管理员调试）"
                >
                  <PartyPopper className="w-3 h-3" />
                  通关庆祝
                </button>
              </>
            )}
            {/* 提交上榜按钮 */}
            <button
              onClick={onSubmitToLeaderboard}
              disabled={!isLoggedIn || solvedCount === 0 || isSubmittingToLeaderboard}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all
                ${!isLoggedIn || solvedCount === 0
                  ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 active:scale-95'
                }
              `}
              title={!isLoggedIn ? '请先登录' : solvedCount === 0 ? '请先完成至少一道题目' : '提交成绩到排行榜'}
            >
              {isSubmittingToLeaderboard ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  提交中...
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  提交上榜
                </>
              )}
            </button>
            <Link to="/ranking?tab=puzzle" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1 group">
              <Zap className="w-3 h-3 group-hover:text-yellow-500 dark:group-hover:text-yellow-400" />
              排行榜
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

// 同步进度到服务器的函数
const syncProgressToServer = async (progressData) => {
  try {
    await api.post('/puzzle/sync-progress', {
      solved_levels: progressData.solvedLevels || [],
      level_times: progressData.levelTimes || {},
      error_counts: progressData.errorCounts || {},
    })
  } catch (err) {
    // 静默失败，不影响用户体验
    console.warn('进度同步失败:', err)
  }
}

// 主页面
export default function CodeChallengePage() {
  const toast = useToast()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const originalRole = useAuthStore((s) => s.originalRole)

  // 判断是否是管理员（使用原始角色，防止角色切换后失效）
  const isAdmin = (originalRole || user?.role) === 'admin'

  const [progress, setProgress] = useState(loadProgress)
  const [currentLevel, setCurrentLevel] = useState(() => {
    // 从 localStorage 读取当前关卡
    const saved = loadProgress()
    return saved.currentLevel || 1
  })
  const [userAnswer, setUserAnswer] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [isError, setIsError] = useState(false)
  const [isLevelSelectorOpen, setIsLevelSelectorOpen] = useState(() => {
    // 从 localStorage 读取关卡选择器状态
    const saved = loadProgress()
    return saved.levelSelectorOpen || false
  })
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [justSolvedLevel, setJustSolvedLevel] = useState(null)
  const [solvedTime, setSolvedTime] = useState(0)

  // 打气鼓励相关状态
  const [showEncouragement, setShowEncouragement] = useState(false)
  const [encouragementMessage, setEncouragementMessage] = useState(null)
  const consecutiveErrorsRef = useRef(0)
  const onCloseEncouragementRef = useRef(() => setShowEncouragement(false))

  // 奖励弹窗相关状态
  const [showRewardModal, setShowRewardModal] = useState(false)
  const [pendingRewardType, setPendingRewardType] = useState(null)
  const [claimedRewards, setClaimedRewards] = useState(() => {
    try {
      const saved = localStorage.getItem('puzzle_claimed_rewards')
      return saved ? JSON.parse(saved) : { half: false, full: false }
    } catch {
      return { half: false, full: false }
    }
  })

  // 全程通关庆祝弹窗状态
  const [showGrandCelebration, setShowGrandCelebration] = useState(false)
  const [hasShownGrandCelebration, setHasShownGrandCelebration] = useState(() => {
    try {
      return localStorage.getItem('puzzle_grand_celebration_shown') === 'true'
    } catch {
      return false
    }
  })

  const [elapsedTime, setElapsedTime] = useState(0)
  const timerRef = useRef(null)
  const autoNextRef = useRef(null)

  // 提交上榜相关状态
  const [isSubmittingToLeaderboard, setIsSubmittingToLeaderboard] = useState(false)

  // 当关卡变化时，保存到 localStorage
  useEffect(() => {
    const newProgress = { ...progress, currentLevel, levelSelectorOpen: isLevelSelectorOpen }
    setProgress(newProgress)
    saveProgress(newProgress)
  }, [currentLevel, isLevelSelectorOpen])

  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    if (autoNextRef.current) {
      clearTimeout(autoNextRef.current)
    }

    if (progress.solvedLevels.includes(currentLevel)) {
      setElapsedTime(progress.levelTimes[currentLevel] || 0)
      setShowSuccess(true)
      return
    }

    setElapsedTime(0)
    setShowSuccess(false)
    setUserAnswer('')
    setIsError(false)

    timerRef.current = setInterval(() => {
      setElapsedTime((prev) => prev + 1)
    }, 1000)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      if (autoNextRef.current) {
        clearTimeout(autoNextRef.current)
      }
    }
  }, [currentLevel, progress.solvedLevels])

  const currentLevelData = PUZZLE_LEVELS.find(l => l.id === currentLevel)
  const currentErrorCount = progress.errorCounts[currentLevel] || 0

  // 处理特殊关卡效果（URL参数、标签页标题、Cookie）
  useEffect(() => {
    const originalTitle = document.title

    if (currentLevelData?.contentType === 'url' && currentLevelData?.urlParam) {
      // 修改 URL 添加参数
      const url = new URL(window.location.href)
      const [key, value] = currentLevelData.urlParam.split('=')
      url.searchParams.set(key, value)
      window.history.replaceState({}, '', url.toString())
    } else {
      // 清除 URL 参数
      const url = new URL(window.location.href)
      url.searchParams.delete('answer')
      window.history.replaceState({}, '', url.toString())
    }

    if (currentLevelData?.contentType === 'title' && currentLevelData?.titleHint) {
      // 修改标签页标题
      document.title = currentLevelData.titleHint
    } else {
      document.title = '码神挑战 - IKunCode'
    }

    // 设置 Cookie（用于 cookie 类型关卡）
    if (currentLevelData?.contentType === 'cookie' && currentLevelData?.cookieAnswer) {
      document.cookie = `puzzle_answer=${currentLevelData.cookieAnswer}; path=/; max-age=3600`
    }

    // 输出 Console 信息（用于 console 类型关卡）
    if (currentLevelData?.contentType === 'console' && currentLevelData?.consoleMessage) {
      if (currentLevelData?.consoleCustom) {
        // 第30关：设置全局变量 a 和 b，让玩家在控制台输入查看
        window.a = '\x001'
        window.b = '1'
      } else {
        console.error(`[Error] WebSocket connection failed (code: ${currentLevelData.consoleMessage})`)
      }
    }

    // 设置 localStorage（用于 localStorage 类型关卡）
    if (currentLevelData?.contentType === 'localStorage' && currentLevelData?.localStorageKey) {
      localStorage.setItem(currentLevelData.localStorageKey, currentLevelData.localStorageValue)
    }

    // 第20关：控制台彩蛋
    if (currentLevelData?.contentType === 'console-egg' && currentLevelData?.consoleSecret) {
      console.log('%c🎉 恭喜你找到了彩蛋！', 'font-size: 20px; color: #00ff00;')
      console.log('%c答案是: ' + currentLevelData.consoleSecret, 'font-size: 16px; color: #ff6600; font-weight: bold;')
    }

    // 第10关：卡住的按钮 - 动态添加遮罩层（不受 React 管理，删除后不会崩溃）
    if (currentLevelData?.contentType === 'stuck-btn') {
      const timer = setTimeout(() => {
        const container = document.getElementById('stuck-btn-container')
        if (container && !document.getElementById('stuck-btn-overlay')) {
          const overlay = document.createElement('div')
          overlay.id = 'stuck-btn-overlay'
          overlay.className = 'absolute inset-0 bg-transparent'
          overlay.style.zIndex = '10'
          container.appendChild(overlay)
        }
      }, 100)
      return () => clearTimeout(timer)
    }

    // 第20关：快速闪烁动画
    if (currentLevelData?.contentType === 'animation-debug') {
      const texts = ['...', '??', '##', 'PAUSE_IT', '!!', '**', '@@']
      let index = 0
      const interval = setInterval(() => {
        const el = document.getElementById('flash-text')
        if (el) {
          el.textContent = texts[index % texts.length]
          index++
        }
      }, 50) // 很快的速度

      return () => clearInterval(interval)
    }

    // 第14关：迷路的图片 - 不需要特殊逻辑，玩家直接观察即可

    // 第12关：沉睡的计时器 - 挂载 startTimer 函数
    if (currentLevelData?.contentType === 'frozen-timer') {
      window.startTimer = function() {
        const timerEl = document.getElementById('frozen-timer')
        if (!timerEl) return '找不到计时器元素'

        let seconds = 5
        timerEl.textContent = `00:0${seconds}`
        timerEl.style.color = '#22c55e' // 变绿表示启动了

        const interval = setInterval(() => {
          seconds--
          timerEl.textContent = `00:0${seconds}`
          if (seconds <= 0) {
            clearInterval(interval)
            alert('⏰ 时间到！答案是: AWAKEN')
          }
        }, 1000)

        return '计时器已启动！'
      }

      return () => {
        if (window.startTimer) delete window.startTimer
      }
    }

    // 第11关：进度条 - 监听 width 变化，100% 时弹出答案
    if (currentLevelData?.contentType === 'progress-bar') {
      let triggered = false
      const checkProgress = () => {
        if (triggered) return
        const bar = document.getElementById('progress-bar-inner')
        if (bar) {
          const width = bar.style.width
          const dataProgress = bar.getAttribute('data-progress')
          if (width === '100%' || dataProgress === '100') {
            triggered = true
            alert('🎉 进度条满了！答案是: COMPLETE')
          }
        }
      }

      const timer = setTimeout(() => {
        const bar = document.getElementById('progress-bar-inner')
        if (bar) {
          // 使用 MutationObserver 监听属性变化
          const observer = new MutationObserver(checkProgress)
          observer.observe(bar, { attributes: true, attributeFilter: ['style', 'data-progress'] })
          window._progressObserver = observer
        }
      }, 100)

      return () => {
        clearTimeout(timer)
        if (window._progressObserver) {
          window._progressObserver.disconnect()
          delete window._progressObserver
        }
      }
    }

    // 第41关：时间旅行者 - 挂载 unlock 函数
    if (currentLevelData?.contentType === 'time-travel') {
      window.unlock = function(year) {
        if (new Date().getFullYear() === year) {
          return "flag_" + year;
        }
        return "时间不对...";
      }
    }

    // 第42关：终极挑战 - 挂载 sacred 对象
    if (currentLevelData?.contentType === 'final-boss') {
      window.sacred = (() => {
        const vault = {};
        Object.defineProperty(vault, 'secret', {
          value: 'champion_',
          writable: false,
          configurable: false
        });
        return Object.freeze(Object.create(vault));
      })();
    }

    return () => {
      document.title = originalTitle
      // 清理挂载的函数
      if (window.unlock) delete window.unlock
      if (window.sacred) delete window.sacred
    }
  }, [currentLevel, currentLevelData])

  // 计算下一个可挑战的关卡
  const maxSolvedLevel = progress.solvedLevels.length > 0 ? Math.max(...progress.solvedLevels) : 0
  const nextUnlockedLevel = maxSolvedLevel + 1

  const handleSelectLevel = useCallback((levelId) => {
    // 只能选择已完成的关卡或下一个待挑战的关卡
    const isUnlocked = progress.solvedLevels.includes(levelId) || levelId === nextUnlockedLevel
    if (isUnlocked) {
      setCurrentLevel(levelId)
    }
  }, [progress.solvedLevels, nextUnlockedLevel])

  const handlePrevLevel = useCallback(() => {
    // 只能回到已完成的关卡
    if (currentLevel > 1 && progress.solvedLevels.includes(currentLevel - 1)) {
      setCurrentLevel(currentLevel - 1)
    }
  }, [currentLevel, progress.solvedLevels])

  const handleNextLevel = useCallback(() => {
    // 只能前进到已完成的关卡或下一个待挑战的关卡
    if (currentLevel < TOTAL_LEVELS) {
      const nextLevel = currentLevel + 1
      const isUnlocked = progress.solvedLevels.includes(nextLevel) || nextLevel === nextUnlockedLevel
      if (isUnlocked) {
        setCurrentLevel(nextLevel)
      }
    }
  }, [currentLevel, progress.solvedLevels, nextUnlockedLevel])

  const handleContinueChallenge = useCallback(() => {
    setShowSuccessModal(false)
    if (currentLevel < TOTAL_LEVELS) {
      setCurrentLevel(prev => prev + 1)
    }
  }, [currentLevel])

  // 提交上榜
  const handleSubmitToLeaderboard = useCallback(async () => {
    if (!user) {
      toast.error('请先登录后再提交上榜')
      return
    }

    if (progress.solvedLevels.length === 0) {
      toast.error('请先完成至少一道题目')
      return
    }

    setIsSubmittingToLeaderboard(true)
    try {
      await syncProgressToServer(progress)
      toast.success('🎉 成绩已提交，快去排行榜看看吧！')
      // 延迟后跳转到排行榜
      setTimeout(() => {
        navigate('/ranking?tab=puzzle')
      }, 1500)
    } catch (err) {
      toast.error('提交失败，请稍后重试')
    } finally {
      setIsSubmittingToLeaderboard(false)
    }
  }, [user, progress, toast, navigate])

  // 调试用 - 重置当前关卡（仅管理员）
  const handleResetLevel = useCallback(() => {
    if (!isAdmin) return
    const newProgress = {
      ...progress,
      solvedLevels: progress.solvedLevels.filter(id => id !== currentLevel),
      errorCounts: {
        ...progress.errorCounts,
        [currentLevel]: 0,
      },
      levelTimes: {
        ...progress.levelTimes,
        [currentLevel]: 0,
      },
    }
    setProgress(newProgress)
    saveProgress(newProgress)
    setShowSuccess(false)
    setUserAnswer('')
    setElapsedTime(0)
    toast.info('关卡已重置，可以重新答题')
  }, [currentLevel, progress, toast, isAdmin])

  // 管理员调试模式标记
  const [isAdminDebugReward, setIsAdminDebugReward] = useState(false)

  // 管理员快捷调试 - 触发半程奖励弹窗
  const handleTriggerHalfReward = useCallback(() => {
    if (!isAdmin) return
    setPendingRewardType('half')
    setIsAdminDebugReward(true)  // 标记为管理员调试
    setShowRewardModal(true)
    toast.info('已触发半程奖励弹窗（调试模式，跳过进度验证）')
  }, [isAdmin, toast])

  // 管理员快捷调试 - 触发全程奖励弹窗
  const handleTriggerFullReward = useCallback(() => {
    if (!isAdmin) return
    setPendingRewardType('full')
    setIsAdminDebugReward(true)  // 标记为管理员调试
    setShowRewardModal(true)
    toast.info('已触发全程奖励弹窗（调试模式，跳过进度验证）')
  }, [isAdmin, toast])

  // 管理员快捷调试 - 触发通关庆祝弹窗
  const handleTriggerGrandCelebration = useCallback(() => {
    console.log('handleTriggerGrandCelebration called, isAdmin:', isAdmin)
    if (!isAdmin) {
      console.log('Not admin, returning')
      return
    }
    console.log('Setting showGrandCelebration to true')
    setShowGrandCelebration(true)
    toast?.info?.('已触发通关庆祝弹窗（调试模式）')
  }, [isAdmin, toast])

  const handleSubmit = useCallback(async () => {
    if (!userAnswer.trim() || isSubmitting) return

    setIsSubmitting(true)
    setIsError(false)

    await new Promise(resolve => setTimeout(resolve, 600))

    const isCorrect = validateAnswer(currentLevel, userAnswer)

    if (isCorrect) {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }

      // 重置连续错误计数
      consecutiveErrorsRef.current = 0

      const newProgress = {
        ...progress,
        solvedLevels: progress.solvedLevels.includes(currentLevel)
          ? progress.solvedLevels
          : [...progress.solvedLevels, currentLevel],
        levelTimes: {
          ...progress.levelTimes,
          [currentLevel]: elapsedTime,
        },
      }
      setProgress(newProgress)
      saveProgress(newProgress)

      // 不再自动同步，需要用户主动点击"提交上榜"按钮

      setShowSuccess(true)
      toast.success('System Access Granted!')

      // 保存通关信息并显示弹窗
      setJustSolvedLevel(currentLevelData)
      setSolvedTime(elapsedTime)
      setShowSuccessModal(true)

      // 检查是否达成半程或全程奖励
      const newSolvedCount = newProgress.solvedLevels.length

      // 全程通关 - 先显示超级庆祝弹窗
      if (newSolvedCount >= FULL_REWARD_THRESHOLD && !hasShownGrandCelebration) {
        setTimeout(() => {
          setShowGrandCelebration(true)
          setHasShownGrandCelebration(true)
          localStorage.setItem('puzzle_grand_celebration_shown', 'true')
        }, 1500)
        // 庆祝弹窗关闭后再显示奖励弹窗
        if (!claimedRewards.full) {
          setTimeout(() => {
            setPendingRewardType('full')
            setShowRewardModal(true)
          }, 15000) // 给庆祝弹窗足够时间
        }
      } else if (newSolvedCount >= FULL_REWARD_THRESHOLD && !claimedRewards.full) {
        // 已经庆祝过，直接显示奖励弹窗
        setTimeout(() => {
          setPendingRewardType('full')
          setShowRewardModal(true)
        }, 2000)
      } else if (newSolvedCount >= HALF_REWARD_THRESHOLD && !claimedRewards.half) {
        setTimeout(() => {
          setPendingRewardType('half')
          setShowRewardModal(true)
        }, 2000)
      }
    } else {
      const newProgress = {
        ...progress,
        errorCounts: {
          ...progress.errorCounts,
          [currentLevel]: (progress.errorCounts[currentLevel] || 0) + 1,
        },
      }
      setProgress(newProgress)
      saveProgress(newProgress)

      setIsError(true)
      toast.error('Access Denied: Invalid Sequence')

      // 连续错误计数增加
      consecutiveErrorsRef.current += 1

      // 连续答错3次及以上时显示打气鼓励
      if (consecutiveErrorsRef.current >= 3) {
        const randomMessage = ENCOURAGEMENT_MESSAGES[Math.floor(Math.random() * ENCOURAGEMENT_MESSAGES.length)]
        setEncouragementMessage(randomMessage)
        setShowEncouragement(true)
        // 显示后重置计数，避免频繁弹出
        consecutiveErrorsRef.current = 0
      }

      setTimeout(() => setIsError(false), 500)
    }

    setIsSubmitting(false)
  }, [currentLevel, userAnswer, isSubmitting, progress, elapsedTime, toast, claimedRewards, hasShownGrandCelebration])

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-white relative overflow-hidden font-sans selection:bg-blue-500/30">
      <AnimationStyles />

      {/* 动态背景 - 仅暗色模式 */}
      <div className="hidden dark:block fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
      </div>

      {/* 亮色模式背景 */}
      <div className="dark:hidden fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100"></div>
      </div>

      {/* 主要内容区域 */}
      <div className="relative z-10 px-4 pt-20 pb-20 min-h-screen flex flex-col items-center">
        {/* 顶部装饰区域 */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{'</>'}</span>
          </div>
          <div className="h-6 w-px bg-slate-300 dark:bg-slate-700"></div>
          <h1 className="text-lg font-bold tracking-wide text-slate-600 dark:text-slate-300">
            码神挑战
          </h1>
          <div className="h-6 w-px bg-slate-300 dark:bg-slate-700"></div>
          <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400 dark:text-slate-500">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
            在线
          </div>
        </div>

        {/* 主卡片 */}
        <ChallengeCard
          level={currentLevelData}
          currentLevel={currentLevel}
          totalLevels={TOTAL_LEVELS}
          errorCount={currentErrorCount}
          elapsedTime={elapsedTime}
          userAnswer={userAnswer}
          onAnswerChange={setUserAnswer}
          onSubmit={handleSubmit}
          onPrevLevel={handlePrevLevel}
          onNextLevel={handleNextLevel}
          onResetLevel={handleResetLevel}
          isSubmitting={isSubmitting}
          showSuccess={showSuccess}
          isError={isError}
          // 提交上榜相关
          solvedCount={progress.solvedLevels.length}
          isLoggedIn={!!user}
          onSubmitToLeaderboard={handleSubmitToLeaderboard}
          isSubmittingToLeaderboard={isSubmittingToLeaderboard}
          // 关卡解锁相关 - 只能按顺序通关
          canGoPrev={currentLevel > 1 && progress.solvedLevels.includes(currentLevel - 1)}
          canGoNext={currentLevel < TOTAL_LEVELS && (progress.solvedLevels.includes(currentLevel + 1) || currentLevel + 1 === nextUnlockedLevel)}
          // 管理员相关
          isAdmin={isAdmin}
          onTriggerHalfReward={handleTriggerHalfReward}
          onTriggerFullReward={handleTriggerFullReward}
          onTriggerGrandCelebration={handleTriggerGrandCelebration}
        />
      </div>

      {/* 底部关卡选择器 */}
      <LevelSelector
        currentLevel={currentLevel}
        solvedLevels={progress.solvedLevels}
        onSelectLevel={handleSelectLevel}
        isOpen={isLevelSelectorOpen}
        setIsOpen={setIsLevelSelectorOpen}
      />

      {/* 通关成功弹窗 */}
      <SuccessModal
        isOpen={showSuccessModal}
        level={justSolvedLevel}
        levelNumber={justSolvedLevel?.id || currentLevel}
        elapsedTime={solvedTime}
        errorCount={progress.errorCounts[justSolvedLevel?.id || currentLevel] || 0}
        onContinue={handleContinueChallenge}
        onClose={() => setShowSuccessModal(false)}
        isLastLevel={currentLevel >= TOTAL_LEVELS}
      />

      {/* 打气鼓励弹窗 */}
      <EncouragementModal
        isOpen={showEncouragement}
        message={encouragementMessage}
        onClose={onCloseEncouragementRef.current}
      />

      {/* 奖励领取弹窗 */}
      <RewardModal
        isOpen={showRewardModal}
        rewardType={pendingRewardType}
        solvedCount={progress.solvedLevels.length}
        isAdminDebug={isAdminDebugReward}
        onClose={() => {
          setShowRewardModal(false)
          setIsAdminDebugReward(false)  // 重置管理员调试标记
          // 记录已显示过该奖励弹窗（即使未领取，但管理员调试不记录）
          if (pendingRewardType && !isAdminDebugReward) {
            const newClaimedRewards = { ...claimedRewards, [pendingRewardType]: true }
            setClaimedRewards(newClaimedRewards)
            localStorage.setItem('puzzle_claimed_rewards', JSON.stringify(newClaimedRewards))
          }
        }}
      />

      {/* 全程通关超级庆祝弹窗 */}
      <GrandCelebrationModal
        isOpen={showGrandCelebration}
        onClose={() => setShowGrandCelebration(false)}
        totalTime={Object.values(progress.levelTimes).reduce((a, b) => a + b, 0)}
        totalErrors={Object.values(progress.errorCounts).reduce((a, b) => a + b, 0)}
        onSubmitToLeaderboard={handleSubmitToLeaderboard}
      />
    </div>
  )
}
