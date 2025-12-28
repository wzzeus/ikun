import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { authApi } from '../services'
import { useToast } from '../components/Toast'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

function getErrorMessage(error) {
  const detail = error?.response?.data?.detail
  if (typeof detail === 'string' && detail) return detail
  if (detail && typeof detail === 'object') {
    if (typeof detail.message === 'string' && detail.message) return detail.message
  }
  if (typeof error?.message === 'string' && error.message) return error.message
  return '操作失败，请稍后重试'
}

export default function AccountSecurityPage() {
  const toast = useToast()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.token)
  const refreshUser = useAuthStore((s) => s.refreshUser)

  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [mergeOpen, setMergeOpen] = useState(false)
  const [mergeLoading, setMergeLoading] = useState(false)

  const [bindingLoading, setBindingLoading] = useState({
    linuxdo: false,
    github: false,
  })

  useEffect(() => {
    if (!token) {
      navigate('/login?next=/account/security', { replace: true })
    }
  }, [token, navigate])

  useEffect(() => {
    if (searchParams.get('merge') === 'linuxdo') {
      setMergeOpen(true)
    }
  }, [searchParams])

  const hasPassword = !!user?.has_password

  const handlePasswordSubmit = async (event) => {
    event.preventDefault()
    if (!newPassword) {
      toast.warning('请输入新密码')
      return
    }
    if (newPassword.length < 8) {
      toast.warning('密码至少 8 位')
      return
    }
    if (new TextEncoder().encode(newPassword).length > 72) {
      toast.warning('密码长度过长')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.warning('两次密码不一致')
      return
    }
    if (hasPassword && !oldPassword) {
      toast.warning('请输入旧密码')
      return
    }
    setSavingPassword(true)
    try {
      if (hasPassword) {
        await authApi.changePassword({ old_password: oldPassword, new_password: newPassword })
      } else {
        await authApi.setPassword({ password: newPassword })
      }
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
      await refreshUser()
      toast.success(hasPassword ? '密码已更新' : '密码已设置')
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setSavingPassword(false)
    }
  }

  const handleBind = async (provider) => {
    setBindingLoading((prev) => ({ ...prev, [provider]: true }))
    try {
      const payload = { next: '/account/security' }
      const result =
        provider === 'linuxdo'
          ? await authApi.bindLinuxDo(payload)
          : await authApi.bindGitHub(payload)
      const authorizeUrl = result?.authorize_url
      if (!authorizeUrl) {
        throw new Error('绑定链接生成失败')
      }
      window.location.href = authorizeUrl
    } catch (error) {
      toast.error(getErrorMessage(error))
      setBindingLoading((prev) => ({ ...prev, [provider]: false }))
    }
  }

  const handleConfirmMerge = async () => {
    setMergeLoading(true)
    try {
      await authApi.confirmLinuxDoMerge()
      await refreshUser()
      toast.success('已合并到当前账号')
      setMergeOpen(false)
      navigate('/account/security', { replace: true })
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setMergeLoading(false)
    }
  }

  const handleCancelMerge = async () => {
    try {
      await authApi.cancelLinuxDoMerge()
      toast.info('已取消合并请求')
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setMergeOpen(false)
      navigate('/account/security', { replace: true })
    }
  }

  const bindings = useMemo(() => ([
    {
      key: 'linuxdo',
      name: 'Linux.do',
      bound: !!user?.linux_do_id,
      detail: user?.linux_do_username || user?.linux_do_id,
    },
    {
      key: 'github',
      name: 'GitHub',
      bound: !!user?.github_id,
      detail: user?.github_username || user?.github_id,
    },
  ]), [user])

  if (!token) {
    return null
  }
  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10 text-slate-500 dark:text-slate-400">
        加载中...
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">账号安全</h1>
        <p className="text-slate-500 dark:text-slate-400">
          管理本地密码与第三方账号绑定
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            {hasPassword ? '修改密码' : '设置本地密码'}
          </h2>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            {hasPassword && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  旧密码
                </label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(event) => setOldPassword(event.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  placeholder="请输入旧密码"
                  autoComplete="current-password"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                新密码
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
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
                className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                placeholder="再次输入新密码"
                autoComplete="new-password"
              />
            </div>
            <button
              type="submit"
              disabled={savingPassword}
              className="w-full py-2.5 rounded-xl bg-yellow-500 text-slate-900 font-bold hover:bg-yellow-400 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {savingPassword ? '保存中...' : hasPassword ? '更新密码' : '设置密码'}
            </button>
          </form>
          <p className="text-xs text-slate-400 mt-3">
            忘记密码可在登录页使用找回功能。
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            第三方账号绑定
          </h2>
          <div className="space-y-4">
            {bindings.map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">{item.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {item.bound ? `已绑定${item.detail ? `：${item.detail}` : ''}` : '未绑定'}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={item.bound || bindingLoading[item.key]}
                  onClick={() => handleBind(item.key)}
                  className="px-3 py-1.5 rounded-lg text-sm font-semibold border border-yellow-500 text-yellow-600 hover:bg-yellow-50 dark:text-yellow-400 dark:border-yellow-400 dark:hover:bg-yellow-900/20 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {item.bound ? '已绑定' : bindingLoading[item.key] ? '跳转中...' : '绑定'}
                </button>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-4">
            绑定过程中如检测到已有账号，将合并到当前账号。
          </p>
        </div>
      </div>

      <Dialog open={mergeOpen} onOpenChange={setMergeOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>确认合并账号</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
            <p>检测到该 Linux.do 账号已绑定到其他账号。</p>
            <p>是否确认将该账号数据合并到当前账号？</p>
          </div>
          <DialogFooter className="mt-6 flex gap-3 sm:justify-end">
            <button
              type="button"
              onClick={handleCancelMerge}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleConfirmMerge}
              disabled={mergeLoading}
              className={`px-4 py-2 rounded-lg text-white ${mergeLoading ? 'bg-slate-400' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              {mergeLoading ? '合并中...' : '确认合并'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
