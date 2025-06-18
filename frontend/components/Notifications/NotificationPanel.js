'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import styles from './NotificationPanel.module.css'

const NotificationPanel = ({ 
  isOpen, 
  onClose, 
  notifications = [],
  unreadCount = 0,
  onMarkAsRead,
  onMarkAllAsRead,
  onDeleteNotification,
  loading = false 
}) => {
  const router = useRouter()
  const panelRef = useRef(null)
  const [loadingStates, setLoadingStates] = useState({})

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  // Handle notification click - navigate to relevant content
  const handleNotificationClick = async (notification) => {
    // Mark as read if unread
    if (!notification.is_read) {
      setLoadingStates(prev => ({ ...prev, [notification.id]: true }))
      await onMarkAsRead(notification.id)
      setLoadingStates(prev => ({ ...prev, [notification.id]: false }))
    }

    // Navigate based on notification type
    switch (notification.type) {
      case 'follow_request':
        router.push('/profile')
        break
      case 'follow_accepted':
        router.push(`/profile/${notification.actor_id}`)
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

    onClose()
  }

  // Handle mark as read
  const handleMarkAsRead = async (e, notificationId) => {
    e.stopPropagation()
    setLoadingStates(prev => ({ ...prev, [notificationId]: true }))
    await onMarkAsRead(notificationId)
    setLoadingStates(prev => ({ ...prev, [notificationId]: false }))
  }

  // Handle delete notification
  const handleDeleteNotification = async (e, notificationId) => {
    e.stopPropagation()
    setLoadingStates(prev => ({ ...prev, [notificationId]: true }))
    await onDeleteNotification(notificationId)
    setLoadingStates(prev => ({ ...prev, [notificationId]: false }))
  }

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
      case 'follow_accepted':
        return '👤'
      case 'post_like':
        return '❤️'
      case 'post_comment':
        return '💬'
      case 'group_invite':
      case 'group_request_accepted':
        return '👥'
      case 'event_invite':
        return '📅'
      default:
        return '🔔'
    }
  }

  // Get notification message based on type
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
        return `Your request to join the group was accepted`
      case 'event_invite':
        return `${actorName} invited you to an event`
      default:
        return notification.content || 'New notification'
    }
  }

  if (!isOpen) return null

  return (
    <div className={styles.overlay}>
      <div className={styles.panel} ref={panelRef}>
        {/* Header */}
        <div className={styles.header}>
          <h3 className={styles.title}>
            Notifications
            {unreadCount > 0 && (
              <span className={styles.unreadBadge}>{unreadCount}</span>
            )}
          </h3>
          <div className={styles.headerActions}>
            {unreadCount > 0 && (
              <button
                className={styles.markAllReadBtn}
                onClick={onMarkAllAsRead}
                disabled={loading}
              >
                Mark all read
              </button>
            )}
            <button
              className={styles.closeBtn}
              onClick={onClose}
              aria-label="Close notifications"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {loading && notifications.length === 0 ? (
            <div className={styles.loading}>
              <div className={styles.loadingSpinner}></div>
              <p>Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>🔔</div>
              <h4>No notifications yet</h4>
              <p>You'll see notifications for likes, comments, follows, and more here.</p>
            </div>
          ) : (
            <div className={styles.notificationsList}>
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`${styles.notificationItem} ${
                    !notification.is_read ? styles.unread : ''
                  } ${loadingStates[notification.id] ? styles.loading : ''}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className={styles.notificationIcon}>
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  <div className={styles.notificationContent}>
                    <div className={styles.notificationMessage}>
                      {getNotificationMessage(notification)}
                    </div>
                    <div className={styles.notificationTime}>
                      {formatTimeAgo(notification.created_at)}
                    </div>
                  </div>

                  <div className={styles.notificationActions}>
                    {!notification.is_read && (
                      <button
                        className={styles.markReadBtn}
                        onClick={(e) => handleMarkAsRead(e, notification.id)}
                        disabled={loadingStates[notification.id]}
                        title="Mark as read"
                      >
                        <div className={styles.unreadDot}></div>
                      </button>
                    )}
                    
                    <button
                      className={styles.deleteBtn}
                      onClick={(e) => handleDeleteNotification(e, notification.id)}
                      disabled={loadingStates[notification.id]}
                      title="Delete notification"
                    >
                      🗑️
                    </button>
                  </div>

                  {loadingStates[notification.id] && (
                    <div className={styles.itemLoading}>
                      <div className={styles.loadingSpinner}></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className={styles.footer}>
            <button
              className={styles.viewAllBtn}
              onClick={() => {
                router.push('/notifications')
                onClose()
              }}
            >
              View all notifications
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default NotificationPanel