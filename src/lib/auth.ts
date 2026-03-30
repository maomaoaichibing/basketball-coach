// 认证状态管理工具

export interface AuthUser {
  id: string
  email: string
  name: string
  role: string
  phone?: string | null
  campusId?: string | null
  campusName?: string
  avatar?: string | null
  specialties: string[]
}

export interface AuthState {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
}

// 获取本地存储的认证信息
export function getAuthFromStorage(): { user: AuthUser | null; token: string | null } {
  if (typeof window === 'undefined') {
    return { user: null, token: null }
  }

  try {
    const token = localStorage.getItem('auth_token')
    const userStr = localStorage.getItem('auth_user')
    const user = userStr ? JSON.parse(userStr) : null
    return { user, token }
  } catch {
    return { user: null, token: null }
  }
}

// 保存认证信息到本地存储
export function saveAuthToStorage(user: AuthUser, token: string) {
  if (typeof window === 'undefined') return

  localStorage.setItem('auth_token', token)
  localStorage.setItem('auth_user', JSON.stringify(user))
}

// 清除认证信息
export function clearAuthFromStorage() {
  if (typeof window === 'undefined') return

  localStorage.removeItem('auth_token')
  localStorage.removeItem('auth_user')
}

// 获取 Authorization header
export function getAuthHeader(): Record<string, string> {
  if (typeof window === 'undefined') {
    return {}
  }

  const token = localStorage.getItem('auth_token')
  if (!token) {
    return {}
  }

  return {
    'Authorization': `Bearer ${token}`
  }
}

// 验证 token 的 API 调用
export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const headers = {
    ...options.headers,
    ...getAuthHeader()
  }

  const response = await fetch(url, {
    ...options,
    headers
  })

  return response
}