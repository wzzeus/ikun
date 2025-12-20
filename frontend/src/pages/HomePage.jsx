import { useEffect } from 'react'
import HeroSection from '../components/contest/HeroSection'
import IntroSection from '../components/contest/IntroSection'
import PrizesSection from '../components/contest/PrizesSection'
import RulesSection from '../components/contest/RulesSection'
import CTASection from '../components/contest/CTASection'
import LiveFeedSection from '../components/contest/LiveFeedSection'
import HotProjectsCarousel from '../components/contest/HotProjectsCarousel'
import HotBettingSection from '../components/contest/HotBettingSection'
import ContestantDashboard from '../components/contestant/ContestantDashboard'
import { useAuthStore } from '../stores/authStore'
import { useRegistrationStore } from '../stores/registrationStore'

/**
 * 首页 - 活动介绍
 */
export default function HomePage() {
  const user = useAuthStore((s) => s.user)
  const registration = useRegistrationStore((s) => s.registration)
  const status = useRegistrationStore((s) => s.status)
  const checkStatus = useRegistrationStore((s) => s.checkStatus)

  // 首次加载时检查报名状态
  useEffect(() => {
    if (user && status === 'unknown') {
      checkStatus(1)
    }
  }, [user, status, checkStatus])

  // 是否显示参赛者仪表盘 - 仅参赛者角色可见
  const isContestant = user?.role === 'contestant'
  const showDashboard = isContestant && registration && status !== 'none' && status !== 'unknown' && status !== 'withdrawn'

  return (
    <>
      <HeroSection />

      {/* 参赛者仪表盘 - 已报名用户显示（优先展示） */}
      {showDashboard && (
        <section className="relative py-12 sm:py-16 bg-slate-100 dark:bg-slate-950">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <ContestantDashboard />
          </div>
        </section>
      )}

      {/* 热门项目轮播 - 显示人气榜前几名 */}
      <HotProjectsCarousel />

      {/* 热门竞猜 - 显示进行中的竞猜活动 */}
      <HotBettingSection />

      {/* 实时动态 */}
      <LiveFeedSection />

      <IntroSection />
      <PrizesSection />
      <RulesSection />
      <CTASection />
    </>
  )
}
