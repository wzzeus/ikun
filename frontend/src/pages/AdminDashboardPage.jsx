import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Users,
  Coins,
  Calendar,
  Gift,
  TrendingUp,
  Settings,
  Search,
  Edit2,
  Check,
  X,
  Plus,
  Trash2,
  RefreshCw,
  Key,
  BarChart3,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Activity,
  Eye,
  Clock,
  Zap,
  AlertTriangle,
  ExternalLink,
  Target,
  Play,
  Square,
  Award,
  XCircle,
  Megaphone,
  Pin,
  Info,
  AlertTriangle as WarningIcon,
  CheckCircle,
  XOctagon,
  ClipboardCheck,
} from 'lucide-react'
import ReactECharts from 'echarts-for-react'
import * as echarts from 'echarts'
import { useAuthStore } from '../stores/authStore'
import { useToast } from '../components/Toast'
import { useThemeStore } from '../stores/themeStore'
import { adminApi2, contestApi, predictionApi, projectApi } from '../services'
import { resolveAvatarUrl } from '../utils/avatar'
import { IMAGE_ACCEPT, validateImageFile } from '../utils/media'
import { PRIZE_CONFIG, RISK_RULES, REVIEW_WEIGHTS, PROCESS_STEPS } from '../components/contest/constants'

// Tab 组件 - 现代简洁风格
function Tab({ active, onClick, children, icon: Icon }) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 whitespace-nowrap ${
        active
          ? 'text-white bg-gradient-to-r from-blue-600 to-indigo-600 shadow-md shadow-blue-500/20'
          : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
      }`}
    >
      {Icon && <Icon className="w-4 h-4" />}
      {children}
    </button>
  )
}

// 统计卡片 - 高端版
function StatCard({ title, value, icon: Icon, color = 'blue' }) {
  const colorMap = {
    blue: { bg: 'from-blue-500/10 to-blue-600/5', border: 'border-blue-200/50 dark:border-blue-500/20', icon: 'from-blue-500 to-blue-600', shadow: 'shadow-blue-500/20' },
    green: { bg: 'from-emerald-500/10 to-emerald-600/5', border: 'border-emerald-200/50 dark:border-emerald-500/20', icon: 'from-emerald-500 to-emerald-600', shadow: 'shadow-emerald-500/20' },
    purple: { bg: 'from-purple-500/10 to-purple-600/5', border: 'border-purple-200/50 dark:border-purple-500/20', icon: 'from-purple-500 to-purple-600', shadow: 'shadow-purple-500/20' },
    orange: { bg: 'from-orange-500/10 to-orange-600/5', border: 'border-orange-200/50 dark:border-orange-500/20', icon: 'from-orange-500 to-orange-600', shadow: 'shadow-orange-500/20' },
    pink: { bg: 'from-pink-500/10 to-pink-600/5', border: 'border-pink-200/50 dark:border-pink-500/20', icon: 'from-pink-500 to-pink-600', shadow: 'shadow-pink-500/20' },
    cyan: { bg: 'from-cyan-500/10 to-cyan-600/5', border: 'border-cyan-200/50 dark:border-cyan-500/20', icon: 'from-cyan-500 to-cyan-600', shadow: 'shadow-cyan-500/20' },
  }

  const theme = colorMap[color] || colorMap.blue

  return (
    <div className={`relative overflow-hidden bg-white dark:bg-slate-900/50 rounded-2xl border ${theme.border} p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${theme.shadow} group backdrop-blur-sm`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${theme.bg} opacity-50`} />
      <div className="relative flex items-center justify-between z-10">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{title}</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{value}</p>
        </div>
        <div className={`p-3.5 rounded-xl bg-gradient-to-br ${theme.icon} shadow-lg ${theme.shadow} transform transition-transform group-hover:scale-110 group-hover:rotate-3`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  )
}

// 角色名称映射
const ROLE_NAME_MAP = {
  admin: '管理员',
  contestant: '选手',
  reviewer: '评审',
  spectator: '观众',
}

// 奖品类型名称映射
const PRIZE_TYPE_MAP = {
  POINTS: '积分',
  ITEM: '道具',
  API_KEY: 'API Key',
  NOTHING: '谢谢参与',
}

const CONTEST_PHASE_LABELS = {
  upcoming: '即将开始',
  signup: '报名中',
  submission: '提交中',
  voting: '投票中',
  ended: '已结束',
}

const CONTEST_PHASE_OPTIONS = [
  { value: 'upcoming', label: '即将开始' },
  { value: 'signup', label: '报名中' },
  { value: 'submission', label: '提交中' },
  { value: 'voting', label: '投票中' },
  { value: 'ended', label: '已结束' },
]

const CONTEST_VISIBILITY_LABELS = {
  draft: '草稿',
  published: '已发布',
  hidden: '已隐藏',
}

const CONTEST_VISIBILITY_OPTIONS = [
  { value: 'published', label: '已发布' },
  { value: 'draft', label: '草稿' },
  { value: 'hidden', label: '已隐藏' },
]

const CONTEST_VISIBILITY_STYLES = {
  draft: 'bg-slate-100 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300',
  published: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200',
  hidden: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200',
}

const CONTEST_FORM_DEFAULT = {
  title: '',
  description: '',
  phase: 'upcoming',
  visibility: 'published',
  home_visible: false,
  banner_url: '',
  rules_md: '',
  prizes_md: '',
  review_rules_md: '',
  faq_md: '',
  template_prize_section_title: '',
  template_prize_section_intro: '',
  template_prize_champion_title: '',
  template_prize_champion_subtitle: '',
  template_prize_champion_count: '',
  template_prize_champion_badge: '',
  template_prize_champion_cash_prize: '',
  template_prize_champion_api_return: '',
  template_prize_champion_api_limit: '',
  template_prize_champion_discount: '',
  template_prize_champion_discount_note: '',
  template_prize_champion_button_text: '',
  template_prize_champion_button_url: '',
  template_prize_second_title: '',
  template_prize_second_subtitle: '',
  template_prize_second_count: '',
  template_prize_second_api_return: '',
  template_prize_second_api_limit: '',
  template_prize_second_discount: '',
  template_prize_third_title: '',
  template_prize_third_subtitle: '',
  template_prize_third_count: '',
  template_prize_third_api_return: '',
  template_prize_third_api_limit: '',
  template_prize_third_discount: '',
  template_participation_title: '',
  template_participation_description: '',
  template_participation_reward: '',
  template_participation_extra: '',
  template_risk_rules: '',
  template_review_weights: '',
  template_process_steps: '',
  signup_start: '',
  signup_end: '',
  submit_start: '',
  submit_end: '',
  vote_start: '',
  vote_end: '',
}

const MAX_BANNER_BYTES = 5 * 1024 * 1024

const DEFAULT_PRIZE_SECTION_TITLE = '奖项设置'
const DEFAULT_PRIZE_SECTION_INTRO = '核心机制：只要你敢写且获奖，Token 消耗 ikuncode 全额买单！'
const DEFAULT_PARTICIPATION = {
  title: '阳光普照奖（参与奖）',
  description: '凡提交合格开源作品的选手',
  reward: '8.5折充值优惠券',
  extra: '平台专属"ikun开发者徽章"',
}

const formatRiskRules = (rules) =>
  rules.map((rule) => `${rule.label}|${rule.content}`).join('\n')

const formatReviewWeights = (weights) =>
  weights.map((item) => `${item.title}|${item.weight}|${item.description}`).join('\n')

const formatProcessSteps = (steps) =>
  steps
    .map((step) => {
      const parts = [step.step, step.title, step.description]
      if (step.highlight) parts.push(step.highlight)
      if (step.suffix) parts.push(step.suffix)
      return parts.join('|')
    })
    .join('\n')

const DEFAULT_RISK_RULES_TEXT = formatRiskRules(RISK_RULES)
const DEFAULT_REVIEW_WEIGHTS_TEXT = formatReviewWeights(REVIEW_WEIGHTS)
const DEFAULT_PROCESS_STEPS_TEXT = formatProcessSteps(PROCESS_STEPS)

const splitLines = (value) =>
  String(value ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

const compactTextObject = (objectValue) => {
  const entries = Object.entries(objectValue).filter(([, value]) => String(value ?? '').trim())
  return entries.length ? Object.fromEntries(entries) : null
}

const parseRiskRulesText = (value) => {
  const lines = splitLines(value)
  if (!lines.length) return { items: [] }
  const items = []
  for (let index = 0; index < lines.length; index += 1) {
    const parts = lines[index].split('|').map((part) => part.trim())
    if (parts.length < 2) {
      return { error: `风控规则第 ${index + 1} 行格式错误，请使用“标题|内容”` }
    }
    items.push({ label: parts[0], content: parts.slice(1).join('|').trim() })
  }
  return { items }
}

const parseReviewWeightsText = (value) => {
  const lines = splitLines(value)
  if (!lines.length) return { items: [] }
  const items = []
  for (let index = 0; index < lines.length; index += 1) {
    const parts = lines[index].split('|').map((part) => part.trim())
    if (parts.length < 3) {
      return { error: `评审权重第 ${index + 1} 行格式错误，请使用“标题|权重|描述”` }
    }
    const weightText = parts[1].replace('%', '').trim()
    const weightValue = Number(weightText)
    if (!Number.isFinite(weightValue)) {
      return { error: `评审权重第 ${index + 1} 行的权重不是数字` }
    }
    items.push({
      title: parts[0],
      weight: weightValue,
      description: parts.slice(2).join('|').trim(),
    })
  }
  return { items }
}

const parseProcessStepsText = (value) => {
  const lines = splitLines(value)
  if (!lines.length) return { items: [] }
  const items = []
  for (let index = 0; index < lines.length; index += 1) {
    const parts = lines[index].split('|').map((part) => part.trim())
    if (parts.length < 3) {
      return { error: `参赛流程第 ${index + 1} 行格式错误，请使用“步骤|标题|描述|高亮(可选)|后缀(可选)”` }
    }
    const stepNumber = Number(parts[0])
    const stepValue = Number.isFinite(stepNumber) ? stepNumber : parts[0]
    const item = {
      step: stepValue,
      title: parts[1],
      description: parts[2],
    }
    if (parts[3]) item.highlight = parts[3]
    if (parts[4]) item.suffix = parts[4]
    items.push(item)
  }
  return { items }
}

const buildTemplateFormData = (templateConfig) => {
  const prizeSection = templateConfig?.prize_section || {}
  const prizes = templateConfig?.prizes || {}
  const champion = prizes.champion || {}
  const second = prizes.second || {}
  const third = prizes.third || {}
  const participation = prizes.participation || {}

  return {
    template_prize_section_title: prizeSection.title || '',
    template_prize_section_intro: prizeSection.intro || '',
    template_prize_champion_title: champion.title || '',
    template_prize_champion_subtitle: champion.subtitle || '',
    template_prize_champion_count: champion.count || '',
    template_prize_champion_badge: champion.badge || '',
    template_prize_champion_cash_prize: champion.cashPrize || '',
    template_prize_champion_api_return: champion.apiReturn || '',
    template_prize_champion_api_limit: champion.apiLimit || '',
    template_prize_champion_discount: champion.discount || '',
    template_prize_champion_discount_note: champion.discountNote || '',
    template_prize_champion_button_text: champion.buttonText || '',
    template_prize_champion_button_url: champion.buttonUrl || champion.button_url || '',
    template_prize_second_title: second.title || '',
    template_prize_second_subtitle: second.subtitle || '',
    template_prize_second_count: second.count || '',
    template_prize_second_api_return: second.apiReturn || '',
    template_prize_second_api_limit: second.apiLimit || '',
    template_prize_second_discount: second.discount || '',
    template_prize_third_title: third.title || '',
    template_prize_third_subtitle: third.subtitle || '',
    template_prize_third_count: third.count || '',
    template_prize_third_api_return: third.apiReturn || '',
    template_prize_third_api_limit: third.apiLimit || '',
    template_prize_third_discount: third.discount || '',
    template_participation_title: participation.title || '',
    template_participation_description: participation.description || '',
    template_participation_reward: participation.reward || '',
    template_participation_extra: participation.extra || '',
    template_risk_rules: templateConfig?.risk_rules?.length ? formatRiskRules(templateConfig.risk_rules) : '',
    template_review_weights: templateConfig?.review_weights?.length
      ? formatReviewWeights(templateConfig.review_weights)
      : '',
    template_process_steps: templateConfig?.process_steps?.length
      ? formatProcessSteps(templateConfig.process_steps)
      : '',
  }
}

const toContestDatetimeInput = (value) => {
  if (!value) return ''
  const text = typeof value === 'string' ? value : new Date(value).toISOString()
  if (!text.includes('T')) return ''
  return text.slice(0, 16)
}

const formatContestDateTime = (value) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('zh-CN')
}

// 仪表盘面板
function DashboardPanel() {
  const theme = useThemeStore((s) => s.theme)
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  const [stats, setStats] = useState(null)
  const [chartData, setChartData] = useState(null)
  const [quotaData, setQuotaData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [chartLoading, setChartLoading] = useState(true)
  const [days, setDays] = useState(7)

  useEffect(() => {
    loadStats()
    loadQuotaData()
  }, [])

  useEffect(() => {
    loadChartData()
  }, [days])

  const loadStats = async () => {
    try {
      const data = await adminApi2.getDashboard()
      setStats(data)
    } catch (error) {
      console.error('加载统计失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadChartData = async () => {
    setChartLoading(true)
    try {
      const data = await adminApi2.getDashboardCharts(days)
      setChartData(data)
    } catch (error) {
      console.error('加载图表数据失败:', error)
    } finally {
      setChartLoading(false)
    }
  }

  const loadQuotaData = async () => {
    try {
      const data = await adminApi2.getApikeyMonitorSummary()
      setQuotaData(data)
    } catch (error) {
      console.error('加载额度数据失败:', error)
    }
  }

  // ECharts 基础配置 - 高端情绪版 (Neon/Glow/Emotional) - 中文限定
  const baseChartOption = {
    backgroundColor: 'transparent',
    textStyle: {
      fontFamily: '"SF Pro SC", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif',
      color: isDark ? '#94a3b8' : '#64748b'
    },
    grid: {
      left: '12',
      right: '20',
      bottom: '20',
      top: '90',
      containLabel: true
    },
    animationEasing: 'elasticOut',
    animationDelayUpdate: function (idx) {
      return idx * 5;
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: isDark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.9)',
      borderColor: isDark ? 'rgba(56, 189, 248, 0.3)' : 'rgba(14, 165, 233, 0.3)',
      borderWidth: 1,
      padding: 0,
      textStyle: { color: isDark ? '#fff' : '#0f172a' },
      axisPointer: {
        type: 'line',
        lineStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(56, 189, 248, 0)' },
              { offset: 0.5, color: '#38bdf8' },
              { offset: 1, color: 'rgba(56, 189, 248, 0)' }
            ]
          },
          width: 2
        }
      },
      extraCssText: 'box-shadow: 0 0 20px rgba(56, 189, 248, 0.15); backdrop-filter: blur(10px); border-radius: 12px; overflow: hidden;',
      formatter: (params) => {
        let content = `<div style="padding: 12px 16px; background: ${isDark ? 'linear-gradient(180deg, rgba(30, 41, 59, 0.4) 0%, rgba(15, 23, 42, 0.6) 100%)' : 'rgba(255,255,255,0.95)'}; border-bottom: 1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}">`
        content += `<div style="color: ${isDark ? '#94a3b8' : '#64748b'}; font-size: 12px; margin-bottom: 8px; font-weight: 500;">${params[0].axisValue}</div>`
        params.forEach(item => {
          content += `
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 24px; margin-bottom: 6px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="width: 8px; height: 8px; border-radius: 50%; background: ${item.color}; box-shadow: 0 0 8px ${item.color}"></span>
                <span style="font-weight: 500; font-size: 13px; color: ${isDark ? '#e2e8f0' : '#334155'}">${item.seriesName}</span>
              </div>
              <span style="font-weight: 700; font-size: 14px; font-family: monospace; color: ${isDark ? '#fff' : '#0f172a'}">${item.value}</span>
            </div>
          `
        })
        content += '</div>'
        return content
      }
    },
  }

  // 极光坐标轴样式
  const commonAxis = {
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: chartData?.dates?.map(d => d.slice(5)) || [],
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: isDark ? '#64748b' : '#94a3b8',
        margin: 16,
        fontSize: 11,
        fontFamily: 'monospace'
      },
    },
    yAxis: {
      type: 'value',
      splitLine: {
        lineStyle: {
          color: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
          type: 'dashed'
        }
      },
      axisLabel: {
        color: isDark ? '#64748b' : '#94a3b8',
        fontSize: 11,
        fontFamily: 'monospace'
      }
    }
  }

  // 1. 活动趋势图
  const activityTrendOption = {
    ...baseChartOption,
    title: {
      text: '活动趋势',
      subtext: '每日用户交互数据',
      left: '24',
      top: '16',
      textStyle: { color: isDark ? '#f8fafc' : '#0f172a', fontSize: 18, fontWeight: 700, letterSpacing: 0.5 },
      subtextStyle: { color: isDark ? '#64748b' : '#94a3b8', fontSize: 12, lineHeight: 20 }
    },
    legend: {
      right: 24, top: 20, icon: 'roundRect', itemWidth: 12, itemHeight: 4,
      textStyle: { color: isDark ? '#94a3b8' : '#64748b', fontSize: 12 }
    },
    xAxis: { ...commonAxis.xAxis, boundaryGap: false },
    yAxis: commonAxis.yAxis,
    series: [
      {
        name: '签到',
        type: 'line',
        smooth: 0.4,
        symbol: 'circle',
        symbolSize: 6,
        showSymbol: false,
        data: chartData?.signins || [],
        lineStyle: { width: 3, shadowColor: 'rgba(139, 92, 246, 0.5)', shadowBlur: 15 },
        itemStyle: { color: '#8b5cf6', borderColor: '#fff', borderWidth: 2 },
        emphasis: { scale: true, focus: 'series' },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{ offset: 0, color: 'rgba(139, 92, 246, 0.4)' }, { offset: 1, color: 'rgba(139, 92, 246, 0)' }]
          }
        }
      },
      {
        name: '抽奖',
        type: 'line',
        smooth: 0.4,
        symbol: 'circle',
        symbolSize: 6,
        showSymbol: false,
        data: chartData?.draws || [],
        lineStyle: { width: 3, shadowColor: 'rgba(236, 72, 153, 0.5)', shadowBlur: 15 },
        itemStyle: { color: '#ec4899', borderColor: '#fff', borderWidth: 2 },
        emphasis: { scale: true, focus: 'series' },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{ offset: 0, color: 'rgba(236, 72, 153, 0.4)' }, { offset: 1, color: 'rgba(236, 72, 153, 0)' }]
          }
        }
      },
      {
        name: '下注',
        type: 'line',
        smooth: 0.4,
        symbol: 'circle',
        symbolSize: 6,
        showSymbol: false,
        data: chartData?.bets || [],
        lineStyle: { width: 3, shadowColor: 'rgba(6, 182, 212, 0.5)', shadowBlur: 15 },
        itemStyle: { color: '#06b6d4', borderColor: '#fff', borderWidth: 2 },
        emphasis: { scale: true, focus: 'series' },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{ offset: 0, color: 'rgba(6, 182, 212, 0.4)' }, { offset: 1, color: 'rgba(6, 182, 212, 0)' }]
          }
        }
      },
    ]
  }

  // 2. 新增用户
  const newUserOption = {
    ...baseChartOption,
    title: {
      text: '新增用户',
      subtext: '每日注册统计',
      left: '24', top: '16',
      textStyle: { color: isDark ? '#f8fafc' : '#0f172a', fontSize: 18, fontWeight: 700, letterSpacing: 0.5 },
      subtextStyle: { color: isDark ? '#64748b' : '#94a3b8', fontSize: 12, lineHeight: 20 }
    },
    tooltip: { ...baseChartOption.tooltip, trigger: 'axis' },
    xAxis: { ...commonAxis.xAxis, boundaryGap: true },
    yAxis: commonAxis.yAxis,
    series: [{
      type: 'bar',
      name: '新增用户',
      barWidth: '24px',
      data: chartData?.new_users || [],
      itemStyle: {
        borderRadius: [4, 4, 0, 0],
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: '#3b82f6' },
            { offset: 1, color: 'rgba(59, 130, 246, 0.1)' }
          ]
        },
        shadowColor: 'rgba(59, 130, 246, 0.5)',
        shadowBlur: 10
      },
      emphasis: {
        itemStyle: {
          shadowBlur: 20,
          shadowColor: 'rgba(59, 130, 246, 0.8)'
        }
      },
      showBackground: true,
      backgroundStyle: {
        color: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
        borderRadius: [4, 4, 0, 0]
      }
    }],
  }

  // 3. 角色分布：炫酷水平条形图
  const roleDistributionOption = {
    ...baseChartOption,
    title: {
      text: '角色分布',
      left: '24', top: '16',
      textStyle: { color: isDark ? '#f8fafc' : '#0f172a', fontSize: 18, fontWeight: 700, letterSpacing: 0.5 }
    },
    legend: { show: false },
    tooltip: { ...baseChartOption.tooltip, trigger: 'axis' },
    xAxis: {
      type: 'value',
      splitLine: {
        lineStyle: {
          color: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
          type: 'dashed'
        }
      },
      axisLabel: {
        color: isDark ? '#64748b' : '#94a3b8',
        fontSize: 11,
        fontFamily: 'monospace'
      }
    },
    yAxis: {
      type: 'category',
      data: chartData?.role_distribution?.map(item => ROLE_NAME_MAP[item.name] || item.name).reverse() || [],
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: isDark ? '#94a3b8' : '#64748b',
        margin: 16,
        fontSize: 12,
        fontWeight: 'bold'
      },
    },
    series: [{
      type: 'bar',
      name: '用户数量',
      barWidth: '60%',
      data: chartData?.role_distribution?.map(item => item.value).reverse() || [],
      itemStyle: {
        borderRadius: [4, 4, 4, 4],
        color: new echarts.graphic.LinearGradient(1, 0, 0, 0, [ // Horizontal gradient
          { offset: 0, color: '#4ade80' },
          { offset: 1, color: '#22c55e' }
        ]),
        shadowColor: 'rgba(74, 222, 128, 0.6)',
        shadowBlur: 15
      },
      emphasis: {
        itemStyle: {
          shadowBlur: 25,
          shadowColor: 'rgba(74, 222, 128, 0.9)'
        }
      },
      label: {
        show: true,
        position: 'right',
        valueAnimation: true,
        fontFamily: 'monospace',
        color: isDark ? '#fff' : '#0f172a'
      }
    }],
  }

  // 4. 奖品分布：极简科技环
  const prizeDistributionOption = {
    ...baseChartOption,
    title: {
      text: '奖品分布',
      left: '24', top: '16',
      textStyle: { color: isDark ? '#f8fafc' : '#0f172a', fontSize: 18, fontWeight: 700, letterSpacing: 0.5 }
    },
    tooltip: {
      trigger: 'item',
      backgroundColor: isDark ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.95)',
      borderColor: isDark ? 'rgba(56, 189, 248, 0.3)' : 'rgba(14, 165, 233, 0.3)',
      borderWidth: 1,
      padding: [12, 16],
      textStyle: { color: isDark ? '#fff' : '#0f172a' },
      formatter: (params) => {
        return `<div style="font-weight: 600; margin-bottom: 4px;">${params.name}</div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="width: 10px; height: 10px; border-radius: 50%; background: ${params.color}; display: inline-block;"></span>
                  <span>数量: <strong>${params.value}</strong></span>
                  <span style="color: ${isDark ? '#94a3b8' : '#64748b'};">(${params.percent}%)</span>
                </div>`
      }
    },
    legend: {
      orient: 'vertical',
      right: '5%',
      top: 'center',
      itemGap: 20,
      icon: 'circle',
      textStyle: {
        color: isDark ? '#94a3b8' : '#64748b',
        fontSize: 12,
        rich: {
          name: {
            width: 50,
            align: 'left'
          },
          value: {
            width: 40,
            align: 'right',
            fontWeight: 'bold',
            color: isDark ? '#f8fafc' : '#0f172a'
          }
        }
      },
      formatter: (name) => {
        const item = chartData?.prize_distribution?.find(d => (PRIZE_TYPE_MAP[d.name] || d.name) === name);
        const rawName = item ? (PRIZE_TYPE_MAP[item.name] || item.name) : name;
        const value = item ? item.value : 0;
        return `{name|${rawName}}  {value|${value}}`;
      }
    },
    series: [{
      type: 'pie',
      radius: ['55%', '75%'],
      center: ['35%', '55%'], // Shift chart to left to accommodate legend
      avoidLabelOverlap: false,
      itemStyle: {
        borderRadius: 8,
        borderColor: isDark ? '#1e293b' : '#fff',
        borderWidth: 3,
        shadowColor: 'rgba(0, 0, 0, 0.2)',
        shadowBlur: 10
      },
      label: {
        show: false,
        position: 'center'
      },
      emphasis: {
        scale: true,
        scaleSize: 8,
        label: {
          show: true,
          fontSize: 20,
          fontWeight: 'bold',
          color: isDark ? '#fff' : '#0f172a',
          formatter: '{b}\n{c}'
        },
        itemStyle: {
          shadowBlur: 20,
          shadowColor: 'rgba(0,0,0,0.5)'
        }
      },
      labelLine: { show: false },
      data: chartData?.prize_distribution?.map(item => ({
        name: PRIZE_TYPE_MAP[item.name] || item.name,
        value: item.value,
      })) || [],
      // Sophisticated Cool Tone Palette
      color: [
        '#3b82f6', // Blue
        '#8b5cf6', // Violet
        '#06b6d4', // Cyan
        '#6366f1', // Indigo
        '#2dd4bf', // Teal
        '#a855f7'  // Purple
      ]
    },
    // Inner thin ring for decoration
    {
      type: 'pie',
      radius: ['50%', '51%'],
      center: ['35%', '55%'],
      itemStyle: {
        color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
        label: { show: false },
        labelLine: { show: false }
      },
      silent: true,
      data: [{ value: 1 }]
    }]
  }

  // 5. 积分流动
  const pointsFlowOption = {
    ...baseChartOption,
    title: {
      text: '积分流动',
      subtext: '系统经济概况',
      left: '24', top: '16',
      textStyle: { color: isDark ? '#f8fafc' : '#0f172a', fontSize: 18, fontWeight: 700, letterSpacing: 0.5 },
      subtextStyle: { color: isDark ? '#64748b' : '#94a3b8', fontSize: 12, lineHeight: 20 }
    },
    legend: { right: 24, top: 20, textStyle: { color: isDark ? '#94a3b8' : '#64748b' } },
    xAxis: { ...commonAxis.xAxis, boundaryGap: true },
    yAxis: commonAxis.yAxis,
    series: [
      {
        name: '流入',
        type: 'bar',
        barWidth: '16px',
        barGap: '40%',
        data: chartData?.points_in || [],
        itemStyle: {
          borderRadius: [4, 4, 4, 4],
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{ offset: 0, color: '#4ade80' }, { offset: 1, color: '#22c55e' }]
          },
          shadowColor: 'rgba(74, 222, 128, 0.4)',
          shadowBlur: 10
        },
        emphasis: {
          itemStyle: { shadowBlur: 20, shadowColor: 'rgba(74, 222, 128, 0.6)' }
        }
      },
      {
        name: '流出',
        type: 'bar',
        barWidth: '16px',
        data: chartData?.points_out || [],
        itemStyle: {
          borderRadius: [4, 4, 4, 4],
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{ offset: 0, color: '#f87171' }, { offset: 1, color: '#ef4444' }]
          },
          shadowColor: 'rgba(248, 113, 113, 0.4)',
          shadowBlur: 10
        },
        emphasis: {
          itemStyle: { shadowBlur: 20, shadowColor: 'rgba(248, 113, 113, 0.6)' }
        }
      },
    ],
  }

  // 6. API 消耗额度 - 水平条形图
  const quotaItems = quotaData?.items?.filter(item => item.quota && item.query_status === 'ok') || []
  const topQuotaItems = quotaItems.slice(0, 10) // 取消耗最高的前10名
  const apiQuotaOption = {
    ...baseChartOption,
    title: {
      text: 'API 消耗排行',
      subtext: `总消耗: $${quotaData?.total_used?.toFixed(2) || '0.00'}`,
      left: '24', top: '16',
      textStyle: { color: isDark ? '#f8fafc' : '#0f172a', fontSize: 18, fontWeight: 700, letterSpacing: 0.5 },
      subtextStyle: { color: '#f59e0b', fontSize: 14, fontWeight: 600, lineHeight: 24 }
    },
    grid: {
      left: '20',
      right: '80',
      bottom: '30',
      top: '90',
      containLabel: true
    },
    tooltip: {
      ...baseChartOption.tooltip,
      trigger: 'axis',
      formatter: (params) => {
        const item = params[0]
        if (!item) return ''
        // 数据是反转的，需要计算正确的索引
        const reversedIndex = topQuotaItems.length - 1 - item.dataIndex
        const data = topQuotaItems[reversedIndex]
        return `
          <div style="padding: 12px 16px;">
            <div style="font-weight: 600; margin-bottom: 8px; color: ${isDark ? '#fff' : '#0f172a'}">${item.name}</div>
            <div style="display: flex; justify-content: space-between; gap: 24px; margin-bottom: 4px;">
              <span style="color: ${isDark ? '#94a3b8' : '#64748b'}">已消耗</span>
              <span style="font-weight: 700; color: #f59e0b">$${data?.quota?.used?.toFixed(2) || '0.00'}</span>
            </div>
            <div style="display: flex; justify-content: space-between; gap: 24px;">
              <span style="color: ${isDark ? '#94a3b8' : '#64748b'}">今日消耗</span>
              <span style="font-weight: 600; color: #3b82f6">$${data?.quota?.today_used?.toFixed(2) || '0.00'}</span>
            </div>
          </div>
        `
      }
    },
    xAxis: {
      type: 'value',
      splitLine: {
        lineStyle: {
          color: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
          type: 'dashed'
        }
      },
      axisLabel: {
        color: isDark ? '#64748b' : '#94a3b8',
        fontSize: 11,
        fontFamily: 'monospace',
        formatter: (value) => `$${value}`
      }
    },
    yAxis: {
      type: 'category',
      data: topQuotaItems.map(item => item.user?.display_name || item.title || '未知').reverse(),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: isDark ? '#94a3b8' : '#64748b',
        margin: 12,
        fontSize: 12,
        fontWeight: 500,
        width: 80,
        overflow: 'truncate',
        ellipsis: '...'
      },
    },
    series: [{
      type: 'bar',
      name: '消耗额度',
      barWidth: '60%',
      data: topQuotaItems.map(item => item.quota?.used || 0).reverse(),
      itemStyle: {
        borderRadius: [0, 4, 4, 0],
        color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
          { offset: 0, color: '#f59e0b' },
          { offset: 1, color: '#fbbf24' }
        ]),
        shadowColor: 'rgba(245, 158, 11, 0.4)',
        shadowBlur: 8
      },
      label: {
        show: true,
        position: 'right',
        formatter: (params) => `$${params.value.toFixed(2)}`,
        color: isDark ? '#fbbf24' : '#f59e0b',
        fontSize: 11,
        fontWeight: 600,
        fontFamily: 'monospace'
      },
      emphasis: {
        itemStyle: {
          shadowBlur: 15,
          shadowColor: 'rgba(245, 158, 11, 0.6)'
        }
      }
    }],
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {Array(6).fill(0).map((_, i) => (
          <div key={i} className="animate-pulse bg-slate-100 dark:bg-slate-800 rounded-xl h-24" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard title="总用户数" value={stats?.total_users || 0} icon={Users} color="blue" />
        <StatCard title="今日活跃" value={stats?.active_users_today || 0} icon={TrendingUp} color="green" />
        <StatCard title="积分流通" value={stats?.total_points_circulation || 0} icon={Coins} color="orange" />
        <StatCard title="今日签到" value={stats?.total_signins_today || 0} icon={Calendar} color="purple" />
        <StatCard title="今日抽奖" value={stats?.total_draws_today || 0} icon={Gift} color="pink" />
        <StatCard title="今日下注" value={stats?.total_bets_today || 0} icon={BarChart3} color="cyan" />
      </div>

      {/* 时间范围选择 */}
      <div className="flex items-center justify-end gap-2">
        <span className="text-sm text-slate-500">时间范围:</span>
        {[7, 14, 30].map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`px-3 py-1 text-sm rounded-lg transition-colors ${
              days === d
                ? 'bg-blue-500 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {d}天
          </button>
        ))}
      </div>

      {/* 图表区域 */}
      {chartLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array(4).fill(0).map((_, i) => (
            <div key={i} className="animate-pulse bg-slate-100/50 dark:bg-slate-800/50 rounded-2xl h-[340px] border border-slate-200/50 dark:border-slate-800/50" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 活动趋势 */}
          <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-slate-700/30 p-2 shadow-xl shadow-slate-200/20 dark:shadow-black/20 hover:shadow-2xl transition-shadow duration-500">
            <div className="bg-gradient-to-br from-white/40 to-transparent dark:from-slate-800/20 dark:to-transparent rounded-xl p-5 h-full">
              <ReactECharts option={activityTrendOption} style={{ height: '360px' }} />
            </div>
          </div>

          {/* 新增用户 */}
          <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-slate-700/30 p-2 shadow-xl shadow-slate-200/20 dark:shadow-black/20 hover:shadow-2xl transition-shadow duration-500">
            <div className="bg-gradient-to-br from-white/40 to-transparent dark:from-slate-800/20 dark:to-transparent rounded-xl p-5 h-full">
              <ReactECharts option={newUserOption} style={{ height: '360px' }} />
            </div>
          </div>

          {/* 用户角色分布 */}
          <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-slate-700/30 p-2 shadow-xl shadow-slate-200/20 dark:shadow-black/20 hover:shadow-2xl transition-shadow duration-500">
            <div className="bg-gradient-to-br from-white/40 to-transparent dark:from-slate-800/20 dark:to-transparent rounded-xl p-5 h-full">
              <ReactECharts option={roleDistributionOption} style={{ height: '360px' }} />
            </div>
          </div>

          {/* 奖品类型分布 */}
          <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-slate-700/30 p-2 shadow-xl shadow-slate-200/20 dark:shadow-black/20 hover:shadow-2xl transition-shadow duration-500">
            <div className="bg-gradient-to-br from-white/40 to-transparent dark:from-slate-800/20 dark:to-transparent rounded-xl p-5 h-full">
              <ReactECharts option={prizeDistributionOption} style={{ height: '360px' }} />
            </div>
          </div>

          {/* 积分流动 - 占满整行 */}
          <div className="lg:col-span-2 bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-slate-700/30 p-2 shadow-xl shadow-slate-200/20 dark:shadow-black/20 hover:shadow-2xl transition-shadow duration-500">
            <div className="bg-gradient-to-br from-white/40 to-transparent dark:from-slate-800/20 dark:to-transparent rounded-xl p-5 h-full">
              <ReactECharts option={pointsFlowOption} style={{ height: '420px' }} />
            </div>
          </div>

          {/* API 消耗排行 - 占满整行 */}
          <div className="lg:col-span-2 bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-slate-700/30 p-2 shadow-xl shadow-slate-200/20 dark:shadow-black/20 hover:shadow-2xl transition-shadow duration-500">
            <div className="bg-gradient-to-br from-white/40 to-transparent dark:from-slate-800/20 dark:to-transparent rounded-xl p-5 h-full">
              {quotaData ? (
                <ReactECharts option={apiQuotaOption} style={{ height: '420px' }} />
              ) : (
                <div className="h-[420px] flex items-center justify-center text-slate-400">
                  <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                  加载中...
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// 角色配置
const ROLE_OPTIONS = [
  { value: 'spectator', label: '观众', color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
  { value: 'contestant', label: '选手', color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
  { value: 'reviewer', label: '评审', color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' },
  { value: 'admin', label: '管理员', color: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' },
]

const getRoleConfig = (role) => ROLE_OPTIONS.find(r => r.value === role) || ROLE_OPTIONS[0]

// 用户管理面板
function UsersPanel() {
  const toast = useToast()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all') // 角色筛选
  const [editingUser, setEditingUser] = useState(null)
  const [editSaving, setEditSaving] = useState(false)
  const [editForm, setEditForm] = useState({ username: '', display_name: '', email: '' })
  const [roleDropdown, setRoleDropdown] = useState(null)
  const [pointsModal, setPointsModal] = useState(null)
  const [pointsAmount, setPointsAmount] = useState('')
  const [pointsReason, setPointsReason] = useState('管理员调整')

  useEffect(() => {
    loadUsers()
  }, [roleFilter]) // 角色筛选变化时重新加载

  // 点击外部关闭角色下拉菜单
  useEffect(() => {
    const handleClickOutside = () => setRoleDropdown(null)
    if (roleDropdown) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [roleDropdown])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const params = { search, limit: 50 }
      if (roleFilter !== 'all') {
        params.role = roleFilter
      }
      const data = await adminApi2.getUsers(params)
      setUsers(data.items)
    } catch (error) {
      toast.error('加载用户失败')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    loadUsers()
  }

  const handleUpdateUser = async (userId, updates) => {
    try {
      await adminApi2.updateUser(userId, updates)
      toast.success('更新成功')
      setEditingUser(null)
      loadUsers()
    } catch (error) {
      toast.error(error.response?.data?.detail || '更新失败')
    }
  }

  const handleAdjustPoints = async () => {
    if (!pointsAmount || isNaN(parseInt(pointsAmount))) {
      toast.error('请输入有效金额')
      return
    }

    try {
      await adminApi2.adjustPoints(pointsModal.id, {
        amount: parseInt(pointsAmount),
        reason: pointsReason
      })
      toast.success('积分调整成功')
      setPointsModal(null)
      setPointsAmount('')
      loadUsers()
    } catch (error) {
      toast.error(error.response?.data?.detail || '调整失败')
    }
  }

  const openEditUser = (user) => {
    setEditingUser(user)
    setEditForm({
      username: user.username || '',
      display_name: user.display_name || '',
      email: user.email || '',
    })
  }

  const handleSaveUserEdit = async () => {
    if (!editingUser) return
    const username = editForm.username.trim()
    if (!username) {
      toast.error('用户名不能为空')
      return
    }
    const displayName = editForm.display_name?.trim() || null
    const emailValue = editForm.email?.trim().toLowerCase() || null
    const payload = {}
    if (username !== editingUser.username) {
      payload.username = username
    }
    if ((editingUser.display_name || null) !== displayName) {
      payload.display_name = displayName
    }
    if ((editingUser.email || null) !== emailValue) {
      payload.email = emailValue
    }
    if (Object.keys(payload).length === 0) {
      toast.warning('未检测到可更新内容')
      setEditingUser(null)
      return
    }
    setEditSaving(true)
    try {
      await adminApi2.updateUser(editingUser.id, payload)
      toast.success('用户资料已更新')
      setEditingUser(null)
      loadUsers()
    } catch (error) {
      toast.error(error.response?.data?.detail || '更新失败')
    } finally {
      setEditSaving(false)
    }
  }

  return (
    <div>
      {/* 搜索栏和筛选 */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        {/* 角色筛选标签 */}
        <div className="flex items-center gap-1 flex-wrap">
          <button
            onClick={() => setRoleFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              roleFilter === 'all'
                ? 'bg-blue-500 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            全部
          </button>
          {ROLE_OPTIONS.map((role) => (
            <button
              key={role.value}
              onClick={() => setRoleFilter(role.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                roleFilter === role.value
                  ? 'bg-blue-500 text-white'
                  : `${role.color} hover:ring-2 hover:ring-blue-300`
              }`}
            >
              {role.label}
            </button>
          ))}
        </div>

        {/* 搜索框 */}
        <div className="flex gap-2 flex-1">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="搜索用户名、昵称、邮箱..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            搜索
          </button>
        </div>
      </div>

      {/* 用户列表 */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead className="bg-slate-50 dark:bg-slate-800">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 dark:text-slate-400">用户</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 dark:text-slate-400">角色</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 dark:text-slate-400">积分</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 dark:text-slate-400">状态</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-slate-600 dark:text-slate-400">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                  加载中...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  暂无用户
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={resolveAvatarUrl(user?.avatar_url)}
                        alt=""
                        className="w-8 h-8 rounded-full"
                      />
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">{user.display_name || user.username}</p>
                        <p className="text-xs text-slate-500">@{user.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setRoleDropdown(roleDropdown === user.id ? null : user.id)
                        }}
                        className={`px-2 py-1 rounded text-xs font-medium cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all ${getRoleConfig(user.role).color}`}
                      >
                        {getRoleConfig(user.role).label}
                        <ChevronDown className="w-3 h-3 inline-block ml-1" />
                      </button>
                      {roleDropdown === user.id && (
                        <div className="absolute z-20 top-full left-0 mt-1 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 min-w-[120px]">
                          {ROLE_OPTIONS.map((role) => (
                            <button
                              key={role.value}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleUpdateUser(user.id, { role: role.value })
                                setRoleDropdown(null)
                              }}
                              className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 ${
                                user.role === role.value ? 'bg-slate-50 dark:bg-slate-700' : ''
                              }`}
                            >
                              <span className={`w-2 h-2 rounded-full ${role.color.split(' ')[0]}`}></span>
                              {role.label}
                              {user.role === role.value && <Check className="w-3 h-3 ml-auto text-blue-500" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-yellow-600">{user.balance}</span>
                    <span className="text-xs text-slate-400 ml-1">积分</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      user.is_active
                        ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {user.is_active ? '正常' : '禁用'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEditUser(user)}
                        className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                        title="编辑资料"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setPointsModal(user)}
                        className="p-1.5 text-slate-400 hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/30 rounded transition-colors"
                        title="调整积分"
                      >
                        <Coins className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleUpdateUser(user.id, { is_active: !user.is_active })}
                        className={`p-1.5 rounded transition-colors ${
                          user.is_active
                            ? 'text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30'
                            : 'text-slate-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/30'
                        }`}
                        title={user.is_active ? '禁用用户' : '启用用户'}
                      >
                        {user.is_active ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* 积分调整弹窗 */}
      {pointsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setPointsModal(null)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
              调整积分 - {pointsModal.display_name || pointsModal.username}
            </h3>
            <p className="text-sm text-slate-500 mb-4">当前余额: {pointsModal.balance} 积分</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  调整数量（正数增加，负数扣除）
                </label>
                <input
                  type="number"
                  value={pointsAmount}
                  onChange={(e) => setPointsAmount(e.target.value)}
                  placeholder="输入积分数量"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  原因说明
                </label>
                <input
                  type="text"
                  value={pointsReason}
                  onChange={(e) => setPointsReason(e.target.value)}
                  placeholder="调整原因"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setPointsModal(null)}
                className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                取消
              </button>
              <button
                onClick={handleAdjustPoints}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                确认调整
              </button>
            </div>
          </div>
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => !editSaving && setEditingUser(null)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
              编辑用户 - {editingUser.display_name || editingUser.username}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  用户名
                </label>
                <input
                  type="text"
                  value={editForm.username}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, username: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  昵称
                </label>
                <input
                  type="text"
                  value={editForm.display_name}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, display_name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  邮箱
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditingUser(null)}
                className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                disabled={editSaving}
              >
                取消
              </button>
              <button
                onClick={handleSaveUserEdit}
                disabled={editSaving}
                className={`flex-1 px-4 py-2 text-white rounded-lg ${editSaving ? 'bg-slate-400' : 'bg-blue-500 hover:bg-blue-600'}`}
              >
                {editSaving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
  }

  // 赛事管理面板
  function ContestManagementPanel() {
    const toast = useToast()
    const [contests, setContests] = useState([])
    const [loading, setLoading] = useState(true)
    const [showEditor, setShowEditor] = useState(false)
    const [saving, setSaving] = useState(false)
    const [editingContest, setEditingContest] = useState(null)
    const [formData, setFormData] = useState({ ...CONTEST_FORM_DEFAULT })
    const [bannerUploading, setBannerUploading] = useState(false)
    const bannerInputRef = useRef(null)

    const loadContests = async () => {
      setLoading(true)
      try {
        const data = await adminApi2.get('/contests')
        setContests(data.items || [])
      } catch (error) {
        console.error('加载赛事失败:', error)
        toast.error('加载赛事失败')
      } finally {
        setLoading(false)
      }
    }

    useEffect(() => {
      loadContests()
    }, [])

    const buildFormData = (contest) => ({
      title: contest?.title || '',
      description: contest?.description || '',
      phase: contest?.phase || 'upcoming',
      visibility: contest?.visibility || 'published',
      home_visible: contest?.home_visible ?? false,
      banner_url: contest?.banner_url || '',
      rules_md: contest?.rules_md || '',
      prizes_md: contest?.prizes_md || '',
      review_rules_md: contest?.review_rules_md || '',
      faq_md: contest?.faq_md || '',
      ...buildTemplateFormData(contest?.template_config),
      signup_start: toContestDatetimeInput(contest?.signup_start),
      signup_end: toContestDatetimeInput(contest?.signup_end),
      submit_start: toContestDatetimeInput(contest?.submit_start),
      submit_end: toContestDatetimeInput(contest?.submit_end),
      vote_start: toContestDatetimeInput(contest?.vote_start),
      vote_end: toContestDatetimeInput(contest?.vote_end),
    })

    const openEditor = (contest = null) => {
      setEditingContest(contest)
      setFormData(contest ? buildFormData(contest) : { ...CONTEST_FORM_DEFAULT })
      setShowEditor(true)
    }

    const updateField = (key, value) => {
      setFormData((prev) => ({ ...prev, [key]: value }))
    }

    const normalizeText = (value) => {
      const text = String(value ?? '').trim()
      return text ? text : null
    }

    const buildTemplateConfig = () => {
      const riskRulesResult = parseRiskRulesText(formData.template_risk_rules)
      if (riskRulesResult.error) return { error: riskRulesResult.error }

      const reviewWeightsResult = parseReviewWeightsText(formData.template_review_weights)
      if (reviewWeightsResult.error) return { error: reviewWeightsResult.error }

      const processStepsResult = parseProcessStepsText(formData.template_process_steps)
      if (processStepsResult.error) return { error: processStepsResult.error }

      const prizeSection = compactTextObject({
        title: formData.template_prize_section_title,
        intro: formData.template_prize_section_intro,
      })

      const champion = compactTextObject({
        title: formData.template_prize_champion_title,
        subtitle: formData.template_prize_champion_subtitle,
        count: formData.template_prize_champion_count,
        badge: formData.template_prize_champion_badge,
        cashPrize: formData.template_prize_champion_cash_prize,
        apiReturn: formData.template_prize_champion_api_return,
        apiLimit: formData.template_prize_champion_api_limit,
        discount: formData.template_prize_champion_discount,
        discountNote: formData.template_prize_champion_discount_note,
        buttonText: formData.template_prize_champion_button_text,
        buttonUrl: formData.template_prize_champion_button_url,
      })

      const second = compactTextObject({
        title: formData.template_prize_second_title,
        subtitle: formData.template_prize_second_subtitle,
        count: formData.template_prize_second_count,
        apiReturn: formData.template_prize_second_api_return,
        apiLimit: formData.template_prize_second_api_limit,
        discount: formData.template_prize_second_discount,
      })

      const third = compactTextObject({
        title: formData.template_prize_third_title,
        subtitle: formData.template_prize_third_subtitle,
        count: formData.template_prize_third_count,
        apiReturn: formData.template_prize_third_api_return,
        apiLimit: formData.template_prize_third_api_limit,
        discount: formData.template_prize_third_discount,
      })

      const participation = compactTextObject({
        title: formData.template_participation_title,
        description: formData.template_participation_description,
        reward: formData.template_participation_reward,
        extra: formData.template_participation_extra,
      })

      const prizes = {}
      if (champion) prizes.champion = champion
      if (second) prizes.second = second
      if (third) prizes.third = third
      if (participation) prizes.participation = participation

      const templateConfig = {}
      if (prizeSection) templateConfig.prize_section = prizeSection
      if (Object.keys(prizes).length) templateConfig.prizes = prizes
      if (riskRulesResult.items.length) templateConfig.risk_rules = riskRulesResult.items
      if (reviewWeightsResult.items.length) templateConfig.review_weights = reviewWeightsResult.items
      if (processStepsResult.items.length) templateConfig.process_steps = processStepsResult.items

      return {
        config: Object.keys(templateConfig).length ? templateConfig : null,
      }
    }

    const buildPayload = (templateConfig) => ({
      title: formData.title.trim(),
      description: formData.description.trim() || null,
      phase: formData.phase || null,
      visibility: formData.visibility || null,
      home_visible: formData.home_visible ?? false,
      rules_md: normalizeText(formData.rules_md),
      prizes_md: normalizeText(formData.prizes_md),
      review_rules_md: normalizeText(formData.review_rules_md),
      faq_md: normalizeText(formData.faq_md),
      template_config: templateConfig,
      signup_start: formData.signup_start || null,
      signup_end: formData.signup_end || null,
      submit_start: formData.submit_start || null,
      submit_end: formData.submit_end || null,
      vote_start: formData.vote_start || null,
      vote_end: formData.vote_end || null,
    })

    const handleSave = async () => {
      const title = formData.title.trim()
      if (!title) {
        toast.error('请输入赛事标题')
        return
      }

      const templateConfigResult = buildTemplateConfig()
      if (templateConfigResult.error) {
        toast.error(templateConfigResult.error)
        return
      }

      setSaving(true)
      try {
        const payload = buildPayload(templateConfigResult.config)
        if (editingContest) {
          await adminApi2.patch(`/contests/${editingContest.id}`, payload)
          toast.success('赛事已更新')
        } else {
          await adminApi2.post('/contests', payload)
          toast.success('赛事已创建')
        }
        setShowEditor(false)
        loadContests()
      } catch (error) {
        console.error('保存赛事失败:', error)
        toast.error('保存赛事失败')
      } finally {
        setSaving(false)
      }
    }

    const handleBannerPick = () => {
      if (!editingContest?.id) {
        toast.error('请先保存赛事后再上传 Banner')
        return
      }
      if (bannerUploading) return
      bannerInputRef.current?.click()
    }

    const handleBannerChange = async (event) => {
      const file = event.target.files?.[0] || null
      event.target.value = ''
      if (!file) return
      if (!editingContest?.id) {
        toast.error('请先保存赛事后再上传 Banner')
        return
      }
      const error = validateImageFile(file, MAX_BANNER_BYTES)
      if (error) {
        toast.error(error)
        return
      }
      setBannerUploading(true)
      try {
        const res = await contestApi.uploadBanner(editingContest.id, file)
        setFormData((prev) => ({ ...prev, banner_url: res?.banner_url || prev.banner_url }))
        toast.success('Banner 已上传')
        await loadContests()
      } catch (error) {
        console.error('上传 Banner 失败:', error)
        toast.error('上传 Banner 失败')
      } finally {
        setBannerUploading(false)
      }
    }

    const handleClearBanner = async () => {
      if (!editingContest?.id) return
      if (bannerUploading) return
      setBannerUploading(true)
      try {
        await adminApi2.patch(`/contests/${editingContest.id}`, { banner_url: null })
        setFormData((prev) => ({ ...prev, banner_url: '' }))
        toast.success('Banner 已清除')
        await loadContests()
      } catch (error) {
        console.error('清除 Banner 失败:', error)
        toast.error('清除 Banner 失败')
      } finally {
        setBannerUploading(false)
      }
    }

    const renderTimeRange = (start, end) => {
      if (!start && !end) {
        return '未配置'
      }
      return `${formatContestDateTime(start)} ~ ${formatContestDateTime(end)}`
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20">
              <Award className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">赛事管理</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">创建与维护比赛阶段配置</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadContests}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </button>
            <button
              onClick={() => openEditor()}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-medium shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all hover:-translate-y-0.5"
            >
              <Plus className="w-4 h-4" />
              新建赛事
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-500">加载中...</div>
          ) : contests.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <Award className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>暂无赛事</p>
              <p className="text-sm mt-1">点击上方按钮创建第一场赛事</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {contests.map((contest) => (
                <div key={contest.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                          {contest.title}
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200">
                          {CONTEST_PHASE_LABELS[contest.phase] || contest.phase || '未知'}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs ${CONTEST_VISIBILITY_STYLES[contest.visibility] || 'bg-slate-100 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300'}`}
                        >
                          {CONTEST_VISIBILITY_LABELS[contest.visibility] || contest.visibility || '未知'}
                        </span>
                        {contest.home_visible && (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-200">
                            首页展示
                          </span>
                        )}
                      </div>
                      {contest.description && (
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                          {contest.description}
                        </p>
                      )}
                      <div className="text-xs text-slate-500 dark:text-slate-500 mt-2">
                        赛事 ID：{contest.id}
                      </div>
                    </div>
                    <button
                      onClick={() => openEditor(contest)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                      编辑
                    </button>
                  </div>
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-600 dark:text-slate-400">
                    <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3">
                      <div className="font-medium text-slate-700 dark:text-slate-300">报名期</div>
                      <div className="mt-1">{renderTimeRange(contest.signup_start, contest.signup_end)}</div>
                    </div>
                    <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3">
                      <div className="font-medium text-slate-700 dark:text-slate-300">提交期</div>
                      <div className="mt-1">{renderTimeRange(contest.submit_start, contest.submit_end)}</div>
                    </div>
                    <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3">
                      <div className="font-medium text-slate-700 dark:text-slate-300">投票期</div>
                      <div className="mt-1">{renderTimeRange(contest.vote_start, contest.vote_end)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {showEditor && (
          <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto"
            onClick={() => setShowEditor(false)}
          >
            <div className="min-h-full flex items-start justify-center px-4 py-8">
              <div
                className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[90vh]"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {editingContest ? '编辑赛事' : '新建赛事'}
                  </h3>
                  <button
                    onClick={() => setShowEditor(false)}
                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 space-y-4 overflow-y-auto">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        赛事标题 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => updateField('title', e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="请输入赛事名称"
                      />
                    </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      当前阶段
                    </label>
                    <select
                      value={formData.phase}
                      onChange={(e) => updateField('phase', e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    >
                      {CONTEST_PHASE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      可见性
                    </label>
                    <select
                      value={formData.visibility}
                      onChange={(e) => updateField('visibility', e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    >
                      {CONTEST_VISIBILITY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      首页展示
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!!formData.home_visible}
                        onChange={(e) => updateField('home_visible', e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-600 dark:text-slate-300">
                        设为首页展示（自动取消其他比赛的首页展示）
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    赛事描述
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => updateField('description', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                    placeholder="简要说明比赛内容与规则"
                  />
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40 p-4 space-y-4">
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">赛事内容配置（Markdown）</div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      赛事 Banner（上传图片）
                    </label>
                    <div className="flex flex-wrap items-center gap-3">
                      <input
                        ref={bannerInputRef}
                        type="file"
                        accept={IMAGE_ACCEPT}
                        className="hidden"
                        onChange={handleBannerChange}
                      />
                      <button
                        type="button"
                        onClick={handleBannerPick}
                        disabled={bannerUploading || !editingContest?.id}
                        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                          bannerUploading || !editingContest?.id
                            ? 'opacity-50 pointer-events-none bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-500'
                            : 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600 shadow-lg shadow-blue-500/20'
                        }`}
                      >
                        {bannerUploading ? '上传中...' : '上传 Banner'}
                      </button>
                      {formData.banner_url && (
                        <button
                          type="button"
                          onClick={handleClearBanner}
                          disabled={bannerUploading}
                          className={`inline-flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                            bannerUploading
                              ? 'opacity-50 pointer-events-none border-slate-200 text-slate-400 dark:border-slate-700'
                              : 'border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          清除 Banner
                        </button>
                      )}
                    </div>
                    {formData.banner_url ? (
                      <div className="mt-3">
                        <img
                          src={formData.banner_url}
                          alt="赛事 Banner"
                          className="w-full max-w-xl rounded-xl border border-slate-200 dark:border-slate-700 object-cover"
                        />
                      </div>
                    ) : (
                      <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">未上传 Banner</div>
                    )}
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      建议 16:9 比例，最大 5MB。请先保存赛事后再上传。
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      赛事规则补充
                    </label>
                    <textarea
                      value={formData.rules_md}
                      onChange={(e) => updateField('rules_md', e.target.value)}
                      rows={4}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-vertical"
                      placeholder="填写赛事规则补充（Markdown）"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      奖项补充说明
                    </label>
                    <textarea
                      value={formData.prizes_md}
                      onChange={(e) => updateField('prizes_md', e.target.value)}
                      rows={4}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-vertical"
                      placeholder="填写奖项补充说明（Markdown）"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      评审规则补充
                    </label>
                    <textarea
                      value={formData.review_rules_md}
                      onChange={(e) => updateField('review_rules_md', e.target.value)}
                      rows={4}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-vertical"
                      placeholder="填写评审规则补充（Markdown）"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      常见问题补充
                    </label>
                    <textarea
                      value={formData.faq_md}
                      onChange={(e) => updateField('faq_md', e.target.value)}
                      rows={4}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-vertical"
                      placeholder="填写 FAQ 补充（Markdown）"
                    />
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    支持 Markdown，作为首页模板的补充说明展示。
                  </div>
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 p-4 space-y-4">
                    <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      首页模板文字配置
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          奖项区标题
                        </label>
                        <input
                          value={formData.template_prize_section_title}
                          onChange={(e) => updateField('template_prize_section_title', e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          placeholder={`默认：${DEFAULT_PRIZE_SECTION_TITLE}`}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          奖项区说明
                        </label>
                        <textarea
                          value={formData.template_prize_section_intro}
                          onChange={(e) => updateField('template_prize_section_intro', e.target.value)}
                          rows={2}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-vertical"
                          placeholder={`默认：${DEFAULT_PRIZE_SECTION_INTRO}`}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                        冠军卡片
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          名称
                        </label>
                        <input
                          value={formData.template_prize_champion_title}
                          onChange={(e) => updateField('template_prize_champion_title', e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          placeholder={`默认：${PRIZE_CONFIG.champion.title}`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          副标题
                        </label>
                        <input
                          value={formData.template_prize_champion_subtitle}
                          onChange={(e) => updateField('template_prize_champion_subtitle', e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          placeholder={`默认：${PRIZE_CONFIG.champion.subtitle}`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          名额
                        </label>
                        <input
                          value={formData.template_prize_champion_count}
                          onChange={(e) => updateField('template_prize_champion_count', e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          placeholder={`默认：${PRIZE_CONFIG.champion.count}`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          徽章文案
                        </label>
                        <input
                          value={formData.template_prize_champion_badge}
                          onChange={(e) => updateField('template_prize_champion_badge', e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          placeholder={`默认：${PRIZE_CONFIG.champion.badge}`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          现金奖励
                        </label>
                        <input
                          value={formData.template_prize_champion_cash_prize}
                          onChange={(e) => updateField('template_prize_champion_cash_prize', e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          placeholder={`默认：${PRIZE_CONFIG.champion.cashPrize}`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          API 返还
                        </label>
                        <input
                          value={formData.template_prize_champion_api_return}
                          onChange={(e) => updateField('template_prize_champion_api_return', e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          placeholder={`默认：${PRIZE_CONFIG.champion.apiReturn}`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          API 上限
                        </label>
                        <input
                          value={formData.template_prize_champion_api_limit}
                          onChange={(e) => updateField('template_prize_champion_api_limit', e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          placeholder={`默认：${PRIZE_CONFIG.champion.apiLimit}`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          折扣
                        </label>
                        <input
                          value={formData.template_prize_champion_discount}
                          onChange={(e) => updateField('template_prize_champion_discount', e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          placeholder={`默认：${PRIZE_CONFIG.champion.discount}`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          折扣说明
                        </label>
                        <input
                          value={formData.template_prize_champion_discount_note}
                          onChange={(e) => updateField('template_prize_champion_discount_note', e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          placeholder={`默认：${PRIZE_CONFIG.champion.discountNote}`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          按钮文案
                        </label>
                        <input
                          value={formData.template_prize_champion_button_text}
                          onChange={(e) => updateField('template_prize_champion_button_text', e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          placeholder={`默认：${PRIZE_CONFIG.champion.buttonText}`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          按钮链接
                        </label>
                        <input
                          value={formData.template_prize_champion_button_url}
                          onChange={(e) => updateField('template_prize_champion_button_url', e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          placeholder="默认：https://api.ikuncode.cc/"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                        亚军卡片
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          名称
                        </label>
                        <input
                          value={formData.template_prize_second_title}
                          onChange={(e) => updateField('template_prize_second_title', e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          placeholder={`默认：${PRIZE_CONFIG.second.title}`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          副标题
                        </label>
                        <input
                          value={formData.template_prize_second_subtitle}
                          onChange={(e) => updateField('template_prize_second_subtitle', e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          placeholder={`默认：${PRIZE_CONFIG.second.subtitle}`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          名额
                        </label>
                        <input
                          value={formData.template_prize_second_count}
                          onChange={(e) => updateField('template_prize_second_count', e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          placeholder={`默认：${PRIZE_CONFIG.second.count}`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          API 返还
                        </label>
                        <input
                          value={formData.template_prize_second_api_return}
                          onChange={(e) => updateField('template_prize_second_api_return', e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          placeholder={`默认：${PRIZE_CONFIG.second.apiReturn}`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          API 上限
                        </label>
                        <input
                          value={formData.template_prize_second_api_limit}
                          onChange={(e) => updateField('template_prize_second_api_limit', e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          placeholder={`默认：${PRIZE_CONFIG.second.apiLimit}`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          折扣
                        </label>
                        <input
                          value={formData.template_prize_second_discount}
                          onChange={(e) => updateField('template_prize_second_discount', e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          placeholder={`默认：${PRIZE_CONFIG.second.discount}`}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                        季军卡片
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          名称
                        </label>
                        <input
                          value={formData.template_prize_third_title}
                          onChange={(e) => updateField('template_prize_third_title', e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          placeholder={`默认：${PRIZE_CONFIG.third.title}`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          副标题
                        </label>
                        <input
                          value={formData.template_prize_third_subtitle}
                          onChange={(e) => updateField('template_prize_third_subtitle', e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          placeholder={`默认：${PRIZE_CONFIG.third.subtitle}`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          名额
                        </label>
                        <input
                          value={formData.template_prize_third_count}
                          onChange={(e) => updateField('template_prize_third_count', e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          placeholder={`默认：${PRIZE_CONFIG.third.count}`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          API 返还
                        </label>
                        <input
                          value={formData.template_prize_third_api_return}
                          onChange={(e) => updateField('template_prize_third_api_return', e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          placeholder={`默认：${PRIZE_CONFIG.third.apiReturn}`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          API 上限
                        </label>
                        <input
                          value={formData.template_prize_third_api_limit}
                          onChange={(e) => updateField('template_prize_third_api_limit', e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          placeholder={`默认：${PRIZE_CONFIG.third.apiLimit}`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          折扣
                        </label>
                        <input
                          value={formData.template_prize_third_discount}
                          onChange={(e) => updateField('template_prize_third_discount', e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          placeholder={`默认：${PRIZE_CONFIG.third.discount}`}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                        参与奖
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          标题
                        </label>
                        <input
                          value={formData.template_participation_title}
                          onChange={(e) => updateField('template_participation_title', e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          placeholder={`默认：${DEFAULT_PARTICIPATION.title}`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          描述
                        </label>
                        <input
                          value={formData.template_participation_description}
                          onChange={(e) => updateField('template_participation_description', e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          placeholder={`默认：${DEFAULT_PARTICIPATION.description}`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          奖励
                        </label>
                        <input
                          value={formData.template_participation_reward}
                          onChange={(e) => updateField('template_participation_reward', e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          placeholder={`默认：${DEFAULT_PARTICIPATION.reward}`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          补充
                        </label>
                        <input
                          value={formData.template_participation_extra}
                          onChange={(e) => updateField('template_participation_extra', e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          placeholder={`默认：${DEFAULT_PARTICIPATION.extra}`}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        风控规则（每行：标题|内容）
                      </label>
                      <textarea
                        value={formData.template_risk_rules}
                        onChange={(e) => updateField('template_risk_rules', e.target.value)}
                        rows={4}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-vertical font-mono text-xs"
                        placeholder={DEFAULT_RISK_RULES_TEXT}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        评审权重（每行：标题|权重|描述）
                      </label>
                      <textarea
                        value={formData.template_review_weights}
                        onChange={(e) => updateField('template_review_weights', e.target.value)}
                        rows={3}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-vertical font-mono text-xs"
                        placeholder={DEFAULT_REVIEW_WEIGHTS_TEXT}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        参赛流程（每行：步骤|标题|描述|高亮(可选)|后缀(可选)）
                      </label>
                      <textarea
                        value={formData.template_process_steps}
                        onChange={(e) => updateField('template_process_steps', e.target.value)}
                        rows={4}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-vertical font-mono text-xs"
                        placeholder={DEFAULT_PROCESS_STEPS_TEXT}
                      />
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      留空表示使用默认模板内容。
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      报名开始时间
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.signup_start}
                      onChange={(e) => updateField('signup_start', e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      报名结束时间
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.signup_end}
                      onChange={(e) => updateField('signup_end', e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      提交开始时间
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.submit_start}
                      onChange={(e) => updateField('submit_start', e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      提交结束时间
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.submit_end}
                      onChange={(e) => updateField('submit_end', e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      投票开始时间
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.vote_start}
                      onChange={(e) => updateField('vote_start', e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      投票结束时间
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.vote_end}
                      onChange={(e) => updateField('vote_end', e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div className="text-xs text-slate-500 dark:text-slate-400">
                  配置时间后系统会自动切换比赛阶段，可按需手动调整阶段。
                </div>
              </div>

              <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <button
                  onClick={() => setShowEditor(false)}
                  className="px-5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all disabled:opacity-60"
                >
                  {saving ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    )
  }

  // 作品评审分配面板
function ProjectReviewAssignPanel() {
  const toast = useToast()
  const [projectIdInput, setProjectIdInput] = useState('')
  const [project, setProject] = useState(null)
  const [projectLoading, setProjectLoading] = useState(false)
  const [assignments, setAssignments] = useState([])
  const [assignmentLoading, setAssignmentLoading] = useState(false)
  const [reviewers, setReviewers] = useState([])
  const [reviewerSearch, setReviewerSearch] = useState('')
  const [reviewerLoading, setReviewerLoading] = useState(false)
  const [assigningId, setAssigningId] = useState(null)
  const [removingId, setRemovingId] = useState(null)

  const assignedIds = new Set(assignments.map((item) => item.reviewer_id))

  const loadProject = async (projectId) => {
    setProjectLoading(true)
    try {
      const data = await adminApi2.getProject(projectId)
      setProject(data)
    } catch (error) {
      setProject(null)
      toast.error(error.response?.data?.detail || '加载作品失败')
    } finally {
      setProjectLoading(false)
    }
  }

  const loadAssignments = async (projectId) => {
    if (!projectId) {
      setAssignments([])
      return
    }
    setAssignmentLoading(true)
    try {
      const data = await adminApi2.getProjectReviewers(projectId)
      setAssignments(data.items || [])
    } catch (error) {
      setAssignments([])
      toast.error(error.response?.data?.detail || '加载评审分配失败')
    } finally {
      setAssignmentLoading(false)
    }
  }

  const handleLoadProject = async () => {
    const id = parseInt(projectIdInput, 10)
    if (!id) {
      toast.error('请输入有效的作品 ID')
      return
    }
    await Promise.all([loadProject(id), loadAssignments(id)])
  }

  const loadReviewers = async () => {
    setReviewerLoading(true)
    try {
      const params = { role: 'reviewer', limit: 50 }
      if (reviewerSearch.trim()) {
        params.search = reviewerSearch.trim()
      }
      const data = await adminApi2.getUsers(params)
      setReviewers(data.items || [])
    } catch (error) {
      setReviewers([])
      toast.error('加载评审员失败')
    } finally {
      setReviewerLoading(false)
    }
  }

  useEffect(() => {
    loadReviewers()
  }, [])

  const handleAssign = async (reviewerId) => {
    if (!project?.id) {
      toast.error('请先加载作品')
      return
    }
    setAssigningId(reviewerId)
    try {
      await adminApi2.assignProjectReviewers(project.id, [reviewerId])
      toast.success('分配成功')
      await loadAssignments(project.id)
    } catch (error) {
      toast.error(error.response?.data?.detail || '分配失败')
    } finally {
      setAssigningId(null)
    }
  }

  const handleRemove = async (reviewerId) => {
    if (!project?.id) {
      toast.error('请先加载作品')
      return
    }
    setRemovingId(reviewerId)
    try {
      await adminApi2.removeProjectReviewer(project.id, reviewerId)
      toast.success('已移除评审员')
      await loadAssignments(project.id)
    } catch (error) {
      toast.error(error.response?.data?.detail || '移除失败')
    } finally {
      setRemovingId(null)
    }
  }

  const ownerName = project?.owner?.display_name || project?.owner?.username || (project?.user_id ? `用户#${project.user_id}` : '-')

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">作品评审分配</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              先加载作品，再为评审员分配权限
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={projectIdInput}
              onChange={(e) => setProjectIdInput(e.target.value)}
              placeholder="作品 ID"
              className="w-32 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
            <button
              onClick={handleLoadProject}
              disabled={projectLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              {projectLoading ? '加载中...' : '加载作品'}
            </button>
          </div>
        </div>

        {project && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
              <div className="text-slate-500 mb-1">作品标题</div>
              <div className="text-slate-900 dark:text-white font-medium">{project.title || '-'}</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
              <div className="text-slate-500 mb-1">作者</div>
              <div className="text-slate-900 dark:text-white font-medium">{ownerName}</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
              <div className="text-slate-500 mb-1">作品状态</div>
              <div className="text-slate-900 dark:text-white font-medium">{project.status}</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
              <div className="text-slate-500 mb-1">当前提交</div>
              <div className="text-slate-900 dark:text-white font-medium">{project.current_submission_id || '-'}</div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">已分配评审员</h3>
          <button
            onClick={() => project?.id && loadAssignments(project.id)}
            disabled={!project?.id || assignmentLoading}
            className="flex items-center gap-2 px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <RefreshCw className={`w-4 h-4 ${assignmentLoading ? 'animate-spin' : ''}`} />
            刷新
          </button>
        </div>

        {!project ? (
          <div className="text-sm text-slate-500">请先加载作品</div>
        ) : assignmentLoading ? (
          <div className="text-sm text-slate-500 flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            加载中...
          </div>
        ) : assignments.length === 0 ? (
          <div className="text-sm text-slate-500">暂无分配记录</div>
        ) : (
          <div className="space-y-3">
            {assignments.map((item) => (
              <div key={item.reviewer_id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                <div>
                  <div className="text-slate-900 dark:text-white font-medium">
                    {item.reviewer?.display_name || item.reviewer?.username || `评审员#${item.reviewer_id}`}
                  </div>
                  <div className="text-xs text-slate-500">ID: {item.reviewer_id}</div>
                </div>
                <button
                  onClick={() => handleRemove(item.reviewer_id)}
                  disabled={removingId === item.reviewer_id}
                  className="px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
                >
                  {removingId === item.reviewer_id ? '移除中...' : '移除'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">评审员列表</h3>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={reviewerSearch}
              onChange={(e) => setReviewerSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadReviewers()}
              placeholder="搜索用户名/昵称"
              className="w-56 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
            <button
              onClick={loadReviewers}
              disabled={reviewerLoading}
              className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              {reviewerLoading ? '加载中...' : '搜索'}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px] text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="px-4 py-3 text-left text-slate-600">ID</th>
                <th className="px-4 py-3 text-left text-slate-600">评审员</th>
                <th className="px-4 py-3 text-right text-slate-600">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {reviewerLoading ? (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                    加载中...
                  </td>
                </tr>
              ) : reviewers.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-slate-500">暂无评审员</td>
                </tr>
              ) : (
                reviewers.map((user) => {
                  const assigned = assignedIds.has(user.id)
                  return (
                    <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-3 text-slate-600">{user.id}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900 dark:text-white">
                          {user.display_name || user.username}
                        </div>
                        <div className="text-xs text-slate-500">@{user.username}</div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleAssign(user.id)}
                          disabled={!project?.id || assigned || assigningId === user.id}
                          className={`px-3 py-1.5 rounded-lg text-sm ${
                            assigned
                              ? 'bg-slate-100 text-slate-400'
                              : 'bg-blue-500 text-white hover:bg-blue-600'
                          }`}
                        >
                          {assigned ? '已分配' : assigningId === user.id ? '分配中...' : '分配'}
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// 作品部署管理面板
function ProjectDeployPanel() {
  const toast = useToast()
  const [projectIdInput, setProjectIdInput] = useState('')
  const [project, setProject] = useState(null)
  const [projectLoading, setProjectLoading] = useState(false)
  const [submissions, setSubmissions] = useState([])
  const [submissionsLoading, setSubmissionsLoading] = useState(false)
  const [actionMessage, setActionMessage] = useState('')
  const [offlineLoading, setOfflineLoading] = useState(false)
  const [redeployingId, setRedeployingId] = useState(null)
  const [stoppingId, setStoppingId] = useState(null)
  const [logOpen, setLogOpen] = useState(false)
  const [logLoading, setLogLoading] = useState(false)
  const [logData, setLogData] = useState(null)

  const STATUS_LABELS = {
    created: '已创建',
    queued: '排队中',
    pulling: '拉取镜像',
    deploying: '部署中',
    healthchecking: '健康检查',
    online: '已上线',
    failed: '失败',
    stopped: '已停止',
  }

  const STATUS_STYLES = {
    created: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    queued: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
    pulling: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
    deploying: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
    healthchecking: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
    online: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
    failed: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
    stopped: 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  }

  const formatDateTime = (value) => {
    if (!value) return '-'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '-'
    return date.toLocaleString('zh-CN')
  }

  const loadProject = async (projectId) => {
    setProjectLoading(true)
    try {
      const data = await adminApi2.getProject(projectId)
      setProject(data)
    } catch (error) {
      setProject(null)
      toast.error(error.response?.data?.detail || '加载作品失败')
    } finally {
      setProjectLoading(false)
    }
  }

  const loadSubmissions = async (projectId) => {
    setSubmissionsLoading(true)
    try {
      const data = await projectApi.listSubmissions(projectId)
      setSubmissions(data.items || [])
    } catch (error) {
      setSubmissions([])
      toast.error(error.response?.data?.detail || '加载提交记录失败')
    } finally {
      setSubmissionsLoading(false)
    }
  }

  const refreshAll = async () => {
    if (!project?.id) return
    await Promise.all([loadProject(project.id), loadSubmissions(project.id)])
  }

  const handleLoadProject = async () => {
    const id = Number(projectIdInput)
    if (!Number.isInteger(id) || id <= 0) {
      toast.error('请输入有效的作品 ID')
      return
    }
    await Promise.all([loadProject(id), loadSubmissions(id)])
  }

  const handleOfflineProject = async () => {
    if (!project?.id) {
      toast.error('请先加载作品')
      return
    }
    setOfflineLoading(true)
    try {
      const message = actionMessage.trim() || undefined
      await adminApi2.offlineProject(project.id, message)
      toast.success('已下架作品')
      await refreshAll()
    } catch (error) {
      toast.error(error.response?.data?.detail || '下架失败')
    } finally {
      setOfflineLoading(false)
    }
  }

  const handleRedeploy = async (submissionId) => {
    setRedeployingId(submissionId)
    try {
      const message = actionMessage.trim() || undefined
      await adminApi2.redeployProjectSubmission(submissionId, message)
      toast.success('已触发重部署')
      await refreshAll()
    } catch (error) {
      toast.error(error.response?.data?.detail || '重部署失败')
    } finally {
      setRedeployingId(null)
    }
  }

  const handleStop = async (submissionId) => {
    setStoppingId(submissionId)
    try {
      const message = actionMessage.trim() || undefined
      await adminApi2.stopProjectSubmission(submissionId, message)
      toast.success('已触发停止')
      await refreshAll()
    } catch (error) {
      toast.error(error.response?.data?.detail || '停止失败')
    } finally {
      setStoppingId(null)
    }
  }

  const handleViewLogs = async (submissionId) => {
    setLogOpen(true)
    setLogLoading(true)
    setLogData(null)
    try {
      const data = await adminApi2.getProjectSubmissionLogs(submissionId)
      setLogData(data)
    } catch (error) {
      toast.error(error.response?.data?.detail || '加载日志失败')
      setLogOpen(false)
    } finally {
      setLogLoading(false)
    }
  }

  const renderStatusBadge = (status) => {
    const label = STATUS_LABELS[status] || status || '-'
    const style = STATUS_STYLES[status] || STATUS_STYLES.created
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${style}`}>
        {label}
      </span>
    )
  }

  const ownerName = project?.owner?.display_name || project?.owner?.username || (project?.user_id ? `用户#${project.user_id}` : '-')

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">作品部署管理</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              加载作品后可查看提交记录，并进行下架/重部署/停止
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={projectIdInput}
              onChange={(e) => setProjectIdInput(e.target.value)}
              placeholder="作品 ID"
              className="w-32 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
            <button
              onClick={handleLoadProject}
              disabled={projectLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              {projectLoading ? '加载中...' : '加载作品'}
            </button>
          </div>
        </div>

        {project && (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                <div className="text-slate-500 mb-1">作品标题</div>
                <div className="text-slate-900 dark:text-white font-medium">{project.title || '-'}</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                <div className="text-slate-500 mb-1">作者</div>
                <div className="text-slate-900 dark:text-white font-medium">{ownerName}</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                <div className="text-slate-500 mb-1">作品状态</div>
                <div className="text-slate-900 dark:text-white font-medium">{project.status}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-slate-500 mb-2">操作说明（可选）</div>
                <textarea
                  value={actionMessage}
                  onChange={(e) => setActionMessage(e.target.value)}
                  placeholder="例如：异常修复后重新部署"
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 resize-none"
                />
              </div>
              <div className="flex items-end gap-3">
                <button
                  onClick={handleOfflineProject}
                  disabled={offlineLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  {offlineLoading ? '下架中...' : '下架作品'}
                </button>
                <button
                  onClick={refreshAll}
                  disabled={submissionsLoading || !project?.id}
                  className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <RefreshCw className={`w-4 h-4 ${submissionsLoading ? 'animate-spin' : ''}`} />
                  刷新提交
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">提交记录</h3>
        </div>

        {!project ? (
          <div className="text-sm text-slate-500">请先加载作品</div>
        ) : submissionsLoading ? (
          <div className="text-sm text-slate-500 flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            加载中...
          </div>
        ) : submissions.length === 0 ? (
          <div className="text-sm text-slate-500">暂无提交记录</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>
                  <th className="px-4 py-3 text-left text-slate-600">提交ID</th>
                  <th className="px-4 py-3 text-left text-slate-600">状态</th>
                  <th className="px-4 py-3 text-left text-slate-600">镜像</th>
                  <th className="px-4 py-3 text-left text-slate-600">域名</th>
                  <th className="px-4 py-3 text-left text-slate-600">更新时间</th>
                  <th className="px-4 py-3 text-right text-slate-600">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {submissions.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3 text-slate-900 dark:text-white font-medium">
                      #{item.id}
                      {project.current_submission_id === item.id && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                          当前线上
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">{renderStatusBadge(item.status)}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 font-mono max-w-[260px] truncate" title={item.image_ref || ''}>
                      {item.image_ref || '-'}
                    </td>
                    <td className="px-4 py-3">
                      {item.domain ? (
                        <a
                          href={item.domain.startsWith('http') ? item.domain : `https://${item.domain}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700"
                        >
                          访问
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                      {formatDateTime(item.updated_at || item.submitted_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => handleRedeploy(item.id)}
                          disabled={redeployingId === item.id}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
                        >
                          <Play className="w-3 h-3" />
                          {redeployingId === item.id ? '重部署中' : '重部署'}
                        </button>
                        <button
                          onClick={() => handleStop(item.id)}
                          disabled={stoppingId === item.id}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 disabled:opacity-50"
                        >
                          <Square className="w-3 h-3" />
                          {stoppingId === item.id ? '停止中' : '停止'}
                        </button>
                        <button
                          onClick={() => handleViewLogs(item.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                          <Eye className="w-3 h-3" />
                          日志
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {logOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !logLoading && setLogOpen(false)} />
          <div className="relative z-10 w-full max-w-3xl mx-4 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">提交日志</h3>
              <button
                type="button"
                onClick={() => setLogOpen(false)}
                disabled={logLoading}
                className="text-slate-500 hover:text-slate-700"
              >
                关闭
              </button>
            </div>
            {logLoading ? (
              <div className="text-sm text-slate-500 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                加载中...
              </div>
            ) : (
              <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                    <div className="text-slate-500 mb-1">状态</div>
                    <div className="text-slate-900 dark:text-white">{logData?.status || '-'}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                    <div className="text-slate-500 mb-1">错误码</div>
                    <div className="text-slate-900 dark:text-white">{logData?.error_code || '-'}</div>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                  <div className="text-slate-500 mb-2">日志内容</div>
                  <pre className="whitespace-pre-wrap break-words text-xs text-slate-900 dark:text-slate-100 font-mono max-h-[360px] overflow-auto">
                    {logData?.log || '暂无日志'}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// 签到配置面板
function SigninConfigPanel() {
  const toast = useToast()
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [newMilestone, setNewMilestone] = useState({ day: '', bonus_points: '', description: '' })

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      const data = await adminApi2.getSigninConfig()
      setConfig(data)
    } catch (error) {
      toast.error('加载配置失败')
    } finally {
      setLoading(false)
    }
  }

  const handleAddMilestone = async () => {
    if (!newMilestone.day || !newMilestone.bonus_points) {
      toast.error('请填写天数和奖励积分')
      return
    }

    try {
      await adminApi2.createMilestone({
        day: parseInt(newMilestone.day),
        bonus_points: parseInt(newMilestone.bonus_points),
        description: newMilestone.description || null
      })
      toast.success('添加成功')
      setNewMilestone({ day: '', bonus_points: '', description: '' })
      loadConfig()
    } catch (error) {
      toast.error('添加失败')
    }
  }

  const handleUpdateMilestone = async (id, data) => {
    try {
      await adminApi2.updateMilestone(id, data)
      toast.success('更新成功')
      setEditing(null)
      loadConfig()
    } catch (error) {
      toast.error('更新失败')
    }
  }

  const handleDeleteMilestone = async (id) => {
    if (!confirm('确定删除此里程碑？')) return

    try {
      await adminApi2.deleteMilestone(id)
      toast.success('删除成功')
      loadConfig()
    } catch (error) {
      toast.error('删除失败')
    }
  }

  if (loading) {
    return <div className="animate-pulse bg-slate-100 dark:bg-slate-800 rounded-xl h-64" />
  }

  return (
    <div className="space-y-6">
      {/* 基础配置 */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
        <h3 className="font-medium text-slate-900 dark:text-white mb-3">基础配置</h3>
        <div className="flex items-center gap-2">
          <span className="text-slate-500">每日签到基础积分:</span>
          <span className="font-bold text-green-600">{config?.base_points || 100}</span>
          <span className="text-slate-500">积分</span>
        </div>
      </div>

      {/* 里程碑配置 */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
        <h3 className="font-medium text-slate-900 dark:text-white mb-3">连续签到里程碑</h3>

        {/* 添加新里程碑 */}
        <div className="flex gap-2 mb-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
          <input
            type="number"
            placeholder="天数"
            value={newMilestone.day}
            onChange={(e) => setNewMilestone({ ...newMilestone, day: e.target.value })}
            className="w-20 px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
          />
          <input
            type="number"
            placeholder="奖励积分"
            value={newMilestone.bonus_points}
            onChange={(e) => setNewMilestone({ ...newMilestone, bonus_points: e.target.value })}
            className="w-24 px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
          />
          <input
            type="text"
            placeholder="描述（可选）"
            value={newMilestone.description}
            onChange={(e) => setNewMilestone({ ...newMilestone, description: e.target.value })}
            className="flex-1 px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
          />
          <button
            onClick={handleAddMilestone}
            className="px-3 py-1.5 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* 里程碑列表 */}
        <div className="space-y-2">
          {config?.milestones?.map((m) => (
            <div key={m.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded">
              {editing === m.id ? (
                <>
                  <input
                    type="number"
                    defaultValue={m.day}
                    className="w-16 px-2 py-1 rounded border text-sm"
                    id={`day-${m.id}`}
                  />
                  <span className="text-slate-500">天</span>
                  <input
                    type="number"
                    defaultValue={m.bonus_points}
                    className="w-20 px-2 py-1 rounded border text-sm"
                    id={`bonus-${m.id}`}
                  />
                  <span className="text-slate-500">积分</span>
                  <button
                    onClick={() => {
                      const day = document.getElementById(`day-${m.id}`).value
                      const bonus = document.getElementById(`bonus-${m.id}`).value
                      handleUpdateMilestone(m.id, { day: parseInt(day), bonus_points: parseInt(bonus) })
                    }}
                    className="p-1 text-green-500 hover:bg-green-50 rounded"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setEditing(null)}
                    className="p-1 text-slate-400 hover:bg-slate-100 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <span className="font-medium text-slate-900 dark:text-white w-16">{m.day} 天</span>
                  <span className="text-green-600">+{m.bonus_points} 积分</span>
                  {m.description && <span className="text-sm text-slate-500">({m.description})</span>}
                  <div className="flex-1" />
                  <button
                    onClick={() => setEditing(m.id)}
                    className="p-1 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteMilestone(m.id)}
                    className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// 抽奖配置面板
function LotteryConfigPanel() {
  const toast = useToast()
  const [configs, setConfigs] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [editingPrize, setEditingPrize] = useState(null)

  useEffect(() => {
    loadConfigs()
  }, [])

  const loadConfigs = async () => {
    try {
      const data = await adminApi2.getLotteryConfigs()
      const configList = data.configs || data.items || []
      setConfigs(configList)
      if (configList.length > 0) setExpanded(configList[0].id)
    } catch (error) {
      toast.error('加载配置失败')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateConfig = async (id, updates) => {
    try {
      await adminApi2.updateLotteryConfig(id, updates)
      toast.success('更新成功')
      loadConfigs()
    } catch (error) {
      toast.error('更新失败')
    }
  }

  const handleUpdatePrize = async (id, updates) => {
    try {
      await adminApi2.updatePrize(id, updates)
      toast.success('更新成功')
      setEditingPrize(null)
      loadConfigs()
    } catch (error) {
      toast.error('更新失败')
    }
  }

  const handleDeletePrize = async (id) => {
    if (!confirm('确定删除此奖品？')) return

    try {
      await adminApi2.deletePrize(id)
      toast.success('删除成功')
      loadConfigs()
    } catch (error) {
      toast.error('删除失败')
    }
  }

  if (loading) {
    return <div className="animate-pulse bg-slate-100 dark:bg-slate-800 rounded-xl h-64" />
  }

  return (
    <div className="space-y-4">
      {configs.map((config) => (
        <div key={config.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          {/* 配置头部 */}
          <div
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
            onClick={() => setExpanded(expanded === config.id ? null : config.id)}
          >
            <div className="flex items-center gap-3">
              <Gift className={`w-5 h-5 ${config.is_active ? 'text-green-500' : 'text-slate-400'}`} />
              <div>
                <h3 className="font-medium text-slate-900 dark:text-white">{config.name}</h3>
                <p className="text-sm text-slate-500">
                  消耗 {config.cost_points} 积分 · 每日限制 {config.daily_limit || '无限'} 次
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                config.is_active
                  ? 'bg-green-100 text-green-600'
                  : 'bg-slate-100 text-slate-500'
              }`}>
                {config.is_active ? '启用中' : '已停用'}
              </span>
              {expanded === config.id ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
            </div>
          </div>

          {/* 展开内容 */}
          {expanded === config.id && (
            <div className="border-t border-slate-100 dark:border-slate-800 p-4">
              {/* 配置选项 */}
              <div className="flex gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">消耗积分:</span>
                  <input
                    type="number"
                    defaultValue={config.cost_points}
                    onBlur={(e) => handleUpdateConfig(config.id, { cost_points: parseInt(e.target.value) })}
                    className="w-20 px-2 py-1 rounded border text-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">每日限制:</span>
                  <input
                    type="number"
                    defaultValue={config.daily_limit || ''}
                    onBlur={(e) => handleUpdateConfig(config.id, { daily_limit: e.target.value ? parseInt(e.target.value) : null })}
                    className="w-20 px-2 py-1 rounded border text-sm"
                    placeholder="无限"
                  />
                </div>
                <button
                  onClick={() => handleUpdateConfig(config.id, { is_active: !config.is_active })}
                  className={`px-3 py-1 rounded text-sm ${
                    config.is_active
                      ? 'bg-red-100 text-red-600 hover:bg-red-200'
                      : 'bg-green-100 text-green-600 hover:bg-green-200'
                  }`}
                >
                  {config.is_active ? '停用' : '启用'}
                </button>
              </div>

              {/* 奖品列表 */}
              <h4 className="font-medium text-slate-900 dark:text-white mb-2">奖品配置</h4>
              <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[500px]">
                <thead className="bg-slate-50 dark:bg-slate-800">
                  <tr>
                    <th className="px-3 py-2 text-left">奖品名称</th>
                    <th className="px-3 py-2 text-left">类型</th>
                    <th className="px-3 py-2 text-left">权重</th>
                    <th className="px-3 py-2 text-left">库存</th>
                    <th className="px-3 py-2 text-left">稀有</th>
                    <th className="px-3 py-2 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {config.prizes.map((prize) => (
                    <tr key={prize.id}>
                      <td className="px-3 py-2">
                        {editingPrize === prize.id ? (
                          <input
                            type="text"
                            defaultValue={prize.name || prize.prize_name}
                            className="w-full px-2 py-1 rounded border text-sm"
                            id={`name-${prize.id}`}
                          />
                        ) : (
                          prize.name || prize.prize_name
                        )}
                      </td>
                      <td className="px-3 py-2 text-slate-500">{prize.type || prize.prize_type}</td>
                      <td className="px-3 py-2">
                        {editingPrize === prize.id ? (
                          <input
                            type="number"
                            defaultValue={prize.weight}
                            className="w-16 px-2 py-1 rounded border text-sm"
                            id={`weight-${prize.id}`}
                          />
                        ) : (
                          prize.weight
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {editingPrize === prize.id ? (
                          <input
                            type="number"
                            defaultValue={prize.stock || ''}
                            className="w-16 px-2 py-1 rounded border text-sm"
                            id={`stock-${prize.id}`}
                            placeholder="无限"
                          />
                        ) : (
                          prize.stock ?? '无限'
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {prize.is_rare && <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-600 rounded text-xs">稀有</span>}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {editingPrize === prize.id ? (
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => {
                                handleUpdatePrize(prize.id, {
                                  name: document.getElementById(`name-${prize.id}`).value,
                                  weight: parseInt(document.getElementById(`weight-${prize.id}`).value),
                                  stock: document.getElementById(`stock-${prize.id}`).value ? parseInt(document.getElementById(`stock-${prize.id}`).value) : null
                                })
                              }}
                              className="p-1 text-green-500 hover:bg-green-50 rounded"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingPrize(null)}
                              className="p-1 text-slate-400 hover:bg-slate-100 rounded"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => setEditingPrize(prize.id)}
                              className="p-1 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeletePrize(prize.id)}
                              className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// 活动管理面板（扭蛋机 + 老虎机）
function ActivityConfigPanel() {
  const toast = useToast()
  // 从 localStorage 恢复子标签和选中的配置
  const [activeSubTab, setActiveSubTab] = useState(() => localStorage.getItem('activitySubTab') || 'lottery')
  const [loading, setLoading] = useState(true)

  // 抽奖/刮刮乐配置状态
  const [lotteryConfigs, setLotteryConfigs] = useState([])
  const [selectedLotteryConfig, setSelectedLotteryConfig] = useState(null)
  const [lotteryPrizes, setLotteryPrizes] = useState([])
  const savedLotteryConfigId = useRef(localStorage.getItem('selectedLotteryConfigId'))

  // 扭蛋机状态
  const [gachaConfigs, setGachaConfigs] = useState([])
  const [gachaPrizes, setGachaPrizes] = useState([])
  const [selectedGachaConfig, setSelectedGachaConfig] = useState(null)
  const [gachaStats, setGachaStats] = useState(null)

  // 老虎机状态
  const [slotConfig, setSlotConfig] = useState(null)
  const [slotSymbols, setSlotSymbols] = useState([])
  const [slotRules, setSlotRules] = useState([])
  const [slotStats, setSlotStats] = useState(null)

  // 编辑状态
  const [editingPrize, setEditingPrize] = useState(null)
  const [editingRule, setEditingRule] = useState(null)
  const [editingLotteryPrize, setEditingLotteryPrize] = useState(null)
  const [showAddPrizeModal, setShowAddPrizeModal] = useState(false)
  const [showAddLotteryPrizeModal, setShowAddLotteryPrizeModal] = useState(false)
  const [newPrize, setNewPrize] = useState({
    prize_type: 'points',
    prize_name: '',
    prize_value: { amount: 10 },
    weight: 1.0,
    stock: null,
    is_rare: false,
    is_enabled: true,
  })
  const [newLotteryPrize, setNewLotteryPrize] = useState({
    config_id: null,
    name: '',
    type: 'POINTS',
    value: '10',
    weight: 1.0,
    stock: null,
    is_rare: false,
    is_enabled: true,
  })

  // 加载抽奖/刮刮乐配置
  const loadLotteryData = async () => {
    try {
      setLoading(true)
      const data = await adminApi2.getLotteryConfigs()
      const configs = data.configs || []
      setLotteryConfigs(configs)
      if (configs.length > 0) {
        // 恢复之前选中的配置，或默认第一个
        const savedId = savedLotteryConfigId.current
        const restoredConfig = savedId ? configs.find(c => c.id === parseInt(savedId)) : null
        const targetConfig = restoredConfig || configs[0]
        setSelectedLotteryConfig(targetConfig)
        setLotteryPrizes(targetConfig.prizes || [])
      }
    } catch (e) {
      console.error('加载抽奖配置失败:', e)
      toast.error('加载抽奖配置失败')
    } finally {
      setLoading(false)
    }
  }

  // 加载扭蛋机配置
  const loadGachaData = async () => {
    try {
      setLoading(true)
      const [configRes, statsRes] = await Promise.all([
        adminApi2.get('/gacha/admin/config'),
        adminApi2.get('/gacha/admin/stats').catch(() => null)
      ])
      setGachaConfigs(configRes.configs || [])
      if (configRes.configs?.length > 0) {
        setSelectedGachaConfig(configRes.configs[0])
        const prizesRes = await adminApi2.get(`/gacha/admin/prizes/${configRes.configs[0].id}`)
        setGachaPrizes(prizesRes.prizes || [])
      }
      setGachaStats(statsRes)
    } catch (e) {
      console.error('加载扭蛋机配置失败:', e)
      toast.error('加载扭蛋机配置失败')
    } finally {
      setLoading(false)
    }
  }

  // 加载老虎机配置
  const loadSlotData = async () => {
    try {
      setLoading(true)
      const [configRes, rulesRes, statsRes] = await Promise.all([
        adminApi2.get('/slot-machine/admin/config'),
        adminApi2.get('/slot-machine/admin/rules'),
        adminApi2.get('/slot-machine/admin/stats?days=7').catch(() => null)
      ])
      setSlotConfig(configRes.config || null)
      setSlotSymbols(configRes.symbols || [])
      setSlotRules(rulesRes.rules || [])
      setSlotStats(statsRes)
    } catch (e) {
      console.error('加载老虎机配置失败:', e)
      toast.error('加载老虎机配置失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (activeSubTab === 'lottery') {
      loadLotteryData()
    } else if (activeSubTab === 'gacha') {
      loadGachaData()
    } else if (activeSubTab === 'slot') {
      loadSlotData()
    }
  }, [activeSubTab])

  // 更新抽奖配置
  const updateLotteryConfig = async (configId, updates) => {
    try {
      await adminApi2.updateLotteryConfig(configId, updates)
      toast.success('配置已更新')
      loadLotteryData()
    } catch (e) {
      toast.error('更新失败: ' + (e?.response?.data?.detail || e.message))
    }
  }

  // 更新抽奖奖品
  const updateLotteryPrize = async (prizeId, updates) => {
    try {
      await adminApi2.updatePrize(prizeId, updates)
      toast.success('奖品已更新')
      loadLotteryData()
      setEditingLotteryPrize(null)
    } catch (e) {
      toast.error('更新失败')
    }
  }

  // 添加抽奖奖品
  const addLotteryPrize = async () => {
    if (!newLotteryPrize.name.trim()) {
      toast.error('请输入奖品名称')
      return
    }
    try {
      await adminApi2.createPrize({
        ...newLotteryPrize,
        config_id: selectedLotteryConfig.id,
      })
      toast.success('奖品已添加')
      setShowAddLotteryPrizeModal(false)
      setNewLotteryPrize({
        config_id: null,
        name: '',
        type: 'POINTS',
        value: '10',
        weight: 1.0,
        stock: null,
        is_rare: false,
        is_enabled: true,
      })
      loadLotteryData()
    } catch (e) {
      toast.error('添加失败: ' + (e?.response?.data?.detail || e.message))
    }
  }

  // 删除抽奖奖品
  const deleteLotteryPrize = async (prizeId) => {
    if (!confirm('确定删除该奖品？')) return
    try {
      await adminApi2.deletePrize(prizeId)
      toast.success('奖品已删除')
      loadLotteryData()
    } catch (e) {
      toast.error('删除失败')
    }
  }

  // 切换抽奖配置
  const selectLotteryConfig = (config) => {
    setSelectedLotteryConfig(config)
    setLotteryPrizes(config.prizes || [])
    // 保存到 localStorage
    localStorage.setItem('selectedLotteryConfigId', config.id)
  }

  // 切换子标签时保存
  const handleSubTabChange = (tab) => {
    setActiveSubTab(tab)
    localStorage.setItem('activitySubTab', tab)
  }

  // 计算抽奖奖品总权重和概率
  const lotteryTotalWeight = lotteryPrizes.filter(p => p.is_enabled).reduce((sum, p) => sum + (p.weight || 0), 0)
  const getLotteryProbability = (weight) => lotteryTotalWeight > 0 ? ((weight / lotteryTotalWeight) * 100).toFixed(2) : 0

  // 更新扭蛋机配置
  const updateGachaConfig = async (configId, updates) => {
    try {
      await adminApi2.put(`/gacha/admin/config/${configId}`, updates)
      toast.success('配置已更新')
      loadGachaData()
    } catch (e) {
      toast.error('更新失败: ' + (e?.response?.data?.detail || e.message))
    }
  }

  // 更新老虎机配置
  const updateSlotConfig = async (updates) => {
    try {
      await adminApi2.put('/slot-machine/admin/config', updates)
      toast.success('配置已更新')
      loadSlotData()
    } catch (e) {
      toast.error('更新失败: ' + (e?.response?.data?.detail || e.message))
    }
  }

  // 更新奖品
  const updatePrize = async (prizeId, updates) => {
    try {
      await adminApi2.put(`/gacha/admin/prizes/${selectedGachaConfig.id}/${prizeId}`, updates)
      toast.success('奖品已更新')
      const prizesRes = await adminApi2.get(`/gacha/admin/prizes/${selectedGachaConfig.id}`)
      setGachaPrizes(prizesRes.prizes || [])
      setEditingPrize(null)
    } catch (e) {
      toast.error('更新失败')
    }
  }

  // 添加奖品
  const addPrize = async () => {
    if (!newPrize.prize_name.trim()) {
      toast.error('请输入奖品名称')
      return
    }
    try {
      await adminApi2.post(`/gacha/admin/prizes/${selectedGachaConfig.id}`, newPrize)
      toast.success('奖品已添加')
      setShowAddPrizeModal(false)
      setNewPrize({
        prize_type: 'points',
        prize_name: '',
        prize_value: { amount: 10 },
        weight: 1.0,
        stock: null,
        is_rare: false,
        is_enabled: true,
      })
      const prizesRes = await adminApi2.get(`/gacha/admin/prizes/${selectedGachaConfig.id}`)
      setGachaPrizes(prizesRes.prizes || [])
    } catch (e) {
      toast.error('添加失败: ' + (e?.response?.data?.detail || e.message))
    }
  }

  // 删除奖品
  const deletePrize = async (prizeId) => {
    if (!confirm('确定删除该奖品？')) return
    try {
      await adminApi2.delete(`/gacha/admin/prizes/${selectedGachaConfig.id}/${prizeId}`)
      toast.success('奖品已删除')
      const prizesRes = await adminApi2.get(`/gacha/admin/prizes/${selectedGachaConfig.id}`)
      setGachaPrizes(prizesRes.prizes || [])
    } catch (e) {
      toast.error('删除失败')
    }
  }

  // 切换奖品启用状态
  const togglePrizeEnabled = async (prize) => {
    await updatePrize(prize.id, { is_enabled: !prize.is_enabled })
  }

  // 计算总权重和概率
  const totalWeight = gachaPrizes.filter(p => p.is_enabled).reduce((sum, p) => sum + p.weight, 0)
  const getProbability = (weight) => totalWeight > 0 ? ((weight / totalWeight) * 100).toFixed(2) : 0

  // 更新规则
  const updateRule = async (ruleId, updates) => {
    try {
      await adminApi2.put(`/slot-machine/admin/rules/${ruleId}`, updates)
      toast.success('规则已更新')
      loadSlotData()
      setEditingRule(null)
    } catch (e) {
      toast.error('更新失败')
    }
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
          <span className="ml-3 text-slate-500">加载中...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 子标签切换 */}
      <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit flex-wrap">
        <button
          onClick={() => handleSubTabChange('lottery')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeSubTab === 'lottery'
              ? 'bg-white dark:bg-slate-700 text-pink-600 dark:text-pink-400 shadow'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          🎁 抽奖配置
        </button>
        <button
          onClick={() => handleSubTabChange('gacha')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeSubTab === 'gacha'
              ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          🎰 扭蛋机管理
        </button>
        <button
          onClick={() => handleSubTabChange('slot')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeSubTab === 'slot'
              ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          ⚡ 老虎机管理
        </button>
      </div>

      {activeSubTab === 'lottery' ? (
        /* 抽奖/刮刮乐配置管理 */
        <div className="space-y-6">
          {/* 配置选择 */}
          {lotteryConfigs.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {lotteryConfigs.map((config) => (
                <button
                  key={config.id}
                  onClick={() => selectLotteryConfig(config)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedLotteryConfig?.id === config.id
                      ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-pink-300'
                  }`}
                >
                  {config.name} ({config.prizes?.length || 0}个奖品)
                </button>
              ))}
            </div>
          )}

          {/* 当前配置详情 */}
          {selectedLotteryConfig && (
            <>
              {/* 基础配置 */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-pink-500" />
                  {selectedLotteryConfig.name} - 基础配置
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div>
                    <label className="text-sm text-slate-500 dark:text-slate-400">名称</label>
                    <input
                      type="text"
                      value={selectedLotteryConfig.name}
                      onChange={(e) => updateLotteryConfig(selectedLotteryConfig.id, { name: e.target.value })}
                      className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-500 dark:text-slate-400">消耗积分</label>
                    <input
                      type="number"
                      value={selectedLotteryConfig.cost_points}
                      onChange={(e) => updateLotteryConfig(selectedLotteryConfig.id, { cost_points: parseInt(e.target.value) })}
                      className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-500 dark:text-slate-400">每日限制</label>
                    <input
                      type="number"
                      value={selectedLotteryConfig.daily_limit || ''}
                      onChange={(e) => updateLotteryConfig(selectedLotteryConfig.id, { daily_limit: e.target.value ? parseInt(e.target.value) : null })}
                      className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                      placeholder="不限"
                    />
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedLotteryConfig.is_active}
                        onChange={(e) => updateLotteryConfig(selectedLotteryConfig.id, { is_active: e.target.checked })}
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-300">启用</span>
                    </label>
                  </div>
                  <div className="flex items-end">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      selectedLotteryConfig.name?.includes('刮刮乐')
                        ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
                        : 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400'
                    }`}>
                      {selectedLotteryConfig.name?.includes('刮刮乐') ? '🎫 刮刮乐' : '🎁 普通抽奖'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 奖池配置 */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Gift className="w-5 h-5 text-pink-500" />
                    奖池配置（{lotteryPrizes.length}个奖品）
                  </h3>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-500">总权重: <span className="font-bold text-pink-600">{lotteryTotalWeight.toFixed(2)}</span></span>
                    <button
                      onClick={() => setShowAddLotteryPrizeModal(true)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      添加奖品
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="text-left py-2 px-3 text-slate-500">奖品名称</th>
                        <th className="text-left py-2 px-3 text-slate-500">类型</th>
                        <th className="text-left py-2 px-3 text-slate-500">奖品值</th>
                        <th className="text-right py-2 px-3 text-slate-500">权重</th>
                        <th className="text-right py-2 px-3 text-slate-500">概率</th>
                        <th className="text-right py-2 px-3 text-slate-500">库存</th>
                        <th className="text-center py-2 px-3 text-slate-500">稀有</th>
                        <th className="text-center py-2 px-3 text-slate-500">状态</th>
                        <th className="text-center py-2 px-3 text-slate-500">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lotteryPrizes.map((prize) => (
                        <tr key={prize.id} className={`border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 ${!prize.is_enabled ? 'opacity-50' : ''}`}>
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-2">
                              {prize.is_rare && <span className="text-yellow-500">★</span>}
                              <span className="text-slate-900 dark:text-white font-medium">{prize.name}</span>
                            </div>
                          </td>
                          <td className="py-2 px-3">
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              prize.type === 'POINTS' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' :
                              prize.type === 'ITEM' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' :
                              prize.type === 'API_KEY' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' :
                              'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                            }`}>
                              {prize.type === 'POINTS' ? '积分' : prize.type === 'ITEM' ? '道具' : prize.type === 'API_KEY' ? 'API Key' : prize.type === 'NOTHING' ? '谢谢参与' : prize.type}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-500">{prize.value || '-'}</td>
                          <td className="py-2 px-3 text-right">
                            {editingLotteryPrize === prize.id ? (
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                defaultValue={prize.weight}
                                onBlur={(e) => updateLotteryPrize(prize.id, { weight: parseFloat(e.target.value) || 0 })}
                                onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                                className="w-20 px-2 py-1 text-right border border-pink-300 rounded focus:ring-2 focus:ring-pink-500 dark:bg-slate-800 dark:border-slate-600"
                                autoFocus
                              />
                            ) : (
                              <span
                                className="text-pink-600 dark:text-pink-400 cursor-pointer hover:underline"
                                onClick={() => setEditingLotteryPrize(prize.id)}
                              >
                                {prize.weight}
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <span className={`font-mono ${prize.is_enabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                              {prize.is_enabled ? getLotteryProbability(prize.weight) : '0.00'}%
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right text-slate-500">{prize.stock ?? '∞'}</td>
                          <td className="py-2 px-3 text-center">
                            <button
                              onClick={() => updateLotteryPrize(prize.id, { is_rare: !prize.is_rare })}
                              className={`w-6 h-6 rounded ${prize.is_rare ? 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900/30' : 'text-slate-300 hover:text-yellow-400'}`}
                            >
                              ★
                            </button>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <button
                              onClick={() => updateLotteryPrize(prize.id, { is_enabled: !prize.is_enabled })}
                              className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                                prize.is_enabled
                                  ? 'bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
                                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
                              }`}
                            >
                              {prize.is_enabled ? '启用' : '禁用'}
                            </button>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => setEditingLotteryPrize(editingLotteryPrize === prize.id ? null : prize.id)}
                                className="p-1 text-pink-500 hover:text-pink-700 hover:bg-pink-50 dark:hover:bg-pink-900/30 rounded"
                                title="编辑权重"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => deleteLotteryPrize(prize.id)}
                                className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                                title="删除"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {lotteryConfigs.length === 0 && !loading && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
              <Gift className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">暂无抽奖配置</p>
            </div>
          )}

          {/* 添加奖品弹窗 */}
          {showAddLotteryPrizeModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">添加新奖品</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-slate-500 dark:text-slate-400">奖品类型</label>
                    <select
                      value={newLotteryPrize.type}
                      onChange={(e) => setNewLotteryPrize({ ...newLotteryPrize, type: e.target.value })}
                      className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                    >
                      <option value="POINTS">积分</option>
                      <option value="ITEM">道具</option>
                      <option value="API_KEY">API Key</option>
                      <option value="NOTHING">谢谢参与</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-slate-500 dark:text-slate-400">奖品名称</label>
                    <input
                      type="text"
                      value={newLotteryPrize.name}
                      onChange={(e) => setNewLotteryPrize({ ...newLotteryPrize, name: e.target.value })}
                      className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                      placeholder="如：100积分"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-500 dark:text-slate-400">奖品值（积分数量/道具类型等）</label>
                    <input
                      type="text"
                      value={newLotteryPrize.value}
                      onChange={(e) => setNewLotteryPrize({ ...newLotteryPrize, value: e.target.value })}
                      className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                      placeholder="如：100"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-slate-500 dark:text-slate-400">权重</label>
                      <input
                        type="number"
                        step="0.01"
                        value={newLotteryPrize.weight}
                        onChange={(e) => setNewLotteryPrize({ ...newLotteryPrize, weight: parseFloat(e.target.value) || 0 })}
                        className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-slate-500 dark:text-slate-400">库存（空=无限）</label>
                      <input
                        type="number"
                        value={newLotteryPrize.stock ?? ''}
                        onChange={(e) => setNewLotteryPrize({ ...newLotteryPrize, stock: e.target.value ? parseInt(e.target.value) : null })}
                        className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                        placeholder="无限"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newLotteryPrize.is_rare}
                        onChange={(e) => setNewLotteryPrize({ ...newLotteryPrize, is_rare: e.target.checked })}
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-300">稀有奖品</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newLotteryPrize.is_enabled}
                        onChange={(e) => setNewLotteryPrize({ ...newLotteryPrize, is_enabled: e.target.checked })}
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-300">立即启用</span>
                    </label>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowAddLotteryPrizeModal(false)}
                    className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    取消
                  </button>
                  <button
                    onClick={addLotteryPrize}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-lg font-medium hover:shadow-lg"
                  >
                    添加
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : activeSubTab === 'gacha' ? (
        /* 扭蛋机管理 */
        <div className="space-y-6">
          {/* 统计卡片 */}
          {gachaStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard title="总抽取次数" value={gachaStats.total_draws || 0} icon={Gift} color="purple" />
              <StatCard title="总消费积分" value={gachaStats.total_cost || 0} icon={Coins} color="orange" />
              <StatCard title="总发放积分" value={gachaStats.total_payout || 0} icon={TrendingUp} color="green" />
              <StatCard title="稀有率" value={`${gachaStats.rare_rate?.toFixed(1) || 0}%`} icon={Award} color="pink" />
            </div>
          )}

          {/* 配置管理 */}
          {selectedGachaConfig && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-500" />
                基础配置
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm text-slate-500 dark:text-slate-400">名称</label>
                  <input
                    type="text"
                    value={selectedGachaConfig.name}
                    onChange={(e) => updateGachaConfig(selectedGachaConfig.id, { name: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-500 dark:text-slate-400">消耗积分</label>
                  <input
                    type="number"
                    value={selectedGachaConfig.cost_points}
                    onChange={(e) => updateGachaConfig(selectedGachaConfig.id, { cost_points: parseInt(e.target.value) })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-500 dark:text-slate-400">每日限制</label>
                  <input
                    type="number"
                    value={selectedGachaConfig.daily_limit || ''}
                    onChange={(e) => updateGachaConfig(selectedGachaConfig.id, { daily_limit: e.target.value ? parseInt(e.target.value) : null })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                    placeholder="不限"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedGachaConfig.is_active}
                      onChange={(e) => updateGachaConfig(selectedGachaConfig.id, { is_active: e.target.checked })}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">启用</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* 奖池管理 */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Gift className="w-5 h-5 text-purple-500" />
                奖池配置（{gachaPrizes.length}个奖品）
              </h3>
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-500">总权重: <span className="font-bold text-blue-600">{totalWeight.toFixed(2)}</span></span>
                <button
                  onClick={() => setShowAddPrizeModal(true)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all"
                >
                  <Plus className="w-4 h-4" />
                  添加奖品
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-2 px-3 text-slate-500">奖品名称</th>
                    <th className="text-left py-2 px-3 text-slate-500">类型</th>
                    <th className="text-right py-2 px-3 text-slate-500">权重</th>
                    <th className="text-right py-2 px-3 text-slate-500">概率</th>
                    <th className="text-right py-2 px-3 text-slate-500">库存</th>
                    <th className="text-center py-2 px-3 text-slate-500">稀有</th>
                    <th className="text-center py-2 px-3 text-slate-500">状态</th>
                    <th className="text-center py-2 px-3 text-slate-500">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {gachaPrizes.map((prize) => (
                    <tr key={prize.id} className={`border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 ${!prize.is_enabled ? 'opacity-50' : ''}`}>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          {prize.is_rare && <span className="text-yellow-500">★</span>}
                          <span className="text-slate-900 dark:text-white font-medium">{prize.prize_name}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          prize.prize_type === 'points' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' :
                          prize.prize_type === 'item' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' :
                          prize.prize_type === 'badge' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' :
                          'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
                        }`}>
                          {prize.prize_type === 'points' ? '积分' : prize.prize_type === 'item' ? '道具' : prize.prize_type === 'badge' ? '徽章' : 'API Key'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right">
                        {editingPrize === prize.id ? (
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            defaultValue={prize.weight}
                            onBlur={(e) => updatePrize(prize.id, { weight: parseFloat(e.target.value) || 0 })}
                            onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                            className="w-20 px-2 py-1 text-right border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600"
                            autoFocus
                          />
                        ) : (
                          <span
                            className="text-blue-600 dark:text-blue-400 cursor-pointer hover:underline"
                            onClick={() => setEditingPrize(prize.id)}
                          >
                            {prize.weight}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <span className={`font-mono ${prize.is_enabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                          {prize.is_enabled ? getProbability(prize.weight) : '0.00'}%
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right text-slate-500">{prize.stock ?? '∞'}</td>
                      <td className="py-2 px-3 text-center">
                        <button
                          onClick={() => updatePrize(prize.id, { is_rare: !prize.is_rare })}
                          className={`w-6 h-6 rounded ${prize.is_rare ? 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900/30' : 'text-slate-300 hover:text-yellow-400'}`}
                        >
                          ★
                        </button>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <button
                          onClick={() => togglePrizeEnabled(prize)}
                          className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                            prize.is_enabled
                              ? 'bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {prize.is_enabled ? '启用' : '禁用'}
                        </button>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setEditingPrize(editingPrize === prize.id ? null : prize.id)}
                            className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
                            title="编辑权重"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deletePrize(prize.id)}
                            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 概率分布可视化 */}
            <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">概率分布</h4>
              <div className="flex flex-wrap gap-2">
                {gachaPrizes.filter(p => p.is_enabled).map((prize) => {
                  const prob = parseFloat(getProbability(prize.weight))
                  return (
                    <div
                      key={prize.id}
                      className={`px-2 py-1 rounded text-xs ${
                        prize.is_rare
                          ? 'bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30 text-orange-700 dark:text-orange-300 border border-yellow-200 dark:border-yellow-800'
                          : 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600'
                      }`}
                      style={{ minWidth: `${Math.max(prob * 2, 40)}px` }}
                    >
                      <div className="font-medium truncate">{prize.prize_name}</div>
                      <div className="text-[10px] opacity-70">{prob}%</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* 添加奖品弹窗 */}
          {showAddPrizeModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">添加新奖品</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-slate-500 dark:text-slate-400">奖品类型</label>
                    <select
                      value={newPrize.prize_type}
                      onChange={(e) => {
                        const type = e.target.value
                        let defaultValue = { amount: 10 }
                        if (type === 'item') defaultValue = { item_type: 'cheer', amount: 1 }
                        if (type === 'badge') defaultValue = { achievement_key: '', fallback_points: 50 }
                        if (type === 'api_key') defaultValue = { usage_type: '扭蛋机' }
                        setNewPrize({ ...newPrize, prize_type: type, prize_value: defaultValue })
                      }}
                      className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                    >
                      <option value="points">积分</option>
                      <option value="item">道具</option>
                      <option value="badge">徽章</option>
                      <option value="api_key">API Key</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-slate-500 dark:text-slate-400">奖品名称</label>
                    <input
                      type="text"
                      value={newPrize.prize_name}
                      onChange={(e) => setNewPrize({ ...newPrize, prize_name: e.target.value })}
                      className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                      placeholder="如：100积分"
                    />
                  </div>
                  {newPrize.prize_type === 'points' && (
                    <div>
                      <label className="text-sm text-slate-500 dark:text-slate-400">积分数量</label>
                      <input
                        type="number"
                        value={newPrize.prize_value?.amount || 0}
                        onChange={(e) => setNewPrize({ ...newPrize, prize_value: { amount: parseInt(e.target.value) || 0 } })}
                        className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                      />
                    </div>
                  )}
                  {newPrize.prize_type === 'item' && (
                    <>
                      <div>
                        <label className="text-sm text-slate-500 dark:text-slate-400">道具类型</label>
                        <select
                          value={newPrize.prize_value?.item_type || 'cheer'}
                          onChange={(e) => setNewPrize({ ...newPrize, prize_value: { ...newPrize.prize_value, item_type: e.target.value } })}
                          className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                        >
                          <option value="cheer">爱心</option>
                          <option value="coffee">咖啡</option>
                          <option value="energy">能量</option>
                          <option value="pizza">披萨</option>
                          <option value="star">星星</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-sm text-slate-500 dark:text-slate-400">数量</label>
                        <input
                          type="number"
                          value={newPrize.prize_value?.amount || 1}
                          onChange={(e) => setNewPrize({ ...newPrize, prize_value: { ...newPrize.prize_value, amount: parseInt(e.target.value) || 1 } })}
                          className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                        />
                      </div>
                    </>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-slate-500 dark:text-slate-400">权重</label>
                      <input
                        type="number"
                        step="0.01"
                        value={newPrize.weight}
                        onChange={(e) => setNewPrize({ ...newPrize, weight: parseFloat(e.target.value) || 0 })}
                        className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-slate-500 dark:text-slate-400">库存（空=无限）</label>
                      <input
                        type="number"
                        value={newPrize.stock ?? ''}
                        onChange={(e) => setNewPrize({ ...newPrize, stock: e.target.value ? parseInt(e.target.value) : null })}
                        className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                        placeholder="无限"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newPrize.is_rare}
                        onChange={(e) => setNewPrize({ ...newPrize, is_rare: e.target.checked })}
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-300">稀有奖品</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newPrize.is_enabled}
                        onChange={(e) => setNewPrize({ ...newPrize, is_enabled: e.target.checked })}
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-300">立即启用</span>
                    </label>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowAddPrizeModal(false)}
                    className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    取消
                  </button>
                  <button
                    onClick={addPrize}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:shadow-lg"
                  >
                    添加
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* 老虎机管理 */
        <div className="space-y-6">
          {/* 统计卡片 */}
          {slotStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard title="总抽取次数" value={slotStats.total_draws || 0} icon={Zap} color="purple" />
              <StatCard title="总消费积分" value={slotStats.total_cost || 0} icon={Coins} color="orange" />
              <StatCard title="实际返奖率" value={`${slotStats.actual_rtp?.toFixed(1) || 0}%`} icon={TrendingUp} color="green" />
              <StatCard title="大奖次数" value={slotStats.jackpot_count || 0} icon={Award} color="pink" />
            </div>
          )}

          {/* 配置管理 */}
          {slotConfig && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-purple-500" />
                基础配置
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <label className="text-sm text-slate-500 dark:text-slate-400">名称</label>
                  <input
                    type="text"
                    value={slotConfig.name}
                    onChange={(e) => updateSlotConfig({ name: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-500 dark:text-slate-400">消耗积分</label>
                  <input
                    type="number"
                    value={slotConfig.cost_points}
                    onChange={(e) => updateSlotConfig({ cost_points: parseInt(e.target.value) })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-500 dark:text-slate-400">滚轴数</label>
                  <input
                    type="number"
                    value={slotConfig.reels}
                    onChange={(e) => updateSlotConfig({ reels: parseInt(e.target.value) })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                    min={3}
                    max={5}
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-500 dark:text-slate-400">两连倍率</label>
                  <input
                    type="number"
                    step="0.1"
                    value={slotConfig.two_kind_multiplier}
                    onChange={(e) => updateSlotConfig({ two_kind_multiplier: parseFloat(e.target.value) })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={slotConfig.is_active}
                      onChange={(e) => updateSlotConfig({ is_active: e.target.checked })}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">启用</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* 符号配置 */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              🎰 符号配置（{slotSymbols.length}个符号）
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
              {slotSymbols.map((symbol) => (
                <div
                  key={symbol.symbol_key}
                  className={`p-3 rounded-xl border text-center ${
                    symbol.is_enabled
                      ? 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                      : 'bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-600 opacity-50'
                  }`}
                >
                  <div className="text-2xl mb-1">{symbol.emoji}</div>
                  <div className="text-xs font-medium text-slate-700 dark:text-slate-300">{symbol.name}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    <span className="text-blue-500">{symbol.multiplier}x</span>
                    <span className="mx-1">·</span>
                    <span>w:{symbol.weight}</span>
                  </div>
                  {symbol.is_jackpot && (
                    <span className="text-xs text-yellow-500">⭐ 大奖</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 中奖规则 */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-500" />
              中奖规则（{slotRules.length}条）
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-2 px-3 text-slate-500">规则名称</th>
                    <th className="text-left py-2 px-3 text-slate-500">类型</th>
                    <th className="text-right py-2 px-3 text-slate-500">倍率</th>
                    <th className="text-right py-2 px-3 text-slate-500">优先级</th>
                    <th className="text-center py-2 px-3 text-slate-500">状态</th>
                    <th className="text-right py-2 px-3 text-slate-500">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {slotRules.map((rule) => (
                    <tr key={rule.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-2 px-3 text-slate-900 dark:text-white font-medium">{rule.rule_name}</td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          rule.rule_type === 'penalty' ? 'bg-red-100 text-red-600' :
                          rule.rule_type === 'bonus' ? 'bg-green-100 text-green-600' :
                          'bg-blue-100 text-blue-600'
                        }`}>
                          {rule.rule_type}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right">
                        {editingRule === rule.id ? (
                          <input
                            type="number"
                            step="0.1"
                            defaultValue={rule.multiplier}
                            onBlur={(e) => updateRule(rule.id, { multiplier: parseFloat(e.target.value) })}
                            className="w-16 px-2 py-1 text-right border rounded"
                            autoFocus
                          />
                        ) : (
                          <span className={rule.multiplier < 0 ? 'text-red-500' : 'text-green-600'}>
                            {rule.multiplier > 0 ? '+' : ''}{rule.multiplier}x
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-500">{rule.priority}</td>
                      <td className="py-2 px-3 text-center">
                        <button
                          onClick={() => updateRule(rule.id, { is_enabled: !rule.is_enabled })}
                          className={`px-2 py-0.5 rounded-full text-xs ${rule.is_enabled ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'}`}
                        >
                          {rule.is_enabled ? '启用' : '禁用'}
                        </button>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <button
                          onClick={() => setEditingRule(editingRule === rule.id ? null : rule.id)}
                          className="text-blue-500 hover:text-blue-700"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// API Key 管理面板
function ApiKeyPanel() {
  const toast = useToast()
  const [keys, setKeys] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [showBatchAdd, setShowBatchAdd] = useState(false)
  const [newKey, setNewKey] = useState({ code: '', quota: '', description: '' })
  const [batchData, setBatchData] = useState({ codes: '', quota: '', description: '抽奖' })

  // 分页状态
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const pageSize = 10

  // 筛选状态
  const [filterDesc, setFilterDesc] = useState('')
  const [filterUsername, setFilterUsername] = useState('')

  useEffect(() => {
    loadKeys()
  }, [page])

  const loadKeys = async () => {
    setLoading(true)
    try {
      const offset = (page - 1) * pageSize
      const params = { limit: pageSize, offset }
      if (filterDesc.trim()) params.description = filterDesc.trim()
      if (filterUsername.trim()) params.username = filterUsername.trim()

      const data = await adminApi2.getApiKeys(params)
      setKeys(data.items)
      setTotal(data.total || 0)
    } catch (error) {
      toast.error('加载失败')
    } finally {
      setLoading(false)
    }
  }

  // 筛选搜索
  const handleSearch = () => {
    setPage(1)
    loadKeys()
  }

  // 清空筛选
  const handleClearFilter = async () => {
    setFilterDesc('')
    setFilterUsername('')
    setPage(1)
    // 直接用空参数请求
    setLoading(true)
    try {
      const data = await adminApi2.getApiKeys({ limit: pageSize, offset: 0 })
      setKeys(data.items)
      setTotal(data.total || 0)
    } catch (error) {
      toast.error('加载失败')
    } finally {
      setLoading(false)
    }
  }

  // 计算总页数
  const totalPages = Math.ceil(total / pageSize)

  const handleAddKey = async () => {
    if (!newKey.code) {
      toast.error('请输入兑换码')
      return
    }

    try {
      await adminApi2.createApiKey({
        code: newKey.code,
        quota: parseFloat(newKey.quota) || 0,
        description: newKey.description || null
      })
      toast.success('添加成功')
      setNewKey({ code: '', quota: '', description: '' })
      setShowAdd(false)
      loadKeys()
    } catch (error) {
      toast.error('添加失败')
    }
  }

  const handleDeleteKey = async (id) => {
    if (!confirm('确定删除此兑换码？')) return

    try {
      await adminApi2.deleteApiKey(id)
      toast.success('删除成功')

      // 如果当前页只剩一条数据，删除后回退到上一页
      if (keys.length === 1 && page > 1) {
        setPage(page - 1)
      } else {
        loadKeys()
      }
    } catch (error) {
      toast.error('删除失败')
    }
  }

  const handleBatchAdd = async () => {
    if (!batchData.codes.trim()) {
      toast.error('请输入兑换码')
      return
    }

    // 解析兑换码：支持换行、逗号、空格分隔
    const codes = batchData.codes
      .split(/[\n,\s]+/)
      .map(c => c.trim())
      .filter(c => c.length > 0)

    if (codes.length === 0) {
      toast.error('请输入有效的兑换码')
      return
    }

    const quota = parseFloat(batchData.quota) || 0
    const description = batchData.description || null

    // 构建批量请求数据
    const batchItems = codes.map(code => ({
      code,
      quota,
      description
    }))

    try {
      const result = await adminApi2.batchCreateApiKeys(batchItems)
      if (result.created > 0) {
        const msg = result.skipped > 0
          ? `成功添加 ${result.created} 个兑换码，跳过 ${result.skipped} 个重复`
          : `成功添加 ${result.created} 个兑换码`
        toast.success(msg)
      } else if (result.skipped > 0) {
        toast.warning(`所有 ${result.skipped} 个兑换码均已存在`)
      } else {
        toast.error(result.message || '添加失败')
      }
      setBatchData({ codes: '', quota: '', description: '抽奖' })
      setShowBatchAdd(false)
      loadKeys()
    } catch (error) {
      toast.error('批量添加失败: ' + (error.response?.data?.detail || '未知错误'))
    }
  }

  const statusMap = {
    AVAILABLE: { label: '可用', color: 'bg-green-100 text-green-600' },
    ASSIGNED: { label: '已分配', color: 'bg-blue-100 text-blue-600' },
    REDEEMED: { label: '已兑换', color: 'bg-slate-100 text-slate-600' },
    EXPIRED: { label: '已过期', color: 'bg-red-100 text-red-600' },
  }

  return (
    <div>
      {/* 筛选和添加按钮 */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        {/* 筛选输入 */}
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="text"
            placeholder="按描述筛选"
            value={filterDesc}
            onChange={(e) => setFilterDesc(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 w-40"
          />
          <input
            type="text"
            placeholder="按用户名筛选"
            value={filterUsername}
            onChange={(e) => setFilterUsername(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 w-40"
          />
          <button
            onClick={handleSearch}
            className="px-4 py-2 text-sm bg-slate-600 text-white rounded-lg hover:bg-slate-700"
          >
            搜索
          </button>
          {(filterDesc || filterUsername) && (
            <button
              onClick={handleClearFilter}
              className="px-4 py-2 text-sm bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600"
            >
              清空筛选
            </button>
          )}
        </div>

        {/* 添加按钮 */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowBatchAdd(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            <Plus className="w-4 h-4" />
            批量添加
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
          >
            <Plus className="w-4 h-4" />
            添加兑换码
          </button>
        </div>
      </div>

      {/* 列表 */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead className="bg-slate-50 dark:bg-slate-800">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">ID</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">兑换码</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">额度</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">状态</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">分配给</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">描述</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">加载中...</td>
              </tr>
            ) : keys.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">暂无兑换码</td>
              </tr>
            ) : (
              keys.map((key) => (
                <tr key={key.id}>
                  <td className="px-4 py-3 text-sm text-slate-500">{key.id}</td>
                  <td className="px-4 py-3 font-mono text-sm">{key.code}</td>
                  <td className="px-4 py-3">${key.quota}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${statusMap[key.status]?.color}`}>
                      {statusMap[key.status]?.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {key.assigned_username ? (
                      <span className="text-blue-600 dark:text-blue-400 font-medium">{key.assigned_username}</span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-sm">{key.description || '-'}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDeleteKey(key.id)}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>

        {/* 分页控件 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
            <div className="text-sm text-slate-500">
              共 {total} 条，第 {page} / {totalPages} 页
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                上一页
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 添加弹窗 */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAdd(false)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">添加 API Key 兑换码</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">兑换码</label>
                <input
                  type="text"
                  value={newKey.code}
                  onChange={(e) => setNewKey({ ...newKey, code: e.target.value })}
                  placeholder="sk-xxxxxx"
                  className="w-full px-3 py-2 rounded-lg border"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">额度（美元）</label>
                <input
                  type="number"
                  value={newKey.quota}
                  onChange={(e) => setNewKey({ ...newKey, quota: e.target.value })}
                  placeholder="0"
                  className="w-full px-3 py-2 rounded-lg border"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">用途</label>
                <select
                  value={newKey.description}
                  onChange={(e) => setNewKey({ ...newKey, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="">请选择用途</option>
                  <option value="抽奖">抽奖</option>
                  <option value="彩蛋">彩蛋</option>
                  <option value="扭蛋机">扭蛋机</option>
                  <option value="刮刮乐">刮刮乐</option>
                  <option value="老虎机">老虎机</option>
                  <option value="积分兑换">积分兑换</option>
                  <option value="码神挑战-半程奖励">码神挑战-半程奖励</option>
                  <option value="码神挑战-全程奖励">码神挑战-全程奖励</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAdd(false)}
                className="flex-1 px-4 py-2 border rounded-lg"
              >
                取消
              </button>
              <button
                onClick={handleAddKey}
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 批量添加弹窗 */}
      {showBatchAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowBatchAdd(false)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">批量添加 API Key 兑换码</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  兑换码（每行一个，或用逗号/空格分隔）
                </label>
                <textarea
                  value={batchData.codes}
                  onChange={(e) => setBatchData({ ...batchData, codes: e.target.value })}
                  placeholder="55ee3072d0da4a7bbc9043079a9fc65a&#10;30313e2b53164511bc31a8fb740de080&#10;93668e4d21094f92b04212bc13abd9ae"
                  rows={6}
                  className="w-full px-3 py-2 rounded-lg border dark:border-slate-700 dark:bg-slate-800 font-mono text-sm"
                />
                <p className="text-xs text-slate-500 mt-1">
                  已输入 {batchData.codes.split(/[\n,\s]+/).filter(c => c.trim()).length} 个兑换码
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  统一额度（美元）
                </label>
                <input
                  type="number"
                  value={batchData.quota}
                  onChange={(e) => setBatchData({ ...batchData, quota: e.target.value })}
                  placeholder="5"
                  className="w-full px-3 py-2 rounded-lg border dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  用途
                </label>
                <select
                  value={batchData.description}
                  onChange={(e) => setBatchData({ ...batchData, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="抽奖">抽奖</option>
                  <option value="彩蛋">彩蛋</option>
                  <option value="扭蛋机">扭蛋机</option>
                  <option value="刮刮乐">刮刮乐</option>
                  <option value="老虎机">老虎机</option>
                  <option value="积分兑换">积分兑换</option>
                  <option value="码神挑战-半程奖励">码神挑战-半程奖励</option>
                  <option value="码神挑战-全程奖励">码神挑战-全程奖励</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowBatchAdd(false)}
                className="flex-1 px-4 py-2 border rounded-lg dark:border-slate-700"
              >
                取消
              </button>
              <button
                onClick={handleBatchAdd}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                批量添加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// API Key 监控面板 - 监控参赛者的 Key 消耗（参考 api-key-tool 风格）
function ApiKeyMonitorPanel() {
  const toast = useToast()
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState(null)
  const [selectedUserData, setSelectedUserData] = useState(null)
  const [userLogs, setUserLogs] = useState([])
  const [userLogsTotal, setUserLogsTotal] = useState(0)
  const [userLogsPage, setUserLogsPage] = useState(1)
  const [logsLoading, setLogsLoading] = useState(false)
  const [allLogs, setAllLogs] = useState([])
  const [allLogsTotal, setAllLogsTotal] = useState(0)
  const [allLogsPage, setAllLogsPage] = useState(1)
  const [showAllLogs, setShowAllLogs] = useState(false)
  const [allLogsLoading, setAllLogsLoading] = useState(false)

  const LOGS_PER_PAGE = 100

  useEffect(() => {
    loadSummary()
  }, [])

  const loadSummary = async () => {
    setLoading(true)
    try {
      const data = await adminApi2.getApikeyMonitorSummary()
      setSummary(data)
    } catch (error) {
      console.error('加载监控数据失败:', error)
      toast.error('加载监控数据失败')
    } finally {
      setLoading(false)
    }
  }

  const loadUserLogs = async (registrationId, displayName, itemData) => {
    setSelectedUser({ id: registrationId, name: displayName })
    setSelectedUserData(itemData)
    setUserLogsPage(1) // 重置页码
    setLogsLoading(true)
    try {
      // 获取所有日志，前端分页显示（后端限制最大500条，已按时间降序排列）
      const data = await adminApi2.getApikeyMonitorLogs(registrationId, 500)
      const logs = data.logs || []
      setUserLogs(logs)
      setUserLogsTotal(data.total || logs.length)
    } catch (error) {
      console.error('加载日志失败:', error)
      toast.error('加载日志失败')
    } finally {
      setLogsLoading(false)
    }
  }

  const loadAllLogs = async () => {
    setShowAllLogs(true)
    setAllLogsPage(1) // 重置页码
    setAllLogsLoading(true)
    try {
      // 后端已按时间降序排列（最新在前）
      const data = await adminApi2.getAllApikeyLogs(1000)
      const logs = data.logs || []
      setAllLogs(logs)
      setAllLogsTotal(data.total || logs.length)
    } catch (error) {
      console.error('加载日志失败:', error)
      toast.error('加载日志失败')
    } finally {
      setAllLogsLoading(false)
    }
  }

  // 格式化时间 - 显示完整日期时间 YYYY-MM-DD HH:mm:ss
  const formatTime = (timestamp) => {
    if (!timestamp) return '-'
    const date = new Date(timestamp * 1000)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hour = String(date.getHours()).padStart(2, '0')
    const minute = String(date.getMinutes()).padStart(2, '0')
    const second = String(date.getSeconds()).padStart(2, '0')
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`
  }

  // 格式化金额（后端返回的是美元值）
  const formatQuota = (value, digits = 4) => {
    if (value === null || value === undefined) return '-'
    return `$${Number(value).toFixed(digits)}`
  }

  // 格式化日志中的 quota 字段（1 USD = 500000 quota）
  const renderLogQuota = (quota) => {
    if (quota === null || quota === undefined) return '-'
    const quotaPerUnit = 500000
    return `$${(quota / quotaPerUnit).toFixed(4)}`
  }

  // 消耗百分比颜色
  const getUsageColor = (used, total) => {
    if (!total || total === 0) return 'text-slate-400'
    const percent = (used / total) * 100
    if (percent >= 90) return 'text-red-500'
    if (percent >= 70) return 'text-orange-500'
    if (percent >= 50) return 'text-yellow-500'
    return 'text-green-500'
  }

  // 进度条颜色
  const getProgressColor = (used, total) => {
    if (!total || total === 0) return 'bg-slate-300'
    const percent = (used / total) * 100
    if (percent >= 90) return 'bg-red-500'
    if (percent >= 70) return 'bg-orange-500'
    if (percent >= 50) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array(4).fill(0).map((_, i) => (
            <div key={i} className="animate-pulse bg-slate-100 dark:bg-slate-800 rounded-xl h-24" />
          ))}
        </div>
        <div className="animate-pulse bg-slate-100 dark:bg-slate-800 rounded-xl h-96" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 汇总统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="参赛选手"
          value={summary?.total_count || 0}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="总消耗"
          value={formatQuota(summary?.total_used)}
          icon={Zap}
          color="orange"
        />
        <StatCard
          title="总剩余"
          value={formatQuota(summary?.total_remaining)}
          icon={Coins}
          color="green"
        />
        <StatCard
          title="今日活跃"
          value={summary?.active_count || 0}
          icon={TrendingUp}
          color="purple"
        />
      </div>

      {/* 工具栏 */}
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-slate-900 dark:text-white">选手消耗明细</h3>
        <div className="flex gap-2">
          <button
            onClick={loadAllLogs}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <Activity className="w-4 h-4" />
            查看全部日志
          </button>
          <button
            onClick={loadSummary}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            刷新
          </button>
        </div>
      </div>

      {/* 选手消耗卡片列表 */}
      {!summary?.items?.length ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 text-center text-slate-500">
          暂无参赛者数据
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {summary.items.map((item) => {
            const quota = item.quota
            const used = quota?.used || 0
            const total = quota?.total || 0
            const remaining = quota?.remaining ?? (total - used)
            const todayUsed = quota?.today_used || 0
            const percent = total > 0 ? Math.min((used / total) * 100, 100) : 0
            const user = item.user
            const isError = item.query_status === 'error'
            const isUnlimited = quota?.is_unlimited
            const isCritical = !isUnlimited && percent >= 90
            const isWarning = !isUnlimited && percent >= 70

            return (
              <div
                key={item.registration_id}
                onClick={() => loadUserLogs(item.registration_id, user?.display_name || user?.username || item.title, item)}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700 transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={resolveAvatarUrl(user?.avatar_url)}
                      alt=""
                      className="w-10 h-10 rounded-full"
                    />
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{user?.display_name || user?.username || '-'}</p>
                      <p className="text-xs text-slate-500 truncate max-w-[150px]" title={item.title}>{item.title || '-'}</p>
                    </div>
                  </div>
                  <div>
                    {isError ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                        <AlertTriangle className="w-3 h-3" />异常
                      </span>
                    ) : isUnlimited ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                        <Zap className="w-3 h-3" />无限
                      </span>
                    ) : isCritical ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                        <AlertTriangle className="w-3 h-3" />告急
                      </span>
                    ) : isWarning ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                        <AlertCircle className="w-3 h-3" />注意
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                        <Check className="w-3 h-3" />正常
                      </span>
                    )}
                  </div>
                </div>
                {quota && !isUnlimited && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-500">消耗进度</span>
                      <span className={getUsageColor(used, total)}>{percent.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                      <div className={`h-2 rounded-full transition-all ${getProgressColor(used, total)}`} style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2 py-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="text-center">
                    <p className="text-xs text-slate-500 mb-1">已使用</p>
                    <p className={`text-sm font-semibold ${getUsageColor(used, total)}`}>{quota ? formatQuota(used, 2) : '-'}</p>
                  </div>
                  <div className="text-center border-x border-slate-100 dark:border-slate-800">
                    <p className="text-xs text-slate-500 mb-1">剩余</p>
                    <p className="text-sm font-semibold text-green-600">{quota ? (isUnlimited ? '∞' : formatQuota(remaining, 2)) : '-'}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-500 mb-1">今日</p>
                    <p className="text-sm font-semibold text-blue-600">{quota ? formatQuota(todayUsed, 2) : '-'}</p>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-400">{quota?.group || '默认分组'}</span>
                  <span className="text-xs text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    <Eye className="w-3 h-3" />点击查看详细日志
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 单个用户日志弹窗 - 参照 api-key-tool 设计 */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelectedUser(null)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-6xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                API 调用日志 - {selectedUser.name}
              </h3>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 配额汇总信息卡片 */}
            {selectedUserData?.quota && (
              <div className="mb-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-xs text-slate-500 mb-1">总额度</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-white">
                      {selectedUserData.quota.is_unlimited ? '∞' : formatQuota(selectedUserData.quota.total, 2)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-500 mb-1">已使用</p>
                    <p className="text-lg font-bold text-orange-500">
                      {formatQuota(selectedUserData.quota.used, 2)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-500 mb-1">剩余</p>
                    <p className="text-lg font-bold text-green-500">
                      {selectedUserData.quota.is_unlimited ? '∞' : formatQuota(selectedUserData.quota.remaining, 2)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-500 mb-1">今日消耗</p>
                    <p className="text-lg font-bold text-blue-500">
                      {formatQuota(selectedUserData.quota.today_used, 2)}
                    </p>
                  </div>
                </div>
                {selectedUserData.quota.group && (
                  <p className="text-xs text-slate-400 text-center mt-2">分组: {selectedUserData.quota.group}</p>
                )}
              </div>
            )}

            <div className="flex-1 overflow-auto">
              {logsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
                </div>
              ) : userLogs.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  暂无调用日志
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 z-10">
                    <tr>
                      <th className="px-3 py-3 text-left font-medium text-slate-600 dark:text-slate-400">时间</th>
                      <th className="px-3 py-3 text-left font-medium text-slate-600 dark:text-slate-400">令牌名称</th>
                      <th className="px-3 py-3 text-left font-medium text-slate-600 dark:text-slate-400">模型</th>
                      <th className="px-3 py-3 text-left font-medium text-slate-600 dark:text-slate-400">用时</th>
                      <th className="px-3 py-3 text-left font-medium text-slate-600 dark:text-slate-400">提示</th>
                      <th className="px-3 py-3 text-left font-medium text-slate-600 dark:text-slate-400">补全</th>
                      <th className="px-3 py-3 text-left font-medium text-slate-600 dark:text-slate-400">花费</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {userLogs
                      .slice((userLogsPage - 1) * LOGS_PER_PAGE, userLogsPage * LOGS_PER_PAGE)
                      .map((log, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            {formatTime(log.created_at)}
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded text-xs font-medium">
                            {log.token_name || '-'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded text-xs font-medium">
                            {log.model_name || log.model || '-'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              (log.use_time || 0) < 10
                                ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                                : (log.use_time || 0) < 30
                                  ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300'
                                  : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                            }`}>
                              {log.use_time || 0}s
                            </span>
                            {log.is_stream !== undefined && (
                              <span className={`px-1.5 py-0.5 rounded text-xs ${
                                log.is_stream
                                  ? 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300'
                                  : 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
                              }`}>
                                {log.is_stream ? '流' : '非流'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-green-600 dark:text-green-400 font-medium">
                          {log.prompt_tokens || 0}
                        </td>
                        <td className="px-3 py-2.5 text-blue-600 dark:text-blue-400 font-medium">
                          {log.completion_tokens > 0 ? log.completion_tokens : '-'}
                        </td>
                        <td className="px-3 py-2.5 font-semibold text-orange-500">
                          {renderLogQuota(log.quota || log.used_quota)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* 底部分页和统计 */}
            {userLogs.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                {/* 分页控件 */}
                {userLogs.length > LOGS_PER_PAGE && (
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <button
                      onClick={() => setUserLogsPage(1)}
                      disabled={userLogsPage === 1}
                      className="px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      首页
                    </button>
                    <button
                      onClick={() => setUserLogsPage(p => Math.max(1, p - 1))}
                      disabled={userLogsPage === 1}
                      className="px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      上一页
                    </button>
                    <span className="text-sm text-slate-600 dark:text-slate-400 px-3">
                      第 <span className="font-semibold">{userLogsPage}</span> / {Math.ceil(userLogs.length / LOGS_PER_PAGE)} 页
                    </span>
                    <button
                      onClick={() => setUserLogsPage(p => Math.min(Math.ceil(userLogs.length / LOGS_PER_PAGE), p + 1))}
                      disabled={userLogsPage >= Math.ceil(userLogs.length / LOGS_PER_PAGE)}
                      className="px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      下一页
                    </button>
                    <button
                      onClick={() => setUserLogsPage(Math.ceil(userLogs.length / LOGS_PER_PAGE))}
                      disabled={userLogsPage >= Math.ceil(userLogs.length / LOGS_PER_PAGE)}
                      className="px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      末页
                    </button>
                  </div>
                )}
                {/* 统计信息 */}
                <div className="flex items-center justify-between text-sm text-slate-500">
                  <span>
                    共 <span className="font-semibold text-slate-700 dark:text-slate-300">{userLogs.length}</span> 条记录
                  </span>
                  <span>
                    总花费: <span className="font-semibold text-orange-500">
                      {renderLogQuota(userLogs.reduce((sum, log) => sum + (log.quota || log.used_quota || 0), 0))}
                    </span>
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 全部日志弹窗 - 参照 api-key-tool 设计 */}
      {showAllLogs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAllLogs(false)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-7xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                全部 API 调用日志
              </h3>
              <button
                onClick={() => setShowAllLogs(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto">
              {allLogsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
                </div>
              ) : allLogs.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  暂无调用日志
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 z-10">
                    <tr>
                      <th className="px-3 py-3 text-left font-medium text-slate-600 dark:text-slate-400">时间</th>
                      <th className="px-3 py-3 text-left font-medium text-slate-600 dark:text-slate-400">选手</th>
                      <th className="px-3 py-3 text-left font-medium text-slate-600 dark:text-slate-400">令牌名称</th>
                      <th className="px-3 py-3 text-left font-medium text-slate-600 dark:text-slate-400">模型</th>
                      <th className="px-3 py-3 text-left font-medium text-slate-600 dark:text-slate-400">用时</th>
                      <th className="px-3 py-3 text-left font-medium text-slate-600 dark:text-slate-400">提示</th>
                      <th className="px-3 py-3 text-left font-medium text-slate-600 dark:text-slate-400">补全</th>
                      <th className="px-3 py-3 text-left font-medium text-slate-600 dark:text-slate-400">花费</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {allLogs
                      .slice((allLogsPage - 1) * LOGS_PER_PAGE, allLogsPage * LOGS_PER_PAGE)
                      .map((log, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            {formatTime(log.created_at)}
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="font-medium text-slate-900 dark:text-white">
                            {log._user?.display_name || log._user?.username || log._title || '-'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded text-xs font-medium">
                            {log.token_name || '-'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded text-xs font-medium">
                            {log.model_name || log.model || '-'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              (log.use_time || 0) < 10
                                ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                                : (log.use_time || 0) < 30
                                  ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300'
                                  : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                            }`}>
                              {log.use_time || 0}s
                            </span>
                            {log.is_stream !== undefined && (
                              <span className={`px-1.5 py-0.5 rounded text-xs ${
                                log.is_stream
                                  ? 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300'
                                  : 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
                              }`}>
                                {log.is_stream ? '流' : '非流'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-green-600 dark:text-green-400 font-medium">
                          {log.prompt_tokens || 0}
                        </td>
                        <td className="px-3 py-2.5 text-blue-600 dark:text-blue-400 font-medium">
                          {log.completion_tokens > 0 ? log.completion_tokens : '-'}
                        </td>
                        <td className="px-3 py-2.5 font-semibold text-orange-500">
                          {renderLogQuota(log.quota || log.used_quota)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* 分页控件 */}
            {allLogs.length > LOGS_PER_PAGE && (
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2">
                <button
                  onClick={() => setAllLogsPage(1)}
                  disabled={allLogsPage === 1}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                >
                  首页
                </button>
                <button
                  onClick={() => setAllLogsPage(p => Math.max(1, p - 1))}
                  disabled={allLogsPage === 1}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                >
                  上一页
                </button>
                <span className="px-4 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                  第 {allLogsPage} / {Math.ceil(allLogs.length / LOGS_PER_PAGE)} 页
                </span>
                <button
                  onClick={() => setAllLogsPage(p => Math.min(Math.ceil(allLogs.length / LOGS_PER_PAGE), p + 1))}
                  disabled={allLogsPage >= Math.ceil(allLogs.length / LOGS_PER_PAGE)}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                >
                  下一页
                </button>
                <button
                  onClick={() => setAllLogsPage(Math.ceil(allLogs.length / LOGS_PER_PAGE))}
                  disabled={allLogsPage >= Math.ceil(allLogs.length / LOGS_PER_PAGE)}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                >
                  末页
                </button>
              </div>
            )}

            {/* 底部统计 */}
            {allLogs.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-sm text-slate-500">
                <span>
                  共 <span className="font-semibold text-slate-700 dark:text-slate-300">{allLogs.length}</span> 条记录
                  {allLogs.length > LOGS_PER_PAGE && (
                    <span className="text-slate-400 ml-1">
                      （当前显示 {(allLogsPage - 1) * LOGS_PER_PAGE + 1} - {Math.min(allLogsPage * LOGS_PER_PAGE, allLogs.length)} 条）
                    </span>
                  )}
                </span>
                <span>
                  总花费: <span className="font-semibold text-orange-500">
                    {renderLogQuota(allLogs.reduce((sum, log) => sum + (log.quota || log.used_quota || 0), 0))}
                  </span>
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// 系统日志面板 - 包含操作日志和请求日志两个子 Tab
function SystemLogsPanel() {
  const [subTab, setSubTab] = useState('requests') // 默认显示请求日志

  return (
    <div className="space-y-4">
      {/* 子标签切换 */}
      <div className="flex gap-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-2">
        <button
          onClick={() => setSubTab('requests')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${
            subTab === 'requests'
              ? 'bg-blue-500 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Zap className="w-4 h-4" />
          请求日志
        </button>
        <button
          onClick={() => setSubTab('operations')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${
            subTab === 'operations'
              ? 'bg-blue-500 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Activity className="w-4 h-4" />
          操作日志
        </button>
      </div>

      {/* 内容区域 */}
      {subTab === 'requests' ? <RequestsLogPanel /> : <OperationsLogPanel />}
    </div>
  )
}

// 请求日志面板 - 全量 API 请求监控
function RequestsLogPanel() {
  const toast = useToast()
  const [logs, setLogs] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [filter, setFilter] = useState({
    method: '',
    path: '',
    statusType: '',
    search: '',
  })
  const [page, setPage] = useState(1)
  const pageSize = 10

  useEffect(() => {
    loadLogs()
    loadStats()
  }, [])

  useEffect(() => {
    setPage(1)
    loadLogs()
  }, [filter])

  const loadLogs = async (currentPage = 1) => {
    setLoading(true)
    try {
      const data = await adminApi2.getRequestLogs({
        method: filter.method || undefined,
        path: filter.path || undefined,
        status_type: filter.statusType || undefined,
        search: filter.search || undefined,
        page: currentPage,
        page_size: pageSize,
      })
      setLogs(data.items || [])
      setTotal(data.total || 0)
    } catch (error) {
      console.error('加载请求日志失败:', error)
      if (error.response?.status === 404) {
        toast.error('请求日志 API 未配置，请执行数据库迁移')
      }
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    setStatsLoading(true)
    try {
      const data = await adminApi2.getRequestLogsStats(24)
      setStats(data)
    } catch (error) {
      console.error('加载统计失败:', error)
    } finally {
      setStatsLoading(false)
    }
  }

  const handlePageChange = (newPage) => {
    setPage(newPage)
    loadLogs(newPage)
  }

  const formatTime = (timestamp) => {
    if (!timestamp) return '-'
    const date = new Date(timestamp)
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const getMethodColor = (method) => {
    const colors = {
      GET: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
      POST: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
      PUT: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400',
      PATCH: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
      DELETE: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    }
    return colors[method] || 'bg-slate-100 text-slate-600'
  }

  const getStatusColor = (code) => {
    if (code >= 200 && code < 300) return 'text-green-600 dark:text-green-400'
    if (code >= 400 && code < 500) return 'text-yellow-600 dark:text-yellow-400'
    if (code >= 500) return 'text-red-600 dark:text-red-400'
    return 'text-slate-600'
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-4">
      {/* 统计卡片 */}
      {!statsLoading && stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
            <div className="text-xs text-slate-500 mb-1">24h 请求总数</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total_requests?.toLocaleString()}</div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
            <div className="text-xs text-slate-500 mb-1">平均响应时间</div>
            <div className="text-2xl font-bold text-blue-600">{stats.avg_response_time_ms}ms</div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
            <div className="text-xs text-slate-500 mb-1">错误率</div>
            <div className={`text-2xl font-bold ${stats.error_rate > 5 ? 'text-red-600' : 'text-green-600'}`}>
              {stats.error_rate}%
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
            <div className="text-xs text-slate-500 mb-1">慢请求 (&gt;1s)</div>
            <div className={`text-2xl font-bold ${stats.slow_requests > 10 ? 'text-yellow-600' : 'text-slate-900 dark:text-white'}`}>
              {stats.slow_requests}
            </div>
          </div>
        </div>
      )}

      {/* 过滤器 */}
      <div className="flex flex-wrap gap-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs text-slate-500 mb-1">搜索</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="路径、用户名、IP..."
              value={filter.search}
              onChange={(e) => setFilter({ ...filter, search: e.target.value })}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
            />
          </div>
        </div>
        <div className="w-32">
          <label className="block text-xs text-slate-500 mb-1">HTTP 方法</label>
          <select
            value={filter.method}
            onChange={(e) => setFilter({ ...filter, method: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
          >
            <option value="">全部</option>
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
          </select>
        </div>
        <div className="w-40">
          <label className="block text-xs text-slate-500 mb-1">状态</label>
          <select
            value={filter.statusType}
            onChange={(e) => setFilter({ ...filter, statusType: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
          >
            <option value="">全部</option>
            <option value="success">成功 (2xx)</option>
            <option value="client_error">客户端错误 (4xx)</option>
            <option value="server_error">服务端错误 (5xx)</option>
          </select>
        </div>
        <div className="flex items-end gap-2">
          <button
            onClick={() => { loadLogs(); loadStats(); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            刷新
          </button>
        </div>
      </div>

      {/* 日志列表 */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 dark:text-slate-400">时间</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 dark:text-slate-400">方法</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 dark:text-slate-400">路径</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 dark:text-slate-400">用户</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 dark:text-slate-400">状态</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 dark:text-slate-400">耗时</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 dark:text-slate-400">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                    <p className="text-slate-500">加载中...</p>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    <Zap className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                    <p>暂无请求日志</p>
                    <p className="text-xs mt-1">请确保已执行 012_request_logs.sql 迁移脚本</p>
                  </td>
                </tr>
              ) : (
                logs.map((log, idx) => (
                  <tr key={log.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-sm text-slate-500">
                        <Clock className="w-3 h-3" />
                        {formatTime(log.created_at)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${getMethodColor(log.method)}`}>
                        {log.method}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-slate-900 dark:text-white font-mono truncate max-w-[200px]" title={log.path}>
                        {log.path}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        {log.username || (log.user_id ? `#${log.user_id}` : '-')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-medium ${getStatusColor(log.status_code)}`}>
                        {log.status_code}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm ${log.response_time_ms > 1000 ? 'text-red-600 font-medium' : 'text-slate-500'}`}>
                        {log.response_time_ms}ms
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-500 font-mono">
                        {log.ip_address || '-'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 分页 */}
        {!loading && total > 0 && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="text-sm text-slate-500">
              共 <span className="font-medium text-slate-700 dark:text-slate-300">{total.toLocaleString()}</span> 条记录
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(1)}
                  disabled={page === 1}
                  className="px-2 py-1 text-sm text-slate-500 hover:text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  首页
                </button>
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                  className="px-2 py-1 text-sm text-slate-500 hover:text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  上一页
                </button>
                <span className="px-3 py-1 text-sm text-slate-600">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= totalPages}
                  className="px-2 py-1 text-sm text-slate-500 hover:text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  下一页
                </button>
                <button
                  onClick={() => handlePageChange(totalPages)}
                  disabled={page >= totalPages}
                  className="px-2 py-1 text-sm text-slate-500 hover:text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  末页
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// 操作日志面板 - 用户操作日志
function OperationsLogPanel() {
  const toast = useToast()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [filter, setFilter] = useState({
    action: '',
    userId: '',
    search: '',
  })
  const [page, setPage] = useState(1)
  const pageSize = 10

  useEffect(() => {
    setPage(1)
    loadLogs(1)
  }, [filter])

  const loadLogs = async (currentPage = 1) => {
    setLoading(true)
    try {
      const data = await adminApi2.getSystemLogs({
        action: filter.action || undefined,
        user_id: filter.userId || undefined,
        search: filter.search || undefined,
        page: currentPage,
        page_size: pageSize,
      })
      setLogs(data.items || [])
      setTotal(data.total || 0)
    } catch (error) {
      console.error('加载日志失败:', error)
      if (error.response?.status === 404) {
        toast.error('日志 API 未配置')
      }
    } finally {
      setLoading(false)
    }
  }

  const handlePageChange = (newPage) => {
    setPage(newPage)
    loadLogs(newPage)
  }

  const formatTime = (timestamp) => {
    if (!timestamp) return '-'
    const date = new Date(timestamp)
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const actionMap = {
    LOGIN: { label: '登录', color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400', icon: Users },
    LOGOUT: { label: '登出', color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400', icon: Users },
    REGISTER: { label: '注册', color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400', icon: Users },
    SIGNIN: { label: '签到', color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400', icon: Calendar },
    LOTTERY: { label: '抽奖', color: 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400', icon: Gift },
    BET: { label: '下注', color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400', icon: Coins },
    SUBMIT: { label: '提交作品', color: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400', icon: Edit2 },
    VOTE: { label: '投票', color: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400', icon: TrendingUp },
    ADMIN: { label: '管理操作', color: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Settings },
  }

  const getActionConfig = (action) => actionMap[action] || { label: action, color: 'bg-slate-100 text-slate-600', icon: Activity }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-4">
      {/* 过滤器 */}
      <div className="flex flex-wrap gap-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs text-slate-500 mb-1">搜索</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="用户名、描述、IP..."
              value={filter.search}
              onChange={(e) => setFilter({ ...filter, search: e.target.value })}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
            />
          </div>
        </div>
        <div className="w-40">
          <label className="block text-xs text-slate-500 mb-1">操作类型</label>
          <select
            value={filter.action}
            onChange={(e) => setFilter({ ...filter, action: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
          >
            <option value="">全部</option>
            <option value="LOGIN">登录</option>
            <option value="REGISTER">注册</option>
            <option value="SIGNIN">签到</option>
            <option value="LOTTERY">抽奖</option>
            <option value="BET">下注</option>
            <option value="SUBMIT">提交作品</option>
            <option value="VOTE">投票</option>
            <option value="ADMIN">管理操作</option>
          </select>
        </div>
        <div className="flex items-end">
          <button
            onClick={() => { setPage(1); loadLogs(1); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            刷新
          </button>
        </div>
      </div>

      {/* 日志列表 */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 dark:bg-slate-800">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 dark:text-slate-400">时间</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 dark:text-slate-400">用户</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 dark:text-slate-400">操作</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 dark:text-slate-400">描述</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 dark:text-slate-400">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                  <p className="text-slate-500">加载中...</p>
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                  <Activity className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                  <p>暂无日志记录</p>
                  <p className="text-xs mt-1">系统日志功能需要后端支持</p>
                </td>
              </tr>
            ) : (
              logs.map((log, idx) => {
                const actionConfig = getActionConfig(log.action)
                const ActionIcon = actionConfig.icon
                return (
                  <tr key={log.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-sm text-slate-500">
                        <Clock className="w-3 h-3" />
                        {formatTime(log.created_at)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <img
                          src={resolveAvatarUrl(log.user?.avatar_url)}
                          alt=""
                          className="w-6 h-6 rounded-full"
                        />
                        <span className="text-sm font-medium text-slate-900 dark:text-white">
                          {log.user?.display_name || log.user?.username || '-'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${actionConfig.color}`}>
                        <ActionIcon className="w-3 h-3" />
                        {actionConfig.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-slate-600 dark:text-slate-400 truncate max-w-[300px]" title={log.description}>
                        {log.description || '-'}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-500 font-mono">
                        {log.ip_address || '-'}
                      </span>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>

        {/* 分页 */}
        {!loading && total > 0 && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="text-sm text-slate-500">
              共 <span className="font-medium text-slate-700 dark:text-slate-300">{total.toLocaleString()}</span> 条记录
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(1)}
                  disabled={page === 1}
                  className="px-2 py-1 text-sm text-slate-500 hover:text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  首页
                </button>
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                  className="px-2 py-1 text-sm text-slate-500 hover:text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  上一页
                </button>
                <span className="px-3 py-1 text-sm text-slate-600 dark:text-slate-400">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= totalPages}
                  className="px-2 py-1 text-sm text-slate-500 hover:text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  下一页
                </button>
                <button
                  onClick={() => handlePageChange(totalPages)}
                  disabled={page >= totalPages}
                  className="px-2 py-1 text-sm text-slate-500 hover:text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  末页
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// 竞猜状态映射
const MARKET_STATUS_MAP = {
  DRAFT: { label: '草稿', color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
  OPEN: { label: '进行中', color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' },
  CLOSED: { label: '已截止', color: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400' },
  SETTLED: { label: '已结算', color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
  CANCELLED: { label: '已取消', color: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' },
}

// 竞猜管理面板
function PredictionPanel() {
  const toast = useToast()
  const [markets, setMarkets] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showSettleModal, setShowSettleModal] = useState(null)
  const [selectedWinners, setSelectedWinners] = useState([])
  const [creating, setCreating] = useState(false)
  const [operating, setOperating] = useState(null) // 正在操作的竞猜 ID
  const [settling, setSettling] = useState(false) // 结算中

  // 新建竞猜表单
  const [newMarket, setNewMarket] = useState({
    title: '',
    description: '',
    options: [{ label: '' }, { label: '' }],
    closes_at: '',
    min_bet: 10,
    max_bet: 1000,
    fee_rate: 0.05,
  })

  useEffect(() => {
    loadMarkets()
  }, [])

  const loadMarkets = async () => {
    setLoading(true)
    try {
      const data = await predictionApi.getMarkets({ limit: 50 })
      setMarkets(data || [])
    } catch (error) {
      console.error('加载竞猜列表失败:', error)
      toast.error('加载竞猜列表失败')
    } finally {
      setLoading(false)
    }
  }

  // 开启竞猜
  const handleOpen = async (id) => {
    if (operating || settling) return
    setOperating(id)
    try {
      await predictionApi.openMarket(id)
      toast.success('竞猜已开启')
      loadMarkets()
    } catch (error) {
      toast.error(error.response?.data?.detail || '操作失败')
    } finally {
      setOperating(null)
    }
  }

  // 关闭竞猜
  const handleClose = async (id) => {
    if (operating || settling) return
    setOperating(id)
    try {
      await predictionApi.closeMarket(id)
      toast.success('竞猜已关闭')
      loadMarkets()
    } catch (error) {
      toast.error(error.response?.data?.detail || '操作失败')
    } finally {
      setOperating(null)
    }
  }

  // 取消竞猜
  const handleCancel = async (id) => {
    if (operating || settling) return
    if (!confirm('确定取消此竞猜？所有下注将被退款。')) return
    setOperating(id)
    try {
      await predictionApi.cancelMarket(id)
      toast.success('竞猜已取消，积分已退还')
      loadMarkets()
    } catch (error) {
      toast.error(error.response?.data?.detail || '操作失败')
    } finally {
      setOperating(null)
    }
  }

  // 结算竞猜
  const handleSettle = async (id) => {
    if (settling || operating) return
    if (selectedWinners.length === 0) {
      toast.error('请选择获胜选项')
      return
    }
    if (!confirm('确定结算此竞猜？结算后不可撤销。')) return
    setSettling(true)
    try {
      await predictionApi.settleMarket(id, selectedWinners)
      toast.success('竞猜已结算')
      setShowSettleModal(null)
      setSelectedWinners([])
      loadMarkets()
    } catch (error) {
      toast.error(error.response?.data?.detail || '结算失败')
    } finally {
      setSettling(false)
    }
  }

  // 创建竞猜
  const handleCreate = async () => {
    if (!newMarket.title.trim()) {
      toast.error('请输入竞猜标题')
      return
    }
    const validOptions = newMarket.options.filter(o => o.label.trim())
    if (validOptions.length < 2) {
      toast.error('至少需要2个选项')
      return
    }

    setCreating(true)
    try {
      await predictionApi.createMarket({
        title: newMarket.title,
        description: newMarket.description,
        options: validOptions,
        closes_at: newMarket.closes_at || null,
        min_bet: newMarket.min_bet,
        max_bet: newMarket.max_bet,
        fee_rate: newMarket.fee_rate,
      })
      toast.success('竞猜创建成功')
      setShowCreateModal(false)
      setNewMarket({
        title: '',
        description: '',
        options: [{ label: '' }, { label: '' }],
        closes_at: '',
        min_bet: 10,
        max_bet: 1000,
        fee_rate: 0.05,
      })
      loadMarkets()
    } catch (error) {
      toast.error(error.response?.data?.detail || '创建失败')
    } finally {
      setCreating(false)
    }
  }

  // 添加选项
  const addOption = () => {
    setNewMarket(prev => ({
      ...prev,
      options: [...prev.options, { label: '' }]
    }))
  }

  // 删除选项
  const removeOption = (index) => {
    if (newMarket.options.length <= 2) return
    setNewMarket(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index)
    }))
  }

  // 更新选项
  const updateOption = (index, value) => {
    setNewMarket(prev => ({
      ...prev,
      options: prev.options.map((opt, i) => i === index ? { ...opt, label: value } : opt)
    }))
  }

  if (loading) {
    return <div className="animate-pulse bg-slate-100 dark:bg-slate-800 rounded-xl h-64" />
  }

  return (
    <div className="space-y-4">
      {/* 顶部操作栏 */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-500">
          共 {markets.length} 个竞猜
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadMarkets}
            className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            刷新
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg hover:shadow-lg hover:shadow-purple-500/25 transition-all"
          >
            <Plus className="w-4 h-4" />
            新建竞猜
          </button>
        </div>
      </div>

      {/* 竞猜列表 */}
      {markets.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <Target className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400">暂无竞猜</p>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">点击"新建竞猜"创建第一个竞猜活动</p>
        </div>
      ) : (
        <div className="space-y-3">
          {markets.map((market) => {
            const status = MARKET_STATUS_MAP[market.status] || MARKET_STATUS_MAP.DRAFT
            const isExpanded = expanded === market.id
            return (
              <div key={market.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                {/* 头部 */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  onClick={() => setExpanded(isExpanded ? null : market.id)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Target className={`w-5 h-5 flex-shrink-0 ${market.status === 'OPEN' ? 'text-green-500' : 'text-slate-400'}`} />
                    <div className="min-w-0">
                      <h3 className="font-medium text-slate-900 dark:text-white truncate">{market.title}</h3>
                      <div className="flex items-center gap-3 text-sm text-slate-500 mt-0.5">
                        <span>奖池: {market.total_pool || 0}</span>
                        <span>选项: {market.options?.length || 0}</span>
                        {market.closes_at && (
                          <span>截止: {new Date(market.closes_at).toLocaleString('zh-CN')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
                      {status.label}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* 展开内容 */}
                {isExpanded && (
                  <div className="border-t border-slate-100 dark:border-slate-800 p-4">
                    {/* 描述 */}
                    {market.description && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{market.description}</p>
                    )}

                    {/* 选项列表 */}
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">竞猜选项</h4>
                      <div className="space-y-2">
                        {market.options?.map((opt) => {
                          const percentage = market.total_pool > 0
                            ? Math.round(((opt.total_stake || 0) / market.total_pool) * 100)
                            : 0
                          return (
                            <div key={opt.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                              <div className="flex items-center gap-3">
                                {opt.is_winner && (
                                  <Award className="w-4 h-4 text-yellow-500" />
                                )}
                                <span className="text-sm text-slate-700 dark:text-slate-300">{opt.label}</span>
                              </div>
                              <div className="flex items-center gap-4 text-sm">
                                <span className="text-slate-500">{percentage}%</span>
                                <span className="text-slate-500">{opt.total_stake || 0} 积分</span>
                                <span className="font-medium text-purple-600 dark:text-purple-400">
                                  {opt.odds ? `${opt.odds.toFixed(2)}x` : '-'}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* 配置信息 */}
                    <div className="flex flex-wrap gap-4 text-sm text-slate-500 mb-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                      <span>最低下注: {market.min_bet}</span>
                      <span>最高下注: {market.max_bet || '无限制'}</span>
                      <span>手续费率: {(market.fee_rate * 100).toFixed(0)}%</span>
                      <span>创建时间: {new Date(market.created_at).toLocaleString('zh-CN')}</span>
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex gap-2">
                      {market.status === 'DRAFT' && (
                        <button
                          onClick={() => handleOpen(market.id)}
                          disabled={!!operating || settling}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {operating === market.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                          开启竞猜
                        </button>
                      )}
                      {market.status === 'OPEN' && (
                        <>
                          <button
                            onClick={() => handleClose(market.id)}
                            disabled={!!operating || settling}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-100 text-yellow-600 rounded-lg hover:bg-yellow-200 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {operating === market.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4" />}
                            关闭下注
                          </button>
                          <button
                            onClick={() => handleCancel(market.id)}
                            disabled={!!operating || settling}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <XCircle className="w-4 h-4" />
                            取消竞猜
                          </button>
                        </>
                      )}
                      {market.status === 'CLOSED' && (
                        <>
                          <button
                            onClick={() => {
                              setShowSettleModal(market)
                              setSelectedWinners([])
                            }}
                            disabled={operating || settling}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Award className="w-4 h-4" />
                            结算竞猜
                          </button>
                          <button
                            onClick={() => handleCancel(market.id)}
                            disabled={!!operating || settling}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <XCircle className="w-4 h-4" />
                            取消竞猜
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* 新建竞猜弹窗 */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">新建竞猜</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto max-h-[60vh]">
              {/* 标题 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">竞猜标题 *</label>
                <input
                  type="text"
                  value={newMarket.title}
                  onChange={(e) => setNewMarket(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  placeholder="例如：谁将获得本届比赛冠军？"
                />
              </div>

              {/* 描述 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">描述（可选）</label>
                <textarea
                  value={newMarket.description}
                  onChange={(e) => setNewMarket(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white resize-none"
                  rows={2}
                  placeholder="竞猜说明..."
                />
              </div>

              {/* 选项 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">竞猜选项 *</label>
                <div className="space-y-2">
                  {newMarket.options.map((opt, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={opt.label}
                        onChange={(e) => updateOption(index, e.target.value)}
                        className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        placeholder={`选项 ${index + 1}`}
                      />
                      {newMarket.options.length > 2 && (
                        <button
                          onClick={() => removeOption(index)}
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  onClick={addOption}
                  className="mt-2 flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700"
                >
                  <Plus className="w-4 h-4" />
                  添加选项
                </button>
              </div>

              {/* 截止时间 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">截止时间（可选）</label>
                <input
                  type="datetime-local"
                  value={newMarket.closes_at}
                  onChange={(e) => setNewMarket(prev => ({ ...prev, closes_at: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              {/* 下注限制 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">最低下注</label>
                  <input
                    type="number"
                    value={newMarket.min_bet}
                    onChange={(e) => setNewMarket(prev => ({ ...prev, min_bet: parseInt(e.target.value) || 10 }))}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">最高下注</label>
                  <input
                    type="number"
                    value={newMarket.max_bet}
                    onChange={(e) => setNewMarket(prev => ({ ...prev, max_bet: parseInt(e.target.value) || null }))}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* 手续费率 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">手续费率</label>
                <select
                  value={newMarket.fee_rate}
                  onChange={(e) => setNewMarket(prev => ({ ...prev, fee_rate: parseFloat(e.target.value) }))}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value={0}>0%（无手续费）</option>
                  <option value={0.05}>5%</option>
                  <option value={0.1}>10%</option>
                  <option value={0.15}>15%</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 p-4 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg hover:shadow-lg disabled:opacity-50 transition-all"
              >
                {creating ? '创建中...' : '创建竞猜'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 结算竞猜弹窗 */}
      {showSettleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !settling && setShowSettleModal(null)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">结算竞猜</h3>
              <button
                onClick={() => setShowSettleModal(null)}
                disabled={settling}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg disabled:opacity-50"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-4">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                选择获胜选项（可多选），点击确认后将自动计算并发放奖励。
              </p>

              <div className="space-y-2 mb-4">
                {showSettleModal.options?.map((opt) => (
                  <button
                    key={opt.id}
                    disabled={settling}
                    onClick={() => {
                      if (settling) return
                      setSelectedWinners(prev =>
                        prev.includes(opt.id)
                          ? prev.filter(id => id !== opt.id)
                          : [...prev, opt.id]
                      )
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-colors disabled:opacity-50 ${
                      selectedWinners.includes(opt.id)
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <span className="text-slate-700 dark:text-slate-300">{opt.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-500">{opt.total_stake || 0} 积分</span>
                      {selectedWinners.includes(opt.id) && (
                        <Check className="w-5 h-5 text-green-500" />
                      )}
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowSettleModal(null)}
                  disabled={settling}
                  className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  onClick={() => handleSettle(showSettleModal.id)}
                  disabled={selectedWinners.length === 0 || settling}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg hover:shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {settling ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      结算中...
                    </>
                  ) : (
                    '确认结算'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// 公告类型配置
const ANNOUNCEMENT_TYPES = {
  info: { label: '信息', color: 'blue', icon: Info, bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800', text: 'text-blue-700 dark:text-blue-300' },
  warning: { label: '警告', color: 'amber', icon: WarningIcon, bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800', text: 'text-amber-700 dark:text-amber-300' },
  success: { label: '成功', color: 'green', icon: CheckCircle, bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800', text: 'text-emerald-700 dark:text-emerald-300' },
  error: { label: '错误', color: 'red', icon: XOctagon, bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800', text: 'text-red-700 dark:text-red-300' },
}

// 公告管理面板
function AnnouncementPanel() {
  const toast = useToast()
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [showEditor, setShowEditor] = useState(false)
  const [editingAnnouncement, setEditingAnnouncement] = useState(null)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'info',
    is_pinned: false,
    is_active: true,
  })

  // 加载公告列表
  const loadAnnouncements = async () => {
    try {
      setLoading(true)
      const response = await adminApi2.getAnnouncements()
      setAnnouncements(response.items || [])
    } catch (error) {
      console.error('加载公告失败:', error)
      toast.error('加载公告失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAnnouncements()
  }, [])

  // 打开编辑器
  const openEditor = (announcement = null) => {
    if (announcement) {
      setEditingAnnouncement(announcement)
      setFormData({
        title: announcement.title,
        content: announcement.content,
        type: announcement.type,
        is_pinned: announcement.is_pinned,
        is_active: announcement.is_active,
      })
    } else {
      setEditingAnnouncement(null)
      setFormData({
        title: '',
        content: '',
        type: 'info',
        is_pinned: false,
        is_active: true,
      })
    }
    setShowEditor(true)
  }

  // 保存公告
  const saveAnnouncement = async () => {
    if (!formData.title.trim()) {
      toast.error('请输入公告标题')
      return
    }
    if (!formData.content.trim()) {
      toast.error('请输入公告内容')
      return
    }

    try {
      if (editingAnnouncement) {
        await adminApi2.updateAnnouncement(editingAnnouncement.id, formData)
        toast.success('公告更新成功')
      } else {
        await adminApi2.createAnnouncement(formData)
        toast.success('公告发布成功')
      }
      setShowEditor(false)
      loadAnnouncements()
    } catch (error) {
      console.error('保存公告失败:', error)
      toast.error('保存公告失败')
    }
  }

  // 删除公告
  const handleDeleteAnnouncement = async (id) => {
    if (!confirm('确定要删除这条公告吗？')) return

    try {
      await adminApi2.deleteAnnouncement(id)
      toast.success('公告删除成功')
      loadAnnouncements()
    } catch (error) {
      console.error('删除公告失败:', error)
      toast.error('删除公告失败')
    }
  }

  // 切换置顶
  const togglePin = async (id) => {
    try {
      await adminApi2.togglePinAnnouncement(id)
      loadAnnouncements()
    } catch (error) {
      console.error('操作失败:', error)
      toast.error('操作失败')
    }
  }

  // 切换启用状态
  const toggleActive = async (announcement) => {
    try {
      await adminApi2.updateAnnouncement(announcement.id, {
        is_active: !announcement.is_active,
      })
      loadAnnouncements()
    } catch (error) {
      console.error('操作失败:', error)
      toast.error('操作失败')
    }
  }

  return (
    <div className="space-y-6">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg shadow-purple-500/20">
            <Megaphone className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">公告管理</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">发布和管理系统公告</p>
          </div>
        </div>
        <button
          onClick={() => openEditor()}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30 transition-all hover:-translate-y-0.5"
        >
          <Plus className="w-4 h-4" />
          发布公告
        </button>
      </div>

      {/* 公告列表 */}
      <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">加载中...</div>
        ) : announcements.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>暂无公告</p>
            <p className="text-sm mt-1">点击上方按钮发布第一条公告</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {announcements.map((announcement) => {
              const typeConfig = ANNOUNCEMENT_TYPES[announcement.type] || ANNOUNCEMENT_TYPES.info
              const TypeIcon = typeConfig.icon
              return (
                <div
                  key={announcement.id}
                  className={`p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${!announcement.is_active ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-start gap-4">
                    {/* 类型图标 */}
                    <div className={`p-2 rounded-lg ${typeConfig.bg} ${typeConfig.border} border`}>
                      <TypeIcon className={`w-5 h-5 ${typeConfig.text}`} />
                    </div>

                    {/* 内容 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {announcement.is_pinned && (
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs rounded-full">
                            <Pin className="w-3 h-3" />
                            置顶
                          </span>
                        )}
                        {!announcement.is_active && (
                          <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs rounded-full">
                            已禁用
                          </span>
                        )}
                        <span className={`px-2 py-0.5 ${typeConfig.bg} ${typeConfig.text} text-xs rounded-full`}>
                          {typeConfig.label}
                        </span>
                      </div>
                      <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                        {announcement.title}
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mt-1">
                        {announcement.content}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 dark:text-slate-400">
                        <span>发布者: {announcement.author?.display_name || announcement.author?.username}</span>
                        <span>浏览: {announcement.view_count}</span>
                        {announcement.published_at && (
                          <span>发布于: {new Date(announcement.published_at).toLocaleString('zh-CN')}</span>
                        )}
                      </div>
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => togglePin(announcement.id)}
                        className={`p-2 rounded-lg transition-colors ${announcement.is_pinned ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600'}`}
                        title={announcement.is_pinned ? '取消置顶' : '置顶'}
                      >
                        <Pin className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => toggleActive(announcement)}
                        className={`p-2 rounded-lg transition-colors ${announcement.is_active ? 'hover:bg-slate-100 dark:hover:bg-slate-800 text-emerald-500' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400'}`}
                        title={announcement.is_active ? '禁用' : '启用'}
                      >
                        {announcement.is_active ? <Eye className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => openEditor(announcement)}
                        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-blue-500 transition-colors"
                        title="编辑"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteAnnouncement(announcement.id)}
                        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-red-500 transition-colors"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 编辑弹窗 */}
      {showEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-2xl mx-4 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            {/* 弹窗标题 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingAnnouncement ? '编辑公告' : '发布新公告'}
              </h3>
              <button
                onClick={() => setShowEditor(false)}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 表单内容 */}
            <div className="p-6 space-y-4">
              {/* 标题 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  公告标题 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="请输入公告标题"
                />
              </div>

              {/* 内容 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  公告内容 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={6}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                  placeholder="请输入公告内容"
                />
              </div>

              {/* 类型选择 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  公告类型
                </label>
                <div className="flex gap-2">
                  {Object.entries(ANNOUNCEMENT_TYPES).map(([key, config]) => {
                    const TypeIcon = config.icon
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setFormData({ ...formData, type: key })}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                          formData.type === key
                            ? `${config.bg} ${config.border} ${config.text} border-2`
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <TypeIcon className="w-4 h-4" />
                        {config.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* 选项 */}
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_pinned}
                    onChange={(e) => setFormData({ ...formData, is_pinned: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300 text-purple-500 focus:ring-purple-500"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">置顶显示</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300 text-purple-500 focus:ring-purple-500"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">立即发布</span>
                </label>
              </div>
            </div>

            {/* 按钮区 */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <button
                onClick={() => setShowEditor(false)}
                className="px-5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                取消
              </button>
              <button
                onClick={saveAnnouncement}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30 transition-all"
              >
                {editingAnnouncement ? '保存修改' : '发布公告'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// 有效的 Tab 列表
const VALID_TABS = ['dashboard', 'users', 'contests', 'review-assign', 'project-deploy', 'signin', 'lottery', 'activity', 'apikeys', 'apimonitor', 'prediction', 'logs', 'announcements']

// 主页面
export default function AdminDashboardPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.token)

  // 从 URL 参数读取当前 Tab，默认为 dashboard
  const tabFromUrl = searchParams.get('tab')
  const initialTab = VALID_TABS.includes(tabFromUrl) ? tabFromUrl : 'dashboard'
  const [activeTab, setActiveTab] = useState(initialTab)

  // 切换 Tab 时同步更新 URL
  const handleTabChange = (tab) => {
    setActiveTab(tab)
    setSearchParams({ tab }, { replace: true })
  }

  useEffect(() => {
    if (!token) {
      navigate('/login')
      return
    }
    if (user?.role !== 'admin') {
      navigate('/')
    }
  }, [token, user, navigate])

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pt-24 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">无权访问</h2>
          <p className="text-slate-500">需要管理员权限</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pt-24 pb-12 relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 dark:bg-purple-500/5 rounded-full blur-3xl" />
        <div className="absolute top-[20%] right-[20%] w-[20%] h-[20%] bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* 页面标题区 */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-white dark:bg-slate-800 rounded-2xl shadow-xl shadow-blue-500/10 border border-slate-100 dark:border-slate-700">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-inner">
                <Settings className="w-6 h-6 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">管理控制台</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                系统运行正常 · {new Date().toLocaleDateString()}
              </p>
            </div>
          </div>
          
          <div className="flex gap-1.5 p-1.5 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-xl border border-slate-200/50 dark:border-slate-700/50 overflow-x-auto scrollbar-hide">
            <Tab active={activeTab === 'dashboard'} onClick={() => handleTabChange('dashboard')} icon={BarChart3}>仪表盘</Tab>
            <Tab active={activeTab === 'users'} onClick={() => handleTabChange('users')} icon={Users}>用户</Tab>
            <Tab active={activeTab === 'contests'} onClick={() => handleTabChange('contests')} icon={Award}>赛事</Tab>
            <Tab active={activeTab === 'review-assign'} onClick={() => handleTabChange('review-assign')} icon={ClipboardCheck}>评审分配</Tab>
            <Tab active={activeTab === 'project-deploy'} onClick={() => handleTabChange('project-deploy')} icon={Play}>部署管理</Tab>
            <Tab active={activeTab === 'signin'} onClick={() => handleTabChange('signin')} icon={Calendar}>签到</Tab>
            <Tab active={activeTab === 'lottery'} onClick={() => handleTabChange('lottery')} icon={Gift}>抽奖</Tab>
            <Tab active={activeTab === 'activity'} onClick={() => handleTabChange('activity')} icon={Zap}>活动</Tab>
            <Tab active={activeTab === 'apikeys'} onClick={() => handleTabChange('apikeys')} icon={Key}>API</Tab>
            <Tab active={activeTab === 'apimonitor'} onClick={() => handleTabChange('apimonitor')} icon={Activity}>监控</Tab>
            <Tab active={activeTab === 'prediction'} onClick={() => handleTabChange('prediction')} icon={Target}>竞猜</Tab>
            <Tab active={activeTab === 'logs'} onClick={() => handleTabChange('logs')} icon={Eye}>日志</Tab>
            <Tab active={activeTab === 'announcements'} onClick={() => handleTabChange('announcements')} icon={Megaphone}>公告</Tab>
          </div>
        </div>

        {/* 内容区容器 */}
        <div className="transition-all duration-500 ease-in-out">
          {activeTab === 'dashboard' && <DashboardPanel />}
          {activeTab === 'users' && <UsersPanel />}
          {activeTab === 'contests' && <ContestManagementPanel />}
          {activeTab === 'review-assign' && <ProjectReviewAssignPanel />}
          {activeTab === 'project-deploy' && <ProjectDeployPanel />}
          {activeTab === 'signin' && <SigninConfigPanel />}
          {activeTab === 'lottery' && <ActivityConfigPanel />}
          {activeTab === 'activity' && <ActivityConfigPanel />}
          {activeTab === 'apikeys' && <ApiKeyPanel />}
          {activeTab === 'apimonitor' && <ApiKeyMonitorPanel />}
          {activeTab === 'prediction' && <PredictionPanel />}
          {activeTab === 'logs' && <SystemLogsPanel />}
          {activeTab === 'announcements' && <AnnouncementPanel />}
        </div>
      </div>
    </div>
  )
}
