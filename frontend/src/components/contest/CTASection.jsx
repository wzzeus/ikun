import { useEffect } from 'react'
import { ChevronRight, ExternalLink, Edit3, XCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { useRegistrationStore } from '../../stores/registrationStore'
import { RegistrationModal, PreparationGuideModal } from '../registration'

/**
 * CTA 行动号召区组件
 */
export default function CTASection({ contestPhase, contestId }) {
  // 当前比赛 ID（后续可从 props 或 context 获取）
  const resolvedContestId = contestId ?? 1

  // 认证状态
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)

  // 报名状态
  const status = useRegistrationStore((s) => s.status)
  const loading = useRegistrationStore((s) => s.loading)
  const saving = useRegistrationStore((s) => s.saving)
  const registration = useRegistrationStore((s) => s.registration)
  const openModal = useRegistrationStore((s) => s.openModal)
  const openPreparationGuide = useRegistrationStore((s) => s.openPreparationGuide)
  const checkStatus = useRegistrationStore((s) => s.checkStatus)
  const withdraw = useRegistrationStore((s) => s.withdraw)

  // 用户角色判断
  const isContestant = user?.role === 'contestant'

  // 登录后检查报名状态（仅参赛者需要检查）
  useEffect(() => {
    if (!token || !isContestant) return
    checkStatus(resolvedContestId).catch(() => {})
  }, [token, isContestant, checkStatus, resolvedContestId])

  // 是否可以编辑（参赛者角色、已报名且未撤回）
  const canEdit = token && isContestant && registration && status !== 'withdrawn' && status !== 'none'
  const isRetireAction = !!contestPhase && contestPhase !== 'signup' && status === 'approved'
  const withdrawLabel = isRetireAction ? '退赛' : '撤回报名'
  const withdrawConfirmMessage = isRetireAction
    ? '确定要退赛吗？退赛后将自动下线部署并删除运行容器，作品不再在公示/展示/投票中出现，且无法再报名。'
    : '确定要撤回报名吗？撤回后将自动下线部署并删除运行容器，作品不再在公示/展示/投票中出现，可在报名期重新报名。'

  // 撤回报名
  const handleWithdraw = async () => {
    if (!window.confirm(withdrawConfirmMessage)) return
    try {
      await withdraw(resolvedContestId)
    } catch {
      // 错误由 store 处理
    }
  }

  // 获取按钮文字
  const getButtonText = () => {
    if (loading) return '查询中...'
    if (canEdit) return '编辑报名'
    return '立即报名参加'
  }

  return (
    <section id="signup" className="py-12 sm:py-16 lg:py-20 text-center scroll-mt-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl sm:text-4xl font-bold text-slate-800 dark:text-white mb-6">
          各位制作人，机会只有一次 <span aria-hidden="true">🐔</span>
        </h2>
        <p className="text-slate-600 dark:text-slate-400 text-lg mb-10">
          这不仅是一场比赛，更是一次免费验证想法、锁定长期低价算力的绝佳机会。
        </p>

        <div className="flex flex-col md:flex-row items-center justify-center gap-4">
          {/* 官网注册按钮 */}
          <a
            href="https://api.ikuncode.cc/"
            target="_blank"
            rel="noreferrer"
            className="w-full md:w-auto px-8 py-4 bg-yellow-500 hover:bg-yellow-400 text-slate-900 rounded-lg font-bold flex items-center justify-center transition-all shadow-lg shadow-yellow-500/20"
          >
            前往官网注册 <ChevronRight className="ml-2 w-5 h-5" />
          </a>

          {/* 报名按钮区域 - 仅参赛者角色显示 */}
          {!token ? (
            // 未登录：显示登录提示
            <Link
              to="/login?next=%2F%23signup"
              className="w-full md:w-auto px-8 py-4 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-white rounded-lg font-bold flex items-center justify-center transition-all"
            >
              登录后报名 <ExternalLink className="ml-2 w-5 h-5" />
            </Link>
          ) : isContestant ? (
            // 参赛者：显示报名/编辑按钮
            <div className="w-full md:w-auto flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-center">
              <button
                type="button"
                onClick={canEdit ? openModal : openPreparationGuide}
                disabled={loading || saving}
                className="px-8 py-4 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-white rounded-lg font-bold flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {getButtonText()}
                {canEdit ? (
                  <Edit3 className="ml-2 w-5 h-5" />
                ) : (
                  <ExternalLink className="ml-2 w-5 h-5" />
                )}
              </button>

              {/* 撤回报名按钮 - 仅已报名的参赛者显示 */}
              {canEdit && (
                <button
                  type="button"
                  onClick={handleWithdraw}
                  disabled={saving}
                  className="px-6 py-4 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 rounded-lg font-bold flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <XCircle className="mr-2 w-5 h-5" />
                  {withdrawLabel}
                </button>
              )}
            </div>
          ) : null}

          {/* QQ群按钮 */}
          <a
            href="https://qm.qq.com/q/120753006"
            target="_blank"
            rel="noreferrer"
            className="w-full md:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold flex items-center justify-center transition-all"
          >
            QQ群：120753006
          </a>
        </div>

        {/* 已报名状态提示 */}
        {canEdit && (
          <p className="mt-6 text-sm text-green-600 dark:text-green-400">
            你已成功报名！状态：
            <span className="font-semibold">
              {status === 'submitted' ? '待审核' :
               status === 'approved' ? '已通过' :
               status === 'rejected' ? '已拒绝' :
               status}
            </span>
          </p>
        )}
      </div>

      {/* 事前准备引导弹窗 */}
      <PreparationGuideModal />

      {/* 报名弹窗 */}
      <RegistrationModal contestId={resolvedContestId} />
    </section>
  )
}
