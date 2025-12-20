import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useRegistrationStore } from '@/stores/registrationStore'
import { useAuthStore } from '@/stores/authStore'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import api from '@/services/api'
import ParticipantDetailModal from '@/components/participant/ParticipantDetailModal'
import {
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  GitCommit,
  Plus,
  Minus,
  Target,
  Wallet,
  Flame,
  ExternalLink,
  Edit3,
  Github,
  TrendingUp,
  Sparkles,
  ChevronRight,
  Zap,
  FileText,
  Eye,
} from 'lucide-react'

/**
 * 审核状态配置
 */
const STATUS_CONFIG = {
  submitted: {
    label: '审核中',
    icon: Clock,
    color: 'text-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-200 dark:border-amber-900/50',
    description: '您的报名正在等待审核',
  },
  approved: {
    label: '已通过',
    icon: CheckCircle2,
    color: 'text-green-500',
    bg: 'bg-green-50 dark:bg-green-950/30',
    border: 'border-green-200 dark:border-green-900/50',
    description: '报名已通过，加油开发吧！',
  },
  rejected: {
    label: '未通过',
    icon: XCircle,
    color: 'text-red-500',
    bg: 'bg-red-50 dark:bg-red-950/30',
    border: 'border-red-200 dark:border-red-900/50',
    description: '报名未通过，可修改后重新提交',
  },
  draft: {
    label: '草稿',
    icon: FileText,
    color: 'text-zinc-500',
    bg: 'bg-zinc-50 dark:bg-zinc-900',
    border: 'border-zinc-200 dark:border-zinc-800',
    description: '报名草稿，请完善后提交',
  },
  withdrawn: {
    label: '已撤回',
    icon: AlertCircle,
    color: 'text-zinc-400',
    bg: 'bg-zinc-50 dark:bg-zinc-900',
    border: 'border-zinc-200 dark:border-zinc-800',
    description: '报名已撤回',
  },
}

/**
 * 解析计划完成度
 */
function parsePlanProgress(plan) {
  if (!plan?.trim()) return { total: 0, done: 0, percent: 0 }

  const lines = plan.replace(/\r\n?/g, '\n').split('\n')
  let total = 0
  let done = 0

  // 匹配 [ ] 或 [x] 格式
  const checkboxRe = /\[( |x|X)\]/

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    // 检查是否包含复选框
    const match = trimmed.match(checkboxRe)
    if (match) {
      total++
      if (match[1].toLowerCase() === 'x') {
        done++
      }
    } else if (trimmed.match(/^[-*+]|^\d+[.)]/)) {
      // 普通列表项也计入总数
      total++
    }
  }

  const percent = total > 0 ? Math.round((done / total) * 100) : 0
  return { total, done, percent }
}

/**
 * 参赛者仪表盘组件 - 精简版
 * 用于在 Navbar 下拉菜单或首页展示
 */
export function ContestantStatusCard({ className, variant = 'default' }) {
  const registration = useRegistrationStore((s) => s.registration)
  const status = useRegistrationStore((s) => s.status)
  const openModal = useRegistrationStore((s) => s.openModal)

  const [githubStats, setGithubStats] = useState(null)
  const [quotaData, setQuotaData] = useState(null)

  // 加载额外数据
  useEffect(() => {
    if (!registration?.id) return

    // 获取 GitHub 统计
    if (registration.repo_url) {
      api.get(`/registrations/${registration.id}/github-stats`)
        .then(setGithubStats)
        .catch(() => setGithubStats(null))
    }

    // 获取额度信息
    api.get(`/registrations/${registration.id}/quota`)
      .then(setQuotaData)
      .catch(() => setQuotaData(null))
  }, [registration?.id, registration?.repo_url])

  // 计算计划进度
  const planProgress = useMemo(() => {
    return parsePlanProgress(registration?.plan)
  }, [registration?.plan])

  // 状态配置
  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.submitted
  const StatusIcon = statusConfig.icon

  if (!registration || status === 'none' || status === 'unknown') {
    return null
  }

  // 迷你版本 - 用于下拉菜单
  if (variant === 'mini') {
    return (
      <div className={cn("p-3 rounded-xl border", statusConfig.bg, statusConfig.border, className)}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <StatusIcon className={cn("w-4 h-4", statusConfig.color)} />
            <span className="text-sm font-bold text-zinc-900 dark:text-white">
              我的项目
            </span>
          </div>
          <Badge variant="secondary" className={cn("text-xs", statusConfig.color)}>
            {statusConfig.label}
          </Badge>
        </div>

        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 truncate mb-2">
          {registration.title}
        </p>

        <div className="flex items-center gap-3 text-xs">
          {/* 计划进度 */}
          <div className="flex items-center gap-1">
            <Target className="w-3 h-3 text-zinc-400" />
            <span className="text-zinc-500">{planProgress.percent}%</span>
          </div>

          {/* GitHub */}
          {githubStats?.summary?.total_commits > 0 && (
            <div className="flex items-center gap-1">
              <GitCommit className="w-3 h-3 text-zinc-400" />
              <span className="text-zinc-500">{githubStats.summary.total_commits}</span>
            </div>
          )}

          {/* 额度 */}
          {quotaData?.status === 'ok' && (
            <div className="flex items-center gap-1">
              <Flame className="w-3 h-3 text-orange-400" />
              <span className="text-zinc-500">${quotaData.quota?.used?.toFixed(2) || '0'}</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  // 默认完整版本
  return (
    <div className={cn(
      "rounded-2xl border overflow-hidden",
      statusConfig.bg,
      statusConfig.border,
      className
    )}>
      {/* 头部 */}
      <div className="p-4 border-b border-zinc-200/50 dark:border-zinc-800/50">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center",
              status === 'approved' ? 'bg-green-500' :
              status === 'submitted' ? 'bg-amber-500' :
              status === 'rejected' ? 'bg-red-500' : 'bg-zinc-500'
            )}>
              <StatusIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-zinc-900 dark:text-white">
                  {registration.title}
                </h3>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                {statusConfig.description}
              </p>
            </div>
          </div>

          <Badge variant="secondary" className={cn("font-semibold", statusConfig.color)}>
            {statusConfig.label}
          </Badge>
        </div>
      </div>

      {/* 数据统计 */}
      <div className="p-4 grid grid-cols-3 gap-3">
        {/* 计划进度 */}
        <div className="text-center p-3 rounded-xl bg-white/50 dark:bg-zinc-900/50">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Target className="w-4 h-4 text-primary" />
          </div>
          <div className="text-lg font-bold text-zinc-900 dark:text-white">
            {planProgress.percent}%
          </div>
          <div className="text-xs text-zinc-500">计划进度</div>
          <div className="mt-1.5 h-1 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${planProgress.percent}%` }}
            />
          </div>
        </div>

        {/* GitHub 提交 */}
        <div className="text-center p-3 rounded-xl bg-white/50 dark:bg-zinc-900/50">
          <div className="flex items-center justify-center gap-1 mb-1">
            <GitCommit className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-lg font-bold text-zinc-900 dark:text-white">
            {githubStats?.summary?.total_commits || 0}
          </div>
          <div className="text-xs text-zinc-500">总提交数</div>
          {githubStats?.summary && (
            <div className="mt-1.5 flex items-center justify-center gap-2 text-xs">
              <span className="text-green-500">+{githubStats.summary.total_additions || 0}</span>
              <span className="text-red-500">-{githubStats.summary.total_deletions || 0}</span>
            </div>
          )}
        </div>

        {/* API 消耗 */}
        <div className="text-center p-3 rounded-xl bg-white/50 dark:bg-zinc-900/50">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Flame className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-lg font-bold text-zinc-900 dark:text-white">
            ${quotaData?.quota?.used?.toFixed(2) || '0.00'}
          </div>
          <div className="text-xs text-zinc-500">已消耗</div>
          {quotaData?.status === 'ok' && (
            <div className="mt-1.5 text-xs text-zinc-400">
              剩余 ${quotaData.quota?.remaining?.toFixed(2) || '∞'}
            </div>
          )}
        </div>
      </div>

      {/* 快捷操作 */}
      <div className="p-3 border-t border-zinc-200/50 dark:border-zinc-800/50 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 h-9"
          onClick={openModal}
        >
          <Edit3 className="w-3.5 h-3.5 mr-1.5" />
          编辑项目
        </Button>

        {registration.repo_url && (
          <Button
            variant="outline"
            size="sm"
            className="h-9"
            asChild
          >
            <a href={registration.repo_url} target="_blank" rel="noreferrer">
              <Github className="w-3.5 h-3.5 mr-1.5" />
              仓库
            </a>
          </Button>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="h-9"
          asChild
        >
          <Link to="/participants">
            <Eye className="w-3.5 h-3.5 mr-1.5" />
            查看
          </Link>
        </Button>
      </div>
    </div>
  )
}

/**
 * 参赛者完整仪表盘
 * 用于首页或独立页面
 */
export default function ContestantDashboard({ className }) {
  const user = useAuthStore((s) => s.user)
  const registration = useRegistrationStore((s) => s.registration)
  const status = useRegistrationStore((s) => s.status)
  const checkStatus = useRegistrationStore((s) => s.checkStatus)
  const openModal = useRegistrationStore((s) => s.openModal)

  const [githubStats, setGithubStats] = useState(null)
  const [quotaData, setQuotaData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showDetailModal, setShowDetailModal] = useState(false)

  // 检查报名状态
  useEffect(() => {
    if (user) {
      checkStatus(1).finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [user, checkStatus])

  // 加载额外数据
  useEffect(() => {
    if (!registration?.id) return

    const loadData = async () => {
      // 获取 GitHub 统计
      if (registration.repo_url) {
        try {
          const stats = await api.get(`/registrations/${registration.id}/github-stats`)
          setGithubStats(stats)
        } catch {
          setGithubStats(null)
        }
      }

      // 获取额度信息
      try {
        const quota = await api.get(`/registrations/${registration.id}/quota`)
        setQuotaData(quota)
      } catch {
        setQuotaData(null)
      }
    }

    loadData()
  }, [registration?.id, registration?.repo_url])

  // 计算计划进度
  const planProgress = useMemo(() => {
    return parsePlanProgress(registration?.plan)
  }, [registration?.plan])

  // 为展示页弹窗构建参赛者数据
  const participantData = useMemo(() => {
    if (!registration || !user) return null
    return {
      id: registration.id,
      title: registration.title,
      summary: registration.summary,
      description: registration.description,
      plan: registration.plan,
      tech_stack: registration.tech_stack,
      repo_url: registration.repo_url,
      status: registration.status,
      submitted_at: registration.submitted_at,
      created_at: registration.created_at,
      user: {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
        trust_level: user.trust_level,
      },
    }
  }, [registration, user])

  // 状态配置
  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.submitted
  const StatusIcon = statusConfig.icon

  // 未登录或未报名
  if (!user || loading) {
    return null
  }

  if (!registration || status === 'none' || status === 'unknown') {
    return null
  }

  return (
    <div className={cn(
      "bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm",
      className
    )}>
      {/* 头部横幅 */}
      <div className={cn(
        "relative px-6 py-5",
        status === 'approved' ? 'bg-gradient-to-r from-green-500 to-emerald-600' :
        status === 'submitted' ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
        status === 'rejected' ? 'bg-gradient-to-r from-red-500 to-rose-600' :
        'bg-gradient-to-r from-zinc-600 to-zinc-700'
      )}>
        {/* 背景装饰 */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
        </div>

        {/* 头部内容 - 移动端纵向堆叠 */}
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center flex-shrink-0">
              <Zap className="w-7 h-7 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge className="bg-white/20 text-white border-0 font-bold">
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {statusConfig.label}
                </Badge>
              </div>
              <h2 className="text-xl font-bold text-white truncate">
                {registration.title}
              </h2>
              <p className="text-sm text-white/70 mt-0.5 truncate">
                {registration.summary?.slice(0, 50)}...
              </p>
            </div>
          </div>

          <Button
            variant="secondary"
            size="sm"
            className="w-full sm:w-auto bg-white/20 text-white border-0 hover:bg-white/30"
            onClick={openModal}
          >
            <Edit3 className="w-4 h-4 mr-1.5" />
            编辑
          </Button>
        </div>
      </div>

      {/* 状态提示 */}
      {status === 'submitted' && (
        <div className="px-6 py-3 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900/50">
          <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
            <Clock className="w-4 h-4" />
            <span className="font-medium">您的报名正在审核中，请耐心等待...</span>
          </div>
        </div>
      )}

      {status === 'rejected' && (
        <div className="px-6 py-3 bg-red-50 dark:bg-red-950/30 border-b border-red-200 dark:border-red-900/50">
          <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-400">
            <XCircle className="w-4 h-4" />
            <span className="font-medium">报名未通过，请修改后重新提交</span>
          </div>
        </div>
      )}

      {/* 数据统计网格 */}
      <div className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* 计划进度 */}
          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Target className="w-4 h-4 text-primary" />
              </div>
              <span className="text-sm font-medium text-zinc-500">计划进度</span>
            </div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-white">
              {planProgress.percent}%
            </div>
            <div className="text-xs text-zinc-400 mt-1">
              {planProgress.done}/{planProgress.total} 已完成
            </div>
            <div className="mt-2 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  planProgress.percent === 100 ? "bg-green-500" : "bg-primary"
                )}
                style={{ width: `${planProgress.percent}%` }}
              />
            </div>
          </div>

          {/* GitHub 提交 */}
          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <GitCommit className="w-4 h-4 text-blue-500" />
              </div>
              <span className="text-sm font-medium text-zinc-500">代码提交</span>
            </div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-white">
              {githubStats?.summary?.total_commits || 0}
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs">
              <span className="text-green-500 font-medium">
                +{githubStats?.summary?.total_additions || 0}
              </span>
              <span className="text-red-500 font-medium">
                -{githubStats?.summary?.total_deletions || 0}
              </span>
            </div>
            <div className="text-xs text-zinc-400 mt-1">
              {githubStats?.summary?.days_active || 0} 天活跃
            </div>
          </div>

          {/* API 消耗 */}
          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Flame className="w-4 h-4 text-orange-500" />
              </div>
              <span className="text-sm font-medium text-zinc-500">API 消耗</span>
            </div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-white">
              ${quotaData?.quota?.used?.toFixed(2) || '0.00'}
            </div>
            <div className="text-xs text-zinc-400 mt-1">
              今日 ${quotaData?.quota?.today_used?.toFixed(2) || '0.00'}
            </div>
            <div className="text-xs text-green-500 font-medium mt-1">
              剩余 {quotaData?.quota?.is_unlimited ? '无限' : `$${quotaData?.quota?.remaining?.toFixed(2) || '0'}`}
            </div>
          </div>

          {/* 应援数 */}
          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-pink-500" />
              </div>
              <span className="text-sm font-medium text-zinc-500">收到应援</span>
            </div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-white">
              -
            </div>
            <div className="text-xs text-zinc-400 mt-1">
              来自社区的支持
            </div>
          </div>
        </div>
      </div>

      {/* 快捷操作 */}
      <div className="px-6 pb-6">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={openModal}>
            <Edit3 className="w-4 h-4 mr-1.5" />
            编辑项目信息
          </Button>

          {registration.repo_url && (
            <Button variant="outline" size="sm" asChild>
              <a href={registration.repo_url} target="_blank" rel="noreferrer">
                <Github className="w-4 h-4 mr-1.5" />
                查看仓库
                <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            </Button>
          )}

          <Button variant="outline" size="sm" onClick={() => setShowDetailModal(true)}>
            <Eye className="w-4 h-4 mr-1.5" />
            查看我的展示页
          </Button>

          <Button variant="outline" size="sm" asChild>
            <Link to="/my-project">
              <Sparkles className="w-4 h-4 mr-1.5" />
              个人中心
            </Link>
          </Button>
        </div>
      </div>

      {/* 展示页弹窗 */}
      <ParticipantDetailModal
        participant={participantData}
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
      />
    </div>
  )
}
