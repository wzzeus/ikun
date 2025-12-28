import { useState, useEffect, useRef } from 'react'
import { X, Megaphone, Pin, Info, AlertTriangle, CheckCircle, XOctagon, Bell, ChevronRight } from 'lucide-react'
import api from '../../services/api'

// 公告类型配置
const ANNOUNCEMENT_TYPES = {
  info: {
    icon: Info,
    bg: 'bg-blue-50 dark:bg-blue-900/30',
    border: 'border-blue-200 dark:border-blue-700',
    iconBg: 'bg-blue-500',
    text: 'text-blue-700 dark:text-blue-300',
    badge: 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300',
    bannerBg: 'from-blue-500/10 via-blue-400/5 to-transparent',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-amber-50 dark:bg-amber-900/30',
    border: 'border-amber-200 dark:border-amber-700',
    iconBg: 'bg-amber-500',
    text: 'text-amber-700 dark:text-amber-300',
    badge: 'bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-300',
    bannerBg: 'from-amber-500/10 via-amber-400/5 to-transparent',
  },
  success: {
    icon: CheckCircle,
    bg: 'bg-emerald-50 dark:bg-emerald-900/30',
    border: 'border-emerald-200 dark:border-emerald-700',
    iconBg: 'bg-emerald-500',
    text: 'text-emerald-700 dark:text-emerald-300',
    badge: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-300',
    bannerBg: 'from-emerald-500/10 via-emerald-400/5 to-transparent',
  },
  error: {
    icon: XOctagon,
    bg: 'bg-red-50 dark:bg-red-900/30',
    border: 'border-red-200 dark:border-red-700',
    iconBg: 'bg-red-500',
    text: 'text-red-700 dark:text-red-300',
    badge: 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-300',
    bannerBg: 'from-red-500/10 via-red-400/5 to-transparent',
  },
}

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null)
  const [dismissedBannerIds, setDismissedBannerIds] = useState([])
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0)
  const panelRef = useRef(null)

  useEffect(() => {
    const loadAnnouncements = async () => {
      try {
        const response = await api.get('/announcements/public', { params: { limit: 10 } })
        const items = response.items || []
        setAnnouncements(items)
        // 加载已关闭的横幅 ID
        const dismissed = JSON.parse(localStorage.getItem('dismissedBannerIds') || '[]')
        setDismissedBannerIds(dismissed)
      } catch (error) {
        console.error('加载公告失败:', error)
      }
    }
    loadAnnouncements()
  }, [])

  // 点击外部关闭面板
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setIsOpen(false)
        setSelectedAnnouncement(null)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // 横幅自动轮播
  const bannerAnnouncements = announcements.filter(a => !dismissedBannerIds.includes(a.id))
  useEffect(() => {
    if (bannerAnnouncements.length <= 1) return
    const timer = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % bannerAnnouncements.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [bannerAnnouncements.length])

  // 关闭横幅（移到通知列表）
  const dismissBanner = (id) => {
    const newDismissed = [...dismissedBannerIds, id]
    setDismissedBannerIds(newDismissed)
    localStorage.setItem('dismissedBannerIds', JSON.stringify(newDismissed))
    // 调整索引
    if (currentBannerIndex >= bannerAnnouncements.length - 1) {
      setCurrentBannerIndex(Math.max(0, bannerAnnouncements.length - 2))
    }
  }

  // 没有公告时不显示
  if (announcements.length === 0) return null

  // 当前显示的横幅公告
  const currentBanner = bannerAnnouncements[currentBannerIndex]
  const bannerTypeConfig = currentBanner ? (ANNOUNCEMENT_TYPES[currentBanner.type] || ANNOUNCEMENT_TYPES.info) : null

  return (
    <>
      {/* 顶部横幅公告 - 未关闭的公告显示在这里 */}
      {currentBanner && bannerTypeConfig && (
        <div className="sticky top-16 z-40 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className={`relative bg-gradient-to-r ${bannerTypeConfig.bannerBg} bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-200/50 dark:border-slate-700/50`}>
            <div className="max-w-7xl mx-auto px-4 py-2.5">
              <div className="flex items-center gap-4">
                {/* 图标 */}
                <div className={`flex-shrink-0 p-1.5 rounded-lg ${bannerTypeConfig.iconBg} shadow-md`}>
                  <Megaphone className="w-4 h-4 text-white" />
                </div>

                {/* 内容 */}
                <div className="flex-1 min-w-0 flex items-center gap-3">
                  {currentBanner.is_pinned && (
                    <span className="flex-shrink-0 flex items-center gap-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 text-xs rounded-full font-medium">
                      <Pin className="w-3 h-3" />
                      置顶
                    </span>
                  )}
                  <div className="flex-1 min-w-0">
                    <span className={`font-semibold ${bannerTypeConfig.text} truncate block text-sm`}>
                      {currentBanner.title}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 truncate block">
                      {currentBanner.content}
                    </span>
                  </div>
                </div>

                {/* 指示器和操作 */}
                <div className="flex-shrink-0 flex items-center gap-2">
                  {bannerAnnouncements.length > 1 && (
                    <div className="flex items-center gap-1">
                      {bannerAnnouncements.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentBannerIndex(index)}
                          className={`w-1.5 h-1.5 rounded-full transition-all ${
                            index === currentBannerIndex
                              ? 'bg-slate-600 dark:bg-slate-300 w-3'
                              : 'bg-slate-300 dark:bg-slate-600 hover:bg-slate-400'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => dismissBanner(currentBanner.id)}
                    className="p-1 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-700/50 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    title="关闭此公告"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 左侧通知按钮 - 有横幅时往下移 */}
      <div className={`fixed left-4 z-40 transition-all duration-300 ${currentBanner ? 'top-32' : 'top-20'}`} ref={panelRef}>
        {/* 公告按钮 */}
        <button
          onClick={() => {
            setIsOpen(!isOpen)
            setSelectedAnnouncement(null)
          }}
          className={`
            relative flex items-center justify-center w-12 h-12 rounded-xl
            bg-white dark:bg-slate-800
            border-2 border-amber-400 dark:border-amber-500
            shadow-lg shadow-amber-500/20 hover:shadow-xl hover:shadow-amber-500/30
            transition-all duration-300 hover:scale-105
            ${isOpen ? 'ring-2 ring-amber-400 ring-offset-2 dark:ring-offset-slate-900' : ''}
          `}
        >
          <Bell className={`w-6 h-6 ${isOpen ? 'text-amber-500' : 'text-amber-500 dark:text-amber-400'}`} />
          {/* 未读数量角标 */}
          {announcements.length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold text-white bg-red-500 rounded-full">
              {announcements.length > 9 ? '9+' : announcements.length}
            </span>
          )}
        </button>

      {/* 公告面板 */}
      {isOpen && (
        <div className="absolute top-14 left-0 w-80 sm:w-96 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {/* 面板头部 */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-amber-500" />
              <span className="font-bold text-slate-800 dark:text-white">公告通知</span>
              <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-300 rounded-full">
                {announcements.length} 条
              </span>
            </div>
            <button
              onClick={() => {
                setIsOpen(false)
                setSelectedAnnouncement(null)
              }}
              className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 公告列表或详情 */}
          <div className="max-h-[400px] overflow-y-auto">
            {selectedAnnouncement ? (
              // 公告详情
              <div className="p-4">
                <button
                  onClick={() => setSelectedAnnouncement(null)}
                  className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 mb-3"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  返回列表
                </button>
                <div className={`p-4 rounded-xl ${ANNOUNCEMENT_TYPES[selectedAnnouncement.type]?.bg || ANNOUNCEMENT_TYPES.info.bg}`}>
                  <div className="flex items-start gap-3 mb-3">
                    {selectedAnnouncement.is_pinned && (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 text-xs rounded-full font-medium">
                        <Pin className="w-3 h-3" />
                        置顶
                      </span>
                    )}
                    <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${ANNOUNCEMENT_TYPES[selectedAnnouncement.type]?.badge || ANNOUNCEMENT_TYPES.info.badge}`}>
                      {selectedAnnouncement.type === 'info' && '通知'}
                      {selectedAnnouncement.type === 'warning' && '警告'}
                      {selectedAnnouncement.type === 'success' && '喜讯'}
                      {selectedAnnouncement.type === 'error' && '重要'}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-3">
                    {selectedAnnouncement.title}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {selectedAnnouncement.content}
                  </p>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-200/50 dark:border-slate-700/50 text-xs text-slate-500 dark:text-slate-400">
                    <span>{selectedAnnouncement.author?.display_name || selectedAnnouncement.author?.username}</span>
                    {selectedAnnouncement.published_at && (
                      <span>{new Date(selectedAnnouncement.published_at).toLocaleString('zh-CN')}</span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              // 公告列表
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {announcements.map((announcement) => {
                  const typeConfig = ANNOUNCEMENT_TYPES[announcement.type] || ANNOUNCEMENT_TYPES.info
                  const TypeIcon = typeConfig.icon
                  return (
                    <button
                      key={announcement.id}
                      onClick={() => setSelectedAnnouncement(announcement)}
                      className="w-full p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`flex-shrink-0 p-2 rounded-lg ${typeConfig.iconBg}`}>
                          <TypeIcon className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {announcement.is_pinned && (
                              <Pin className="w-3 h-3 text-amber-500 flex-shrink-0" />
                            )}
                            <span className="font-semibold text-slate-800 dark:text-white truncate">
                              {announcement.title}
                            </span>
                          </div>
                          <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
                            {announcement.content}
                          </p>
                          <div className="flex items-center gap-2 mt-2 text-xs text-slate-400 dark:text-slate-500">
                            <span>{announcement.author?.display_name || announcement.author?.username}</span>
                            <span>·</span>
                            {announcement.published_at && (
                              <span>{new Date(announcement.published_at).toLocaleDateString('zh-CN')}</span>
                            )}
                          </div>
                        </div>
                        <svg className="w-5 h-5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* 空状态 */}
          {announcements.length === 0 && (
            <div className="p-8 text-center">
              <Megaphone className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500 dark:text-slate-400">暂无公告</p>
            </div>
          )}
        </div>
      )}
      </div>
    </>
  )
}
