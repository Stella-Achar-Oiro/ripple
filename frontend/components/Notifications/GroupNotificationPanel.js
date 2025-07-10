'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useGroupChatNotifications } from '../../contexts/GroupChatNotificationContext'
import GroupNotificationItem from './GroupNotificationItem'
import styles from './GroupNotificationPanel.module.css'

export default function GroupNotificationPanel({ isVisible, onClose }) {
  const router = useRouter()
  const { 
    getAllGroupNotifications, 
    totalUnreadCount, 
    clearAllGroupNotifications,
    markGroupAsRead 
  } = useGroupChatNotifications()

  const groupNotifications = getAllGroupNotifications()

  if (!isVisible) return null

  const handleMarkAllAsRead = () => {
    if (totalUnreadCount > 0) {
      clearAllGroupNotifications()
    }
  }

  const handleGroupClick = (groupId) => {
    markGroupAsRead(groupId)
    router.push(`/groups/${groupId}`)
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div className={styles.backdrop} onClick={onClose} />
      
      {/* Panel */}
      <div className={styles.groupNotificationPanel}>
        <div className={styles.panelHeader}>
          <div className={styles.headerTitle}>
            <i className="fas fa-users"></i>
            <h3>Group Messages</h3>
          </div>
          <div className={styles.headerActions}>
            {totalUnreadCount > 0 && (
              <button 
                className={styles.markAllButton}
                onClick={handleMarkAllAsRead}
              >
                Mark all as read
              </button>
            )}
            <button className={styles.closeButton} onClick={onClose}>
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>

        <div className={styles.panelContent}>
          {groupNotifications.length === 0 ? (
            <div className={styles.emptyState}>
              <i className="fas fa-comments-slash"></i>
              <span>No group messages yet</span>
            </div>
          ) : (
            <div className={styles.notificationList}>
              {groupNotifications.map(notification => (
                <GroupNotificationItem 
                  key={notification.groupId} 
                  notification={notification}
                  onClick={() => handleGroupClick(notification.groupId)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
