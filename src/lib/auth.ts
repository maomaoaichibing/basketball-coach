// 认证状态管理工具

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  phone?: string | null;
  campusId?: string | null;
  campusName?: string;
  avatar?: string | null;
  specialties: string[];
}

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// 获取本地存储的认证信息
export function getAuthFromStorage(): {
  user: AuthUser | null;
  token: string | null;
} {
  if (typeof window === 'undefined') {
    return { user: null, token: null };
  }

  try {
    const token = localStorage.getItem('auth_token');
    const userStr = localStorage.getItem('auth_user');
    const user = userStr ? JSON.parse(userStr) : null;
    return { user, token };
  } catch {
    return { user: null, token: null };
  }
}

// 保存认证信息到本地存储
export function saveAuthToStorage(user: AuthUser, token: string) {
  if (typeof window === 'undefined') return;

  localStorage.setItem('auth_token', token);
  localStorage.setItem('auth_user', JSON.stringify(user));
}

// 清除认证信息
export function clearAuthFromStorage() {
  if (typeof window === 'undefined') return;

  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_user');
}

// 获取 Authorization header
export function getAuthHeader(): Record<string, string> {
  if (typeof window === 'undefined') {
    return {};
  }

  const token = localStorage.getItem('auth_token');
  if (!token) {
    return {};
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}

// 是否正在刷新 token（防止并发刷新）
let isRefreshing = false;
// 等待刷新完成的请求队列
let refreshSubscribers: Array<(token: string | null) => void> = [];

function subscribeTokenRefresh(cb: (token: string | null) => void) {
  refreshSubscribers.push(cb);
}

function onTokenRefreshed(token: string | null) {
  refreshSubscribers.forEach(cb => cb(token));
  refreshSubscribers = [];
}

// 刷新 token
async function refreshToken(): Promise<string | null> {
  try {
    const currentToken = localStorage.getItem('auth_token');
    if (!currentToken) return null;

    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${currentToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (data.success && data.data?.token) {
      // 保存新 token
      localStorage.setItem('auth_token', data.data.token);
      // 同步到 cookie
      const expires = new Date(Date.now() + 7 * 864e5).toUTCString();
      document.cookie = `auth_token=${encodeURIComponent(data.data.token)}; expires=${expires}; path=/; SameSite=Lax`;
      // 触发 token 更新事件（让 AuthProvider 同步）
      window.dispatchEvent(
        new CustomEvent('auth-token-refreshed', { detail: { token: data.data.token } })
      );
      return data.data.token;
    }
    return null;
  } catch {
    return null;
  }
}

// 验证 token 的 API 调用
// 自动附加 Authorization header
// 401 时先尝试刷新 token，刷新失败才跳转登录页
export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  // 排除 auth 自身的请求，避免循环
  if (url.includes('/api/auth/')) {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
      ...getAuthHeader(),
    };
    return fetch(url, { ...options, headers });
  }

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
    ...getAuthHeader(),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status !== 401) {
    return response;
  }

  // 401 未授权：尝试刷新 token
  if (typeof window === 'undefined') {
    return response;
  }

  if (isRefreshing) {
    // 已经在刷新中，排队等待
    return new Promise<Response>(resolve => {
      subscribeTokenRefresh(newToken => {
        if (newToken) {
          // 用新 token 重试原请求
          const retryHeaders: Record<string, string> = {
            ...(options.headers as Record<string, string>),
            Authorization: `Bearer ${newToken}`,
          };
          resolve(fetch(url, { ...options, headers: retryHeaders }));
        } else {
          // 刷新失败，返回原始 401 响应
          resolve(response);
        }
      });
    });
  }

  isRefreshing = true;

  const newToken = await refreshToken();

  isRefreshing = false;

  if (newToken) {
    // 刷新成功，通知所有等待的请求
    onTokenRefreshed(newToken);
    // 重试原请求
    const retryHeaders: Record<string, string> = {
      ...(options.headers as Record<string, string>),
      Authorization: `Bearer ${newToken}`,
    };
    return fetch(url, { ...options, headers: retryHeaders });
  }

  // 刷新失败，清除登录状态，跳转登录页
  onTokenRefreshed(null);
  clearAuthFromStorage();
  document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax';
  const redirect = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.href = `/login?redirect=${redirect}`;
  return response;
}

// 从 token 中解析过期时间（JWT 的 exp 是秒级时间戳）
export function getTokenExpTime(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp ? payload.exp * 1000 : null; // 转为毫秒
  } catch {
    return null;
  }
}

// 检查 token 是否需要在近期刷新（过期前 1 天）
export function shouldRefreshToken(token: string): boolean {
  const expTime = getTokenExpTime(token);
  if (!expTime) return false;
  const oneDay = 24 * 60 * 60 * 1000;
  return Date.now() > expTime - oneDay;
}
