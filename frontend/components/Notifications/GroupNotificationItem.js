'use client'

import { useState, useEffect } from 'react'
import { useGroupChatNotifications } from '../../contexts/GroupChatNotificationContext'
import styles from './GroupNotificationItem.module.css'

export default function GroupNotificationItem({ notification, onClick }) {
  const { getGroupInfo, fetchGroupInfo, formatNotificationTime } = useGroupChatNotifications()
  const [groupInfo, setGroupInfo] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

  // Fetch group information
  useEffect(() => {
    const loadGroupInfo = async () => {
      setIsLoading(true)
      
      // Check cache first
      const cached = getGroupInfo(notification.groupId)
      if (cached) {
        setGroupInfo(cached)
        setIsLoading(false)
        return
      }

      // Fetch from API
      const info = await fetchGroupInfo(notification.groupId)
      setGroupInfo(info)
      setIsLoading(false)
    }

    loadGroupInfo()
  }, [notification.groupId, getGroupInfo, fetchGroupInfo])

  const handleClick = () => {
    if (onClick) {
      onClick()
    }
  }

  const getSenderDisplayName = (sender) => {
    if (!sender) return 'Unknown User'
    if (sender.nickname) return sender.nickname
    if (sender.first_name && sender.last_name) {
      return `${sender.first_name} ${sender.last_name}`
    }
    if (sender.first_name) return sender.first_name
    return `User ${sender.id || 'Unknown'}`
  }

  const truncateMessage = (message, maxLength = 50) => {
    if (!message) return ''
    if (message.length <= maxLength) return message
    return message.substring(0, maxLength) + '...'
  }

  if (isLoading) {
    return (
      <div className={styles.notificationItem}>
        <div className={styles.loadingState}>
          <i className="fas fa-spinner fa-spin"></i>
          <span>Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`${styles.notificationItem} ${notification.unreadCount > 0 ? styles.unread : ''}`}
      onClick={handleClick}
    >
      <div className={styles.groupAvatar}>
        {groupInfo?.avatar_path ? (
          <img 
            src={`${API_URL}${groupInfo.avatar_path}`} 
            alt={groupInfo.title}
            className={styles.avatarImage}
          />
        ) : (
          <div className={styles.avatarPlaceholder}>
            <i className="fas fa-users"></i>
          </div>
        )}
        {notification.unreadCount > 0 && (
          <span className={styles.unreadBadge}>
            {notification.unreadCount > 99 ? '99+' : notification.unreadCount}
          </span>
        )}
      </div>

      <div className={styles.notificationContent}>
        <div className={styles.notificationHeader}>
          <span className={styles.groupTitle}>
            {groupInfo?.title || `Group ${notification.groupId}`}
          </span>
          <span className={styles.notificationTime}>
            {formatNotificationTime(notification.lastTimestamp)}
          </span>
        </div>
        
        <div className={styles.lastMessage}>
          <span className={styles.senderName}>
            {getSenderDisplayName(notification.lastSender)}:
          </span>
          <span className={styles.messagePreview}>
            {truncateMessage(notification.lastMessage)}
          </span>
        </div>
      </div>
    </div>
  )
}
