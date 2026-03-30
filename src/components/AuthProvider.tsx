'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { AuthUser } from '@/lib/auth'

interface AuthContextType {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (user: AuthUser, token: string) => void
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // 从 localStorage 恢复登录状态
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('auth_token')
      const storedUser = localStorage.getItem('auth_user')
      
      if (storedToken && storedUser) {
        try {
          setToken(storedToken)
          setUser(JSON.parse(storedUser))
        } catch {
          localStorage.removeItem('auth_token')
          localStorage.removeItem('auth_user')
        }
      }
      setIsLoading(false)
    }
  }, [])

  const login = (newUser: AuthUser, newToken: string) => {
    localStorage.setItem('auth_token', newToken)
    localStorage.setItem('auth_user', JSON.stringify(newUser))
    setUser(newUser)
    setToken(newToken)
  }

  const logout = () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
    setUser(null)
    setToken(null)
  }

  const refreshUser = async () => {
    if (!token) return

    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await response.json()
      
      if (data.success && data.data) {
        setUser(data.data)
        localStorage.setItem('auth_user', JSON.stringify(data.data))
      } else {
        // token 失效，清除登录状态
        logout()
      }
    } catch {
      // 网络错误，保留当前状态
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        login,
        logout,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}