import { Trophy, Users, Gift, Ticket, Gem, Coins } from 'lucide-react'
import { PRIZE_CONFIG } from './constants'

const DEFAULT_PARTICIPATION = {
  title: '阳光普照奖（参与奖）',
  description: '凡提交合格开源作品的选手',
  reward: '8.5折充值优惠券',
  extra: '平台专属"ikun开发者徽章"',
}

/**
 * 奖项设置区组件
 */
export default function PrizesSection({ templateConfig }) {
  const prizeOverrides = templateConfig?.prizes || {}
  const sectionTitle = templateConfig?.prize_section?.title || '奖项设置'
  const sectionIntro =
    templateConfig?.prize_section?.intro || '核心机制：只要你敢写且获奖，Token 消耗 ikuncode 全额买单！'
  const championConfig = { ...PRIZE_CONFIG.champion, ...prizeOverrides.champion }
  const secondConfig = { ...PRIZE_CONFIG.second, ...prizeOverrides.second }
  const thirdConfig = { ...PRIZE_CONFIG.third, ...prizeOverrides.third }
  const participationConfig = { ...DEFAULT_PARTICIPATION, ...prizeOverrides.participation }
  const championButtonUrl =
    championConfig.buttonUrl || championConfig.button_url || 'https://api.ikuncode.cc/'

  return (
    <section id="prizes" className="py-20 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-slate-800 dark:text-white sm:text-4xl">
            <Trophy className="inline-block w-8 h-8 mr-2 text-yellow-500 dark:text-yellow-400" />
            {sectionTitle}
          </h2>
          <p className="mt-4 text-yellow-600 dark:text-yellow-400 font-semibold">
            {sectionIntro}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <RunnerUpCard place={2} config={secondConfig} />
          <ChampionCard config={championConfig} buttonUrl={championButtonUrl} />
          <RunnerUpCard place={3} config={thirdConfig} />
        </div>

        {/* 阳光普照奖 */}
        <div className="mt-12 bg-white/50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 p-6 flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center mb-4 md:mb-0">
            <div className="p-3 bg-yellow-500/10 rounded-full mr-4">
              <Users className="text-yellow-500 dark:text-yellow-400" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-slate-800 dark:text-white flex items-center">
                <Gift className="w-4 h-4 mr-2 text-yellow-500 dark:text-yellow-400" aria-hidden="true" />
                {participationConfig.title}
              </h4>
              <p className="text-slate-600 dark:text-slate-400 text-sm">{participationConfig.description}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-yellow-600 dark:text-yellow-300 font-bold">{participationConfig.reward}</p>
            <p className="text-slate-600 dark:text-slate-400 text-sm">+ {participationConfig.extra}</p>
          </div>
        </div>
      </div>
    </section>
  )
}

/**
 * 冠军卡片
 */
function ChampionCard({ config, buttonUrl }) {
  return (
    <div className="relative z-10 bg-white dark:bg-slate-800 rounded-2xl border-2 border-yellow-500 p-8 shadow-2xl shadow-yellow-500/20 transform hover:-translate-y-2 transition-all">
      <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-yellow-500 text-slate-900 px-4 py-1 rounded-full text-sm font-bold shadow-lg">
        {config.badge}
      </div>
      <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center border-4 border-white dark:border-slate-800 shadow-lg">
        <Trophy className="w-8 h-8 text-slate-900" />
      </div>

      <div className="text-center mb-6 pt-8">
        <h3 className="text-3xl font-bold text-yellow-500 dark:text-yellow-400">{config.title} ({config.count})</h3>
        <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">{config.subtitle}</p>
      </div>

      <ul className="space-y-6 mb-8">
        <li className="flex items-center bg-slate-100 dark:bg-slate-700/50 p-3 rounded-lg border border-yellow-500/30">
          <Coins className="w-6 h-6 mr-3 text-yellow-500 dark:text-yellow-400" aria-hidden="true" />
          <div>
            <span className="block text-slate-500 dark:text-slate-400 text-xs">现金大奖</span>
            <span className="text-xl font-bold text-slate-800 dark:text-white">{config.cashPrize}</span>
          </div>
        </li>
        <li className="flex items-start">
          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-500 text-xs mt-0.5">
            <Gem className="w-3.5 h-3.5" aria-hidden="true" />
          </div>
          <span className="ml-3 text-slate-700 dark:text-slate-300">
            API 消耗 <span className="text-yellow-500 dark:text-yellow-400 font-bold">{config.apiReturn}</span>
            <br />
            <span className="text-xs text-slate-500">{config.apiLimit}</span>
          </span>
        </li>
        <li className="flex items-start">
          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-500 text-xs mt-0.5">
            <Ticket className="w-3.5 h-3.5" aria-hidden="true" />
          </div>
          <span className="ml-3 text-slate-700 dark:text-slate-300">
            至尊特权 <span className="text-yellow-500 dark:text-yellow-400 font-bold">{config.discount}</span> 充值券
            <br />
            <span className="text-xs text-slate-500">{config.discountNote}</span>
          </span>
        </li>
      </ul>

      <a
        href={buttonUrl}
        target="_blank"
        rel="noreferrer"
        className="block w-full py-3 bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold rounded-lg transition-colors text-center"
      >
        {config.buttonText}
      </a>
    </div>
  )
}

/**
 * 亚军/季军卡片
 */
function RunnerUpCard({ place, config }) {
  const Icon = config.icon
  const bgColor = place === 2 ? 'bg-slate-300' : 'bg-orange-700'
  const textColor = place === 2 ? 'text-slate-800' : 'text-orange-200'

  return (
    <div className="relative mt-8 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-600 p-8 transform hover:scale-105 transition-all shadow-sm">
      <div className={`absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 ${bgColor} rounded-full flex items-center justify-center border-4 border-white dark:border-slate-800 shadow-lg`}>
        <span className={`text-xl font-bold ${textColor}`}>{place}</span>
      </div>

      <div className="text-center mb-6 pt-4">
        <h3 className="text-2xl font-bold text-slate-700 dark:text-slate-200">{config.title} ({config.count})</h3>
        <div className="flex items-center justify-center gap-2 text-slate-500 dark:text-slate-400 text-sm mt-1">
          <Icon size={16} /> {config.subtitle}
        </div>
      </div>

      <ul className="space-y-4 mb-8">
        <li className="flex items-start">
          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 text-xs mt-0.5">
            <Gem className="w-3.5 h-3.5" aria-hidden="true" />
          </div>
          <span className="ml-3 text-slate-700 dark:text-slate-300">
            API 消耗 <span className="text-slate-800 dark:text-white font-bold">{config.apiReturn}</span>
            <br />
            <span className="text-xs text-slate-500">{config.apiLimit}</span>
          </span>
        </li>
        <li className="flex items-start">
          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 text-xs mt-0.5">
            <Ticket className="w-3.5 h-3.5" aria-hidden="true" />
          </div>
          <span className="ml-3 text-slate-700 dark:text-slate-300">
            <span className="text-yellow-600 dark:text-yellow-400 font-bold">{config.discount}</span> 充值优惠券 × 1
          </span>
        </li>
      </ul>
    </div>
  )
}
