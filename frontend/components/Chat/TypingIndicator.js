'use client'

import styles from './TypingIndicator.module.css'

export default function TypingIndicator({ typingUsers, isGroup }) {
  if (!typingUsers || typingUsers.length === 0) return null

  const getTypingText = () => {
    if (typingUsers.length === 1) {
      const user = typingUsers[0]
      const name = isGroup ? user.name : 'User'
      return `${name} is typing...`
    } else if (typingUsers.length === 2) {
      const names = typingUsers.map(u => isGroup ? u.name : 'User')
      return `${names.join(' and ')} are typing...`
    } else {
      return `${typingUsers.length} people are typing...`
    }
  }

  return (
    <div className={styles.typingIndicator}>
      <div className={styles.typingDots}>
        <span></span>
        <span></span>
        <span></span>
      </div>
      <span className={styles.typingText}>
        {getTypingText()}
      </span>
    </div>
  )
}
