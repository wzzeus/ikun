import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  Star,
  GitCommit,
  ExternalLink,
  Trophy,
  Flame,
  Crown,
  Medal,
  Zap,
  Github,
} from 'lucide-react'
import api from '../../services/api'

// 提取技术栈标签
const getTechTags = (techStack) => {
  if (!techStack) return []
  if (techStack.content) return []
  
  const tags = []
  const categories = ['frontend', 'backend', 'mobile', 'database', 'ai']
  categories.forEach(cat => {
    if (Array.isArray(techStack[cat])) tags.push(...techStack[cat])
  })
  if (Array.isArray(techStack.other)) tags.push(...techStack.other)
  return tags.slice(0, 3)
}

// 👑 震撼荣耀主题配置
const RANK_THEMES = {
  1: {
    // 黄金圣斗士风格 - 极致辉煌
    wrapper: 'p-[2px] bg-gradient-to-b from-yellow-200 via-yellow-500 to-yellow-800 rounded-3xl',
    cardBg: 'bg-gradient-to-br from-yellow-950 via-amber-950 to-black',
    glow: 'shadow-[0_0_100px_-20px_rgba(255,200,0,0.8)]', // 巨大的金色光晕
    border: 'border-yellow-400/50',
    textGradient: 'bg-gradient-to-r from-yellow-100 via-yellow-300 to-yellow-500',
    badge: 'bg-gradient-to-r from-yellow-400 to-amber-600 text-yellow-950 shadow-[0_0_20px_rgba(250,204,21,0.6)]',
    iconColor: 'text-yellow-400',
    watermark: 'text-yellow-500',
    watermarkOpacity: 'opacity-10',
    icon: Crown,
    label: 'CHAMPION',
    animation: 'animate-pulse-slow',
  },
  2: {
    // 极光白银风格 - 科技神圣
    wrapper: 'p-[2px] bg-gradient-to-b from-slate-200 via-slate-400 to-slate-700 rounded-3xl',
    cardBg: 'bg-gradient-to-br from-slate-900 via-slate-900 to-black',
    glow: 'shadow-[0_0_100px_-20px_rgba(200,220,255,0.6)]', // 巨大的银色光晕
    border: 'border-slate-300/50',
    textGradient: 'bg-gradient-to-r from-white via-slate-200 to-slate-400',
    badge: 'bg-gradient-to-r from-slate-300 to-slate-500 text-slate-900 shadow-[0_0_20px_rgba(148,163,184,0.6)]',
    iconColor: 'text-slate-200',
    watermark: 'text-slate-400',
    watermarkOpacity: 'opacity-10',
    icon: Medal,
    label: 'RUNNER UP',
    animation: 'animate-pulse-slow',
  },
  3: {
    // 熔岩黑铜风格 - 力量爆发
    wrapper: 'p-[2px] bg-gradient-to-b from-orange-300 via-orange-600 to-red-900 rounded-3xl',
    cardBg: 'bg-gradient-to-br from-orange-950 via-red-950 to-black',
    glow: 'shadow-[0_0_100px_-20px_rgba(249,115,22,0.6)]', // 巨大的铜色光晕
    border: 'border-orange-400/50',
    textGradient: 'bg-gradient-to-r from-orange-100 via-orange-400 to-orange-600',
    badge: 'bg-gradient-to-r from-orange-400 to-red-700 text-white shadow-[0_0_20px_rgba(234,88,12,0.6)]',
    iconColor: 'text-orange-400',
    watermark: 'text-orange-600',
    watermarkOpacity: 'opacity-10',
    icon: Trophy,
    label: 'THIRD PLACE',
    animation: 'animate-pulse-slow',
  },
  default: {
    // 凡人修仙风格 - 低调内敛
    wrapper: 'p-[1px] bg-slate-800 rounded-3xl',
    cardBg: 'bg-slate-900',
    glow: 'shadow-xl', // 普通阴影，无光晕
    border: 'border-slate-800',
    textGradient: 'text-white', // 纯白文本，无渐变
    badge: 'bg-slate-800 text-slate-400 border border-slate-700',
    iconColor: 'text-slate-500',
    watermark: 'text-slate-800',
    watermarkOpacity: 'opacity-30', // 更淡的水印
    icon: Star,
    label: 'TOP PROJECT',
    animation: '',
  }
}

function ProjectCard({ project, rank, isActive }) {
  const theme = RANK_THEMES[rank] || RANK_THEMES.default
  const RankIcon = theme.icon
  const techTags = useMemo(() => getTechTags(project.tech_stack), [project.tech_stack])

  return (
    <div
      className={`
        w-full transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]
        ${isActive ? `relative opacity-100 scale-105 z-20 ${theme.animation}` : 'absolute top-0 left-0 opacity-0 scale-90 translate-y-8 -z-10 pointer-events-none'}
      `}
    >
      {/* 🚀 极强光晕层 (独立于卡片，避免被裁切) */}
      <div className={`absolute inset-4 rounded-[3rem] ${theme.glow} transition-all duration-1000 ${isActive ? 'opacity-100' : 'opacity-0'}`} />

      {/* 卡片外框 (模拟金属边框) */}
      <div className={`relative ${theme.wrapper} shadow-2xl overflow-hidden`}>
        {/* 卡片内容主体 */}
        <div className={`relative h-full rounded-[22px] ${theme.cardBg} overflow-hidden`}>
          
          {/* ✨ 动态背景特效 */}
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20 bg-center" />
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-gradient-to-bl from-white/10 to-transparent rounded-full blur-3xl pointer-events-none mix-blend-overlay" />
          
          {/* 巨大的背景水印 */}
          <div className={`absolute -right-6 -bottom-14 text-[220px] font-black leading-none tracking-tighter select-none pointer-events-none ${theme.watermark} ${theme.watermarkOpacity} blur-sm`}>
            {String(rank).padStart(2, '0')}
          </div>
          
          {/* 流光扫过动画 */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite]" />

          <div className="relative p-8 md:p-10 flex flex-col md:flex-row gap-8 items-center">
            
            {/* 👈 左侧：荣耀头像 */}
            <div className="flex-shrink-0 relative group">
               {/* 徽章 */}
              <div className={`absolute -top-4 -left-2 z-20 flex items-center gap-1.5 px-4 py-1.5 rounded-full ${theme.badge} text-xs font-black uppercase tracking-wider transform -rotate-6 group-hover:rotate-0 transition-transform duration-300`}>
                <RankIcon className="w-3.5 h-3.5" />
                <span>{theme.label}</span>
              </div>

              {/* 头像光环 */}
              <div className="relative">
                <div className={`absolute -inset-3 rounded-full bg-gradient-to-br ${theme.textGradient} opacity-30 blur-md animate-spin-slow`} />
                <div className={`absolute -inset-1 rounded-full bg-gradient-to-br ${theme.textGradient} opacity-80 blur-sm`} />
                <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-full p-1 bg-black">
                  <img
                    src={project.user?.avatar_url || `https://ui-avatars.com/api/?name=${project.user?.username}&background=random`}
                    alt={project.user?.username}
                    className="w-full h-full rounded-full object-cover border-2 border-white/10"
                  />
                </div>
              </div>
              
              <div className="text-center mt-3 relative z-10">
                <span className="inline-block px-3 py-1 rounded-full bg-black/50 backdrop-blur border border-white/10 text-white font-bold text-sm shadow-lg">
                  {project.user?.display_name || project.user?.username}
                </span>
              </div>
            </div>

            {/* 📄 中间：项目信息 */}
            <div className="flex-1 min-w-0 text-center md:text-left z-10 flex flex-col justify-center">
              <Link to={`/participants?id=${project.id}`} className="block group/title">
                <h3 className={`text-3xl md:text-5xl font-black tracking-tight mb-4 text-transparent bg-clip-text ${theme.textGradient} drop-shadow-md leading-tight`}>
                  {project.title}
                </h3>
                <p className="text-slate-300/90 text-sm md:text-lg font-light leading-relaxed line-clamp-2 md:line-clamp-2 mb-4 group-hover/title:text-white transition-colors">
                  {project.summary}
                </p>
              </Link>

              {/* 技术栈 */}
              <div className="flex flex-wrap justify-center md:justify-start gap-2">
                {techTags.map((tag, i) => (
                  <span key={i} className="px-3 py-1 text-xs font-bold uppercase tracking-wide text-white/70 bg-white/5 border border-white/10 rounded-md backdrop-blur-sm">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* 👉 右侧：数据展示 */}
            <div className="flex-shrink-0 flex flex-row md:flex-col items-center justify-center gap-6 z-10 w-full md:w-auto border-t md:border-t-0 md:border-l border-white/10 pt-6 md:pt-0 md:pl-10">
              
              <div className="flex items-center gap-8 md:gap-0 md:flex-col md:space-y-6">
                <div className="text-center md:text-right group/stat">
                  <div className={`text-3xl font-black ${theme.iconColor} flex items-center justify-center md:justify-end gap-2 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]`}>
                    <Heart className="w-6 h-6 fill-current group-hover/stat:scale-125 transition-transform" />
                    {project.stats?.total || 0}
                  </div>
                  <div className="text-[10px] text-white/50 font-bold tracking-[0.2em] uppercase mt-1">Popularity</div>
                </div>
                
                {project.github_stats && (
                  <div className="text-center md:text-right group/stat">
                    <div className="text-2xl font-bold text-white/90 flex items-center justify-center md:justify-end gap-2">
                      <Star className="w-5 h-5 group-hover/stat:rotate-180 transition-transform duration-500" />
                      {project.github_stats.stars || 0}
                    </div>
                    <div className="text-[10px] text-white/50 font-bold tracking-[0.2em] uppercase mt-1">Stars</div>
                  </div>
                )}
              </div>

              <div className="hidden md:flex items-center gap-3">
                {project.repo_url && (
                  <a
                    href={project.repo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center justify-center w-12 h-12 rounded-xl shadow-lg transition-all hover:scale-110 active:scale-95 ${theme.badge}`}
                    title="查看 GitHub 仓库"
                  >
                    <Github className="w-5 h-5" />
                  </a>
                )}
                <Link
                  to={`/participants?id=${project.id}&tab=cheer`}
                  className={`
                    flex items-center gap-2 px-8 py-3 rounded-xl font-black text-sm uppercase tracking-wider shadow-lg transition-all hover:scale-110 active:scale-95 hover:shadow-2xl
                    ${theme.badge}
                  `}
                >
                  <Zap className="w-4 h-4 fill-current" />
                  <span>打气</span>
                </Link>
              </div>
            </div>

            {/* 移动端按钮 */}
            <div className="md:hidden w-full flex items-center gap-3">
              {project.repo_url && (
                <a
                  href={project.repo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center justify-center w-14 h-14 rounded-xl shadow-lg transition-colors ${theme.badge}`}
                  title="查看 GitHub 仓库"
                >
                  <Github className="w-6 h-6" />
                </a>
              )}
              <Link
                to={`/participants?id=${project.id}&tab=cheer`}
                className={`
                  flex-1 flex justify-center items-center gap-2 px-6 py-4 rounded-xl font-black uppercase tracking-wider shadow-lg
                  ${theme.badge}
                `}
              >
                <Zap className="w-4 h-4 fill-current" />
                <span>为TA打气</span>
              </Link>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

export default function HotProjectsCarousel() {
  const [projects, setProjects] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const response = await api.get('/contests/1/cheer-leaderboard', { params: { limit: 5 } })
        const items = response.items || []
        if (items.length > 0) {
          const regResponse = await api.get('/contests/1/registrations/public')
          const regMap = {}
          ;(regResponse.items || []).forEach(reg => { regMap[reg.id] = reg })
          
          setProjects(items.map(item => regMap[item.registration_id] ? {
            ...regMap[item.registration_id],
            stats: item.stats,
            rank: item.rank,
          } : null).filter(Boolean))
        }
      } catch (error) {
        console.error('Failed to load hot projects', error)
      } finally {
        setLoading(false)
      }
    }
    loadProjects()
  }, [])

  useEffect(() => {
    if (projects.length <= 1 || isPaused) return
    const interval = setInterval(() => setCurrentIndex((prev) => (prev + 1) % projects.length), 6000)
    return () => clearInterval(interval)
  }, [projects.length, isPaused])

  const goToPrev = () => setCurrentIndex((prev) => (prev - 1 + projects.length) % projects.length)
  const goToNext = () => setCurrentIndex((prev) => (prev + 1) % projects.length)

  if (loading || projects.length === 0) return null

  return (
    <section className="py-12 bg-slate-50 dark:bg-slate-900 overflow-hidden">
      <div className="max-w-5xl mx-auto px-4">
        {/* 顶部标题栏 */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-orange-500 blur-lg opacity-50 animate-pulse" />
              <div className="relative p-3 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl shadow-xl border border-white/20">
                <Flame className="w-8 h-8 text-white" />
              </div>
            </div>
            <div>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white leading-none italic uppercase tracking-tighter">
                Hall of Fame
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-bold tracking-widest uppercase">
                人气封神榜
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Link to="/ranking" className="text-sm font-bold text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors uppercase tracking-wider">
              View All
            </Link>
            {projects.length > 1 && (
              <div className="flex items-center bg-white dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 p-1.5 shadow-sm">
                <button onClick={goToPrev} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"><ChevronLeft className="w-5 h-5" /></button>
                <button onClick={goToNext} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"><ChevronRight className="w-5 h-5" /></button>
              </div>
            )}
          </div>
        </div>

        {/* 卡片展示区 */}
        <div 
          className="relative perspective-1000 py-4"
          style={{ minHeight: '340px' }} // 预留足够高度给放大的卡片
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {projects.map((project, index) => (
            <ProjectCard
              key={project.id}
              project={project}
              rank={project.rank || index + 1}
              isActive={index === currentIndex}
            />
          ))}
        </div>
        
        {/* 底部指示条 - 扩大移动端点击区域 */}
        {projects.length > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            {projects.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                aria-label={`切换到第 ${index + 1} 个项目`}
                className="p-2 -m-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/60"
              >
                <span
                  className={`block h-1.5 rounded-full transition-all duration-500 ${
                    index === currentIndex
                      ? 'w-12 bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]'
                      : 'w-2 bg-slate-300 dark:bg-slate-800'
                  }`}
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
