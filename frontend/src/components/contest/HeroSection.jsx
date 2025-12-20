import { Flame, Edit3, Rocket, Shield, Heart, TrendingUp, ClipboardCheck, Settings, Sparkles, Target, Code2 } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '../../stores/authStore'
import { useRegistrationStore } from '../../stores/registrationStore'

/**
 * 英雄区组件
 */
export default function HeroSection() {
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  const registration = useRegistrationStore((s) => s.registration)
  const status = useRegistrationStore((s) => s.status)
  const openModal = useRegistrationStore((s) => s.openModal)
  const openPreparationGuide = useRegistrationStore((s) => s.openPreparationGuide)

  // 用户角色
  const isAdmin = user?.role === 'admin'
  const isReviewer = user?.role === 'reviewer'
  const isContestant = user?.role === 'contestant'
  const isSpectator = user?.role === 'spectator'

  // 是否已报名（可以编辑）- 必须是参赛者角色且有报名记录
  const canEdit = token && isContestant && registration && status !== 'withdrawn' && status !== 'none'

  // 按钮文案和图标 - 根据角色显示不同内容
  const getButtonContent = () => {
    if (!token) {
      return { text: '立即报名参赛', icon: Rocket, isLink: false }
    }
    if (isAdmin) {
      return { text: '审核项目', icon: Shield, isLink: true, to: '/admin/review' }
    }
    if (isReviewer) {
      return { text: '评审中心', icon: ClipboardCheck, isLink: true, to: '/review-center' }
    }
    if (isSpectator) {
      // 吃瓜群众 - 引导去看排行榜
      return { text: '查看热门项目', icon: TrendingUp, isLink: true, to: '/ranking' }
    }
    if (canEdit) {
      // 已报名的参赛者
      return { text: '管理我的项目', icon: Edit3, isLink: false }
    }
    // 其他情况（如未报名的参赛者角色）
    return { text: '立即报名参赛', icon: Rocket, isLink: false }
  }

  const buttonContent = getButtonContent()

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  /**
   * 处理报名按钮点击
   * 已登录且已报名：直接打开报名弹窗编辑
   * 已登录但未报名：打开事前准备引导
   * 未登录：滚动到报名区（CTA Section）
   */
  const handleSignupClick = () => {
    if (!token) {
      scrollToSection('signup')
      return
    }

    if (canEdit) {
      openModal()
    } else {
      openPreparationGuide()
    }
  }

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* 背景效果 */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/15 via-slate-100 to-slate-100 dark:via-slate-950 dark:to-slate-950" />
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-yellow-500/20 dark:bg-yellow-500/25 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-orange-500/15 dark:bg-orange-500/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/3 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-amber-500/10 rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.03)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center py-16 sm:py-20">
        {/* 标签 - 响应式尺寸调整 */}
        <div className="inline-flex items-center px-4 sm:px-6 py-2 sm:py-3 rounded-full border border-yellow-500/40 bg-yellow-500/10 text-yellow-600 dark:text-yellow-300 text-sm sm:text-base font-semibold mb-8 sm:mb-12 animate-bounce shadow-lg shadow-yellow-500/10">
          <Flame className="w-5 h-5 mr-2" />
          Vibe Coding 开发者实战大赏
        </div>

        {/* 主标题 - 移动端从更小字号开始 */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-black tracking-tight mb-8 leading-tight text-slate-800 dark:text-white">
          第一届 ikuncode <br />
          <span className="bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 dark:from-yellow-300 dark:via-orange-400 dark:to-red-500 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(251,191,36,0.3)]">
            "鸡王争霸赛"
          </span>
        </h1>

        {/* 副标题 - 响应式字号 */}
        <p className="mt-6 max-w-3xl mx-auto text-lg sm:text-xl md:text-2xl text-slate-600 dark:text-slate-300 font-medium tracking-wide">
          练习时长两年半？来证明你的实力！
        </p>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          寻找全栈大牛 | 代码开源共建 | 算力费用全免
        </p>

        {/* CTA 按钮 - 移动端纵向堆叠，桌面端支持换行 */}
        <div className="mt-10 sm:mt-14 flex flex-col sm:flex-row sm:flex-wrap justify-center gap-3 sm:gap-4">
          {buttonContent.isLink ? (
            <Button
              asChild
              size="lg"
              className="w-full sm:w-auto from-yellow-500 to-orange-600 text-slate-900 bg-gradient-to-r font-bold text-base sm:text-xl hover:shadow-2xl hover:shadow-yellow-500/30 transition-all transform hover:-translate-y-2 hover:scale-105 active:scale-[0.98]"
            >
              <Link to={buttonContent.to}>
                <buttonContent.icon className="w-5 h-5 mr-2" />
                {buttonContent.text}
              </Link>
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSignupClick}
              size="lg"
              className="w-full sm:w-auto from-yellow-500 to-orange-600 text-slate-900 bg-gradient-to-r font-bold text-base sm:text-xl hover:shadow-2xl hover:shadow-yellow-500/30 transition-all transform hover:-translate-y-2 hover:scale-105 active:scale-[0.98]"
            >
              <buttonContent.icon className="w-5 h-5 mr-2" />
              {buttonContent.text}
            </Button>
          )}
          {isAdmin ? (
            <>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="w-full sm:w-auto border-2 border-blue-400 dark:border-blue-500 bg-blue-50/50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 hover:border-blue-500 dark:hover:border-blue-400 text-blue-700 dark:text-blue-300 font-bold text-base sm:text-xl transition-all hover:-translate-y-1 active:scale-[0.98]"
              >
                <Link to="/admin/dashboard">
                  <Settings className="w-5 h-5 mr-2" />
                  管理后台
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="w-full sm:w-auto border-2 border-purple-400 dark:border-purple-500 bg-purple-50/50 dark:bg-purple-900/30 hover:bg-purple-100 dark:hover:bg-purple-900/50 hover:border-purple-500 dark:hover:border-purple-400 text-purple-700 dark:text-purple-300 font-bold text-base sm:text-xl transition-all hover:-translate-y-1 active:scale-[0.98]"
              >
                <Link to="/admin/activity">
                  <Sparkles className="w-5 h-5 mr-2" />
                  活动管理
                </Link>
              </Button>
            </>
          ) : (
            <>
              <Button
                asChild
                size="lg"
                className="w-full sm:w-auto px-8 py-6 border-2 border-purple-300 dark:border-purple-600 bg-purple-50/50 dark:bg-purple-900/30 hover:bg-purple-100 dark:hover:bg-purple-900/50 hover:border-purple-400 dark:hover:border-purple-500 text-purple-700 dark:text-purple-300 font-bold text-base sm:text-xl transition-all hover:-translate-y-1 active:scale-[0.98]"
              >
                <Link to="/activity">
                  <Sparkles className="w-5 h-5 mr-2" />
                  疯狂娱乐城
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                className="w-full sm:w-auto px-8 py-6 border-2 border-blue-300 dark:border-blue-600 bg-blue-50/50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 hover:border-blue-400 dark:hover:border-blue-500 text-blue-700 dark:text-blue-300 font-bold text-base sm:text-xl transition-all hover:-translate-y-1 active:scale-[0.98]"
              >
                <Link to="/tasks">
                  <Target className="w-5 h-5 mr-2" />
                  每日任务
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                className="w-full sm:w-auto px-8 py-6 border-2 border-emerald-300 dark:border-emerald-600 bg-emerald-50/50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 hover:border-emerald-400 dark:hover:border-emerald-500 text-emerald-700 dark:text-emerald-300 font-bold text-base sm:text-xl transition-all hover:-translate-y-1 active:scale-[0.98]"
              >
                <Link to="/code-challenge">
                  <Code2 className="w-5 h-5 mr-2" />
                  码神挑战
                </Link>
              </Button>
            </>
          )}
        </div>

        {/* 活动时间 */}
        <p className="mt-10 text-base text-slate-500 dark:text-slate-400">
          活动时间：2025年12月15日 —— 2025年12月25日
        </p>
      </div>

      {/* 底部渐变 */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-100 dark:from-slate-950 to-transparent z-10" />
    </section>
  )
}
