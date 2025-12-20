import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'
import DevRoleSwitcher from '../dev/DevRoleSwitcher'
import AnnouncementBanner from '../contest/AnnouncementBanner'

// 不显示 Footer 的页面路径
const HIDE_FOOTER_PATHS = ['/code-challenge']

/**
 * 页面布局组件
 *
 * 支持 hash 锚点跳转（如 /#signup）
 */
export default function Layout() {
  const location = useLocation()

  // 是否隐藏 Footer
  const hideFooter = HIDE_FOOTER_PATHS.includes(location.pathname)

  // 支持 hash 锚点滚动（用于报名区定位等场景）
  useEffect(() => {
    const hash = location.hash || ''
    if (!hash.startsWith('#')) return

    const id = hash.slice(1)
    if (!id) return

    // 延迟执行以确保 DOM 已渲染
    const timer = setTimeout(() => {
      const el = document.getElementById(id)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' })
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [location.pathname, location.hash])

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-200 flex flex-col transition-colors duration-300">
      <Navbar />
      {/* 全局公告横幅 */}
      <AnnouncementBanner />
      <main className="flex-1">
        <Outlet />
      </main>
      {!hideFooter && <Footer />}
      {/* 开发模式角色切换器 */}
      <DevRoleSwitcher />
    </div>
  )
}
