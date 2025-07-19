'use client'

import { useEffect } from 'react'
import { useWebSocket } from '../../contexts/WebSocketContext'
import { useAuth } from '../../contexts/AuthContext'

export default function ElectronWebSocketEnhancer({ children }) {
  const { user } = useAuth()
  const webSocket = useWebSocket()
  
  // Check if running in Electron
  const isElectron = typeof window !== 'undefined' && window.electronAPI

  useEffect(() => {
    if (!isElectron || !user) return

    // Listen for WebSocket messages and show desktop notifications
    let lastNotificationTime = 0
    const notificationCooldown = 3000 // 3 seconds between notifications

    const handleNewMessage = async (messageData) => {
      const now = Date.now()
      
      // Prevent notification spam
      if (now - lastNotificationTime < notificationCooldown) {
        return
      }
      
      try {
        let title = 'New Message'
        let body = messageData.content || 'You have a new message'
        
        // Customize notification based on message type
        if (messageData.from !== user.id) {
          if (messageData.group_id) {
            title = 'Group Message'
            body = `New message in group chat`
          } else {
            title = 'Private Message'
            body = messageData.content || 'You have a new private message'
          }
          
          await window.electronAPI.showNotification({
            title,
            body: body.length > 100 ? body.substring(0, 100) + '...' : body,
            silent: false
          })
          
          lastNotificationTime = now
        }
      } catch (error) {
        console.error('Failed to show desktop notification:', error)
      }
    }

    // Monitor WebSocket messages
    const originalSend = WebSocket.prototype.send
    
    // Listen for incoming messages via custom events
    const handleWebSocketMessage = (event) => {
      if (event.detail && event.detail.type === 'message_received') {
        handleNewMessage(event.detail.data)
      }
    }

    window.addEventListener('ripple-websocket-message', handleWebSocketMessage)

    return () => {
      window.removeEventListener('ripple-websocket-message', handleWebSocketMessage)
    }
  }, [isElectron, user])

  // Monitor connection status for offline detection
  useEffect(() => {
    if (!isElectron) return

    if (webSocket?.connectionError) {
      // Show offline notification
      window.electronAPI?.showNotification({
        title: 'Connection Lost',
        body: 'You are now offline. Messages will be queued until connection is restored.',
        silent: false
      }).catch(console.error)
    } else if (webSocket?.isConnected) {
      // Optionally show reconnection notification
      // window.electronAPI?.showNotification({
      //   title: 'Connected',
      //   body: 'You are back online!',
      //   silent: true
      // }).catch(console.error)
    }
  }, [isElectron, webSocket?.isConnected, webSocket?.connectionError])

  return children
}