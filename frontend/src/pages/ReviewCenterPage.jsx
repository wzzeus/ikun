import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CheckCircle,
  Clock,
  Star,
  Filter,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Award,
  Users,
  BarChart3,
  Send,
  Edit3,
  Trash2,
  AlertCircle,
} from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { reviewCenterApi } from '../services'
import { Badge } from '../components/ui/badge'

/**
 * 评审中心页面 - 评审员专属
 *
 * 功能：
 * 1. 查看所有已提交的作品
 * 2. 对作品进行评分（1-100分）
 * 3. 筛选已评分/未评分作品
 * 4. 查看评分统计
 */
export default function ReviewCenterPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)

  // 状态
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all, yes, no
  const [stats, setStats] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [scoringId, setScoringId] = useState(null)
  const [scoreInput, setScoreInput] = useState('')
  const [commentInput, setCommentInput] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const token = useAuthStore((s) => s.token)

  // 权限检查 - 等待用户信息加载完成后再判断
  useEffect(() => {
    // 如果没有 token，说明未登录，跳转首页
    if (!token) {
      navigate('/')
      return
    }
    // 如果有 token 但 user 还没加载，等待加载
    if (!user) {
      return
    }
    // user 已加载，检查权限
    if (user.role !== 'reviewer' && user.role !== 'admin') {
      navigate('/')
    }
  }, [user, token, navigate])

  // 加载数据
  const loadData = async () => {
    setLoading(true)
    try {
      const [submissionsData, statsData] = await Promise.all([
        reviewCenterApi.getSubmissions({ scored: filter !== 'all' ? filter : undefined }),
        reviewCenterApi.getStats(),
      ])
      setSubmissions(submissionsData.items || [])
      setStats(statsData)
    } catch (error) {
      console.error('加载数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.role === 'reviewer' || user?.role === 'admin') {
      loadData()
    }
  }, [user, filter])

  // 开始评分
  const handleStartScoring = (submission) => {
    setScoringId(submission.id)
    setScoreInput(submission.my_review?.score?.toString() || '')
    setCommentInput(submission.my_review?.comment || '')
    setExpandedId(submission.id)
  }

  // 提交评分
  const handleSubmitScore = async (submissionId) => {
    const score = parseInt(scoreInput, 10)
    if (isNaN(score) || score < 1 || score > 100) {
      alert('请输入有效的评分（1-100）')
      return
    }

    setSubmitting(true)
    try {
      await reviewCenterApi.submitReview(submissionId, {
        score,
        comment: commentInput.trim() || null,
      })
      setScoringId(null)
      setScoreInput('')
      setCommentInput('')
      await loadData()
    } catch (error) {
      console.error('提交评分失败:', error)
      alert(error.response?.data?.detail || '提交失败')
    } finally {
      setSubmitting(false)
    }
  }

  // 删除评分
  const handleDeleteReview = async (submissionId) => {
    if (!confirm('确定要删除这个评分吗？')) return

    try {
      await reviewCenterApi.deleteReview(submissionId)
      await loadData()
    } catch (error) {
      console.error('删除评分失败:', error)
      alert(error.response?.data?.detail || '删除失败')
    }
  }

  // 取消评分
  const handleCancelScoring = () => {
    setScoringId(null)
    setScoreInput('')
    setCommentInput('')
  }

  if (!user || (user.role !== 'reviewer' && user.role !== 'admin')) {
    return null
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pt-24 pb-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* 页面标题 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-3 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-xl shadow-lg">
              <Award className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">评审中心</h1>
              <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">为参赛作品评分打分</p>
            </div>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-sm sm:text-base"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </button>
        </div>

        {/* 统计卡片 */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-blue-500" />
                <span className="text-sm text-slate-500">待审作品</span>
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total_submissions}</div>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm text-slate-500">已评分</span>
              </div>
              <div className="text-2xl font-bold text-green-600">{stats.reviewed_count}</div>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-yellow-500" />
                <span className="text-sm text-slate-500">未评分</span>
              </div>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending_count}</div>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4 text-purple-500" />
                <span className="text-sm text-slate-500">我的平均分</span>
              </div>
              <div className="text-2xl font-bold text-purple-600">
                {stats.avg_score_given ? parseFloat(stats.avg_score_given).toFixed(1) : '-'}
              </div>
            </div>
          </div>
        )}

        {/* 筛选器 */}
        <div className="flex items-center gap-2 mb-6">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-sm text-slate-500 mr-2">筛选:</span>
          {[
            { value: 'all', label: '全部' },
            { value: 'no', label: '未评分' },
            { value: 'yes', label: '已评分' },
          ].map((item) => (
            <button
              key={item.value}
              onClick={() => setFilter(item.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === item.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* 作品列表 */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        ) : submissions.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            {filter === 'no' ? '没有未评分的作品' : filter === 'yes' ? '还没有评分记录' : '暂无待审作品'}
          </div>
        ) : (
          <div className="space-y-4">
            {submissions.map((sub) => {
              const isExpanded = expandedId === sub.id
              const isScoring = scoringId === sub.id
              const hasReview = !!sub.my_review

              return (
                <div
                  key={sub.id}
                  className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden"
                >
                  {/* 卡片头部 */}
                  <div
                    className="p-3 sm:p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : sub.id)}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="flex items-start gap-3 sm:gap-4">
                        <img
                          src={sub.contestant?.avatar_url || `https://ui-avatars.com/api/?name=${sub.contestant?.username}`}
                          alt={sub.contestant?.display_name}
                          className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-900 dark:text-white truncate text-sm sm:text-base">{sub.title}</h3>
                          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                            {sub.contestant?.display_name || sub.contestant?.username} ·
                            <span className="ml-1">
                              {sub.submitted_at ? new Date(sub.submitted_at).toLocaleString() : '未提交'}
                            </span>
                          </p>
                          {sub.description && (
                            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 line-clamp-1">
                              {sub.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 pl-13 sm:pl-0">
                        {/* 我的评分 */}
                        {hasReview ? (
                          <div className="flex items-center gap-1 px-2 sm:px-3 py-1 bg-green-100 dark:bg-green-900/30 rounded-full">
                            <Star className="w-3 h-3 sm:w-4 sm:h-4 text-green-600 dark:text-green-400 fill-current" />
                            <span className="text-xs sm:text-sm font-bold text-green-600 dark:text-green-400">
                              {sub.my_review.score}
                            </span>
                          </div>
                        ) : (
                          <Badge variant="secondary" className="text-yellow-600 dark:text-yellow-400 text-xs">
                            <Clock className="w-3 h-3 mr-1" />
                            待评分
                          </Badge>
                        )}
                        {/* 统计信息 */}
                        <div className="text-right">
                          <div className="text-xs text-slate-500">
                            {sub.stats.review_count} 人评分
                          </div>
                          <div className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
                            {sub.stats.final_score !== null
                              ? `最终分: ${parseFloat(sub.stats.final_score).toFixed(1)}`
                              : '评分中'}
                          </div>
                        </div>
                        {/* 展开/收起 */}
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-slate-400 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-slate-400 flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 展开详情 */}
                  {isExpanded && (
                    <div className="border-t border-slate-200 dark:border-slate-800">
                      <div className="p-4 space-y-4">
                        {/* 项目链接 */}
                        <div className="flex flex-wrap gap-3">
                          <a
                            href={sub.repo_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                            查看代码仓库
                          </a>
                          {sub.demo_url && (
                            <a
                              href={sub.demo_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-sm text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                            >
                              <ExternalLink className="w-4 h-4" />
                              在线演示
                            </a>
                          )}
                        </div>

                        {/* 项目描述 */}
                        {sub.description && (
                          <div>
                            <h4 className="text-sm font-medium text-slate-500 mb-2">项目描述</h4>
                            <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap text-sm">
                              {sub.description}
                            </p>
                          </div>
                        )}

                        {/* 评分统计 */}
                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
                          <h4 className="text-sm font-medium text-slate-500 mb-2">评分统计</h4>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 text-center">
                            <div>
                              <div className="text-lg font-bold text-slate-700 dark:text-slate-300">
                                {sub.stats.review_count}
                              </div>
                              <div className="text-xs text-slate-500">评分人数</div>
                            </div>
                            <div>
                              <div className="text-lg font-bold text-blue-600">
                                {sub.stats.avg_score !== null ? parseFloat(sub.stats.avg_score).toFixed(1) : '-'}
                              </div>
                              <div className="text-xs text-slate-500">平均分</div>
                            </div>
                            <div>
                              <div className="text-lg font-bold text-green-600">
                                {sub.stats.max_score ?? '-'}
                              </div>
                              <div className="text-xs text-slate-500">最高分</div>
                            </div>
                            <div>
                              <div className="text-lg font-bold text-orange-600">
                                {sub.stats.min_score ?? '-'}
                              </div>
                              <div className="text-xs text-slate-500">最低分</div>
                            </div>
                          </div>
                          {sub.stats.review_count >= 3 && (
                            <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 text-center">
                              <span className="text-sm text-slate-500">
                                最终得分（去掉最高最低）：
                              </span>
                              <span className="text-lg font-bold text-purple-600 ml-2">
                                {sub.stats.final_score !== null ? parseFloat(sub.stats.final_score).toFixed(2) : '-'}
                              </span>
                            </div>
                          )}
                          {sub.stats.review_count > 0 && sub.stats.review_count < 3 && (
                            <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                              <div className="flex items-center justify-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                                <AlertCircle className="w-4 h-4" />
                                <span>还需 {3 - sub.stats.review_count} 人评分才能计算最终得分</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* 评分表单 */}
                        {isScoring ? (
                          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 sm:p-4 border border-blue-200 dark:border-blue-800">
                            <h4 className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-3">
                              {hasReview ? '修改评分' : '提交评分'}
                            </h4>
                            <div className="space-y-3">
                              <div>
                                <label className="block text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-1">
                                  评分 (1-100)
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  max="100"
                                  value={scoreInput}
                                  onChange={(e) => setScoreInput(e.target.value)}
                                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                  placeholder="请输入 1-100 的分数"
                                />
                              </div>
                              <div>
                                <label className="block text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-1">
                                  评审意见（可选）
                                </label>
                                <textarea
                                  value={commentInput}
                                  onChange={(e) => setCommentInput(e.target.value)}
                                  rows={3}
                                  maxLength={2000}
                                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                                  placeholder="可以填写评审意见..."
                                />
                              </div>
                              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                                <button
                                  onClick={() => handleSubmitScore(sub.id)}
                                  disabled={submitting}
                                  className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm"
                                >
                                  <Send className="w-4 h-4" />
                                  {submitting ? '提交中...' : '提交评分'}
                                </button>
                                <button
                                  onClick={handleCancelScoring}
                                  className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-sm"
                                >
                                  取消
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 pt-2">
                            {hasReview ? (
                              <>
                                <div className="flex-1 bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Star className="w-4 h-4 text-green-600 fill-current" />
                                    <span className="text-sm font-medium text-green-700 dark:text-green-300">
                                      我的评分：{sub.my_review.score} 分
                                    </span>
                                  </div>
                                  {sub.my_review.comment && (
                                    <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                                      {sub.my_review.comment}
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleStartScoring(sub)}
                                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors text-sm"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                    修改
                                  </button>
                                  <button
                                    onClick={() => handleDeleteReview(sub.id)}
                                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-sm"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    删除
                                  </button>
                                </div>
                              </>
                            ) : (
                              <button
                                onClick={() => handleStartScoring(sub)}
                                className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                              >
                                <Star className="w-4 h-4" />
                                开始评分
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
