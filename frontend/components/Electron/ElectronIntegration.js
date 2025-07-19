'use client'

import { useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useWebSocket } from '../../contexts/WebSocketContext'

export default function ElectronIntegration() {
  const { user, isAuthenticated } = useAuth()
  const { isConnected } = useWebSocket()

  // Check if running in Electron
  const isElectron = typeof window !== 'undefined' && window.electronAPI

  useEffect(() => {
    if (!isElectron) return

    // Save session when user authenticates
    if (isAuthenticated && user) {
      const sessionData = {
        user,
        timestamp: Date.now(),
        isAuthenticated: true
      }
      
      window.electronAPI.saveSession(sessionData)
        .catch(error => console.error('Failed to save session:', error))
    }
  }, [isElectron, isAuthenticated, user])

  useEffect(() => {
    if (!isElectron) return

    // Clear session when user logs out
    if (!isAuthenticated) {
      window.electronAPI.clearSession()
        .catch(error => console.error('Failed to clear session:', error))
    }
  }, [isElectron, isAuthenticated])

  useEffect(() => {
    if (!isElectron) return

    // Handle keyboard shortcuts
    const handleKeyboardShortcuts = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
        event.preventDefault()
        // Focus on new chat or search
        const searchInput = document.querySelector('input[placeholder*="Search"]')
        if (searchInput) {
          searchInput.focus()
        }
      }
    }

    // Listen for Electron keyboard shortcuts
    const handleElectronNewChat = () => {
      const searchInput = document.querySelector('input[placeholder*="Search"]')
      if (searchInput) {
        searchInput.focus()
      }
    }

    window.addEventListener('electron-new-chat', handleElectronNewChat)
    document.addEventListener('keydown', handleKeyboardShortcuts)

    return () => {
      window.removeEventListener('electron-new-chat', handleElectronNewChat)
      document.removeEventListener('keydown', handleKeyboardShortcuts)
    }
  }, [isElectron])

  // Don't render anything - this is just for integration
  return null
}

// Hook for desktop notifications in messaging
export function useElectronNotifications() {
  const isElectron = typeof window !== 'undefined' && window.electronAPI

  const showNotification = async (title, body, options = {}) => {
    if (!isElectron) return

    try {
      await window.electronAPI.showNotification({
        title: title || 'Ripple Messenger',
        body: body || '',
        silent: false,
        ...options
      })
    } catch (error) {
      console.error('Failed to show desktop notification:', error)
    }
  }

  return { showNotification, isElectron }
}