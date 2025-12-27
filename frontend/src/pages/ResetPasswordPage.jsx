import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useToast } from '../components/Toast'
import { authApi } from '../services'
import logo from '@/assets/logo.png'

function getErrorMessage(error) {
  const detail = error?.response?.data?.detail
  if (typeof detail === 'string' && detail) return detail
  if (detail && typeof detail === 'object') {
    if (typeof detail.message === 'string' && detail.message) return detail.message
  }
  if (typeof error?.message === 'string' && error.message) return error.message
  return '重置失败，请稍后重试'
}

export default function ResetPasswordPage() {
  const toast = useToast()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = useMemo(() => searchParams.get('token') || '', [searchParams])
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!token) {
      toast.error('重置链接无效')
      return
    }
    if (!password) {
      toast.warning('请输入新密码')
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
    if (password !== confirmPassword) {
      toast.warning('两次密码不一致')
      return
    }
    setSubmitting(true)
    try {
      await authApi.resetPassword({ token, password })
      toast.success('密码已重置，请登录')
      navigate('/login', { replace: true })
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

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
          重置密码
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-center mb-8">
          设置新的登录密码
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              新密码
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
              确认密码
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
              placeholder="再次输入新密码"
              autoComplete="new-password"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-yellow-500 text-slate-900 font-bold hover:bg-yellow-400 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? '提交中...' : '重置密码'}
          </button>
        </form>

        <div className="border-t border-slate-200 dark:border-slate-800 pt-6 text-center text-sm">
          <Link to="/login" className="text-yellow-500 hover:text-yellow-400 font-medium">
            返回登录
          </Link>
        </div>
      </div>
    </div>
  )
}
