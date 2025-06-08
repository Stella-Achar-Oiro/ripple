'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const router = useRouter()
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

  // Check authentication status
  const checkAuth = async () => {
    try {
      const response = await fetch(`${API_URL}/api/auth/profile`, {
        credentials: 'include'
      })

      if (response.ok) {
        const userData = await response.json()
        setUser(userData.data)
        setIsAuthenticated(true)
        return true
      } else {
        setUser(null)
        setIsAuthenticated(false)
        return false
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      setUser(null)
      setIsAuthenticated(false)
      return false
    }
  }

  // Login function
  const login = async (email, password) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Invalid email or password')
      }

      // Update auth state
      setUser(data.data.user)
      setIsAuthenticated(true)
      
      return { success: true, user: data.data.user }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  // Logout function
  const logout = async () => {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      })
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      // Always clear local state regardless of API response
      setUser(null)
      setIsAuthenticated(false)
      router.push('/')
    }
  }

  // Register function
  const register = async (userData) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed')
      }

      // Update auth state
      setUser(data.data.user)
      setIsAuthenticated(true)
      
      return { success: true, user: data.data.user }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  // Initialize auth state on mount
  useEffect(() => {
    const initAuth = async () => {
      await checkAuth()
      setIsLoading(false)
    }
    
    initAuth()
  }, [])

  const value = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    register,
    checkAuth
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
