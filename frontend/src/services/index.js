import api from './api'

/**
 * 认证相关 API
 */
export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  refresh: () => api.post('/auth/refresh'),
  forgotPassword: (data) => api.post('/auth/password/forgot', data),
  resetPassword: (data) => api.post('/auth/password/reset', data),
  changePassword: (data) => api.post('/auth/password/change', data),
  setPassword: (data) => api.post('/auth/password/set', data),
  bindLinuxDo: (data) => api.post('/auth/linuxdo/bind', data),
  bindGitHub: (data) => api.post('/auth/github/bind', data),
  confirmLinuxDoMerge: () => api.post('/auth/linuxdo/merge/confirm'),
  cancelLinuxDoMerge: () => api.post('/auth/linuxdo/merge/cancel'),
}

/**
 * 用户相关 API
 */
export const userApi = {
  getMe: () => api.get('/users/me'),
  updateMe: (data) => api.put('/users/me', data),
  getUser: (id) => api.get(`/users/${id}`),
  uploadAvatar: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/users/me/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  // 角色选择（新用户引导）
  selectRole: (role) => api.post('/users/me/select-role', { role }),
}

/**
 * 比赛相关 API
 */
export const contestApi = {
  list: () => api.get('/contests'),
  get: (id) => api.get(`/contests/${id}`),
  getStats: (id) => api.get(`/contests/${id}/stats`),
  getCurrent: (params) => api.get('/contests/current', { params }),
  signup: (id) => api.post(`/contests/${id}/signup`),
  getRanking: (id, params) => api.get(`/contests/${id}/ranking`, { params }),
  getRankingDetail: (id, projectId) => api.get(`/contests/${id}/ranking/${projectId}`),
  getInteractionLeaderboard: (id, params) => api.get(`/contests/${id}/interaction-leaderboard`, { params }),
  uploadBanner: (contestId, file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post(`/contests/${contestId}/banner`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

/**
 * 作品部署相关 API
 */
export const projectApi = {
  list: (params) => api.get('/projects', { params }),
  create: (data) => api.post('/projects', data),
  update: (projectId, data) => api.patch(`/projects/${projectId}`, data),
  uploadCover: (projectId, file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post(`/projects/${projectId}/cover`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  deleteCover: (projectId) => api.delete(`/projects/${projectId}/cover`),
  uploadScreenshot: (projectId, file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post(`/projects/${projectId}/screenshots`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  deleteScreenshot: (projectId, url) =>
    api.delete(`/projects/${projectId}/screenshots`, { params: { url } }),
  submitImage: (projectId, data) => api.post(`/projects/${projectId}/submissions`, data),
  listSubmissions: (projectId, params) => api.get(`/projects/${projectId}/submissions`, { params }),
  getCurrentSubmission: (projectId) => api.get(`/projects/${projectId}/submissions/current`),
  getAccess: (projectId) => api.get(`/projects/${projectId}/access`),
  like: (projectId) => api.post(`/projects/${projectId}/like`),
  unlike: (projectId) => api.delete(`/projects/${projectId}/like`),
  favorite: (projectId) => api.post(`/projects/${projectId}/favorite`),
  unfavorite: (projectId) => api.delete(`/projects/${projectId}/favorite`),
}

/**
 * 作品提交相关 API
 * 支持5种材料：项目源码、演示视频（可选）、项目文档、API调用证明、参赛报名表
 */
export const submissionApi = {
  // 获取作品列表
  list: (params) => api.get('/submissions', { params }),
  // 获取作品详情
  get: (id) => api.get(`/submissions/${id}`),
  // 创建作品（草稿）
  create: (data) => api.post('/submissions', data),
  // 更新作品
  update: (id, data) => api.patch(`/submissions/${id}`, data),
  // 删除作品
  delete: (id) => api.delete(`/submissions/${id}`),
  // 获取我的作品
  getMine: (contestId) => api.get('/submissions', { params: { contest_id: contestId, mine: true } }),

  // 附件上传
  // 初始化附件上传
  initAttachment: (submissionId, data) =>
    api.post(`/submissions/${submissionId}/attachments/init`, data),
  // 完成附件上传（multipart/form-data）
  completeAttachment: (submissionId, attachmentId, file, onProgress) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post(
      `/submissions/${submissionId}/attachments/${attachmentId}/complete`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: onProgress,
      }
    )
  },
  // 删除附件
  deleteAttachment: (submissionId, attachmentId) =>
    api.delete(`/submissions/${submissionId}/attachments/${attachmentId}`),

  // 校验和提交
  // 触发材料校验
  validate: (id) => api.post(`/submissions/${id}/validate`),
  // 最终提交
  finalize: (id) => api.post(`/submissions/${id}/finalize`),

  // 管理审核
  // 审核作品（管理员/评审）
  review: (id, data) => api.post(`/submissions/${id}/review`, data),
}

/**
 * 投票相关 API
 */
export const voteApi = {
  vote: (submissionId) => api.post(`/votes/${submissionId}`),
  cancel: (submissionId) => api.delete(`/votes/${submissionId}`),
  getMyVotes: () => api.get('/votes/my'),
}

/**
 * 报名相关 API
 */
export const registrationApi = {
  // 获取公开报名列表
  getPublic: (contestId) => api.get(`/contests/${contestId}/registrations/public`),
  // 获取我的报名
  getMy: (contestId) => api.get(`/contests/${contestId}/registrations/me`),
  // 创建报名
  create: (contestId, data) => api.post(`/contests/${contestId}/registrations`, data),
  // 更新报名
  update: (contestId, data) => api.put(`/contests/${contestId}/registrations/me`, data),
  // 撤回报名
  withdraw: (contestId) => api.delete(`/contests/${contestId}/registrations/me`),
  // 检查报名状态
  check: (contestId) => api.get(`/contests/${contestId}/registrations/check`),
}

/**
 * 管理员 API
 */
export const adminApi = {
  // 获取所有报名列表（包含待审核）
  getAllRegistrations: (contestId) => api.get(`/contests/${contestId}/registrations/all`),
  // 审核通过
  approveRegistration: (contestId, registrationId) =>
    api.post(`/contests/${contestId}/registrations/${registrationId}/approve`),
  // 拒绝报名
  rejectRegistration: (contestId, registrationId) =>
    api.post(`/contests/${contestId}/registrations/${registrationId}/reject`),
}

/**
 * 成就系统 API
 */
export const achievementApi = {
  // 获取所有成就定义
  getDefinitions: () => api.get('/achievements'),
  // 获取我的成就（添加时间戳避免缓存）
  getMyAchievements: () => api.get(`/users/me/achievements?_t=${Date.now()}`),
  // 获取我的统计
  getMyStats: () => api.get('/users/me/stats'),
  // 领取成就
  claimAchievement: (key) => api.post(`/users/me/achievements/${key}/claim`),
  // 获取我的徽章
  getMyBadges: () => api.get('/users/me/badges'),
  // 设置徽章展示
  setBadge: (slot, achievementKey) => api.put('/users/me/badges', { slot, achievement_key: achievementKey }),
  // 移除徽章
  removeBadge: (slot) => api.delete(`/users/me/badges/${slot}`),
  // 获取用户成就（公开）
  getUserAchievements: (userId) => api.get(`/users/${userId}/achievements`),
  // 获取用户徽章（公开）
  getUserBadges: (userId) => api.get(`/users/${userId}/badges`),
  // 获取用户统计（公开）
  getUserStats: (userId) => api.get(`/users/${userId}/stats`),
  // 获取可兑换积分的徽章列表
  getExchangeableBadges: () => api.get('/users/me/badges/exchangeable'),
  // 徽章兑换积分
  exchangeBadge: (achievementKey) => api.post('/users/me/badges/exchange', { achievement_key: achievementKey }),
}

/**
 * 积分系统 API
 */
export const pointsApi = {
  // 获取积分余额
  getBalance: () => api.get('/points/balance'),
  // 获取积分历史
  getHistory: (params) => api.get('/points/history', { params }),
  // 签到
  signin: () => api.post('/points/signin'),
  // 获取签到状态
  getSigninStatus: () => api.get('/points/signin/status'),
}

/**
 * 抽奖系统 API
 */
export const lotteryApi = {
  // 获取抽奖信息
  getInfo: () => api.get('/lottery/info'),
  // 执行抽奖（use_ticket: 是否优先使用抽奖券）
  draw: (requestId, useTicket = false) => api.post('/lottery/draw', { request_id: requestId, use_ticket: useTicket }),
  // 获取抽奖历史
  getHistory: (params) => api.get('/lottery/history', { params }),
  // 获取中奖记录
  getWinners: (limit = 10) => api.get('/lottery/winners', { params: { limit } }),
  // 获取用户道具
  getItems: () => api.get('/lottery/items'),
  // 获取用户API Key
  getApiKeys: () => api.get('/lottery/api-keys'),

  // 刮刮乐
  // 获取刮刮乐信息
  getScratchInfo: () => api.get('/lottery/scratch/info'),
  // 购买刮刮乐（use_ticket: 是否优先使用刮刮乐券）
  buyScratchCard: (useTicket = false) => api.post('/lottery/scratch/buy', { use_ticket: useTicket }),
  // 刮开刮刮乐
  revealScratchCard: (cardId) => api.post(`/lottery/scratch/${cardId}/reveal`),

  // 彩蛋
  // 获取彩蛋库存状态
  getEasterEggStatus: () => api.get('/lottery/easter-egg/status'),
  // 领取彩蛋
  claimEasterEgg: () => api.post('/lottery/easter-egg/claim'),

  // 管理员测试
  // 强制抽中 API Key（仅管理员）- 幸运抽奖
  adminTestDrawApiKey: () => api.post('/lottery/admin/test-draw-apikey'),
  // 强制抽中 API Key（仅管理员）- 刮刮乐
  adminTestScratchDrawApiKey: () => api.post('/lottery/scratch/admin/test-draw-apikey'),
}

/**
 * 扭蛋机 API
 */
export const gachaApi = {
  // 获取扭蛋机状态
  getStatus: () => api.get('/gacha/status'),
  // 扭蛋
  play: (useTicket = false) => api.post('/gacha/play', { use_ticket: useTicket }),
  // 管理员测试：强制抽中 API Key
  adminTestDrawApiKey: () => api.post('/gacha/admin/test-draw-apikey'),
}

/**
 * 管理后台 API
 */
export const adminApi2 = {
  // 通用方法 - 用于动态 API 调用
  get: (url, config) => api.get(url, config),
  post: (url, data, config) => api.post(url, data, config),
  patch: (url, data, config) => api.patch(url, data, config),
  put: (url, data, config) => api.put(url, data, config),
  delete: (url, config) => api.delete(url, config),

  // 仪表盘
  getDashboard: () => api.get('/admin/dashboard'),
  getDashboardCharts: (days = 7) => api.get('/admin/dashboard/charts', { params: { days } }),

  // 用户管理
  getUsers: (params) => api.get('/admin/users', { params }),
  updateUser: (userId, data) => api.put(`/admin/users/${userId}`, data),
  adjustPoints: (userId, data) => api.post(`/admin/users/${userId}/points`, data),
  getUserPointsHistory: (userId, params) => api.get(`/admin/users/${userId}/points-history`, { params }),

  // 作品评审分配
  getProject: (projectId) => api.get(`/projects/${projectId}`),
  getProjectReviewers: (projectId) => api.get(`/admin/projects/${projectId}/reviewers`),
  assignProjectReviewers: (projectId, reviewerIds) =>
    api.post(`/admin/projects/${projectId}/reviewers`, { reviewer_ids: reviewerIds }),
  removeProjectReviewer: (projectId, reviewerId) =>
    api.delete(`/admin/projects/${projectId}/reviewers/${reviewerId}`),

  // 作品部署管理
  offlineProject: (projectId, message) =>
    api.post(`/admin/projects/${projectId}/offline`, { message }),
  redeployProjectSubmission: (submissionId, message) =>
    api.post(`/admin/project-submissions/${submissionId}/redeploy`, { message }),
  stopProjectSubmission: (submissionId, message) =>
    api.post(`/admin/project-submissions/${submissionId}/stop`, { message }),
  getProjectSubmissionLogs: (submissionId) =>
    api.get(`/admin/project-submissions/${submissionId}/logs`),

  // 签到配置
  getSigninConfig: () => api.get('/admin/signin/config'),
  createMilestone: (data) => api.post('/admin/signin/milestones', data),
  updateMilestone: (id, data) => api.put(`/admin/signin/milestones/${id}`, data),
  deleteMilestone: (id) => api.delete(`/admin/signin/milestones/${id}`),

  // 抽奖配置
  getLotteryConfigs: () => api.get('/admin/lottery/configs'),
  createLotteryConfig: (data) => api.post('/admin/lottery/configs', data),
  updateLotteryConfig: (id, data) => api.put(`/admin/lottery/configs/${id}`, data),
  createPrize: (data) => api.post('/admin/lottery/prizes', data),
  updatePrize: (id, data) => api.put(`/admin/lottery/prizes/${id}`, data),
  deletePrize: (id) => api.delete(`/admin/lottery/prizes/${id}`),

  // API Key 管理
  getApiKeys: (params) => api.get('/admin/api-keys', { params }),
  createApiKey: (data) => api.post('/admin/api-keys', data),
  batchCreateApiKeys: (codes) => api.post('/admin/api-keys/batch', { items: codes }),
  deleteApiKey: (id) => api.delete(`/admin/api-keys/${id}`),

  // API Key 监控（参赛者消耗）
  getApikeyMonitorSummary: () => api.get('/admin/apikey-monitor/summary'),
  getApikeyMonitorLogs: (registrationId, limit = 100) =>
    api.get(`/admin/apikey-monitor/${registrationId}/logs`, { params: { limit } }),
  getAllApikeyLogs: (limit = 200) =>
    api.get('/admin/apikey-monitor/all-logs', { params: { limit } }),

  // 系统日志（操作日志）
  getSystemLogs: (params) => api.get('/admin/logs', { params }),

  // 请求日志（全量 API 监控）
  getRequestLogs: (params) => api.get('/admin/request-logs', { params }),
  getRequestLogsStats: (hours = 24) => api.get('/admin/request-logs/stats', { params: { hours } }),

  // 公告管理
  getAnnouncements: (params) => api.get('/announcements', { params }),
  createAnnouncement: (data) => api.post('/announcements', data),
  updateAnnouncement: (id, data) => api.put(`/announcements/${id}`, data),
  deleteAnnouncement: (id) => api.delete(`/announcements/${id}`),
  togglePinAnnouncement: (id) => api.post(`/announcements/${id}/toggle-pin`),

  // 活动管理
  getActivityStats: () => api.get('/admin/activity/stats'),
  getDailyStats: (date) => api.get('/admin/activity/stats/daily', { params: { date } }),
  getRangeStats: (startDate, endDate) => api.get('/admin/activity/stats/range', { params: { start_date: startDate, end_date: endDate } }),

  // 积分商城管理
  getExchangeItemsAdmin: () => api.get('/admin/exchange/items'),
  createExchangeItem: (data) => api.post('/admin/exchange/items', data),
  updateExchangeItem: (id, data) => api.put(`/admin/exchange/items/${id}`, data),
  deleteExchangeItem: (id) => api.delete(`/admin/exchange/items/${id}`),
  addExchangeItemStock: (id, quantity) => api.post(`/admin/exchange/items/${id}/add-stock`, null, { params: { quantity } }),
  toggleExchangeItemStatus: (id) => api.post(`/admin/exchange/items/${id}/toggle`),

  // 老虎机管理
  getSlotMachineConfig: () => api.get('/slot-machine/admin/config'),
  updateSlotMachineConfig: (data) => api.put('/slot-machine/admin/config', data),
  replaceSlotMachineSymbols: (data) => api.put('/slot-machine/admin/symbols', data),
  getSlotMachineStats: (days = 7) => api.get('/slot-machine/admin/stats', { params: { days } }),
}

/**
 * 老虎机 API
 */
export const slotMachineApi = {
  // 获取配置
  getConfig: () => api.get('/slot-machine/config'),
  // 抽奖
  spin: () => api.post('/slot-machine/spin'),
  // 管理员测试：强制抽中 API Key
  adminTestDrawApiKey: () => api.post('/slot-machine/admin/test-draw-apikey'),
}

/**
 * 评审中心 API（Project 体系）
 */
export const reviewCenterApi = {
  // 获取评审员统计
  getStats: () => api.get('/review-center/stats'),
  // 获取待评审作品列表
  getSubmissions: (params) => api.get('/review-center/projects', { params }),
  // 获取作品详情
  getSubmission: (id) => api.get(`/review-center/projects/${id}`),
  // 提交/更新评分
  submitReview: (projectId, data) => api.post(`/review-center/projects/${projectId}/score`, data),
  // 删除评分
  deleteReview: (projectId) => api.delete(`/review-center/projects/${projectId}/score`),
}

/**
 * 积分兑换 API
 */
export const exchangeApi = {
  // 获取兑换商品列表
  getItems: () => api.get('/exchange/items'),
  // 获取用户兑换信息（余额、券数量）
  getInfo: () => api.get('/exchange/info'),
  // 兑换商品
  redeem: (itemId, quantity = 1) => api.post('/exchange/redeem', { item_id: itemId, quantity }),
  // 获取兑换历史
  getHistory: (params) => api.get('/exchange/history', { params }),
  // 获取用户券数量
  getTickets: () => api.get('/exchange/tickets'),
}

/**
 * 竞猜系统 API
 */
export const predictionApi = {
  // 获取竞猜列表
  getMarkets: (params) => api.get('/prediction/markets', { params }),
  // 获取开放的竞猜
  getOpenMarkets: () => api.get('/prediction/markets/open'),
  // 获取竞猜详情
  getMarket: (id) => api.get(`/prediction/markets/${id}`),
  // 获取竞猜统计
  getMarketStats: (id) => api.get(`/prediction/markets/${id}/stats`),
  // 下注
  placeBet: (marketId, data) => api.post(`/prediction/markets/${marketId}/bet`, data),
  // 获取我的下注记录
  getMyBets: (params) => api.get('/prediction/bets', { params }),
  // 管理员：创建竞猜
  createMarket: (data) => api.post('/prediction/admin/markets', data),
  // 管理员：开启竞猜
  openMarket: (id) => api.post(`/prediction/admin/markets/${id}/open`),
  // 管理员：关闭竞猜
  closeMarket: (id) => api.post(`/prediction/admin/markets/${id}/close`),
  // 管理员：结算竞猜
  settleMarket: (id, winnerIds) => api.post(`/prediction/admin/markets/${id}/settle`, { winner_option_ids: winnerIds }),
  // 管理员：取消竞猜
  cancelMarket: (id) => api.post(`/prediction/admin/markets/${id}/cancel`),
}

/**
 * 每日任务系统 API
 */
export const taskApi = {
  // 获取我的任务列表（含进度）
  // schedule: 'DAILY' | 'WEEKLY'
  getMyTasks: (schedule = 'DAILY') => api.get('/tasks/me', { params: { schedule } }),
  // 领取任务奖励
  claimReward: (taskId) => api.post(`/tasks/me/${taskId}/claim`),
  // 管理员：获取任务定义列表
  getDefinitions: (params) => api.get('/tasks/admin/definitions', { params }),
  // 管理员：创建任务定义
  createDefinition: (data) => api.post('/tasks/admin/definitions', data),
  // 管理员：更新任务定义
  updateDefinition: (id, data) => api.put(`/tasks/admin/definitions/${id}`, data),
  // 管理员：删除任务定义
  deleteDefinition: (id) => api.delete(`/tasks/admin/definitions/${id}`),
}
