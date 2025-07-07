'use client'

import styles from './MessageStatus.module.css'

export default function MessageStatus({ message, isOwnMessage, isLastMessage }) {
  if (!isOwnMessage) return null

  const getStatusIcon = () => {
    if (message.read_at) {
      return <i className={`fas fa-check-double ${styles.read}`} title="Read"></i>
    } else if (message.delivered_at || message.created_at) {
      return <i className={`fas fa-check ${styles.delivered}`} title="Delivered"></i>
    } else {
      return <i className={`fas fa-clock ${styles.sending}`} title="Sending..."></i>
    }
  }

  const getStatusText = () => {
    if (message.read_at) {
      return 'Read'
    } else if (message.delivered_at || message.created_at) {
      return 'Delivered'
    } else {
      return 'Sending...'
    }
  }

  return (
    <div className={styles.messageStatus}>
      {getStatusIcon()}
      {isLastMessage && (
        <span className={styles.statusText}>
          {getStatusText()}
        </span>
      )}
    </div>
  )
}
