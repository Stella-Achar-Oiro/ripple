'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from './AuthContext'

const NotificationContext = createContext()

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

  // Fetch notifications from API
  const fetchNotifications = async () => {
    if (!user) return

    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/api/notifications`, {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setNotifications(data.data?.notifications || [])
        setUnreadCount(data.data?.unread_count || 0)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      const response = await fetch(`${API_URL}/api/notifications/read/${notificationId}`, {
        method: 'PUT',
        credentials: 'include'
      })

      if (response.ok) {
        setNotifications(prev => 
          prev.map(notif => 
            notif.id === notificationId 
              ? { ...notif, is_read: true }
              : notif
          )
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      const response = await fetch(`${API_URL}/api/notifications/read-all`, {
        method: 'PUT',
        credentials: 'include'
      })

      if (response.ok) {
        setNotifications(prev => 
          prev.map(notif => ({ ...notif, is_read: true }))
        )
        setUnreadCount(0)
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }

  // Handle group invitation/join request response
  const handleGroupInvitation = async (membershipId, action) => {
    try {
      const response = await fetch(`${API_URL}/api/groups/handle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          membership_id: membershipId,
          action: action
        })
      })

      if (response.ok) {
        // Refresh notifications after handling invitation/request
        await fetchNotifications()
        return true
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Failed to handle request')
      }
    } catch (error) {
      console.error('Error handling group request:', error)
      throw error
    }
  }

  // Add new notification (for real-time updates)
  const addNotification = (notification) => {
    setNotifications(prev => [notification, ...prev])
    if (!notification.is_read) {
      setUnreadCount(prev => prev + 1)
    }
  }

  // Format notification time
  const formatNotificationTime = (timestamp) => {
    const now = new Date()
    const notifTime = new Date(timestamp)
    const diffInMinutes = Math.floor((now - notifTime) / (1000 * 60))

    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours}h ago`
    
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays}d ago`
    
    return notifTime.toLocaleDateString()
  }

  // Get notification icon based on type
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'group_invitation':
        return 'fas fa-users'
      case 'group_request':
        return 'fas fa-user-plus'
      case 'follow_request':
        return 'fas fa-user-plus'
      case 'event_created':
        return 'fas fa-calendar'
      case 'group_post_created':
        return 'fas fa-edit'
      case 'event_reminder':
        return 'fas fa-bell'
      default:
        return 'fas fa-bell'
    }
  }

  // Initialize notifications when user logs in
  useEffect(() => {
    if (user) {
      fetchNotifications()
    } else {
      setNotifications([])
      setUnreadCount(0)
    }
  }, [user])

  const value = {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    handleGroupInvitation,
    addNotification,
    formatNotificationTime,
    getNotificationIcon
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}
