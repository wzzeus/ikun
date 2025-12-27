import { useState, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X, Sun, Moon, Monitor, LogOut, User, Shield, Crown, Sparkles, Zap, Coffee, Gavel, CheckCircle, Target, GitCommit, Flame, Edit3, ChevronRight, Clock, CheckCircle2, XCircle, Award, Gift, Coins, Settings, LayoutDashboard, Upload } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { useThemeStore } from '../../stores/themeStore'
import { useRegistrationStore } from '../../stores/registrationStore'
import { Badge } from '../ui/badge'
import logo from '@/assets/logo.png'
import { resolveAvatarUrl } from '@/utils/avatar'
import { useToast } from '@/components/Toast'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui'
import { userApi } from '@/services'
import { IMAGE_ACCEPT, validateImageFile } from '@/utils/media'
import { useContestId } from '@/hooks/useContestId'

const THEME_ICONS = {
  light: Sun,
  dark: Moon,
  system: Monitor,
}

const THEME_LABELS = {
  light: '亮色模式',
  dark: '暗色模式',
  system: '跟随系统',
}

const TRUST_LEVEL_LABELS = {
  0: '新用户',
  1: '基础用户',
  2: '成员',
  3: '活跃用户',
  4: '领导者',
}

const ROLE_CONFIG = {
  admin: {
    label: '尊贵管理员',
    variant: 'admin',
    // 黑金至尊配色
    headerClass: 'bg-slate-900 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-200/20 via-slate-900 to-slate-950',
    icon: Crown,
    iconClass: 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]',
    textGradient: 'bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-600',
    borderClass: 'border-amber-500/50',
    ringClass: 'ring-amber-400',
    avatarContainerClass: 'relative p-[2px] bg-gradient-to-tr from-amber-300 via-yellow-500 to-amber-700 rounded-full animate-spin-slow',
  },
  reviewer: {
    label: '特邀评审官',
    variant: 'reviewer',
    // 宝石蓝/孔雀蓝主题
    headerClass: 'bg-gradient-to-br from-slate-900 via-blue-900 to-cyan-900 bg-[size:200%_200%] animate-[background-position_4s_ease_infinite_alternate]',
    icon: CheckCircle, // 更换为蓝色对钩
    iconClass: 'text-blue-300 drop-shadow-[0_0_8px_rgba(96,165,250,0.8)]', // 蓝色光晕
    textGradient: 'bg-gradient-to-r from-blue-200 via-cyan-300 to-blue-400',
    borderClass: 'border-blue-600/50 shadow-[0_0_20px_rgba(96,165,250,0.2)]',
    ringClass: 'ring-blue-400',
    avatarContainerClass: 'relative p-[3px] bg-gradient-to-br from-blue-400 to-cyan-600 rounded-full animate-pulse-slow', // 晶体脉冲效果
  },
  contestant: {
    label: '极客先锋',
    variant: 'contestant',
    // 赛博极光配色 (深紫+青色)
    headerClass: 'bg-indigo-950 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-cyan-400/30 via-violet-900 to-slate-950',
    icon: Zap,
    iconClass: 'text-cyan-300 drop-shadow-[0_0_10px_rgba(34,211,238,1)] animate-pulse',
    textGradient: 'bg-gradient-to-r from-cyan-300 via-blue-400 to-purple-400',
    borderClass: 'border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.15)]',
    ringClass: 'ring-cyan-400',
    avatarContainerClass: 'relative p-[2px] bg-gradient-to-bl from-cyan-400 via-blue-500 to-purple-600 rounded-full animate-spin-slow',
  },
  spectator: {
    label: '首席鉴赏官',
    variant: 'spectator',
    // 活力派对配色 (暖橙+玫红)
    headerClass: 'bg-orange-50 dark:bg-slate-900 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-400/20 via-rose-100/20 to-transparent',
    icon: Coffee,
    iconClass: 'text-orange-500 dark:text-orange-400',
    textGradient: 'bg-gradient-to-r from-orange-500 via-red-500 to-rose-500',
    borderClass: 'border-orange-200 dark:border-orange-900/50',
    ringClass: 'ring-orange-400',
    avatarContainerClass: 'relative p-[2px] bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 rounded-full',
  },
}

const AVATAR_MAX_BYTES = 2 * 1024 * 1024

const NAV_ITEMS = [
  { path: '/', label: '首页' },
  { path: '/submissions', label: '作品展示' },
  { path: '/ranking', label: '排行榜' },
  { path: '/announcement', label: '公示', icon: Award },
  { path: '/participants', label: '参赛选手' },
  { path: '/activity', label: '疯狂娱乐城', icon: Gift, highlight: true },
]

/**
 * 参赛者状态配置
 */
const REGISTRATION_STATUS_CONFIG = {
  submitted: {
    label: '审核中',
    icon: Clock,
    color: 'text-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
  },
  approved: {
    label: '已通过',
    icon: CheckCircle2,
    color: 'text-green-500',
    bg: 'bg-green-50 dark:bg-green-900/20',
  },
  rejected: {
    label: '未通过',
    icon: XCircle,
    color: 'text-red-500',
    bg: 'bg-red-50 dark:bg-red-900/20',
  },
}

/**
 * 用户下拉菜单组件
 */
function UserDropdown({ user, logout }) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)
  const avatarInputRef = useRef(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileForm, setProfileForm] = useState({
    username: user?.username || '',
    display_name: user?.display_name || '',
    email: user?.email || '',
  })
  const toast = useToast()
  const setUser = useAuthStore((s) => s.setUser)

  // 获取报名状态
  const registration = useRegistrationStore((s) => s.registration)
  const regStatus = useRegistrationStore((s) => s.status)
  const openModal = useRegistrationStore((s) => s.openModal)
  const checkStatus = useRegistrationStore((s) => s.checkStatus)
  const { contestId } = useContestId()

  // 首次加载时检查报名状态
  useEffect(() => {
    if (user?.role === 'contestant' && regStatus === 'unknown') {
      checkStatus(contestId)
    }
  }, [user, regStatus, checkStatus, contestId])

  useEffect(() => {
    if (!user) return
    setProfileForm({
      username: user.username || '',
      display_name: user.display_name || '',
      email: user.email || '',
    })
  }, [user])

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const trustLevel = user.trust_level ?? 0
  const trustLabel = TRUST_LEVEL_LABELS[trustLevel] || `等级 ${trustLevel}`
  
  const roleKey = user.role || 'spectator'
  const config = ROLE_CONFIG[roleKey] || ROLE_CONFIG.spectator
  const Icon = config.icon

  const handleAvatarPick = () => {
    if (avatarUploading) return
    avatarInputRef.current?.click()
  }

  const handleAvatarChange = async (event) => {
    const file = event.target.files?.[0] || null
    event.target.value = ''
    if (!file) return
    const error = validateImageFile(file, AVATAR_MAX_BYTES)
    if (error) {
      toast.error(error)
      return
    }
    setAvatarUploading(true)
    try {
      const updated = await userApi.uploadAvatar(file)
      setUser(updated)
      toast.success('头像已更新')
    } catch (err) {
      const detail = err?.response?.data?.detail || '头像上传失败'
      toast.error(detail)
    } finally {
      setAvatarUploading(false)
    }
  }

  const handleProfileSave = async () => {
    if (!user) return
    const username = profileForm.username.trim()
    if (!username) {
      toast.error('用户名不能为空')
      return
    }
    const displayName = profileForm.display_name?.trim() || null
    const emailValue = profileForm.email?.trim().toLowerCase() || null
    const payload = {}
    if (username !== user.username) {
      payload.username = username
    }
    if ((user.display_name || null) !== displayName) {
      payload.display_name = displayName
    }
    if ((user.email || null) !== emailValue) {
      payload.email = emailValue
    }
    if (Object.keys(payload).length === 0) {
      toast.warning('未检测到可更新内容')
      setProfileOpen(false)
      return
    }
    setProfileSaving(true)
    try {
      const updated = await userApi.updateMe(payload)
      setUser(updated)
      toast.success('资料已更新')
      setProfileOpen(false)
    } catch (err) {
      const detail = err?.response?.data?.detail || '资料更新失败'
      toast.error(detail)
    } finally {
      setProfileSaving(false)
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="group relative flex items-center justify-center focus:outline-none"
      >
        {/* 头像光环特效 - 所有角色现在都有了专属光环 */}
        <div className={`
          ${roleKey === 'admin' ? 'w-10 h-10' : 'w-9 h-9'} 
          rounded-full flex items-center justify-center transition-all duration-300
          ${config.avatarContainerClass}
        `}>
          <div className="bg-white dark:bg-slate-900 rounded-full p-0.5 w-full h-full flex items-center justify-center">
             <img
              src={resolveAvatarUrl(user?.avatar_url)}
              alt={user.display_name || user.username}
              className="w-full h-full rounded-full object-cover"
            />
          </div>
        </div>

        {/* 角标装饰 */}
        {roleKey === 'admin' && (
          <div className="absolute -top-3 -right-2 transform rotate-12 drop-shadow-md animate-bounce" style={{ animationDuration: '3s' }}>
            <Crown className="w-5 h-5 text-yellow-500 fill-yellow-300" />
          </div>
        )}
        {roleKey === 'contestant' && (
          <div className="absolute -bottom-1 -right-1 bg-slate-900 rounded-full p-0.5 border border-cyan-500">
             <Zap className="w-3 h-3 text-cyan-400 fill-cyan-400" />
          </div>
        )}
        {roleKey === 'reviewer' && (
          <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-0.5 border border-slate-900 shadow-md">
             <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
               <polyline points="20 6 9 17 4 12" />
             </svg>
          </div>
        )}
      </button>

      {isOpen && (
        <div className={`
          absolute right-0 mt-3 w-80 
          rounded-2xl shadow-2xl 
          border ${config.borderClass}
          overflow-hidden z-50 
          animate-in fade-in slide-in-from-top-2 duration-300
          bg-white dark:bg-slate-900
        `}>
          {/* 头部区域 */}
          <div className={`relative p-6 ${config.headerClass} overflow-hidden`}>
            {/* 动态光效背景 - 为所有角色添加扫光效果，但强度不同 */}
            <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
              <div className="absolute top-0 -left-1/4 w-1/2 h-full bg-gradient-to-r from-transparent via-white to-transparent transform skew-x-12 animate-shimmer" />
            </div>
            
            <div className="relative z-10 flex flex-col items-center text-center space-y-3">
              <div className="relative group">
                {/* 头像外圈动态光效 */}
                <div className={`absolute -inset-1 rounded-full blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-pulse ${
                    roleKey === 'admin' ? 'bg-amber-400' :
                    roleKey === 'contestant' ? 'bg-cyan-400' :
                    roleKey === 'reviewer' ? 'bg-blue-400' : // 评审员光环调整为蓝色
                    'bg-orange-400'
                }`}></div>
                
                <div className={`relative p-1 rounded-full bg-white/10 backdrop-blur-sm`}>
                   <img
                    src={resolveAvatarUrl(user?.avatar_url)}
                    alt={user.display_name || user.username}
                    className="w-20 h-20 rounded-full border-2 border-white/20 shadow-xl"
                  />
                </div>
                
                {/* 头像右下角装饰图标 */}
                <div className={`absolute -bottom-1 -right-1 rounded-full p-1.5 shadow-lg border border-white/20 backdrop-blur-md ${
                   roleKey === 'admin' ? 'bg-slate-900 border-amber-500' :
                   roleKey === 'contestant' ? 'bg-slate-900 border-cyan-500' :
                   roleKey === 'reviewer' ? 'bg-slate-900 border-blue-500' :
                   'bg-white dark:bg-slate-800 border-orange-200'
                }`}>
                  <Icon className={`w-4 h-4 ${config.iconClass}`} />
                </div>
              </div>

              <div>
                <h3 className={`text-xl font-black tracking-tight ${config.textGradient} bg-clip-text text-transparent`}>
                  {user.display_name || user.username}
                </h3>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full border border-white/10 shadow-sm backdrop-blur-md
                    ${roleKey === 'spectator' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' : 'bg-white/10 text-white'}
                  `}>
                    {config.label}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 详情区域 */}
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              <input
                ref={avatarInputRef}
                type="file"
                accept={IMAGE_ACCEPT}
                className="hidden"
                onChange={handleAvatarChange}
              />
              <button
                type="button"
                onClick={handleAvatarPick}
                disabled={avatarUploading}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  avatarUploading
                    ? 'opacity-50 pointer-events-none bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-500'
                    : 'bg-gradient-to-r from-slate-900 to-slate-700 text-white hover:from-slate-800 hover:to-slate-600 dark:from-white dark:to-slate-200 dark:text-slate-900'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                {avatarUploading ? '上传中...' : '上传头像'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false)
                  setProfileOpen(true)
                }}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-all"
              >
                <Edit3 className="w-3.5 h-3.5" />
                编辑资料
              </button>
              <span className="text-xs text-slate-500 dark:text-slate-400">PNG/JPG/WebP/GIF，≤2MB</span>
            </div>
            {/* 信任等级进度 - 仅 Linux.do 用户显示 */}
            {user.linux_do_id && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-slate-500">信任等级</span>
                  <span className={`
                      ${roleKey === 'admin' ? 'text-amber-600 dark:text-amber-400' :
                        roleKey === 'contestant' ? 'text-cyan-600 dark:text-cyan-400' :
                        roleKey === 'reviewer' ? 'text-blue-600 dark:text-blue-400' :
                        'text-orange-600 dark:text-orange-400'}
                  `}>
                    Lv.{trustLevel} - {trustLabel}
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-[1px]">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${
                      roleKey === 'admin' ? 'bg-gradient-to-r from-amber-300 via-yellow-500 to-amber-600' :
                      roleKey === 'contestant' ? 'bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600' :
                      roleKey === 'reviewer' ? 'bg-gradient-to-r from-blue-400 via-cyan-500 to-blue-600' :
                      'bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500'
                    }`}
                    style={{ width: `${trustLevel >= 3 ? 100 : Math.min((trustLevel + 1) * 25, 100)}%` }}
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
               <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                 <div className="text-xs text-slate-500 mb-1">用户名</div>
                 <div className="font-mono text-sm font-bold truncate text-slate-700 dark:text-slate-200">
                   @{user.username}
                 </div>
               </div>
               {/* Linux.do 用户显示 ID */}
               {user.linux_do_id && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <div className="text-xs text-slate-500 mb-1">Linux.do ID</div>
                  <div className="font-mono text-sm font-bold truncate text-slate-700 dark:text-slate-200">
                    {user.linux_do_id}
                  </div>
                </div>
               )}
               {/* GitHub 用户显示邮箱 */}
               {user.github_id && user.email && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <div className="text-xs text-slate-500 mb-1">邮箱</div>
                  <div className="font-mono text-sm font-bold truncate text-slate-700 dark:text-slate-200">
                    {user.email}
                  </div>
                </div>
               )}
            </div>
          </div>

          {/* 参赛者项目状态卡片 */}
          {roleKey === 'contestant' && registration && regStatus !== 'none' && regStatus !== 'unknown' && (
            <div className="p-3 border-t border-slate-100 dark:border-slate-800">
              {(() => {
                const statusConf = REGISTRATION_STATUS_CONFIG[regStatus] || REGISTRATION_STATUS_CONFIG.submitted
                const StatusIcon = statusConf.icon
                return (
                  <div className={`rounded-xl p-3 ${statusConf.bg} border border-slate-200 dark:border-slate-700/50`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <StatusIcon className={`w-4 h-4 ${statusConf.color}`} />
                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                          我的项目
                        </span>
                      </div>
                      <Badge variant="secondary" className={`text-xs font-semibold ${statusConf.color}`}>
                        {statusConf.label}
                      </Badge>
                    </div>

                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate mb-3">
                      {registration.title}
                    </p>

                    {/* 快捷操作 */}
                    <div className="flex gap-2">
                      <Link
                        to="/my-project"
                        onClick={() => setIsOpen(false)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-cyan-600 dark:text-cyan-400 bg-white dark:bg-slate-800 rounded-lg hover:bg-cyan-50 dark:hover:bg-cyan-900/20 transition-colors border border-slate-200 dark:border-slate-700"
                      >
                        <Target className="w-3.5 h-3.5" />
                        个人中心
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          openModal()
                          setIsOpen(false)
                        }}
                        className="flex items-center justify-center gap-1 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        编辑
                      </button>
                    </div>
                  </div>
                )
              })()}
            </div>
          )}

          {/* 管理员入口 - 显示管理后台 */}
          {roleKey === 'admin' ? (
            <div className="p-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2">
              <Link
                to="/admin/dashboard"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-center space-x-2 px-3 py-3 text-sm font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>管理后台</span>
              </Link>
              <Link
                to="/admin/review"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-center space-x-2 px-3 py-3 text-sm font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                <Shield className="w-4 h-4" />
                <span>报名审核</span>
              </Link>
            </div>
          ) : roleKey === 'reviewer' ? (
            /* 评审员入口 - 评审中心 */
            <div className="p-2 border-t border-slate-100 dark:border-slate-800">
              <Link
                to="/review-center"
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center justify-center space-x-2 px-3 py-3 text-sm font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                <Award className="w-4 h-4" />
                <span>评审中心</span>
              </Link>
            </div>
          ) : (
            /* 普通用户 - 娱乐城 & 任务入口 */
            <div className="p-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2">
              <Link
                to="/activity"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-center space-x-2 px-3 py-3 text-sm font-bold text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                <Gift className="w-4 h-4" />
                <span>疯狂娱乐城</span>
              </Link>
              <Link
                to="/tasks"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-center space-x-2 px-3 py-3 text-sm font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                <Target className="w-4 h-4" />
                <span>每日任务</span>
              </Link>
            </div>
          )}

          {/* 底部按钮 */}
          <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <Link
              to="/account/security"
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] mb-2"
            >
              <Settings className="w-4 h-4" />
              <span>账号安全</span>
            </Link>
            <button
              type="button"
              onClick={() => {
                logout()
                setIsOpen(false)
              }}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              <LogOut className="w-4 h-4" />
              <span>退出登录</span>
            </button>
          </div>
        </div>
      )}

      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>编辑资料</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">用户名</label>
              <input
                type="text"
                value={profileForm.username}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, username: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                placeholder="请输入用户名"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">昵称</label>
              <input
                type="text"
                value={profileForm.display_name}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, display_name: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                placeholder="可选，展示用昵称"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">邮箱</label>
              <input
                type="email"
                value={profileForm.email}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                placeholder="可选，用于找回密码"
              />
            </div>
          </div>
          <DialogFooter className="mt-6 flex gap-3 sm:justify-end">
            <button
              type="button"
              onClick={() => setProfileOpen(false)}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleProfileSave}
              disabled={profileSaving}
              className={`px-4 py-2 rounded-lg text-white ${profileSaving ? 'bg-slate-400' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              {profileSaving ? '保存中...' : '保存'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/**
 * 主题切换按钮组件
 */
function ThemeToggleButton({ className }) {
  const theme = useThemeStore((s) => s.theme)
  const toggleTheme = useThemeStore((s) => s.toggleTheme)
  const Icon = THEME_ICONS[theme]
  const label = `切换主题（当前：${THEME_LABELS[theme]}）`

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 ${className || ''}`}
      aria-label={label}
      title={label}
    >
      <Icon className="h-5 w-5" />
    </button>
  )
}

/**
 * 导航栏组件
 */
export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const location = useLocation()
  const { user, logout } = useAuthStore()

  return (
    <nav className="fixed top-0 w-full z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative flex items-center justify-center">
               <div className="absolute inset-0 bg-yellow-500/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                              <img
                                src={logo}
                                alt="ikuncode"
                                className="h-9 w-9 relative z-10 transition-transform duration-300 group-hover:scale-105 rounded-full"
                              />            </div>
            <span className="text-xl font-black tracking-tight bg-gradient-to-br from-slate-900 via-slate-800 to-slate-600 dark:from-white dark:via-slate-200 dark:to-slate-400 bg-clip-text text-transparent group-hover:to-yellow-500 transition-all duration-300">
              IKunCode
            </span>
          </Link>

          {/* 桌面端导航 */}
          <div className="hidden md:flex items-center space-x-4">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    item.highlight
                      ? location.pathname === item.path
                        ? 'text-orange-500 bg-orange-50 dark:bg-orange-900/20'
                        : 'text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20'
                      : location.pathname === item.path
                      ? 'text-yellow-400'
                      : 'hover:text-yellow-400'
                  }`}
                >
                  {Icon && <Icon className="w-4 h-4" />}
                  {item.label}
                </Link>
              )
            })}

            {user ? (
              <div className="flex items-center space-x-3">
                {/* 只有参赛选手才能提交作品 */}
                {user.role === 'contestant' && (
                  <Link
                    to="/submit"
                    className="bg-yellow-500 text-slate-900 px-4 py-2 rounded-full font-bold hover:bg-yellow-400 transition-all"
                  >
                    提交作品
                  </Link>
                )}
                <UserDropdown user={user} logout={logout} />
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  to="/login"
                  className="bg-yellow-500 text-slate-900 px-4 py-2 rounded-full font-bold hover:bg-yellow-400 transition-all"
                >
                  登录
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 rounded-full font-bold border border-yellow-500 text-yellow-600 hover:bg-yellow-50 transition-all dark:text-yellow-400 dark:border-yellow-400 dark:hover:bg-yellow-900/20"
                >
                  注册
                </Link>
              </div>
            )}

            <ThemeToggleButton />
          </div>

          {/* 移动端菜单按钮 */}
          <div className="flex items-center space-x-2 md:hidden">
            <ThemeToggleButton />
            <button
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-md text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400"
              aria-label="切换菜单"
              aria-expanded={isMenuOpen}
              aria-controls="mobile-menu"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* 移动端菜单 */}
      {isMenuOpen && (
        <div id="mobile-menu" className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 dark:text-slate-200 hover:text-yellow-500 dark:hover:text-yellow-400"
              >
                {item.label}
              </Link>
            ))}

            {/* 用户操作区 */}
            {user ? (
              <>
                {/* 只有参赛选手才能提交作品 */}
                {user.role === 'contestant' && (
                  <Link
                    to="/submit"
                    onClick={() => setIsMenuOpen(false)}
                    className="block px-3 py-2 rounded-md text-base font-medium text-yellow-500 dark:text-yellow-400"
                  >
                    提交作品
                  </Link>
                )}
                {/* 管理员显示管理入口 */}
                {user.role === 'admin' ? (
                  <>
                    <Link
                      to="/admin/dashboard"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium text-amber-500 dark:text-amber-400"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      管理后台
                    </Link>
                    <Link
                      to="/admin/review"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium text-amber-500 dark:text-amber-400"
                    >
                      <Shield className="w-4 h-4" />
                      报名审核
                    </Link>
                  </>
                ) : user.role === 'reviewer' ? (
                  /* 评审员显示评审中心 */
                  <Link
                    to="/review-center"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium text-blue-500 dark:text-blue-400"
                  >
                    <Award className="w-4 h-4" />
                    评审中心
                  </Link>
                ) : (
                  /* 普通用户显示活动中心和成就 */
                  <>
                    {/* 参赛者显示我的项目 */}
                    {user.role === 'contestant' && (
                      <Link
                        to="/my-project"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium text-cyan-500 dark:text-cyan-400"
                      >
                        <Target className="w-4 h-4" />
                        我的项目
                      </Link>
                    )}
                    <Link
                      to="/activity"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium text-orange-500 dark:text-orange-400"
                    >
                      <Gift className="w-4 h-4" />
                      疯狂娱乐城
                    </Link>
                    <Link
                      to="/tasks"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium text-blue-500 dark:text-blue-400"
                    >
                      <Target className="w-4 h-4" />
                      每日任务
                    </Link>
                  </>
                )}
                <Link
                  to="/account/security"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium text-slate-600 dark:text-slate-300"
                >
                  <Settings className="w-4 h-4" />
                  账号安全
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    logout()
                    setIsMenuOpen(false)
                  }}
                  className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  退出登录
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setIsMenuOpen(false)}
                  className="block px-3 py-2 rounded-md text-base font-medium text-yellow-500 dark:text-yellow-400"
                >
                  登录
                </Link>
                <Link
                  to="/register"
                  onClick={() => setIsMenuOpen(false)}
                  className="block px-3 py-2 rounded-md text-base font-medium text-yellow-500 dark:text-yellow-400"
                >
                  注册
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
