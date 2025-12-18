import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Users, Code2, Calendar, Sparkles, Trophy, Search, Github, GitCommit, Plus, Minus, Heart, Coffee, Zap, Pizza, Star, ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import api from '../services/api'
import { useAuthStore } from '@/stores/authStore'
import { useToast } from '@/components/Toast'
import { cn } from '@/lib/utils'
import ParticipantDetailModal from '@/components/participant/ParticipantDetailModal'

/**
 * 打气类型配置
 */
const CHEER_TYPES = [
  { type: 'cheer', icon: Heart, label: '打气', color: 'text-red-500' },
  { type: 'coffee', icon: Coffee, label: '咖啡', color: 'text-amber-600' },
  { type: 'energy', icon: Zap, label: '能量', color: 'text-yellow-500' },
  { type: 'pizza', icon: Pizza, label: '披萨', color: 'text-orange-500' },
  { type: 'star', icon: Star, label: '星星', color: 'text-purple-500' },
]

/**
 * 参赛选手页面
 */
export default function ParticipantsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [participants, setParticipants] = useState([])
  const [filteredParticipants, setFilteredParticipants] = useState([])
  const [githubStats, setGithubStats] = useState({})
  const [cheerStats, setCheerStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [cheeringId, setCheeringId] = useState(null)
  const [selectedParticipant, setSelectedParticipant] = useState(null)

  const user = useAuthStore((s) => s.user)
  const isLoggedIn = useAuthStore((s) => !!s.token)
  const navigate = useNavigate()
  const toast = useToast()

  // 获取选手列表
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

        // 并行获取选手列表和 GitHub 统计
        const [participantsRes, githubRes] = await Promise.all([
          api.get('/contests/1/registrations/public'),
          api.get('/contests/1/github-stats').catch(() => ({ items: [] })),
        ])

        const items = participantsRes.items || []

        // 排序：有头像的优先，然后按时间倒序
        items.sort((a, b) => {
          const aHasAvatar = a.user?.avatar_url ? 1 : 0
          const bHasAvatar = b.user?.avatar_url ? 1 : 0
          if (aHasAvatar !== bHasAvatar) return bHasAvatar - aHasAvatar
          return new Date(b.created_at) - new Date(a.created_at)
        })

        setParticipants(items)
        setFilteredParticipants(items)

        // 处理 GitHub 统计数据
        const statsMap = {}
        for (const stat of githubRes.items || []) {
          statsMap[stat.registration_id] = stat
        }
        setGithubStats(statsMap)

        // 获取每个选手的打气统计
        const cheerMap = {}
        for (const p of items) {
          try {
            const cheerRes = await api.get(`/registrations/${p.id}/cheers`)
            cheerMap[p.id] = cheerRes
          } catch {
            cheerMap[p.id] = { stats: { total: 0 }, user_cheered_today: {} }
          }
        }
        setCheerStats(cheerMap)

      } catch (err) {
        setError(err?.response?.data?.detail || '加载失败')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // 搜索过滤
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredParticipants(participants)
      return
    }

    const query = searchQuery.toLowerCase()
    const filtered = participants.filter(p =>
      p.title?.toLowerCase().includes(query) ||
      p.user?.display_name?.toLowerCase().includes(query) ||
      p.user?.username?.toLowerCase().includes(query) ||
      p.tech_stack?.content?.toLowerCase().includes(query)
    )
    setFilteredParticipants(filtered)
  }, [searchQuery, participants])

  // 处理 URL 参数，自动打开对应选手的详情弹窗
  useEffect(() => {
    const highlightId = searchParams.get('highlight')
    if (highlightId && participants.length > 0) {
      const target = participants.find(p => String(p.id) === highlightId)
      if (target) {
        setSelectedParticipant(target)
        // 清除 URL 参数
        setSearchParams({}, { replace: true })
      }
    }
  }, [searchParams, participants, setSearchParams])

  // 打气
  const handleCheer = useCallback(async (registrationId, cheerType = 'cheer') => {
    if (!isLoggedIn) {
      toast.warning('请先登录后再打气', {
        action: {
          label: '去登录',
          onClick: () => navigate('/login'),
        },
      })
      return
    }

    setCheeringId(registrationId)
    try {
      await api.post(`/registrations/${registrationId}/cheer`, {
        cheer_type: cheerType,
      })

      // 刷新该选手的打气统计
      const cheerRes = await api.get(`/registrations/${registrationId}/cheers`)
      setCheerStats(prev => ({
        ...prev,
        [registrationId]: cheerRes,
      }))
      toast.success('打气成功！')
    } catch (err) {
      const detail = err?.response?.data?.detail || '打气失败'
      // 如果是道具不足，提示去做任务
      if (detail.includes('不足') || detail.includes('余额')) {
        toast.warning(detail, {
          action: {
            label: '去做任务赚道具',
            onClick: () => navigate('/tasks'),
          },
        })
      } else {
        toast.error(detail)
      }
    } finally {
      setCheeringId(null)
    }
  }, [isLoggedIn, navigate, toast])

  if (loading) {
    return (
      <div className="min-h-screen pt-32 pb-12 bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-zinc-500 font-medium animate-pulse">加载选手中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen pt-32 pb-12 bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
            <Trophy className="w-8 h-8 rotate-180" />
          </div>
          <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">无法加载数据</h3>
          <p className="text-zinc-500">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-24 pb-20 bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 页面头部 */}
        <div className="flex flex-col items-center text-center mb-16 space-y-6">
          <Badge variant="outline" className="px-4 py-1.5 rounded-full text-sm font-semibold border-primary/20 text-primary bg-primary/5">
            <Users className="w-4 h-4 mr-2" />
            开发者集结
          </Badge>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-zinc-900 dark:text-white">
            参赛选手一览
          </h1>

          <p className="max-w-2xl text-lg text-zinc-500 dark:text-zinc-400 font-medium">
            来自社区的 <span className="text-primary font-bold">{participants.length}</span> 位个人练习生已加入战场
            <br className="hidden sm:block" />
            谁能 C 位出道，问鼎"鸡王"？
          </p>

          {/* 搜索框 */}
          <div className="w-full max-w-md relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
            <Input
              placeholder="搜索选手、项目或技术栈..."
              className="pl-10 h-12 rounded-xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 focus:ring-primary/20 text-base"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* 选手列表 */}
        {filteredParticipants.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-zinc-50/50">
            <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-900 rounded-full flex items-center justify-center mb-6">
              <Search className="w-10 h-10 text-zinc-400" />
            </div>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">未找到匹配的选手</h3>
            <p className="text-zinc-500 dark:text-zinc-400">换个关键词试试？</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredParticipants.map((participant) => {
              const stats = githubStats[participant.id] || {}
              const cheer = cheerStats[participant.id] || { stats: { total: 0 }, user_cheered_today: {} }
              const hasGithub = !!participant.repo_url

              return (
                <div
                  key={participant.id}
                  onClick={() => setSelectedParticipant(participant)}
                  className="group relative bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col cursor-pointer"
                >
                  {/* 头部：用户与TL */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <img
                          src={participant.user?.avatar_url || `https://ui-avatars.com/api/?name=${participant.user?.username || 'U'}&background=random`}
                          alt={participant.user?.display_name}
                          className="w-14 h-14 rounded-xl object-cover ring-2 ring-zinc-100 dark:ring-zinc-800 group-hover:ring-primary/20 transition-all"
                        />
                        <div className="absolute -bottom-1 -right-1 bg-white dark:bg-zinc-900 rounded-full p-0.5">
                          <div className="w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-zinc-900" />
                        </div>
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-zinc-900 dark:text-white leading-tight group-hover:text-primary transition-colors">
                          {participant.user?.display_name || participant.user?.username}
                        </h3>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">
                          @{participant.user?.username}
                        </p>
                      </div>
                    </div>

                    {participant.user?.trust_level !== undefined && (
                      <Badge variant="secondary" className="font-mono font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-transparent">
                        TL{participant.user.trust_level}
                      </Badge>
                    )}
                  </div>

                  {/* 项目卡片主体 */}
                  <div className="flex-1 space-y-3">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                        <Code2 className="w-3.5 h-3.5" />
                        Project
                      </div>
                      <h4 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 line-clamp-1">
                        {participant.title}
                      </h4>
                    </div>

                    <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed min-h-[40px]">
                      {participant.summary}
                    </p>

                    {/* GitHub 统计 */}
                    {hasGithub && (
                      <div className="flex items-center gap-3 py-2 px-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50">
                        <Github className="w-4 h-4 text-zinc-500" />
                        <div className="flex items-center gap-4 text-xs font-medium">
                          <span className="flex items-center gap-1 text-zinc-600 dark:text-zinc-400">
                            <GitCommit className="w-3.5 h-3.5" />
                            {stats.commits_count || 0} 今日
                          </span>
                          <span className="flex items-center gap-1 text-green-600">
                            <Plus className="w-3 h-3" />
                            {stats.additions || 0}
                          </span>
                          <span className="flex items-center gap-1 text-red-500">
                            <Minus className="w-3 h-3" />
                            {stats.deletions || 0}
                          </span>
                        </div>
                        <a
                          href={participant.repo_url}
                          target="_blank"
                          rel="noreferrer"
                          className="ml-auto text-zinc-400 hover:text-primary"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    )}

                    {/* 技术栈 */}
                    {participant.tech_stack?.content && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {participant.tech_stack.content
                          .split(/[,，、\n]/)
                          .filter(t => t.trim())
                          .slice(0, 4)
                          .map((tech, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300"
                            >
                              {tech.trim()}
                            </span>
                          ))}
                        {participant.tech_stack.content.split(/[,，、\n]/).filter(t => t.trim()).length > 4 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-50 dark:bg-zinc-800/30 text-zinc-400">
                            +{participant.tech_stack.content.split(/[,，、\n]/).filter(t => t.trim()).length - 4}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 底部：打气区域 */}
                  <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between">
                      {/* 打气按钮组 */}
                      <div className="flex items-center gap-1">
                        {CHEER_TYPES.map(({ type, icon: Icon, label, color }) => {
                          const cheered = cheer.user_cheered_today?.[type]
                          return (
                            <Button
                              key={type}
                              variant="ghost"
                              size="sm"
                              disabled={cheeringId === participant.id || cheered || participant.user?.id === user?.id}
                              onClick={() => handleCheer(participant.id, type)}
                              className={cn(
                                "h-8 px-2 rounded-lg transition-all",
                                cheered && "bg-zinc-100 dark:bg-zinc-800"
                              )}
                              title={cheered ? `今日已送${label}` : `送${label}`}
                            >
                              <Icon className={cn("w-4 h-4", cheered ? color : "text-zinc-400")} />
                            </Button>
                          )
                        })}
                      </div>

                      {/* 打气总数 */}
                      <div className="flex items-center gap-1.5 text-sm font-bold text-zinc-500">
                        <Heart className="w-4 h-4 text-red-400" />
                        <span>{cheer.stats?.total || 0}</span>
                      </div>
                    </div>

                    {/* 日期 */}
                    <div className="flex items-center gap-1.5 mt-3 text-xs font-medium text-zinc-400">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(participant.submitted_at || participant.created_at).toLocaleDateString('zh-CN')}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 选手详情弹窗 */}
      <ParticipantDetailModal
        participant={selectedParticipant}
        open={!!selectedParticipant}
        onClose={() => setSelectedParticipant(null)}
      />
    </div>
  )
}
