import { create } from 'zustand'
import api from '../services/api'
import { useAuthStore } from './authStore'

/**
 * 安全地将任意值转为字符串
 */
const safeString = (value) => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

/**
 * 字段名中文映射
 */
const fieldNameMap = {
  title: '项目名称',
  summary: '项目简介',
  description: '项目介绍',
  plan: '实现计划',
  tech_stack: '技术栈',
  repo_url: '仓库地址',
  email: '联系邮箱',
  wechat: '微信号',
  api_key: 'API Key',
}

/**
 * 常见错误信息中文映射
 */
const errorMessageMap = {
  'String should have at least 20 characters': '内容至少需要20个字符',
  'String should have at least 10 characters': '内容至少需要10个字符',
  'String should have at least 2 characters': '内容至少需要2个字符',
  'String should have at most 200 characters': '内容不能超过200个字符',
  'String should have at most 500 characters': '内容不能超过500个字符',
  'String should have at most 2000 characters': '内容不能超过2000个字符',
  'field required': '此项为必填',
  'Field required': '此项为必填',
  'value is not a valid email address': '请输入有效的邮箱地址',
  'Invalid email format': '邮箱格式不正确',
  'ensure this value has at least': '内容长度不足',
}

/**
 * 翻译错误信息
 */
const translateErrorMessage = (msg) => {
  if (!msg) return msg
  // 精确匹配
  if (errorMessageMap[msg]) return errorMessageMap[msg]
  // 模糊匹配（处理带数字的情况）
  for (const [pattern, translation] of Object.entries(errorMessageMap)) {
    if (msg.includes(pattern.replace(/\d+/, ''))) {
      // 提取数字
      const numMatch = msg.match(/(\d+)/)
      if (numMatch && translation.includes('个字符')) {
        return translation.replace(/\d+/, numMatch[1])
      }
      return translation
    }
  }
  return msg
}

/**
 * 获取错误信息
 * 处理 FastAPI 验证错误（数组）、字符串错误、对象错误等多种格式
 * 保证返回字符串类型
 */
const getErrorMessage = (error) => {
  const fallback = '请求失败，请稍后重试'
  const detail = error?.response?.data?.detail

  // FastAPI/Pydantic 验证错误：detail 是数组
  if (Array.isArray(detail)) {
    const messages = detail
      .map(err => {
        if (typeof err === 'string') return translateErrorMessage(err)
        if (!err || typeof err !== 'object') return safeString(err)
        // 提取字段名（去掉 body/query/path 等前缀）
        const rawField = Array.isArray(err.loc)
          ? err.loc.filter(p => !['body', 'query', 'path', 'header'].includes(p)).map(String).join('.')
          : ''
        const field = fieldNameMap[rawField] || rawField
        const msg = translateErrorMessage(safeString(err.msg || err.message || ''))
        return field && msg ? `${field}: ${msg}` : msg
      })
      .filter(Boolean)
    return messages.length > 0 ? messages.join('；') : '验证失败'
  }

  // 普通字符串错误
  if (typeof detail === 'string' && detail) {
    return detail
  }

  // 对象格式错误（包含 msg 或 message 字段）
  if (detail && typeof detail === 'object') {
    const msg = detail.msg || detail.message
    if (typeof msg === 'string' && msg) return msg
    return safeString(detail) || fallback
  }

  // 其他响应数据中的错误
  const data = error?.response?.data
  if (typeof data === 'string' && data) return data
  if (typeof data?.message === 'string' && data.message) return data.message
  if (typeof data?.error === 'string' && data.error) return data.error

  // 原始错误消息
  if (typeof error?.message === 'string' && error.message) return error.message

  return fallback
}

/**
 * 事前准备引导初始状态
 */
const initialPreparationState = {
  preparationOpen: false,
  preparationStep: 1,
  preparationProjectChecked: false,
  preparationTokenChecked: false,
}

/**
 * 报名状态管理 Store
 *
 * 管理用户的报名状态、表单数据和弹窗显示
 */
export const useRegistrationStore = create((set, get) => ({
  // 报名数据
  registration: null,
  // 报名状态：unknown | none | draft | submitted | approved | rejected | withdrawn
  status: 'unknown',
  // 加载状态
  loading: false,
  // 保存状态
  saving: false,
  // 错误信息
  error: null,

  // 弹窗控制
  modalOpen: false,
  openModal: () => set({ modalOpen: true, error: null }),
  closeModal: () => set({ modalOpen: false, error: null }),
  clearError: () => set({ error: null }),

  // 事前准备引导弹窗控制
  ...initialPreparationState,
  openPreparationGuide: () => set({
    ...initialPreparationState,
    preparationOpen: true,
    error: null,
  }),
  closePreparationGuide: () => set({
    ...initialPreparationState,
    error: null,
  }),
  setPreparationProjectChecked: (checked) => set({ preparationProjectChecked: !!checked }),
  setPreparationTokenChecked: (checked) => set({ preparationTokenChecked: !!checked }),
  nextPreparationStep: () => set((state) => {
    if (state.preparationStep !== 1 || !state.preparationProjectChecked) return {}
    return { preparationStep: 2 }
  }),
  prevPreparationStep: () => set((state) => {
    if (state.preparationStep !== 2) return {}
    return { preparationStep: 1 }
  }),
  startRegistrationFromPreparation: () => {
    const { preparationProjectChecked, preparationTokenChecked } = get()
    if (!preparationProjectChecked || !preparationTokenChecked) return
    set({
      ...initialPreparationState,
      modalOpen: true,
      error: null,
    })
  },

  /**
   * 检查当前用户的报名状态
   */
  checkStatus: async (contestId) => {
    const token = useAuthStore.getState().token
    if (!token) {
      set({ registration: null, status: 'none', error: null })
      return null
    }

    set({ loading: true, error: null })
    try {
      const response = await api.get(`/contests/${contestId}/registrations/me`)
      set({
        registration: response,
        status: response?.status || 'unknown',
        loading: false
      })
      return response
    } catch (error) {
      // 404 表示未报名，不是错误
      if (error?.response?.status === 404) {
        set({ registration: null, status: 'none', loading: false, error: null })
        return null
      }
      set({ loading: false, error: getErrorMessage(error) })
      throw error
    }
  },

  /**
   * 创建报名
   */
  create: async (contestId, payload) => {
    set({ saving: true, error: null })
    try {
      const response = await api.post(`/contests/${contestId}/registrations`, payload)
      set({
        registration: response,
        status: response?.status || 'submitted',
        saving: false
      })
      return response
    } catch (error) {
      // 409 冲突表示已报名，重新获取状态
      if (error?.response?.status === 409) {
        try {
          await get().checkStatus(contestId)
        } catch {
          // 忽略
        }
      }
      set({ saving: false, error: getErrorMessage(error) })
      throw error
    }
  },

  /**
   * 更新报名信息
   */
  update: async (contestId, payload) => {
    set({ saving: true, error: null })
    try {
      const response = await api.put(`/contests/${contestId}/registrations/me`, payload)
      set({
        registration: response,
        status: response?.status || 'submitted',
        saving: false
      })
      return response
    } catch (error) {
      set({ saving: false, error: getErrorMessage(error) })
      throw error
    }
  },

  /**
   * 撤回报名
   */
  withdraw: async (contestId) => {
    set({ saving: true, error: null })
    try {
      const response = await api.delete(`/contests/${contestId}/registrations/me`)
      set({
        registration: response,
        status: 'withdrawn',
        saving: false
      })
      return response
    } catch (error) {
      set({ saving: false, error: getErrorMessage(error) })
      throw error
    }
  },

  /**
   * 重置状态（用于登出时）
   */
  reset: () => set({
    registration: null,
    status: 'unknown',
    loading: false,
    saving: false,
    error: null,
    modalOpen: false,
    ...initialPreparationState
  })
}))
