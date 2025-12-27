import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { authApi } from '../services'
import { useToast } from '../components/Toast'
import { trackLogin } from '../utils/analytics'
import logo from '@/assets/logo.png'

function getErrorMessage(error) {
  const detail = error?.response?.data?.detail
  if (typeof detail === 'string' && detail) return detail
  if (detail && typeof detail === 'object') {
    if (typeof detail.message === 'string' && detail.message) return detail.message
  }
  if (typeof error?.message === 'string' && error.message) return error.message
  return '注册失败，请稍后重试'
}

/**
 * 注册页
 */
export default function RegisterPage() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const [searchParams] = useSearchParams()
  const toast = useToast()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [saving, setSaving] = useState(false)

  const nextFromQuery = useMemo(() => {
    return searchParams.get('next') || ''
  }, [searchParams])

  const handleRegister = async (event) => {
    event.preventDefault()
    if (!username.trim() || !password) {
      toast.warning('请输入用户名和密码')
      return
    }
    if (password.length < 8) {
      toast.warning('密码至少 8 位')
      return
    }
    if (new TextEncoder().encode(password).length > 72) {
      toast.warning('密码长度过长')
      return
    }
    setSaving(true)
    try {
      const payload = {
        username: username.trim(),
        password,
      }
      const emailValue = email.trim()
      if (emailValue) payload.email = emailValue
      const displayValue = displayName.trim()
      if (displayValue) payload.display_name = displayValue

      const result = await authApi.register(payload)
      const user = result?.user
      const token = result?.access_token
      if (!user || !token) {
        throw new Error('注册返回异常')
      }
      login(user, token)
      trackLogin('local')
      const next = nextFromQuery
      if (user && !user.role_selected) {
        const guidePath = next ? `/role-guide?next=${encodeURIComponent(next)}` : '/role-guide'
        navigate(guidePath, { replace: true })
      } else {
        navigate(next || '/', { replace: true })
      }
      toast.success('注册成功')
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const loginLink = useMemo(() => {
    return nextFromQuery ? `/login?next=${encodeURIComponent(nextFromQuery)}` : '/login'
  }, [nextFromQuery])

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex items-center justify-center px-4 transition-colors">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 shadow-lg">
        <div className="flex justify-center mb-6">
          <img
            src={logo}
            alt="ikuncode"
            className="w-16 h-16 rounded-full"
          />
        </div>

        <h1 className="text-2xl font-bold text-slate-900 dark:text-white text-center mb-2">
          注册账号
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-center mb-8">
          使用本地账号注册后即可登录
        </p>

        <form onSubmit={handleRegister} className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              用户名
            </label>
            <input
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
              placeholder="请输入用户名"
              autoComplete="username"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
              placeholder="至少 8 位"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              邮箱（可选）
            </label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
              placeholder="example@domain.com"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              昵称（可选）
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
              placeholder="用于展示的名称"
              autoComplete="nickname"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 rounded-xl bg-yellow-500 text-slate-900 font-bold hover:bg-yellow-400 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? '注册中...' : '注册并登录'}
          </button>
        </form>

        <div className="border-t border-slate-200 dark:border-slate-800 pt-6">
          <p className="text-slate-500 dark:text-slate-400 text-center text-sm mb-2">
            已有账号？
            <Link
              to={loginLink}
              className="ml-1 text-yellow-500 hover:text-yellow-400 font-medium"
            >
              去登录
            </Link>
          </p>
          <p className="text-slate-500 dark:text-slate-400 text-center text-sm mb-4">
            你也可以使用第三方账号快捷登录
          </p>
          <Link
            to="/login"
            className="block text-center text-yellow-500 hover:text-yellow-400 font-medium"
          >
            返回登录页
          </Link>
        </div>
      </div>
    </div>
  )
}
