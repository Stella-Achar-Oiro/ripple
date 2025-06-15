'use client'

import { useState } from 'react'
import { useNotifications } from '../../contexts/NotificationContext'
import styles from './NotificationItem.module.css'

export default function NotificationItem({ notification }) {
  const [isHandling, setIsHandling] = useState(false)
  const { markAsRead, handleGroupInvitation, formatNotificationTime, getNotificationIcon } = useNotifications()

  const handleClick = async () => {
    if (!notification.is_read) {
      await markAsRead(notification.id)
    }
  }

  const handleGroupInvitationAction = async (action) => {
    if (isHandling) return

    try {
      setIsHandling(true)
      
      // Extract membership ID from related_id
      const membershipId = notification.related_id
      if (!membershipId) {
        throw new Error('Invalid invitation data')
      }

      await handleGroupInvitation(membershipId, action)
      
      // Mark notification as read after handling
      if (!notification.is_read) {
        await markAsRead(notification.id)
      }
    } catch (error) {
      console.error('Error handling group invitation:', error)
      alert('Failed to handle invitation. Please try again.')
    } finally {
      setIsHandling(false)
    }
  }

  const renderNotificationContent = () => {
    const iconClass = getNotificationIcon(notification.type)
    
    return (
      <div className={styles.notificationContent}>
        <div className={styles.notificationHeader}>
          <i className={iconClass}></i>
          <span className={styles.notificationTitle}>{notification.title}</span>
        </div>
        <div className={styles.notificationMessage}>
          {notification.message}
        </div>
        <div className={styles.notificationTime}>
          {formatNotificationTime(notification.created_at)}
        </div>
      </div>
    )
  }

  const renderGroupInvitationActions = () => {
    if (notification.type !== 'group_invitation' || notification.is_read) {
      return null
    }

    return (
      <div className={styles.notificationActions}>
        <button
          className={`${styles.actionButton} ${styles.acceptButton}`}
          onClick={(e) => {
            e.stopPropagation()
            handleGroupInvitationAction('accept')
          }}
          disabled={isHandling}
        >
          {isHandling ? (
            <i className="fas fa-spinner fa-spin"></i>
          ) : (
            <>
              <i className="fas fa-check"></i>
              Accept
            </>
          )}
        </button>
        <button
          className={`${styles.actionButton} ${styles.declineButton}`}
          onClick={(e) => {
            e.stopPropagation()
            handleGroupInvitationAction('decline')
          }}
          disabled={isHandling}
        >
          {isHandling ? (
            <i className="fas fa-spinner fa-spin"></i>
          ) : (
            <>
              <i className="fas fa-times"></i>
              Decline
            </>
          )}
        </button>
      </div>
    )
  }

  return (
    <div 
      className={`${styles.notificationItem} ${!notification.is_read ? styles.unread : ''}`}
      onClick={handleClick}
    >
      {renderNotificationContent()}
      {renderGroupInvitationActions()}
    </div>
  )
}
