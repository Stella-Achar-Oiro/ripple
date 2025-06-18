'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './NotificationItem.module.css'

const NotificationItem = ({
  notification,
  onMarkAsRead,
  onDelete,
  onClick,
  compact = false,
  showActions = true
}) => {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  // Format time ago
  const formatTimeAgo = (timestamp) => {
    const now = new Date()
    const notificationTime = new Date(timestamp)
    const diffInSeconds = Math.floor((now - notificationTime) / 1000)

    if (diffInSeconds < 60) return 'Just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
    return notificationTime.toLocaleDateString()
  }

  // Get notification icon based on type
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'follow_request':
        return { emoji: '👤', bg: '#3b82f6' }
      case 'follow_accepted':
        return { emoji: '✅', bg: '#10b981' }
      case 'post_like':
        return { emoji: '❤️', bg: '#ef4444' }
      case 'post_comment':
        return { emoji: '💬', bg: '#8b5cf6' }
      case 'group_invite':
        return { emoji: '👥', bg: '#f59e0b' }
      case 'group_request_accepted':
        return { emoji: '🎉', bg: '#10b981' }
      case 'event_invite':
        return { emoji: '📅', bg: '#06b6d4' }
      default:
        return { emoji: '🔔', bg: '#6b7280' }
    }
  }

  // Get notification message based on type
  const getNotificationMessage = (notification) => {
    const actorName = notification.actor_name || 'Someone'
    
    switch (notification.type) {
      case 'follow_request':
        return {
          primary: `${actorName} sent you a follow request`,
          secondary: 'Tap to view their profile and respond'
        }
      case 'follow_accepted':
        return {
          primary: `${actorName} accepted your follow request`,
          secondary: 'You can now see their posts'
        }
      case 'post_like':
        return {
          primary: `${actorName} liked your post`,
          secondary: 'Tap to view the post'
        }
      case 'post_comment':
        return {
          primary: `${actorName} commented on your post`,
          secondary: notification.content ? `"${notification.content}"` : 'Tap to view the comment'
        }
      case 'group_invite':
        return {
          primary: `${actorName} invited you to join a group`,
          secondary: notification.group_name || 'Tap to view the group'
        }
      case 'group_request_accepted':
        return {
          primary: 'Your request to join the group was accepted',
          secondary: notification.group_name || 'You can now participate in the group'
        }
      case 'event_invite':
        return {
          primary: `${actorName} invited you to an event`,
          secondary: notification.event_name || 'Tap to view event details'
        }
      default:
        return {
          primary: notification.content || 'New notification',
          secondary: ''
        }
    }
  }

  // Handle notification click
  const handleClick = async () => {
    if (onClick) {
      onClick(notification)
      return
    }

    // Mark as read if unread
    if (!notification.is_read && onMarkAsRead) {
      setIsLoading(true)
      await onMarkAsRead(notification.id)
      setIsLoading(false)
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
  }

  // Handle mark as read
  const handleMarkAsRead = async (e) => {
    e.stopPropagation()
    if (!onMarkAsRead) return
    
    setIsLoading(true)
    await onMarkAsRead(notification.id)
    setIsLoading(false)
  }

  // Handle delete
  const handleDelete = async (e) => {
    e.stopPropagation()
    if (!onDelete) return
    
    setIsLoading(true)
    await onDelete(notification.id)
    setIsLoading(false)
  }

  const iconData = getNotificationIcon(notification.type)
  const messageData = getNotificationMessage(notification)

  return (
    <div
      className={`${styles.notificationItem} ${
        !notification.is_read ? styles.unread : ''
      } ${compact ? styles.compact : ''} ${
        isLoading ? styles.loading : ''
      }`}
      onClick={handleClick}
    >
      {/* Unread indicator */}
      {!notification.is_read && <div className={styles.unreadIndicator}></div>}

      {/* Notification icon */}
      <div 
        className={styles.iconContainer}
        style={{ backgroundColor: iconData.bg }}
      >
        <span className={styles.icon}>{iconData.emoji}</span>
      </div>

      {/* Content */}
      <div className={styles.content}>
        <div className={styles.message}>
          <span className={styles.primaryMessage}>{messageData.primary}</span>
          {messageData.secondary && !compact && (
            <span className={styles.secondaryMessage}>{messageData.secondary}</span>
          )}
        </div>
        
        <div className={styles.metadata}>
          <span className={styles.timestamp}>{formatTimeAgo(notification.created_at)}</span>
          {notification.group_name && (
            <span className={styles.groupName}>in {notification.group_name}</span>
          )}
        </div>
      </div>

      {/* Actions */}
      {showActions && (
        <div className={styles.actions}>
          {!notification.is_read && onMarkAsRead && (
            <button
              className={styles.markReadBtn}
              onClick={handleMarkAsRead}
              disabled={isLoading}
              title="Mark as read"
            >
              <div className={styles.unreadDot}></div>
            </button>
          )}
          
          {onDelete && (
            <button
              className={styles.deleteBtn}
              onClick={handleDelete}
              disabled={isLoading}
              title="Delete notification"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c0 1 1 2 2H8Z"/>
                <line x1="10" y1="11" x2="10" y2="17"/>
                <line x1="14" y1="11" x2="14" y2="17"/>
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Loading overlay */}
      {isLoading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingSpinner}></div>
        </div>
      )}
    </div>
  )
}

export default NotificationItem