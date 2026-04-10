'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
} from 'react';

import {
  AuthUser,
  getAuthFromStorage,
  saveAuthToStorage,
  clearAuthFromStorage,
  shouldRefreshToken,
} from '@/lib/auth';

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: AuthUser, token: string) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Cookie 工具函数
function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax`;
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

// 检查并自动刷新 token
async function tryRefreshToken(): Promise<string | null> {
  const token = localStorage.getItem('auth_token');
  if (!token) return null;

  // 检查是否需要刷新（过期前1天）
  if (!shouldRefreshToken(token)) return token;

  try {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (data.success && data.data?.token) {
      localStorage.setItem('auth_token', data.data.token);
      setCookie('auth_token', data.data.token, 7);
      return data.data.token;
    }
    return null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 初始化：恢复登录状态 + 尝试刷新
  useEffect(() => {
    const init = async () => {
      if (typeof window === 'undefined') return;

      try {
        const { user: storedUser, token: storedToken } = getAuthFromStorage();
        const cookieToken = getCookie('auth_token');
        const finalToken = storedToken || cookieToken;

        if (finalToken && storedUser) {
          try {
            // 尝试静默刷新 token
            const newToken = await tryRefreshToken();
            const activeToken = newToken || finalToken;

            setToken(activeToken);
            setUser(storedUser);

            // 如果 token 被刷新了，同步 localStorage
            if (newToken && newToken !== finalToken) {
              // 不需要额外操作，tryRefreshToken 已经保存了
            }

            // 同步到 cookie（如果只有 cookie 没有 localStorage）
            if (!storedToken && cookieToken) {
              localStorage.setItem('auth_token', cookieToken);
            }
          } catch {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user');
            deleteCookie('auth_token');
          }
        }
      } finally {
        // 确保无论成功失败，loading 状态都会结束
        setIsLoading(false);
      }
    };

    init();

    // 每 5 分钟检查一次是否需要刷新 token
    refreshIntervalRef.current = setInterval(
      async () => {
        const currentToken = localStorage.getItem('auth_token');
        if (!currentToken) return;

        const newToken = await tryRefreshToken();
        if (newToken) {
          setToken(newToken);
        } else if (shouldRefreshToken(currentToken)) {
          // 刷新失败且 token 快过期了，尝试获取最新用户信息确认状态
          try {
            const meResponse = await fetch('/api/auth/me', {
              headers: { Authorization: `Bearer ${currentToken}` },
            });
            if (!meResponse.ok) {
              // 用户信息也获取失败，清除登录状态
              localStorage.removeItem('auth_token');
              localStorage.removeItem('auth_user');
              deleteCookie('auth_token');
              setUser(null);
              setToken(null);
            }
          } catch {
            // 网络错误，保留当前状态
          }
        }
      },
      5 * 60 * 1000
    ); // 5 分钟

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  // 监听 token 刷新事件（fetchWithAuth 触发）
  useEffect(() => {
    const handleTokenRefreshed = (e: Event) => {
      const customEvent = e as CustomEvent<{ token: string }>;
      if (customEvent.detail?.token) {
        setToken(customEvent.detail.token);
      }
    };

    window.addEventListener('auth-token-refreshed', handleTokenRefreshed);
    return () => window.removeEventListener('auth-token-refreshed', handleTokenRefreshed);
  }, []);

  const login = useCallback((newUser: AuthUser, newToken: string) => {
    // 双存：localStorage + Cookie
    saveAuthToStorage(newUser, newToken);
    setCookie('auth_token', newToken, 7); // 7天过期
    setUser(newUser);
    setToken(newToken);
  }, []);

  const logout = useCallback(() => {
    clearAuthFromStorage();
    deleteCookie('auth_token');
    setUser(null);
    setToken(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!token) return;

    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();

      if (data.success && data.data) {
        setUser(data.data);
        localStorage.setItem('auth_user', JSON.stringify(data.data));
      } else {
        // token 失效，清除登录状态
        logout();
      }
    } catch {
      // 网络错误，保留当前状态
    }
  }, [token, logout]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // 返回默认值，避免在 AuthProvider 外部使用时崩溃
    return {
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      login: () => {},
      logout: () => {},
      refreshUser: async () => {},
    };
  }
  return context;
}
