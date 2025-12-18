import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/authStore'
import { useToast } from '@/components/Toast'
import { cn } from '@/lib/utils'
import api from '@/services/api'
import { lotteryApi } from '@/services'
import {
  Github,
  GitCommit,
  Plus,
  Minus,
  Heart,
  Coffee,
  Zap,
  Pizza,
  Star,
  ExternalLink,
  Calendar,
  Code2,
  FileText,
  Target,
  Clock,
  MessageCircle,
  TrendingUp,
  Activity,
  CheckCircle2,
  Wallet,
  Flame,
  Receipt,
} from 'lucide-react'

/**
 * 解析计划文本为任务列表
 * 支持格式: - xxx, * xxx, 1. xxx, - [ ] xxx, - [x] xxx, [ ] xxx, [x] xxx
 */
function parsePlanToTasks(planText) {
  if (!planText?.trim()) return []

  const lines = planText.replace(/\r\n?/g, '\n').split('\n')
  const tasks = []

  // 将 tab 转换为空格计算缩进级别
  const getIndentLevel = (indent) => {
    const spaces = indent.replace(/\t/g, '    ')
    return Math.floor(spaces.length / 2)
  }

  // 带列表标记的项: - xxx, * xxx, + xxx, 1. xxx, 2) xxx，可选带 [ ] [x] 复选框
  const listItemRe = /^(\s*)(?:[-*+]|(\d+)[.)])\s+(?:\[( |x|X)\]\s*)?(.+)$/
  // 裸复选框格式: [ ] xxx, [x] xxx
  const bareCheckboxRe = /^(\s*)\[( |x|X)\]\s+(.+)$/

  for (const rawLine of lines) {
    const trimmed = rawLine.trim()
    if (!trimmed) continue

    // 优先匹配带列表标记的格式
    const listMatch = rawLine.match(listItemRe)
    if (listMatch) {
      const indent = listMatch[1] || ''
      const checkboxState = listMatch[3]
      const text = (listMatch[4] || '').trim()

      if (text) {
        tasks.push({
          id: `${tasks.length}-${text.slice(0, 20)}`,
          text,
          checked: checkboxState?.toLowerCase() === 'x',
          level: getIndentLevel(indent),
        })
      }
      continue
    }

    // 匹配裸复选框格式
    const bareMatch = rawLine.match(bareCheckboxRe)
    if (bareMatch) {
      const indent = bareMatch[1] || ''
      const checkboxState = bareMatch[2]
      const text = (bareMatch[3] || '').trim()

      if (text) {
        tasks.push({
          id: `${tasks.length}-${text.slice(0, 20)}`,
          text,
          checked: checkboxState?.toLowerCase() === 'x',
          level: getIndentLevel(indent),
        })
      }
      continue
    }

    // 非列表格式：如果有内容，作为普通任务（未完成）
    // 这样可以兼容用户直接写的普通文本计划
    if (trimmed && !trimmed.startsWith('#')) {
      tasks.push({
        id: `${tasks.length}-${trimmed.slice(0, 20)}`,
        text: trimmed,
        checked: false,
        level: 0,
      })
    }
  }

  return tasks
}

/**
 * 解析并美化项目介绍内容
 * 识别标题行（emoji 开头）和列表项，渲染成卡片样式
 */
function DescriptionRenderer({ content }) {
  const sections = useMemo(() => {
    if (!content?.trim()) return []

    const lines = content.replace(/\r\n?/g, '\n').split('\n')
    const result = []
    let currentSection = null

    // 检测是否是标题行（emoji + 文字，没有详细描述）
    const isSectionTitle = (line) => {
      const trimmed = line.trim()
      // emoji 开头，后面跟着简短文字，没有 " - " 分隔符
      const emojiMatch = trimmed.match(/^([\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|✨|🔍|📊|💰|⚙️|📦|🎨|📈|🚀|💡|🔧|🛠️|📱|💻|🌐|🔒|⚡|🎯|📝|✅|❌|⭐|🏆|🎉|💪|👍|❤️|🔥)\s*(.+)$/u)
      if (!emojiMatch) return false
      // 如果包含 " - " 则是列表项，不是标题
      return !trimmed.includes(' - ')
    }

    // 解析列表项（emoji + 标题 - 描述）
    const parseListItem = (line) => {
      const trimmed = line.trim()
      // 匹配 emoji + 文字 - 描述 格式
      const match = trimmed.match(/^([\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|✨|🔍|📊|💰|⚙️|📦|🎨|📈|🚀|💡|🔧|🛠️|📱|💻|🌐|🔒|⚡|🎯|📝|✅|❌|⭐|🏆|🎉|💪|👍|❤️|🔥)\s*([^-–]+)\s*[-–]\s*(.+)$/u)
      if (match) {
        return { emoji: match[1], title: match[2].trim(), desc: match[3].trim() }
      }
      // 匹配纯 emoji + 文字格式
      const simpleMatch = trimmed.match(/^([\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|✨|🔍|📊|💰|⚙️|📦|🎨|📈|🚀|💡|🔧|🛠️|📱|💻|🌐|🔒|⚡|🎯|📝|✅|❌|⭐|🏆|🎉|💪|👍|❤️|🔥)\s*(.+)$/u)
      if (simpleMatch) {
        return { emoji: simpleMatch[1], title: simpleMatch[2].trim(), desc: '' }
      }
      return null
    }

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue

      if (isSectionTitle(trimmed)) {
        // 新的分区标题
        if (currentSection) {
          result.push(currentSection)
        }
        const parsed = parseListItem(trimmed)
        currentSection = {
          title: parsed ? `${parsed.emoji} ${parsed.title}` : trimmed,
          items: []
        }
      } else {
        const item = parseListItem(trimmed)
        if (item) {
          if (!currentSection) {
            currentSection = { title: '', items: [] }
          }
          currentSection.items.push(item)
        } else if (trimmed) {
          // 普通文本行
          if (!currentSection) {
            currentSection = { title: '', items: [] }
          }
          currentSection.items.push({ emoji: '', title: trimmed, desc: '' })
        }
      }
    }

    if (currentSection) {
      result.push(currentSection)
    }

    return result
  }, [content])

  if (!content?.trim()) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
        <FileText className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-sm">暂无项目介绍</p>
      </div>
    )
  }

  // 如果解析出来的内容太少，使用原始显示
  if (sections.length === 0 || (sections.length === 1 && sections[0].items.length === 0)) {
    return (
      <div className="prose prose-zinc dark:prose-invert max-w-none">
        <div className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          {content}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {sections.map((section, sIdx) => (
        <div key={sIdx} className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          {section.title && (
            <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800">
              <h4 className="font-semibold text-zinc-900 dark:text-white">
                {section.title}
              </h4>
            </div>
          )}
          {section.items.length > 0 && (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {section.items.map((item, iIdx) => (
                <div key={iIdx} className="px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                  <div className="flex items-start gap-3">
                    {item.emoji && (
                      <span className="text-lg flex-shrink-0 mt-0.5">{item.emoji}</span>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-zinc-900 dark:text-white">
                        {item.title}
                      </div>
                      {item.desc && (
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                          {item.desc}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

/**
 * 实现计划 Todo List 组件 - 滴答清单风格
 */
function PlanTodoList({ plan }) {
  // 解析任务并计算统计数据
  const { tasks, total, done, percent } = useMemo(() => {
    const parsedTasks = parsePlanToTasks(plan)
    const taskTotal = parsedTasks.length
    const taskDone = parsedTasks.filter((t) => t.checked).length
    const taskPercent = taskTotal ? Math.round((taskDone / taskTotal) * 100) : 0
    return { tasks: parsedTasks, total: taskTotal, done: taskDone, percent: taskPercent }
  }, [plan])

  if (!plan?.trim()) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
        <Target className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-sm">暂无实现计划</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 进度卡片 */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        {/* 进度头部 */}
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Target className="w-4 h-4 text-primary" />
              </div>
              <span className="font-semibold text-zinc-900 dark:text-white">
                实现计划
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-zinc-500">
                {done} / {total} 已完成
              </span>
              <Badge
                variant="secondary"
                className={cn(
                  "font-mono",
                  percent === 100
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                )}
              >
                {percent}%
              </Badge>
            </div>
          </div>

          {/* 进度条 */}
          <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500 ease-out",
                percent === 100
                  ? "bg-green-500"
                  : "bg-gradient-to-r from-primary to-primary/80"
              )}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        {/* 任务列表 */}
        <div className="p-2">
          <div className="space-y-0.5">
            {tasks.map((task) => (
              <div
                key={task.id}
                className={cn(
                  "group flex items-start gap-3 px-3 py-2.5 rounded-xl transition-colors",
                  "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                )}
                style={{ paddingLeft: `${12 + task.level * 20}px` }}
              >
                {/* 勾选圆圈 */}
                <div className="flex-shrink-0 mt-0.5">
                  {task.checked ? (
                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-zinc-300 dark:border-zinc-600 group-hover:border-primary/50 transition-colors" />
                  )}
                </div>

                {/* 任务文本 */}
                <span
                  className={cn(
                    "flex-1 text-sm leading-relaxed",
                    task.checked
                      ? "text-zinc-400 dark:text-zinc-500 line-through decoration-zinc-300 dark:decoration-zinc-600"
                      : "text-zinc-700 dark:text-zinc-200"
                  )}
                >
                  {task.text}
                </span>

                {/* 完成标记 */}
                {task.checked && (
                  <CheckCircle2 className="w-4 h-4 text-primary/60 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * 打气类型配置
 * points: 给选手加的分数
 * 消耗：每种道具都消耗1个
 */
const CHEER_TYPES = [
  { type: 'cheer', icon: Heart, label: '打气', color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-950/30', points: 1 },
  { type: 'coffee', icon: Coffee, label: '咖啡', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30', points: 2 },
  { type: 'energy', icon: Zap, label: '能量', color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-950/30', points: 3 },
  { type: 'pizza', icon: Pizza, label: '披萨', color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-950/30', points: 4 },
  { type: 'star', icon: Star, label: '星星', color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-950/30', points: 5 },
]

/**
 * 选手详情弹窗
 */
export default function ParticipantDetailModal({ participant, open, onClose }) {
  const [githubStats, setGithubStats] = useState(null)
  const [cheerData, setCheerData] = useState(null)
  const [quotaData, setQuotaData] = useState(null)
  const [quotaLogs, setQuotaLogs] = useState([])
  const [userItems, setUserItems] = useState({}) // 用户道具余额
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [quotaLoading, setQuotaLoading] = useState(false)
  const [cheeringType, setCheeringType] = useState(null)
  const [activeTab, setActiveTab] = useState('intro')
  const [cheerMessage, setCheerMessage] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)

  // 防止重复同步
  const syncingRef = useRef(false)
  const lastSyncedId = useRef(null)

  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.token)
  const isLoggedIn = !!token
  const toast = useToast()
  const navigate = useNavigate()

  // 获取用户道具余额
  const fetchUserItems = useCallback(async () => {
    if (!isLoggedIn) return
    try {
      const items = await lotteryApi.getItems()
      // 转换为 { type: quantity } 格式
      const itemMap = {}
      items.forEach(item => {
        itemMap[item.item_type] = item.quantity
      })
      setUserItems(itemMap)
    } catch (err) {
      console.error('获取道具余额失败', err)
    }
  }, [isLoggedIn])

  // 加载详情数据
  useEffect(() => {
    if (!open || !participant) return

    // 重置状态
    setActiveTab('intro')
    setGithubStats(null)
    setCheerData(null)
    setQuotaData(null)
    setQuotaLogs([])
    setCheerMessage('')  // 清空留言输入框
    lastSyncedId.current = null

    const fetchDetails = async () => {
      setLoading(true)
      try {
        // 计算最近2个月的日期范围
        const endDate = new Date()
        const startDate = new Date()
        startDate.setMonth(startDate.getMonth() - 2)
        const formatDate = (d) => d.toISOString().split('T')[0]

        const [statsRes, cheerRes] = await Promise.all([
          api.get(`/registrations/${participant.id}/github-stats`, {
            params: { start_date: formatDate(startDate), end_date: formatDate(endDate) }
          }).catch(() => null),
          api.get(`/registrations/${participant.id}/cheers`).catch(() => ({ stats: { total: 0 }, user_cheered_today: {}, recent_messages: [] })),
        ])
        setGithubStats(statsRes)
        setCheerData(cheerRes)
      } catch (err) {
        console.error('加载详情失败', err)
      } finally {
        setLoading(false)
      }
    }

    fetchDetails()
    fetchUserItems() // 获取用户道具余额
  }, [open, participant, fetchUserItems])

  // 切换到 GitHub Tab 时，如果没有数据则自动同步
  useEffect(() => {
    if (activeTab !== 'github' || !participant?.repo_url) return

    // 检查是否有有效数据（有提交记录）
    const hasData = githubStats?.summary?.total_commits > 0
    if (hasData) return

    // 防止重复同步：同一个选手只同步一次
    if (syncingRef.current || lastSyncedId.current === participant.id) return

    // 自动同步60天数据
    const syncData = async () => {
      syncingRef.current = true
      setSyncing(true)
      try {
        // 使用更长的超时时间（60秒），同步60天数据
        await api.post(`/registrations/${participant.id}/github-sync?days=60`, null, {
          timeout: 60000,
        })
        // 重新获取最近2个月的数据
        const endDate = new Date()
        const startDate = new Date()
        startDate.setMonth(startDate.getMonth() - 2)
        const formatDate = (d) => d.toISOString().split('T')[0]

        const statsRes = await api.get(`/registrations/${participant.id}/github-stats`, {
          params: { start_date: formatDate(startDate), end_date: formatDate(endDate) }
        })
        setGithubStats(statsRes)
        lastSyncedId.current = participant.id
      } catch (err) {
        console.error('同步GitHub数据失败', err)
        // 标记已尝试过，避免无限重试
        lastSyncedId.current = participant.id
      } finally {
        syncingRef.current = false
        setSyncing(false)
      }
    }

    syncData()
  }, [activeTab, participant?.id, participant?.repo_url, githubStats?.summary?.total_commits])

  // 切换到 API余额 Tab 时加载数据
  useEffect(() => {
    if (activeTab !== 'quota' || !participant?.id) return
    if (quotaData !== null) return // 已加载过

    const fetchQuotaData = async () => {
      setQuotaLoading(true)
      try {
        // 获取额度信息
        const res = await api.get(`/registrations/${participant.id}/quota`)
        setQuotaData(res)

        // 如果有 api_key，尝试获取调用日志
        if (res?.status === 'ok') {
          try {
            const logsRes = await api.get(`/registrations/${participant.id}/quota-logs`)
            setQuotaLogs(logsRes?.logs || [])
          } catch {
            // 日志获取失败不影响主流程
            setQuotaLogs([])
          }
        }
      } catch (err) {
        console.error('加载额度数据失败', err)
        setQuotaData({ status: 'error', message: '加载失败' })
      } finally {
        setQuotaLoading(false)
      }
    }

    fetchQuotaData()
  }, [activeTab, participant?.id, quotaData])

  // 打气
  const handleCheer = useCallback(async (cheerType, message = null) => {
    if (!isLoggedIn) {
      toast.warning('请先登录后再打气', {
        action: {
          label: '去登录',
          onClick: () => {
            onClose()
            navigate('/login')
          },
        },
      })
      return
    }

    setCheeringType(cheerType)
    try {
      await api.post(`/registrations/${participant.id}/cheer`, {
        cheer_type: cheerType,
        message: message || null,
      })

      // 刷新打气数据和道具余额
      const cheerRes = await api.get(`/registrations/${participant.id}/cheers`)
      setCheerData(cheerRes)
      fetchUserItems() // 刷新道具余额
      toast.success('打气成功！')
    } catch (err) {
      const detail = err?.response?.data?.detail || '打气失败'
      // 如果是道具不足，提示去做任务
      if (detail.includes('不足') || detail.includes('余额')) {
        toast.warning(detail, {
          action: {
            label: '去做任务赚道具',
            onClick: () => {
              onClose()
              navigate('/tasks')
            },
          },
        })
      } else {
        toast.error(detail)
      }
    } finally {
      setCheeringType(null)
    }
  }, [isLoggedIn, participant, toast, fetchUserItems, navigate, onClose])

  // 发送打气留言（消耗1个打气道具）
  const handleSendCheerMessage = useCallback(async () => {
    if (!isLoggedIn) {
      toast.warning('请先登录后再留言', {
        action: {
          label: '去登录',
          onClick: () => {
            onClose()
            navigate('/login')
          },
        },
      })
      return
    }

    if (!cheerMessage.trim()) {
      toast.warning('请输入留言内容')
      return
    }

    // 检查道具余额
    const cheerBalance = userItems['cheer'] || 0
    if (cheerBalance < 1) {
      toast.warning('打气道具不足，需要1个打气', {
        action: {
          label: '去做任务赚道具',
          onClick: () => {
            onClose()
            navigate('/tasks')
          },
        },
      })
      return
    }

    setSendingMessage(true)
    try {
      await api.post(`/registrations/${participant.id}/cheer`, {
        cheer_type: 'cheer',
        message: cheerMessage.trim(),
      })

      // 刷新打气数据和道具余额
      const cheerRes = await api.get(`/registrations/${participant.id}/cheers`)
      setCheerData(cheerRes)
      setCheerMessage('')
      fetchUserItems() // 刷新道具余额
      toast.success('留言发送成功')
    } catch (err) {
      const detail = err?.response?.data?.detail || '留言失败'
      if (detail.includes('不足') || detail.includes('余额')) {
        toast.warning(detail, {
          action: {
            label: '去做任务赚道具',
            onClick: () => {
              onClose()
              navigate('/tasks')
            },
          },
        })
      } else {
        toast.error(detail)
      }
    } finally {
      setSendingMessage(false)
    }
  }, [isLoggedIn, participant, cheerMessage, toast, userItems, fetchUserItems, navigate, onClose])

  if (!participant) return null

  const hasGithub = !!participant.repo_url

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] p-0 gap-0 overflow-hidden bg-zinc-50 dark:bg-zinc-950 flex flex-col" aria-describedby={undefined}>
        {/* 无障碍访问：隐藏的标题 */}
        <VisuallyHidden.Root asChild>
          <h2>{participant?.title || '选手详情'}</h2>
        </VisuallyHidden.Root>

        {/* 头部 */}
        <div className="relative bg-zinc-900 text-white p-6 pb-20">
          <div className="flex items-start gap-4">
            <img
              src={participant.user?.avatar_url || `https://ui-avatars.com/api/?name=${participant.user?.username || 'U'}&background=random`}
              alt={participant.user?.display_name}
              className="w-16 h-16 rounded-xl object-cover ring-2 ring-white/20"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-bold truncate">
                  {participant.user?.display_name || participant.user?.username}
                </h2>
                {participant.user?.trust_level !== undefined && (
                  <Badge variant="secondary" className="font-mono bg-white/10 border-white/20 text-white">
                    TL{participant.user.trust_level}
                  </Badge>
                )}
              </div>
              <p className="text-zinc-400 text-sm">@{participant.user?.username}</p>
            </div>

            {/* 打气统计 */}
            <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
              <Heart className="w-5 h-5 text-red-400" />
              <span className="font-bold text-lg">{cheerData?.stats?.total || 0}</span>
            </div>
          </div>
        </div>

        {/* 项目标题卡片 */}
        <div className="px-6 -mt-12 relative z-10">
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-lg">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">
              <Code2 className="w-3.5 h-3.5" />
              Project
            </div>
            <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
              {participant.title}
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400">
              {participant.summary}
            </p>

            {/* GitHub 链接 */}
            {hasGithub && (
              <a
                href={participant.repo_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 mt-3 text-sm text-primary hover:underline"
              >
                <Github className="w-4 h-4" />
                {participant.repo_url.replace('https://github.com/', '')}
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>

        {/* Tab 切换 */}
        <div className="px-6 pt-4">
          <div className="flex gap-1 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
            {[
              { id: 'intro', label: '项目介绍', icon: FileText },
              { id: 'plan', label: '实现计划', icon: Target },
              { id: 'github', label: 'GitHub', icon: Github },
              { id: 'cheer', label: '打气墙', icon: MessageCircle },
              { id: 'quota', label: 'API余额', icon: Wallet },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all",
                  activeTab === id
                    ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm"
                    : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* 项目介绍 */}
              {activeTab === 'intro' && (
                <div className="space-y-6">
                  <DescriptionRenderer content={participant.description} />

                  {/* 技术栈 */}
                  <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                    <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800">
                      <h4 className="font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                        <Code2 className="w-4 h-4 text-primary" />
                        技术栈
                      </h4>
                    </div>
                    <div className="p-4">
                      <div className="flex flex-wrap gap-2">
                        {(participant.tech_stack?.content || '')
                          .split(/[,，、\n]/)
                          .filter(t => t.trim())
                          .map((tech, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                            >
                              {tech.trim()}
                            </span>
                          ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 实现计划 - 滴答清单风格 */}
              {activeTab === 'plan' && (
                <PlanTodoList plan={participant.plan} />
              )}

              {/* GitHub 统计 */}
              {activeTab === 'github' && (
                <div className="space-y-6">
                  {!hasGithub ? (
                    <div className="text-center py-12 text-zinc-500">
                      <Github className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>该选手未设置 GitHub 仓库</p>
                    </div>
                  ) : syncing ? (
                    <div className="text-center py-12">
                      <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
                      <p className="text-zinc-600 dark:text-zinc-400 font-medium">正在从 GitHub 获取数据...</p>
                      <p className="text-xs text-zinc-400 mt-1">首次加载需要几秒钟</p>
                    </div>
                  ) : (
                    <>
                      {/* 统计概览 */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 text-center">
                          <div className="text-2xl font-bold text-zinc-900 dark:text-white">
                            {githubStats?.summary?.total_commits || 0}
                          </div>
                          <div className="text-xs text-zinc-500 mt-1">总提交数</div>
                        </div>
                        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 text-center">
                          <div className="text-2xl font-bold text-green-600">
                            +{githubStats?.summary?.total_additions || 0}
                          </div>
                          <div className="text-xs text-zinc-500 mt-1">新增行数</div>
                        </div>
                        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 text-center">
                          <div className="text-2xl font-bold text-red-500">
                            -{githubStats?.summary?.total_deletions || 0}
                          </div>
                          <div className="text-xs text-zinc-500 mt-1">删除行数</div>
                        </div>
                        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 text-center">
                          <div className="text-2xl font-bold text-primary">
                            {githubStats?.summary?.days_active || 0}
                          </div>
                          <div className="text-xs text-zinc-500 mt-1">活跃天数</div>
                        </div>
                      </div>

                      {/* 每日提交记录 */}
                      <div>
                        <h4 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                          <Activity className="w-4 h-4" />
                          提交记录详情
                        </h4>
                        <div className="space-y-4">
                          {(githubStats?.daily_stats || []).filter(day => day.commits_count > 0).map((day) => (
                            <div
                              key={day.date}
                              className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden"
                            >
                              {/* 日期头部 */}
                              <div className="flex items-center justify-between px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-700">
                                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                                  <Calendar className="w-4 h-4" />
                                  {day.date}
                                </div>
                                <div className="flex items-center gap-4 text-xs font-medium">
                                  <span className="flex items-center gap-1 text-zinc-600 dark:text-zinc-400">
                                    <GitCommit className="w-3.5 h-3.5" />
                                    {day.commits_count} 次提交
                                  </span>
                                  <span className="text-green-600 font-mono">+{day.additions}</span>
                                  <span className="text-red-500 font-mono">-{day.deletions}</span>
                                </div>
                              </div>

                              {/* 提交列表 */}
                              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                {(day.commits_detail || []).map((commit, idx) => (
                                  <div
                                    key={idx}
                                    className="px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
                                  >
                                    <div className="flex items-start gap-3">
                                      {/* 提交图标 */}
                                      <div className="mt-0.5 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                        <GitCommit className="w-3.5 h-3.5 text-primary" />
                                      </div>

                                      <div className="flex-1 min-w-0">
                                        {/* 提交信息 */}
                                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 leading-relaxed">
                                          {commit.message}
                                        </p>

                                        {/* 元信息 */}
                                        <div className="flex items-center gap-4 mt-2 text-xs">
                                          <code className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-primary font-mono">
                                            {commit.sha}
                                          </code>
                                          <span className="text-zinc-400 flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {new Date(commit.timestamp).toLocaleString('zh-CN', {
                                              month: '2-digit',
                                              day: '2-digit',
                                              hour: '2-digit',
                                              minute: '2-digit'
                                            })}
                                          </span>
                                          <span className="text-green-600 font-mono">+{commit.additions}</span>
                                          <span className="text-red-500 font-mono">-{commit.deletions}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}

                          {(!githubStats?.daily_stats || githubStats.daily_stats.filter(d => d.commits_count > 0).length === 0) && (
                            <div className="text-center py-12 text-zinc-500">
                              <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-30" />
                              <p className="text-sm">暂无提交记录</p>
                              <p className="text-xs text-zinc-400 mt-1">选手还没有开始提交代码</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* 打气墙 */}
              {activeTab === 'cheer' && (
                <div className="space-y-6">
                  {/* 打气按钮 */}
                  <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
                    <h4 className="text-sm font-semibold text-zinc-900 dark:text-white mb-3">
                      为 TA 加油打气！
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {CHEER_TYPES.map(({ type, icon: Icon, label, color, bg, points }) => {
                        const balance = userItems[type] || 0
                        const canAfford = balance >= 1 // 每种道具都只消耗1个
                        const isSelf = participant.user?.id === user?.id
                        return (
                          <Button
                            key={type}
                            variant="outline"
                            size="sm"
                            disabled={cheeringType || !canAfford || isSelf || !isLoggedIn}
                            onClick={() => handleCheer(type)}
                            className={cn(
                              "h-10 px-4 rounded-xl transition-all gap-2",
                              canAfford && !isSelf && "hover:border-primary/50"
                            )}
                            title={`消耗1个${label}，+${points}分`}
                          >
                            <Icon className={cn("w-4 h-4", canAfford ? color : "text-zinc-300")} />
                            <span>{label}</span>
                            <span className={cn("text-xs", canAfford ? "text-zinc-500" : "text-zinc-300")}>
                              ({balance})
                            </span>
                          </Button>
                        )
                      })}
                    </div>
                    {participant.user?.id === user?.id && (
                      <p className="text-xs text-zinc-400 mt-2">不能给自己打气哦~</p>
                    )}
                  </div>

                  {/* 评论输入框 */}
                  {isLoggedIn && participant.user?.id !== user?.id && (
                    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
                      <h4 className="text-sm font-semibold text-zinc-900 dark:text-white mb-3">
                        留言加油
                      </h4>
                      <div className="flex gap-3">
                        <img
                          src={user?.avatar_url || `https://ui-avatars.com/api/?name=${user?.username || 'U'}&background=random`}
                          alt={user?.display_name}
                          className="w-10 h-10 rounded-lg flex-shrink-0"
                        />
                        <div className="flex-1">
                          <textarea
                            value={cheerMessage}
                            onChange={(e) => setCheerMessage(e.target.value)}
                            placeholder="写下你的加油留言..."
                            maxLength={200}
                            rows={3}
                            className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                          />
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-zinc-400">
                              {cheerMessage.length}/200
                            </span>
                            <Button
                              size="sm"
                              disabled={sendingMessage || !cheerMessage.trim()}
                              onClick={handleSendCheerMessage}
                              className="gap-1.5"
                            >
                              {sendingMessage ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                  发送中...
                                </>
                              ) : (
                                <>
                                  <Heart className="w-4 h-4" />
                                  发送加油
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 未登录提示 */}
                  {!isLoggedIn && (
                    <div className="bg-zinc-100 dark:bg-zinc-800/50 rounded-xl p-4 text-center">
                      <p className="text-sm text-zinc-500">
                        登录后可以给选手留言加油哦~
                      </p>
                    </div>
                  )}

                  {/* 留言列表 */}
                  <div>
                    <h4 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <MessageCircle className="w-4 h-4" />
                      最近打气留言
                    </h4>
                    <div className="space-y-3">
                      {(cheerData?.recent_messages || []).map((msg) => {
                        const cheerType = CHEER_TYPES.find(c => c.type === msg.cheer_type)
                        const CheerIcon = cheerType?.icon || Heart
                        return (
                          <div
                            key={msg.id}
                            className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4"
                          >
                            <div className="flex items-start gap-3">
                              <img
                                src={msg.user?.avatar_url || `https://ui-avatars.com/api/?name=${msg.user?.username || 'U'}&background=random`}
                                alt={msg.user?.display_name}
                                className="w-8 h-8 rounded-lg"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-sm text-zinc-900 dark:text-white">
                                    {msg.user?.display_name || msg.user?.username}
                                  </span>
                                  <CheerIcon className={cn("w-4 h-4", cheerType?.color)} />
                                  <span className="text-xs text-zinc-400">
                                    {new Date(msg.created_at).toLocaleString('zh-CN')}
                                  </span>
                                </div>
                                {msg.message && (
                                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                    {msg.message}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}

                      {(!cheerData?.recent_messages || cheerData.recent_messages.length === 0) && (
                        <div className="text-center py-8 text-zinc-500">
                          <Heart className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          <p className="text-sm">还没有打气留言，快来第一个吧！</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* API余额 */}
              {activeTab === 'quota' && (
                <div className="space-y-6">
                  {quotaLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                    </div>
                  ) : quotaData?.status === 'no_api_key' ? (
                    <div className="text-center py-12 text-zinc-500">
                      <Wallet className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p className="font-medium">该选手未设置 API Key</p>
                      <p className="text-sm text-zinc-400 mt-1">无法查看额度消耗信息</p>
                    </div>
                  ) : quotaData?.status === 'error' ? (
                    <div className="text-center py-12 text-zinc-500">
                      <Wallet className="w-12 h-12 mx-auto mb-3 opacity-30 text-red-400" />
                      <p className="font-medium text-red-500">额度查询失败</p>
                      <p className="text-sm text-zinc-400 mt-1">{quotaData?.message || '请稍后重试'}</p>
                    </div>
                  ) : (
                    <>
                      {/* 额度概览卡片 */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* 总消耗 */}
                        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
                          <div className="flex items-center gap-2 text-zinc-500 text-sm mb-2">
                            <Flame className="w-4 h-4 text-orange-500" />
                            总消耗
                          </div>
                          <div className="text-2xl font-bold text-zinc-900 dark:text-white">
                            ${quotaData?.quota?.used?.toFixed(2) || '0.00'}
                          </div>
                        </div>

                        {/* 今日消耗 */}
                        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
                          <div className="flex items-center gap-2 text-zinc-500 text-sm mb-2">
                            <TrendingUp className="w-4 h-4 text-blue-500" />
                            今日消耗
                          </div>
                          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            ${quotaData?.quota?.today_used?.toFixed(2) || '0.00'}
                          </div>
                        </div>

                        {/* 剩余额度 */}
                        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
                          <div className="flex items-center gap-2 text-zinc-500 text-sm mb-2">
                            <Wallet className="w-4 h-4 text-green-500" />
                            剩余额度
                          </div>
                          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                            {quotaData?.quota?.is_unlimited ? '无限' : `$${quotaData?.quota?.remaining?.toFixed(2) || '0.00'}`}
                          </div>
                        </div>
                      </div>

                      {/* 费用详情/调用日志 */}
                      <div>
                        <h4 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                          <Receipt className="w-4 h-4" />
                          最近调用记录
                        </h4>
                        {quotaLogs.length === 0 ? (
                          <div className="text-center py-8 text-zinc-500 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
                            <Receipt className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            <p className="text-sm">暂无调用记录</p>
                          </div>
                        ) : (
                          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                            {/* 表头 */}
                            <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-500">
                              <div className="col-span-3">时间</div>
                              <div className="col-span-3">模型</div>
                              <div className="col-span-1 text-center">用时</div>
                              <div className="col-span-2 text-right">提示</div>
                              <div className="col-span-1 text-right">补全</div>
                              <div className="col-span-2 text-right">花费</div>
                            </div>
                            {/* 数据行 - 按时间倒序（最新的在前） */}
                            <div className="divide-y divide-zinc-100 dark:divide-zinc-800 max-h-[400px] overflow-y-auto">
                              {[...quotaLogs].sort((a, b) => b.created_at - a.created_at).slice(0, 50).map((log, idx) => (
                                <div key={idx} className="grid grid-cols-12 gap-2 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors text-sm items-center">
                                  <div className="col-span-3 text-zinc-500 text-xs">
                                    {new Date(log.created_at * 1000).toLocaleString('zh-CN', {
                                      month: '2-digit',
                                      day: '2-digit',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      second: '2-digit'
                                    })}
                                  </div>
                                  <div className="col-span-3 font-medium text-zinc-900 dark:text-white truncate" title={log.model_name}>
                                    {log.model_name || log.model || '未知'}
                                  </div>
                                  <div className="col-span-1 text-center">
                                    <span className="inline-flex px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs">
                                      {log.use_time || 0}s
                                    </span>
                                  </div>
                                  <div className="col-span-2 text-right text-zinc-600 dark:text-zinc-400 tabular-nums">
                                    {log.prompt_tokens?.toLocaleString() || 0}
                                  </div>
                                  <div className="col-span-1 text-right text-zinc-600 dark:text-zinc-400 tabular-nums">
                                    {log.completion_tokens?.toLocaleString() || 0}
                                  </div>
                                  <div className="col-span-2 text-right font-semibold text-orange-500 tabular-nums">
                                    ${(log.quota / 500000).toFixed(6)}
                                  </div>
                                </div>
                              ))}
                            </div>
                            {/* 统计 */}
                            <div className="px-4 py-2 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-200 dark:border-zinc-700 text-xs text-zinc-500 flex justify-between">
                              <span>显示最近 {Math.min(quotaLogs.length, 50)} 条</span>
                              <span>今日消耗: <span className="font-semibold text-orange-500">${quotaData?.quota?.today_used?.toFixed(2) || '0.00'}</span></span>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* 底部 */}
        <div className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <Calendar className="w-4 h-4" />
            报名于 {new Date(participant.submitted_at || participant.created_at).toLocaleDateString('zh-CN')}
          </div>
          <Button variant="outline" onClick={onClose}>
            关闭
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
