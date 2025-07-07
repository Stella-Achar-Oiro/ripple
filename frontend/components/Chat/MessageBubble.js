'use client'

import { useState } from 'react'
import Avatar from '../shared/Avatar'
import MessageStatus from './MessageStatus'
import styles from './MessageBubble.module.css'

export default function MessageBubble({ 
  message, 
  isOwnMessage, 
  showAvatar, 
  isLastMessage,
  isGroup 
}) {
  const [showTime, setShowTime] = useState(false)

  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = (now - date) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (diffInHours < 24 * 7) {
      return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })
    } else {
      return date.toLocaleDateString([], { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    }
  }

  const handleMessageClick = () => {
    setShowTime(!showTime)
  }

  return (
    <div className={`${styles.messageContainer} ${isOwnMessage ? styles.own : styles.other}`}>
      {!isOwnMessage && showAvatar && (
        <div className={styles.messageAvatar}>
          <Avatar user={message.sender} size="small" />
        </div>
      )}
      
      <div className={styles.messageContent}>
        {!isOwnMessage && isGroup && showAvatar && (
          <div className={styles.senderName}>
            {message.sender?.first_name} {message.sender?.last_name}
          </div>
        )}
        
        <div 
          className={`${styles.messageBubble} ${isOwnMessage ? styles.ownBubble : styles.otherBubble}`}
          onClick={handleMessageClick}
        >
          <div className={styles.messageText}>
            {message.content}
          </div>
          
          {showTime && (
            <div className={styles.messageTime}>
              {formatTime(message.created_at)}
            </div>
          )}
        </div>
        
        {isOwnMessage && (
          <MessageStatus 
            message={message} 
            isOwnMessage={isOwnMessage}
            isLastMessage={isLastMessage}
          />
        )}
      </div>
    </div>
  )
}
