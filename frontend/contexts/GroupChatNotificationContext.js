'use client'

import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { useAuth } from './AuthContext'

const GroupChatNotificationContext = createContext()

export function useGroupChatNotifications() {
  const context = useContext(GroupChatNotificationContext)
  if (!context) {
    throw new Error('useGroupChatNotifications must be used within a GroupChatNotificationProvider')
  }
  return context
}

export function GroupChatNotificationProvider({ children }) {
  const { user } = useAuth()
  
  // State for group chat notifications
  const [groupNotifications, setGroupNotifications] = useState(new Map()) // groupId -> notification data
  const [totalUnreadCount, setTotalUnreadCount] = useState(0)
  const [groupInfo, setGroupInfo] = useState(new Map()) // groupId -> group info cache
  
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

  // Add or update group notification
  const addGroupNotification = useCallback((groupId, message, senderInfo) => {
    if (!user || message.sender_id === user.id) return // Don't notify for own messages

    setGroupNotifications(prev => {
      const updated = new Map(prev)
      const existing = updated.get(groupId) || {
        groupId,
        unreadCount: 0,
        lastMessage: null,
        lastSender: null,
        lastTimestamp: null,
        messages: []
      }

      const newNotification = {
        ...existing,
        unreadCount: existing.unreadCount + 1,
        lastMessage: message.content,
        lastSender: senderInfo,
        lastTimestamp: message.created_at || message.timestamp || new Date().toISOString(),
        messages: [...existing.messages, { ...message, senderInfo }].slice(-5) // Keep last 5 messages
      }

      updated.set(groupId, newNotification)
      return updated
    })

    // Update total unread count
    setTotalUnreadCount(prev => prev + 1)
  }, [user])

  // Clear notifications for a specific group
  const clearGroupNotifications = useCallback((groupId) => {
    setGroupNotifications(prev => {
      const updated = new Map(prev)
      const existing = updated.get(groupId)
      if (existing && existing.unreadCount > 0) {
        setTotalUnreadCount(prevTotal => Math.max(0, prevTotal - existing.unreadCount))
        updated.delete(groupId)
      }
      return updated
    })
  }, [])

  // Get notifications for a specific group
  const getGroupNotification = useCallback((groupId) => {
    return groupNotifications.get(groupId) || null
  }, [groupNotifications])

  // Get all group notifications as array
  const getAllGroupNotifications = useCallback(() => {
    return Array.from(groupNotifications.values()).sort((a, b) => 
      new Date(b.lastTimestamp) - new Date(a.lastTimestamp)
    )
  }, [groupNotifications])

  // Fetch group information
  const fetchGroupInfo = useCallback(async (groupId) => {
    if (groupInfo.has(groupId)) {
      return groupInfo.get(groupId)
    }

    try {
      const response = await fetch(`${API_URL}/api/groups/${groupId}`, {
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        const info = {
          id: data.data.id,
          title: data.data.title,
          description: data.data.description,
          avatar_path: data.data.avatar_path
        }
        
        setGroupInfo(prev => new Map(prev).set(groupId, info))
        return info
      }
    } catch (err) {
      console.error('Error fetching group info:', err)
    }
    
    return { id: groupId, title: `Group ${groupId}`, description: '', avatar_path: null }
  }, [API_URL, groupInfo])

  // Get group info from cache or fetch
  const getGroupInfo = useCallback((groupId) => {
    return groupInfo.get(groupId) || null
  }, [groupInfo])

  // Mark group as read (when user opens group chat)
  const markGroupAsRead = useCallback((groupId) => {
    clearGroupNotifications(groupId)
  }, [clearGroupNotifications])

  // Clear all group notifications
  const clearAllGroupNotifications = useCallback(() => {
    setGroupNotifications(new Map())
    setTotalUnreadCount(0)
  }, [])

  // Format notification time
  const formatNotificationTime = useCallback((timestamp) => {
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
  }, [])

  const value = {
    // State
    groupNotifications,
    totalUnreadCount,
    
    // Actions
    addGroupNotification,
    clearGroupNotifications,
    markGroupAsRead,
    clearAllGroupNotifications,
    
    // Getters
    getGroupNotification,
    getAllGroupNotifications,
    getGroupInfo,
    fetchGroupInfo,
    
    // Utilities
    formatNotificationTime
  }

  return (
    <GroupChatNotificationContext.Provider value={value}>
      {children}
    </GroupChatNotificationContext.Provider>
  )
}
