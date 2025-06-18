'use client'

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'

const NotificationContext = createContext()

export const useNotifications = () => {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}

export const NotificationProvider = ({ children }) => {
  // State management
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [lastFetchTime, setLastFetchTime] = useState(null)

  // Refs
  const wsRef = useRef(null)
  const fetchTimeoutRef = useRef(null)
  const retryCount = useRef(0)
  const router = useRouter()

  // Constants
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
  const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080/ws'
  const FETCH_INTERVAL = 30000 // 30 seconds for polling fallback

  // Load notifications from API
  const loadNotifications = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true)
    setError('')

    try {
      const response = await fetch(`${API_URL}/api/notifications`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        if (response.status === 401) {
          // User not authenticated, clear notifications silently
          setNotifications([])
          setUnreadCount(0)
          setError('')
          return
        }
        throw new Error(`Failed to load notifications: ${response.status}`)
      }

      const data = await response.json()
      const notificationsList = data.data?.notifications || []
      
      setNotifications(notificationsList)
      
      // Calculate unread count
      const unread = notificationsList.filter(notif => !notif.is_read).length
      setUnreadCount(unread)
      
      setLastFetchTime(new Date())
      setError('') // Clear any previous errors
      
    } catch (error) {
      console.error('Error loading notifications:', error)
      // Only set error if it's not an auth issue
      if (!error.message.includes('401')) {
        setError('Failed to load notifications')
      }
    } finally {
      if (showLoading) setIsLoading(false)
    }
  }, [API_URL])

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId) => {
    try {
      const response = await fetch(`${API_URL}/api/notifications/read/${notificationId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to mark notification as read: ${response.status}`)
      }

      // Update local state
      setNotifications(prev => prev.map(notif => 
        notif.id === notificationId 
          ? { ...notif, is_read: true }
          : notif
      ))

      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1))

    } catch (error) {
      console.error('Error marking notification as read:', error)
      setError('Failed to mark notification as read')
      throw error
    }
  }, [API_URL])

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/notifications/read-all`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to mark all notifications as read: ${response.status}`)
      }

      // Update local state
      setNotifications(prev => prev.map(notif => ({ ...notif, is_read: true })))
      setUnreadCount(0)

    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      setError('Failed to mark all notifications as read')
      throw error
    }
  }, [API_URL])

  // Delete notification
  const deleteNotification = useCallback(async (notificationId) => {
    try {
      const response = await fetch(`${API_URL}/api/notifications/delete/${notificationId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to delete notification: ${response.status}`)
      }

      // Update local state
      const deletedNotification = notifications.find(notif => notif.id === notificationId)
      setNotifications(prev => prev.filter(notif => notif.id !== notificationId))
      
      // Update unread count if the deleted notification was unread
      if (deletedNotification && !deletedNotification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }

    } catch (error) {
      console.error('Error deleting notification:', error)
      setError('Failed to delete notification')
      throw error
    }
  }, [API_URL, notifications])

  // Add new notification (for real-time updates)
  const addNotification = useCallback((newNotification) => {
    setNotifications(prev => {
      // Check if notification already exists
      const exists = prev.some(notif => notif.id === newNotification.id)
      if (exists) return prev

      // Add new notification to the beginning
      const updated = [newNotification, ...prev]
      
      // Limit to latest 100 notifications to prevent memory issues
      return updated.slice(0, 100)
    })

    // Update unread count if the new notification is unread
    if (!newNotification.is_read) {
      setUnreadCount(prev => prev + 1)
    }

    // Show browser notification if supported and user has given permission
    if ('Notification' in window && Notification.permission === 'granted') {
      const title = 'New Notification'
      const body = getNotificationMessage(newNotification)
      
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: `notification-${newNotification.id}`,
        requireInteraction: false
      })
    }
  }, [])

  // Update notification (for real-time updates)
  const updateNotification = useCallback((updatedNotification) => {
    setNotifications(prev => prev.map(notif => 
      notif.id === updatedNotification.id 
        ? { ...notif, ...updatedNotification }
        : notif
    ))
  }, [])

  // Get notification message for browser notifications
  const getNotificationMessage = (notification) => {
    const actorName = notification.actor_name || 'Someone'
    
    switch (notification.type) {
      case 'follow_request':
        return `${actorName} sent you a follow request`
      case 'follow_accepted':
        return `${actorName} accepted your follow request`
      case 'post_like':
        return `${actorName} liked your post`
      case 'post_comment':
        return `${actorName} commented on your post`
      case 'group_invite':
        return `${actorName} invited you to join a group`
      case 'group_request_accepted':
        return 'Your request to join the group was accepted'
      case 'event_invite':
        return `${actorName} invited you to an event`
      default:
        return notification.content || 'New notification'
    }
  }

  // WebSocket connection for real-time notifications
  const connectWebSocket = useCallback(() => {
    // Prevent multiple connections
    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) {
      return
    }

    try {
      const ws = new WebSocket(WS_URL)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('Notification WebSocket connected')
        retryCount.current = 0 // Reset retry count on successful connection
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          
          // Handle notification-related WebSocket messages
          switch (data.type) {
            case 'notification':
              if (data.data) {
                addNotification(data.data)
              }
              break
              
            case 'notification_read':
              if (data.notification_id) {
                setNotifications(prev => prev.map(notif => 
                  notif.id === data.notification_id 
                    ? { ...notif, is_read: true }
                    : notif
                ))
                setUnreadCount(prev => Math.max(0, prev - 1))
              }
              break
              
            case 'notification_deleted':
              if (data.notification_id) {
                setNotifications(prev => prev.filter(notif => notif.id !== data.notification_id))
                setUnreadCount(prev => Math.max(0, prev - 1))
              }
              break
              
            default:
              // Ignore other message types
              break
          }
        } catch (error) {
          console.error('Error parsing notification WebSocket message:', error)
        }
      }

      ws.onclose = (event) => {
        wsRef.current = null
        
        // Only attempt to reconnect for certain close codes and not too frequently
        if (event.code !== 1000 && event.code !== 1001) {
          // Use exponential backoff for reconnection with max retry limit
          if (retryCount.current < 3) {
            const retryDelay = Math.min(30000, 5000 * Math.pow(1.5, retryCount.current))
            retryCount.current = retryCount.current + 1
            
            console.log(`WebSocket disconnected (${event.code}). Retrying in ${retryDelay}ms... (${retryCount.current}/3)`)
            setTimeout(() => {
              connectWebSocket()
            }, retryDelay)
          } else {
            console.log('Max WebSocket retry attempts reached. Using polling fallback only.')
          }
        }
      }

      ws.onerror = (error) => {
        // Reduce error logging frequency
        if (retryCount.current < 2) {
          console.warn('WebSocket connection failed. Falling back to polling.')
        }
      }

    } catch (error) {
      console.error('Failed to connect notification WebSocket:', error)
    }
  }, [WS_URL, addNotification])

  // Request browser notification permission
  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission()
      return permission === 'granted'
    }
    return Notification.permission === 'granted'
  }, [])

  // Periodic polling as fallback
  useEffect(() => {
    const startPolling = () => {
      fetchTimeoutRef.current = setTimeout(() => {
        loadNotifications(false) // Don't show loading for background refresh
        startPolling()
      }, FETCH_INTERVAL)
    }

    startPolling()

    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current)
      }
    }
  }, [loadNotifications, FETCH_INTERVAL])

  // Initialize
  useEffect(() => {
    loadNotifications()
    
    // Delay WebSocket connection to avoid React Strict Mode double-mounting issues
    const wsTimeout = setTimeout(() => {
      connectWebSocket()
    }, 100)
    
    requestNotificationPermission()

    return () => {
      clearTimeout(wsTimeout)
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close(1000, 'Component unmounting')
      }
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current)
      }
    }
  }, [loadNotifications, connectWebSocket, requestNotificationPermission])

  // Navigate to notification content
  const navigateToNotification = useCallback(async (notification) => {
    // Mark as read if unread
    if (!notification.is_read) {
      try {
        await markAsRead(notification.id)
      } catch (error) {
        // Continue navigation even if mark as read fails
        console.error('Failed to mark notification as read:', error)
      }
    }

    // Navigate based on notification type
    switch (notification.type) {
      case 'follow_request':
        router.push('/profile?tab=requests')
        break
      case 'follow_accepted':
        if (notification.actor_id) {
          router.push(`/profile/${notification.actor_id}`)
        }
        break
      case 'post_like':
      case 'post_comment':
        if (notification.reference_id) {
          router.push(`/feed?post=${notification.reference_id}`)
        }
        break
      case 'group_invite':
      case 'group_request_accepted':
        if (notification.reference_id) {
          router.push(`/groups/${notification.reference_id}`)
        }
        break
      case 'event_invite':
        if (notification.reference_id) {
          router.push(`/events/${notification.reference_id}`)
        }
        break
      default:
        break
    }
  }, [markAsRead, router])

  const value = {
    // State
    notifications,
    unreadCount,
    isLoading,
    error,
    lastFetchTime,
    
    // Actions
    loadNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    addNotification,
    updateNotification,
    navigateToNotification,
    requestNotificationPermission,
    
    // WebSocket
    connectWebSocket,
    isWebSocketConnected: wsRef.current?.readyState === WebSocket.OPEN
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

export default NotificationProvider