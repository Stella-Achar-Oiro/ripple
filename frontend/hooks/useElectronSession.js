import { useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'

export function useElectronSession() {
  const { user, isAuthenticated, logout } = useAuth()

  // Check if running in Electron
  const isElectron = typeof window !== 'undefined' && window.electronAPI

  // Save session data when user logs in or user data changes
  const saveSession = useCallback(async (userData = null) => {
    if (!isElectron) return

    try {
      const sessionData = {
        user: userData || user,
        timestamp: Date.now(),
        isAuthenticated: isAuthenticated
      }
      
      await window.electronAPI.saveSession(sessionData)
    } catch (error) {
      console.error('Failed to save session to Electron:', error)
    }
  }, [isElectron, user, isAuthenticated])

  // Clear session data on logout
  const clearSession = useCallback(async () => {
    if (!isElectron) return

    try {
      await window.electronAPI.clearSession()
    } catch (error) {
      console.error('Failed to clear session from Electron:', error)
    }
  }, [isElectron])

  // Handle session restoration from Electron
  useEffect(() => {
    if (!isElectron) return

    const handleSessionRestore = (sessionData) => {
      if (sessionData && sessionData.user && !isAuthenticated) {
        // Check if session is still valid (not older than 7 days)
        const sessionAge = Date.now() - sessionData.timestamp
        const maxAge = 7 * 24 * 60 * 60 * 1000 // 7 days

        if (sessionAge < maxAge) {
          // Restore the user session
          // This would need to be implemented in AuthContext
          console.log('Restoring session for user:', sessionData.user.email)
          
          // Try to validate session with backend
          fetch(process.env.NEXT_PUBLIC_API_URL + '/api/auth/profile', {
            credentials: 'include'
          })
          .then(response => {
            if (response.ok) {
              // Session is still valid, user will be logged in automatically
              console.log('Session restored successfully')
            } else {
              // Session expired, clear it
              clearSession()
            }
          })
          .catch(() => {
            // Network error or session invalid
            clearSession()
          })
        } else {
          // Session too old, clear it
          clearSession()
        }
      }
    }

    // Listen for session restoration from Electron
    const unsubscribe = window.electronAPI.onRestoreSession(handleSessionRestore)

    return unsubscribe
  }, [isElectron, isAuthenticated, clearSession])

  // Handle logout from menu
  useEffect(() => {
    if (!isElectron) return

    const handleLogout = () => {
      logout()
      clearSession()
    }

    const unsubscribe = window.electronAPI.onLogout(handleLogout)
    return unsubscribe
  }, [isElectron, logout, clearSession])

  // Save session when user changes
  useEffect(() => {
    if (isAuthenticated && user) {
      saveSession()
    } else if (!isAuthenticated) {
      clearSession()
    }
  }, [isAuthenticated, user, saveSession, clearSession])

  // Desktop notification helper
  const showDesktopNotification = useCallback(async (title, body, options = {}) => {
    if (!isElectron) return

    try {
      await window.electronAPI.showNotification({
        title,
        body,
        ...options
      })
    } catch (error) {
      console.error('Failed to show desktop notification:', error)
    }
  }, [isElectron])

  return {
    isElectron,
    saveSession,
    clearSession,
    showDesktopNotification
  }
}