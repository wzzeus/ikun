import { AlertTriangle, Award, Calendar } from 'lucide-react'
import { RISK_RULES, REVIEW_WEIGHTS, PROCESS_STEPS } from './constants'

/**
 * 风控规则与评审区组件
 */
export default function RulesSection() {
  return (
    <section id="rules" className="py-16 bg-slate-200/50 dark:bg-slate-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 风控警告 */}
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 mb-12">
          <div className="flex items-center mb-4">
            <AlertTriangle className="text-red-500 mr-2" />
            <h3 className="text-xl font-bold text-red-500">
              <span aria-hidden="true">⚠️</span> 风控与返还规则（必读）
            </h3>
          </div>
          <ul className="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-300 text-sm">
            {RISK_RULES.map((rule) => (
              <li key={rule.label}>
                <span className="font-bold text-slate-800 dark:text-white">{rule.label}：</span>
                {rule.content}
              </li>
            ))}
          </ul>
        </div>

        {/* 评审机制与赛程 */}
        <div id="judging" className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* 评审机制 */}
          <div>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-4 flex items-center">
              <Award className="mr-2 text-yellow-500 dark:text-yellow-400" /> 评审机制
            </h3>
            <div className="space-y-4">
              {REVIEW_WEIGHTS.map((item) => (
                <div key={item.title} className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-slate-800 dark:text-white">{item.title}</span>
                    <span className={`${item.textColor} font-bold`}>{item.weight}%</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                    <div
                      className={`${item.color} h-2 rounded-full`}
                      style={{ width: `${item.weight}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">{item.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 参赛流程 */}
          <div id="schedule">
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-4 flex items-center">
              <Calendar className="mr-2 text-blue-500 dark:text-blue-400" /> 参赛流程
            </h3>
            {/* 时间轴 - 确保圆点与竖线对齐 */}
            <div className="relative border-l border-slate-300 dark:border-slate-700 ml-3 space-y-8 py-2">
              {PROCESS_STEPS.map((step) => (
                <div key={step.step} className="relative pl-8">
                  <span className="absolute left-0 -translate-x-1/2 top-1 w-6 h-6 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-full flex items-center justify-center text-xs text-slate-700 dark:text-slate-300">
                    {step.step}
                  </span>
                  <h4 className="font-bold text-slate-800 dark:text-white">{step.title}</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {step.description}
                    {step.highlight && (
                      <>
                        <code className="text-yellow-600 dark:text-yellow-400 bg-slate-100 dark:bg-slate-800 px-1 rounded">
                          {step.highlight}
                        </code>
                        {step.suffix}
                      </>
                    )}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
