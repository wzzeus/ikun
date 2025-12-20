/**
 * 任务引导页跳转路径映射
 * 定义每种任务类型对应的引导页面路径
 */
export const TASK_GUIDE_PATHS = {
  SIGNIN: '/activity',           // 签到在活动中心
  BROWSE_PROJECT: '/participants', // 浏览选手项目详情
  CHEER: '/participants',        // 给选手打气
  VOTE: '/ranking',              // 投票（排行榜页面有投票入口）
  COMMENT: '/participants',      // 评论/留言（选手详情页有留言功能）
  PREDICTION: '/prediction',     // 竞猜市场
  LOTTERY: '/activity',          // 抽奖
  GACHA: '/activity',            // 扭蛋
  EXCHANGE: '/activity',         // 积分商城
}

/**
 * 获取任务引导页路径
 * @param {string} taskType - 任务类型
 * @returns {string|null} - 引导页路径，无映射时返回 null
 */
export const getTaskGuidePath = (taskType) => {
  return TASK_GUIDE_PATHS[taskType] || null
}

/**
 * 判断任务是否可导航到引导页
 * @param {object} params - 参数对象
 * @param {string} params.taskType - 任务类型
 * @param {boolean} params.isCompleted - 是否已完成
 * @param {boolean} params.isClaimed - 是否已领取
 * @returns {boolean} - 是否可导航
 */
export const canNavigateToGuide = ({ taskType, isCompleted, isClaimed }) => {
  // CHAIN_BONUS 任务不可跳转
  if (taskType === 'CHAIN_BONUS') return false
  // 已完成或已领取的任务不可跳转
  if (isCompleted || isClaimed) return false
  // 检查是否有对应的引导页
  return Boolean(TASK_GUIDE_PATHS[taskType])
}
