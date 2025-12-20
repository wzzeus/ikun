import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-slate-300 dark:text-slate-700">404</h1>
        <p className="text-xl text-slate-500 dark:text-slate-400 mt-4">页面走丢了...</p>
        <p className="text-slate-400 dark:text-slate-500 mt-2 font-mono text-sm" data-answer="easter_egg_404">
          找不到你要的页面
        </p>
        <Link
          to="/"
          className="inline-block mt-8 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
        >
          返回首页
        </Link>
      </div>
    </div>
  )
}
