import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react'

// Toast Context
const ToastContext = createContext(null)

// Toast 类型配置
const toastConfig = {
  success: {
    icon: CheckCircle,
    bgColor: 'bg-green-50 dark:bg-green-900/30',
    borderColor: 'border-green-200 dark:border-green-800',
    iconColor: 'text-green-500',
    textColor: 'text-green-800 dark:text-green-200',
  },
  error: {
    icon: XCircle,
    bgColor: 'bg-red-50 dark:bg-red-900/30',
    borderColor: 'border-red-200 dark:border-red-800',
    iconColor: 'text-red-500',
    textColor: 'text-red-800 dark:text-red-200',
  },
  warning: {
    icon: AlertCircle,
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/30',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
    iconColor: 'text-yellow-500',
    textColor: 'text-yellow-800 dark:text-yellow-200',
  },
  info: {
    icon: Info,
    bgColor: 'bg-blue-50 dark:bg-blue-900/30',
    borderColor: 'border-blue-200 dark:border-blue-800',
    iconColor: 'text-blue-500',
    textColor: 'text-blue-800 dark:text-blue-200',
  },
}

// 单个 Toast 组件
// message 支持字符串或 React 节点
// action: { label: string, onClick: () => void } 可选操作按钮
function ToastItem({ id, type = 'info', message, title, duration = 3000, action, onClose }) {
  const [isVisible, setIsVisible] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)
  const config = toastConfig[type] || toastConfig.info
  const Icon = config.icon

  useEffect(() => {
    // 入场动画
    requestAnimationFrame(() => setIsVisible(true))

    // 自动关闭
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleClose()
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [duration])

  const handleClose = useCallback(() => {
    setIsLeaving(true)
    setTimeout(() => onClose(id), 300)
  }, [id, onClose])

  return (
    <div
      className={`
        flex items-start gap-3 p-4 rounded-xl border shadow-lg backdrop-blur-sm
        transform transition-all duration-300 ease-out
        ${config.bgColor} ${config.borderColor}
        ${isVisible && !isLeaving ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
    >
      <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${config.iconColor}`} />
      <div className="flex-1 min-w-0">
        {title && (
          <p className={`font-medium ${config.textColor}`}>{title}</p>
        )}
        <div className={`text-sm ${config.textColor} ${title ? 'opacity-80' : ''}`}>
          {message}
        </div>
        {action && (
          <button
            onClick={() => {
              try {
                action.onClick?.()
              } finally {
                handleClose()
              }
            }}
            className={`mt-2 text-sm font-medium underline underline-offset-2 hover:opacity-80 transition-opacity ${config.textColor}`}
          >
            {action.label}
          </button>
        )}
      </div>
      <button
        onClick={handleClose}
        className={`flex-shrink-0 p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${config.textColor}`}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

// Toast 容器
function ToastContainer({ toasts, removeToast }) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed top-20 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem {...toast} onClose={removeToast} />
        </div>
      ))}
    </div>
  )
}

// Toast Provider
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { ...toast, id }])
    return id
  }, [])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback((message, options = {}) => {
    return addToast({ message, type: 'info', ...options })
  }, [addToast])

  toast.success = (message, options = {}) => addToast({ message, type: 'success', ...options })
  toast.error = (message, options = {}) => addToast({ message, type: 'error', ...options })
  toast.warning = (message, options = {}) => addToast({ message, type: 'warning', ...options })
  toast.info = (message, options = {}) => addToast({ message, type: 'info', ...options })

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  )
}

// Hook
export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

export default ToastProvider
