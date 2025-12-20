import { useEffect, lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { ToastProvider } from './components/Toast'
import Layout from './components/layout/Layout'
import { useAuthStore } from './stores/authStore'

// 核心页面 - 直接加载
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import NotFoundPage from './pages/NotFoundPage'

// 懒加载页面 - 按需加载
const SubmissionsPage = lazy(() => import('./pages/SubmissionsPage'))
const RankingPage = lazy(() => import('./pages/RankingPage'))
const ParticipantsPage = lazy(() => import('./pages/ParticipantsPage'))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))
const RoleGuidePage = lazy(() => import('./pages/RoleGuidePage'))
const SubmitPage = lazy(() => import('./pages/SubmitPage'))
const AdminReviewPage = lazy(() => import('./pages/AdminReviewPage'))
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'))
const ActivityManagePage = lazy(() => import('./pages/ActivityManagePage'))
const ReviewCenterPage = lazy(() => import('./pages/ReviewCenterPage'))
const ContestantCenterPage = lazy(() => import('./pages/ContestantCenterPage'))
const AchievementsPage = lazy(() => import('./pages/AchievementsPage'))
const ActivityCenterPage = lazy(() => import('./pages/ActivityCenterPage'))
const PredictionPage = lazy(() => import('./pages/PredictionPage'))
const PredictionListPage = lazy(() => import('./pages/PredictionListPage'))
const MyBetsPage = lazy(() => import('./pages/MyBetsPage'))
const TasksPage = lazy(() => import('./pages/TasksPage'))
const CodeChallengePage = lazy(() => import('./pages/CodeChallengePage'))
const PointsHistoryPage = lazy(() => import('./pages/PointsHistoryPage'))

// 加载中组件
function PageLoading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        <p className="text-sm text-slate-500 dark:text-slate-400">加载中...</p>
      </div>
    </div>
  )
}

function App() {
  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.token)
  const refreshUser = useAuthStore((s) => s.refreshUser)

  // 自动刷新用户信息：当已登录时刷新一次以获取最新状态（包括 original_role）
  useEffect(() => {
    if (token && user) {
      refreshUser()
    }
  }, []) // 只在首次加载时刷新

  return (
    <ToastProvider>
      <Suspense fallback={<PageLoading />}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="submissions" element={<SubmissionsPage />} />
            <Route path="ranking" element={<RankingPage />} />
            <Route path="participants" element={<ParticipantsPage />} />
            <Route path="submit" element={<SubmitPage />} />
            <Route path="achievements" element={<AchievementsPage />} />
            <Route path="activity" element={<ActivityCenterPage />} />
            <Route path="tasks" element={<TasksPage />} />
            <Route path="code-challenge" element={<CodeChallengePage />} />
            <Route path="points-history" element={<PointsHistoryPage />} />
            <Route path="prediction" element={<PredictionListPage />} />
            <Route path="prediction/:id" element={<PredictionPage />} />
            <Route path="my-bets" element={<MyBetsPage />} />
            <Route path="my-project" element={<ContestantCenterPage />} />
            <Route path="admin/review" element={<AdminReviewPage />} />
            <Route path="admin/dashboard" element={<AdminDashboardPage />} />
            <Route path="admin/activity" element={<ActivityManagePage />} />
            <Route path="review-center" element={<ReviewCenterPage />} />
          </Route>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/role-guide" element={<RoleGuidePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </ToastProvider>
  )
}

export default App
