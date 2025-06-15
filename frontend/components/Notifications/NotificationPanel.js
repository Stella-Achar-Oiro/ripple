'use client'

import { useNotifications } from '../../contexts/NotificationContext'
import NotificationItem from './NotificationItem'
import styles from './NotificationPanel.module.css'

export default function NotificationPanel({ isVisible, onClose }) {
  const { notifications, unreadCount, loading, markAllAsRead } = useNotifications()

  if (!isVisible) return null

  const handleMarkAllAsRead = async () => {
    if (unreadCount > 0) {
      await markAllAsRead()
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div className={styles.backdrop} onClick={onClose} />
      
      {/* Panel */}
      <div className={styles.notificationPanel}>
        <div className={styles.panelHeader}>
          <h3>Notifications</h3>
          <div className={styles.headerActions}>
            {unreadCount > 0 && (
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
          {loading ? (
            <div className={styles.loadingState}>
              <i className="fas fa-spinner fa-spin"></i>
              <span>Loading notifications...</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className={styles.emptyState}>
              <i className="fas fa-bell-slash"></i>
              <span>No notifications yet</span>
            </div>
          ) : (
            <div className={styles.notificationList}>
              {notifications.map(notification => (
                <NotificationItem 
                  key={notification.id} 
                  notification={notification} 
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
