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

  const handleFollowRequestAction = async (action) => {
    if (isHandling) return

    try {
      setIsHandling(true)
      
      const followId = notification.related_id
      if (!followId) {
        throw new Error('Invalid follow request data')
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/follow/handle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          follow_id: followId,
          action: action
        })
      })

      if (response.ok) {
        // Mark notification as read after handling
        if (!notification.is_read) {
          await markAsRead(notification.id)
        }
      } else {
        throw new Error('Failed to handle follow request')
      }
    } catch (error) {
      console.error('Error handling follow request:', error)
      alert('Failed to handle follow request. Please try again.')
    } finally {
      setIsHandling(false)
    }
  }

  const renderActions = () => {
    if (notification.is_read) return null

    // Handle follow requests
    if (notification.type === 'follow_request') {
      return (
        <div className={styles.notificationActions}>
          <button
            className={`${styles.actionButton} ${styles.acceptButton}`}
            onClick={(e) => {
              e.stopPropagation()
              handleFollowRequestAction('accept')
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
              handleFollowRequestAction('decline')
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

    // Handle group invitations and requests
    if (notification.type === 'group_invitation' || notification.type === 'group_request') {
      const isInvitation = notification.type === 'group_invitation'
      
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
                {isInvitation ? 'Accept' : 'Approve'}
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
                {isInvitation ? 'Decline' : 'Reject'}
              </>
            )}
          </button>
        </div>
      )
    }

    return null
  }

  return (
    <div
      className={`${styles.notificationItem} ${!notification.is_read ? styles.unread : ''}`}
      onClick={handleClick}
    >
      {renderNotificationContent()}
      {renderActions()}
    </div>
  )
}
