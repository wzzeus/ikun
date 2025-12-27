import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { trackLogin } from '../utils/analytics'
import { getApiBaseUrl } from '../lib/apiBaseUrl'
import { authApi } from '../services'
import { useToast } from '../components/Toast'
import logo from '@/assets/logo.png'

/**
 * 解码 base64url JSON
 */
function decodeBase64UrlJson(encoded) {
  try {
    // 补齐 padding
    const padded = encoded + '==='.slice((encoded.length + 3) % 4)
    const base64 = padded.replace(/-/g, '+').replace(/_/g, '/')
    const binary = atob(base64)
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
    const jsonText = new TextDecoder().decode(bytes)
    return JSON.parse(jsonText)
  } catch {
    return null
  }
}

function getErrorMessage(error) {
  const detail = error?.response?.data?.detail
  if (typeof detail === 'string' && detail) return detail
  if (detail && typeof detail === 'object') {
    if (typeof detail.message === 'string' && detail.message) return detail.message
  }
  if (typeof error?.message === 'string' && error.message) return error.message
  return '登录失败，请稍后重试'
}

/**
 * 登录页
 */
export default function LoginPage() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const [searchParams] = useSearchParams()
  const toast = useToast()
  const [account, setAccount] = useState('')
  const [password, setPassword] = useState('')
  const [localLoading, setLocalLoading] = useState(false)

  const apiBaseUrl = useMemo(() => {
    // OAuth 登录需要完整 URL，不能用相对路径
    return getApiBaseUrl()
  }, [])

  // 从 URL 参数获取登录后跳转目标
  const nextFromQuery = useMemo(() => {
    return searchParams.get('next') || ''
  }, [searchParams])

  // 处理 OAuth 回调
  useEffect(() => {
    const hash = window.location.hash || ''
    if (!hash.startsWith('#')) return

    const params = new URLSearchParams(hash.slice(1))
    const token = params.get('token')
    if (!token) return
    const notice = params.get('notice')

    // 优先使用回调中的 next，其次使用 URL 参数中的 next
    const next = params.get('next') || nextFromQuery
    const userParam = params.get('user')

    // 解码用户信息
    const user = userParam ? decodeBase64UrlJson(userParam) : null

    // 登录并清除 hash
    login(user, token)
    trackLogin('linuxdo')
    window.location.hash = ''
    if (notice) {
      toast.info(notice)
    }

    // 检查是否需要角色选择引导
    // 如果用户还没选过角色（role_selected 为 false），跳转到引导页
    if (user && !user.role_selected) {
      // 带上原来的 next 参数，选完角色后继续跳转
      const guidePath = next ? `/role-guide?next=${encodeURIComponent(next)}` : '/role-guide'
      navigate(guidePath, { replace: true })
    } else {
      // 已选过角色，直接跳转
      navigate(next || '/', { replace: true })
    }
  }, [login, navigate, nextFromQuery, toast])

  /**
   * 开始 Linux.do 登录
   * 将 next 参数传递给后端，以便回调时返回指定页面
   */
  const startLinuxDoLogin = () => {
    const qs = new URLSearchParams()
    if (nextFromQuery) {
      qs.set('next', nextFromQuery)
    }
    const suffix = qs.toString() ? `?${qs.toString()}` : ''
    window.location.href = `${apiBaseUrl}/auth/linuxdo/login${suffix}`
  }

  /**
   * 开始 GitHub 登录
   */
  const startGitHubLogin = () => {
    const qs = new URLSearchParams()
    if (nextFromQuery) {
      qs.set('next', nextFromQuery)
    }
    const suffix = qs.toString() ? `?${qs.toString()}` : ''
    window.location.href = `${apiBaseUrl}/auth/github/login${suffix}`
  }

  const handleLocalLogin = async (event) => {
    event.preventDefault()
    if (!account.trim() || !password) {
      toast.warning('请输入账号和密码')
      return
    }
    if (new TextEncoder().encode(password).length > 72) {
      toast.warning('密码长度过长')
      return
    }
    setLocalLoading(true)
    try {
      const result = await authApi.login({ username: account.trim(), password })
      const user = result?.user
      const token = result?.access_token
      if (!user || !token) {
        throw new Error('登录返回异常')
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
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setLocalLoading(false)
    }
  }

  const registerLink = useMemo(() => {
    return nextFromQuery ? `/register?next=${encodeURIComponent(nextFromQuery)}` : '/register'
  }, [nextFromQuery])

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex items-center justify-center px-4 transition-colors">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 shadow-lg">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img
            src={logo}
            alt="ikuncode"
            className="w-16 h-16 rounded-full"
          />
        </div>

        <h1 className="text-2xl font-bold text-slate-900 dark:text-white text-center mb-2">
          登录鸡王争霸赛
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-center mb-8">
          你干嘛～ 嗨嗨哟～
        </p>

        <div className="space-y-6 mb-8">
          <form onSubmit={handleLocalLogin} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                用户名或邮箱
              </label>
              <input
                type="text"
                value={account}
                onChange={(event) => setAccount(event.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                placeholder="请输入用户名或邮箱"
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
                placeholder="请输入密码"
                autoComplete="current-password"
              />
            </div>
            <div className="flex justify-end">
              <Link
                to="/forgot-password"
                className="text-xs text-yellow-500 hover:text-yellow-400 font-medium"
              >
                忘记密码？
              </Link>
            </div>
            <button
              type="submit"
              disabled={localLoading}
              className="w-full py-3 rounded-xl bg-yellow-500 text-slate-900 font-bold hover:bg-yellow-400 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {localLoading ? '登录中...' : '本地账号登录'}
            </button>
          </form>

          <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
            <span className="flex-1 border-t border-slate-200 dark:border-slate-700" />
            或
            <span className="flex-1 border-t border-slate-200 dark:border-slate-700" />
          </div>

          {/* Linux.do 登录 */}
          <div className="space-y-4">
            <button
              type="button"
              onClick={startLinuxDoLogin}
              className="w-full py-3 rounded-xl bg-white text-slate-900 font-semibold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 border border-slate-200"
            >
              <svg className="w-6 h-6" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
                <clipPath id="linuxdo-clip"><circle cx="60" cy="60" r="47"/></clipPath>
                <circle fill="#f0f0f0" cx="60" cy="60" r="50"/>
                <rect fill="#1c1c1e" clipPath="url(#linuxdo-clip)" x="10" y="10" width="100" height="30"/>
                <rect fill="#f0f0f0" clipPath="url(#linuxdo-clip)" x="10" y="40" width="100" height="40"/>
                <rect fill="#ffb003" clipPath="url(#linuxdo-clip)" x="10" y="80" width="100" height="30"/>
              </svg>
              使用 LinuxDO 继续
            </button>

            <button
              type="button"
              onClick={startGitHubLogin}
              className="w-full py-3 rounded-xl bg-slate-900 dark:bg-slate-800 text-white font-semibold hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 border border-slate-700"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              使用 GitHub 登录
            </button>

            <p className="text-slate-400 dark:text-slate-500 text-center text-sm">
              将跳转到第三方授权并回到本站完成登录
            </p>
          </div>
        </div>

        <div className="border-t border-slate-200 dark:border-slate-800 pt-6">
          <p className="text-slate-500 dark:text-slate-400 text-center text-sm mb-2">
            没有账号？
            <Link
              to={registerLink}
              className="ml-1 text-yellow-500 hover:text-yellow-400 font-medium"
            >
              去注册
            </Link>
          </p>
          <p className="text-slate-500 dark:text-slate-400 text-center text-sm mb-4">
            登录即表示您同意我们的服务条款
          </p>
          <Link
            to="/"
            className="block text-center text-yellow-500 hover:text-yellow-400 font-medium"
          >
            返回首页
          </Link>
        </div>
      </div>
    </div>
  )
}
