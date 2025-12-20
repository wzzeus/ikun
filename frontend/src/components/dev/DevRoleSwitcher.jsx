/**
 * 管理员专属 - 角色快速切换组件
 * 仅管理员可用，切换角色会同步修改数据库
 * 支持在不同角色间切换以测试功能
 */
import { useState, useEffect } from 'react'
import { ChevronDown, Crown, CheckCircle, Zap, Coffee, Loader2 } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import api from '../../services/api'

const ROLE_SWITCHER_KEY = 'dev_role_switcher_minimized'

const ROLES = [
  {
    value: 'admin',
    label: '管理员',
    icon: Crown,
    color: 'bg-gradient-to-r from-amber-500 to-orange-500',
    desc: '尊贵管理员'
  },
  {
    value: 'reviewer',
    label: '评审员',
    icon: CheckCircle,
    color: 'bg-gradient-to-r from-blue-500 to-cyan-500',
    desc: '特邀评审官'
  },
  {
    value: 'contestant',
    label: '参赛者',
    icon: Zap,
    color: 'bg-gradient-to-r from-cyan-500 to-blue-500',
    desc: '极客先锋'
  },
  {
    value: 'spectator',
    label: '吃瓜用户',
    icon: Coffee,
    color: 'bg-gradient-to-r from-orange-500 to-red-500',
    desc: '首席鉴赏官'
  },
]

export default function DevRoleSwitcher() {
  const [isMinimized, setIsMinimized] = useState(() => {
    // 从 localStorage 读取状态，默认最小化
    const saved = localStorage.getItem(ROLE_SWITCHER_KEY)
    return saved !== null ? saved === 'true' : true
  })
  const [switching, setSwitching] = useState(false)
  const [error, setError] = useState(null)

  // 保存最小化状态到 localStorage
  useEffect(() => {
    localStorage.setItem(ROLE_SWITCHER_KEY, String(isMinimized))
  }, [isMinimized])
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  // 记录用户的原始角色（首次加载时）
  const originalRole = useAuthStore((s) => s.originalRole)
  const setOriginalRole = useAuthStore((s) => s.setOriginalRole)

  // 未登录时不显示
  if (!user) return null

  // 只有管理员（或原始角色是管理员的用户）可以使用此功能
  const isAdminUser = user.role === 'admin' || originalRole === 'admin'
  if (!isAdminUser) return null

  const currentRole = user.role || 'spectator'

  const handleRoleChange = async (role) => {
    if (role === currentRole || switching) return

    setSwitching(true)
    setError(null)

    try {
      // 调用后端 API 切换角色
      const response = await api.post('/users/me/switch-role', { role })
      // 更新本地用户状态（setUser 会自动同步 original_role 到 originalRole）
      setUser(response)
    } catch (err) {
      console.error('角色切换失败:', err)
      setError(err.response?.data?.detail || '角色切换失败')
      // 3秒后清除错误提示
      setTimeout(() => setError(null), 3000)
    } finally {
      setSwitching(false)
    }
  }

  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-4 left-4 z-50 p-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full shadow-lg hover:from-amber-600 hover:to-orange-600 transition-all"
        title="展开角色切换器"
      >
        <Crown className="w-5 h-5" />
      </button>
    )
  }

  return (
    <div className="fixed bottom-4 left-4 z-50">
      {/* 切换面板 */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden w-64">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">角色切换</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(true)}
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
              title="最小化"
            >
              <ChevronDown className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        </div>

        {/* 当前角色 */}
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <div className="text-xs text-slate-500 mb-1">当前角色</div>
          <div className="flex items-center gap-2">
            {(() => {
              const role = ROLES.find(r => r.value === currentRole)
              const Icon = role?.icon || Coffee
              return (
                <>
                  <span className={`p-1.5 rounded-lg ${role?.color || 'bg-slate-500'}`}>
                    <Icon className="w-4 h-4 text-white" />
                  </span>
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">{role?.label || currentRole}</div>
                    <div className="text-xs text-slate-500">{role?.desc}</div>
                  </div>
                </>
              )
            })()}
          </div>
        </div>

        {/* 角色列表 */}
        <div className="p-2 space-y-1">
          {ROLES.map((role) => {
            const Icon = role.icon
            const isActive = currentRole === role.value
            return (
              <button
                key={role.value}
                onClick={() => handleRoleChange(role.value)}
                disabled={switching || isActive}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                  isActive
                    ? 'bg-slate-100 dark:bg-slate-800 ring-2 ring-purple-500'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                } ${switching ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span className={`p-1.5 rounded-lg ${role.color}`}>
                  <Icon className="w-4 h-4 text-white" />
                </span>
                <div className="text-left">
                  <div className={`text-sm font-medium ${isActive ? 'text-purple-600 dark:text-purple-400' : 'text-slate-700 dark:text-slate-300'}`}>
                    {role.label}
                  </div>
                  <div className="text-xs text-slate-500">{role.desc}</div>
                </div>
                {isActive && (
                  <span className="ml-auto text-xs font-bold text-purple-500">✓</span>
                )}
              </button>
            )
          })}
        </div>

        {/* 状态提示 */}
        <div className={`px-4 py-2 border-t ${error ? 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/30' : 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-900/30'}`}>
          {switching ? (
            <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
              <Loader2 className="w-3 h-3 animate-spin" />
              正在切换角色...
            </div>
          ) : error ? (
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          ) : (
            <p className="text-xs text-green-700 dark:text-green-400">
              管理员专属 · 角色切换会同步修改数据库
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
