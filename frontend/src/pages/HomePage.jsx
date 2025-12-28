import { useEffect, useState } from 'react'
import HeroSection from '../components/contest/HeroSection'
import IntroSection from '../components/contest/IntroSection'
import PrizesSection from '../components/contest/PrizesSection'
import RulesSection from '../components/contest/RulesSection'
import CTASection from '../components/contest/CTASection'
import LiveFeedSection from '../components/contest/LiveFeedSection'
import HotProjectsCarousel from '../components/contest/HotProjectsCarousel'
import HotBettingSection from '../components/contest/HotBettingSection'
import MarkdownSection from '../components/contest/MarkdownSection'
import ContestantDashboard from '../components/contestant/ContestantDashboard'
import { useAuthStore } from '../stores/authStore'
import { useRegistrationStore } from '../stores/registrationStore'
import { contestApi } from '../services'

/**
 * 首页 - 比赛展示与参赛入口
 */
export default function HomePage() {
  const user = useAuthStore((s) => s.user)
  const registration = useRegistrationStore((s) => s.registration)
  const status = useRegistrationStore((s) => s.status)
  const checkStatus = useRegistrationStore((s) => s.checkStatus)
  const [featuredContest, setFeaturedContest] = useState(null)
  const [contests, setContests] = useState([])
  const [selectedContestId, setSelectedContestId] = useState(null)
  const [loadingContest, setLoadingContest] = useState(true)

  useEffect(() => {
    let active = true
    const loadContest = async () => {
      setLoadingContest(true)
      let homepageContest = null
      try {
        homepageContest = await contestApi.getHomepage()
      } catch (error) {
        if (error?.response?.status !== 404) {
          console.error('加载首页展示比赛失败', error)
        }
      }

      let list = []
      try {
        const data = await contestApi.list()
        list = data.items || []
      } catch (error) {
        console.error('加载比赛列表失败', error)
      }

      if (!active) return
      setFeaturedContest(homepageContest)
      setContests(list)
      if (homepageContest?.id) {
        setSelectedContestId(homepageContest.id)
      } else {
        setSelectedContestId(null)
      }
      setLoadingContest(false)
    }

    loadContest()
    return () => {
      active = false
    }
  }, [])

  const activeContest = contests.find((item) => item.id === selectedContestId) || featuredContest
  const activeContestId = activeContest?.id
  const templateConfig = activeContest?.template_config || null
  const showContestSections = Boolean(featuredContest)

  useEffect(() => {
    if (!user || !activeContestId || user.role !== 'contestant') return
    checkStatus(activeContestId).catch(() => {})
  }, [user, activeContestId, checkStatus])

  // 参赛者看板 - 仅在已报名且未撤回时展示
  const isContestant = user?.role === 'contestant'
  const showDashboard =
    showContestSections &&
    isContestant &&
    registration &&
    status !== 'none' &&
    status !== 'unknown' &&
    status !== 'withdrawn'
  const hasPrizes = Boolean(activeContest?.prizes_md && activeContest.prizes_md.trim())
  const hasRules = Boolean(activeContest?.rules_md && activeContest.rules_md.trim())
  const hasReviewRules = Boolean(activeContest?.review_rules_md && activeContest.review_rules_md.trim())
  const hasFaq = Boolean(activeContest?.faq_md && activeContest.faq_md.trim())

  const handleContestChange = (event) => {
    const value = event.target.value
    setSelectedContestId(value ? Number(value) : null)
  }

  return (
    <>
      <HeroSection />

      {showContestSections && (
        <>
          {contests.length > 1 && (
            <section className="py-6 bg-slate-100 dark:bg-slate-950">
              <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    选择比赛
                  </div>
                  <select
                    className="w-full sm:w-auto px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    value={selectedContestId ?? ''}
                    onChange={handleContestChange}
                    disabled={loadingContest}
                  >
                    {contests.map((contest) => (
                      <option key={contest.id} value={contest.id}>
                        {contest.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>
          )}

          {activeContest?.banner_url && (
            <section className="py-10 bg-slate-100 dark:bg-slate-950">
              <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-lg">
                  <img
                    src={activeContest.banner_url}
                    alt="比赛横幅"
                    className="w-full h-auto object-cover"
                    loading="lazy"
                  />
                </div>
              </div>
            </section>
          )}

          {/* 参赛者看板 - 仅在报名有效时展示 */}
          {showDashboard && (
            <section className="relative py-12 sm:py-16 bg-slate-100 dark:bg-slate-950">
              <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <ContestantDashboard contestId={activeContestId} />
              </div>
            </section>
          )}

          {/* 热门作品 - 跟随当前比赛 */}
          <HotProjectsCarousel contestId={activeContestId} />

          {/* 热度竞猜 - 暂时不区分比赛 */}
          <HotBettingSection />

          {/* 实时动态 - 跟随当前比赛 */}
          <LiveFeedSection contestId={activeContestId} />

          <IntroSection />
          <PrizesSection templateConfig={templateConfig} />
          {hasPrizes && (
            <MarkdownSection title="奖项补充说明" content={activeContest?.prizes_md} id="prizes-extra" />
          )}
          <RulesSection templateConfig={templateConfig} />
          {hasRules && (
            <MarkdownSection title="规则补充说明" content={activeContest?.rules_md} id="rules-extra" />
          )}
          {hasReviewRules && (
            <MarkdownSection title="评审补充说明" content={activeContest?.review_rules_md} id="judging-extra" />
          )}
          {hasFaq && <MarkdownSection title="常见问题补充" content={activeContest?.faq_md} id="faq" />}
          <CTASection contestPhase={activeContest?.phase} contestId={activeContestId} />
        </>
      )}
    </>
  )
}
