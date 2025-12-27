import { Code, Zap, Star, Music, Mic } from 'lucide-react'

/**
 * 特色卡片数据
 */
export const FEATURES = [
  {
    icon: Zap,
    iconColor: 'text-yellow-400',
    title: '实战落地',
    description: '验证 ikuncode 在复杂 Agent、长文本分析等高负载场景下的稳定性。',
  },
  {
    icon: Code,
    iconColor: 'text-blue-400',
    title: '开源共建',
    description: '所有参赛代码开源，回馈 Linux.do 及技术社区，共享技术成果。',
  },
  {
    icon: Star,
    iconColor: 'text-purple-400',
    title: '极致赋能',
    description: '通过费用全返与超低折扣，让优秀开发者实现"算力自由"。',
  },
]

/**
 * 奖项配置
 */
export const PRIZE_CONFIG = {
  champion: {
    title: '鸡王',
    subtitle: '技术王者的最高礼遇',
    count: '1名',
    badge: 'C位出道',
    cashPrize: '¥888 人民币',
    apiReturn: '100% 全额返还',
    apiLimit: '上限 ¥2000',
    discount: '3.8折',
    discountNote: '全网最低费率，仅此一份',
    buttonText: '冲击鸡王宝座',
  },
  second: {
    title: '练习生',
    subtitle: '唱跳全能',
    count: '3名',
    icon: Music,
    apiReturn: '50% 返还',
    apiLimit: '上限 ¥1000',
    discount: '6.9折',
  },
  third: {
    title: '练习生',
    subtitle: 'Rap担当',
    count: '10名',
    icon: Mic,
    apiReturn: '20% 返还',
    apiLimit: '上限 ¥200',
    discount: '7.8折',
  },
}

/**
 * 风控规则
 */
export const RISK_RULES = [
  { label: '消耗认定', content: '仅统计活动周期内，由参赛专用 Key 产生的真实有效调用。' },
  { label: '返还形式', content: '费用返还以平台余额形式发放。' },
  { label: '折扣券说明', content: '优惠券为一次性使用（建议大额充值时使用以最大化收益），有效期为发奖后30天内。' },
  { label: '严禁作弊', content: '后台部署了严格的流量分析系统，恶意刷量、空跑脚本将直接取消参赛及返还资格。' },
]

/**
 * 参赛流程
 */
export const PROCESS_STEPS = [
  {
    step: 1,
    title: '准备 (Prepare)',
    description: '登录 ikuncode，准备参赛项目，并创建名为',
    highlight: 'ikun-contest',
    suffix: '的专用 API Key。',
  },
  {
    step: 2,
    title: '报名 (Signup)',
    description: '填写报名表单，提交项目简介、计划、技术栈与联系方式。',
  },
  {
    step: 3,
    title: '开发 (Build)',
    description: '持续完善项目，开源至 GitHub/Gitee，并真实调用 ikuncode API。',
  },
  {
    step: 4,
    title: '提交 (Submit)',
    description: '提交期上传作品材料与镜像部署，进入评审/投票/公示环节。',
  },
]

/**
 * 评审权重
 */
export const REVIEW_WEIGHTS = [
  {
    title: '专业评审团',
    weight: 40,
    color: 'bg-yellow-400',
    textColor: 'text-yellow-400',
    description: '10位资深开发者：代码规范、功能完备性、技术复杂度。',
  },
  {
    title: '社区公投 (Linux.do)',
    weight: 60,
    color: 'bg-blue-400',
    textColor: 'text-blue-400',
    description: '群众的眼睛是雪亮的，好用的工具自然高分！',
  },
]
