'use client'

import styles from './Avatar.module.css'

export default function Avatar({ 
  user, 
  size = 'medium', 
  showFallback = true,
  className = '',
  ...props 
}) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
  
  const getInitials = (user) => {
    console.log("User object:", user) // debugging line
    if (!user) return 'U'
    const firstName = user.first_name || ''
    const lastName = user.last_name || ''
    const nickname = user.nickname || ''
    const initials = user.initials || ''
    
    if (firstName && lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
    }
    if (nickname) {
      return nickname.charAt(0).toUpperCase()
    }
    if (initials) {
      return initials.toUpperCase()
    }
    return 'U'
  }

  const sizeClass = {
    small: styles.small,
    medium: styles.medium,
    large: styles.large,
    xlarge: styles.xlarge
  }[size] || styles.medium

  if (user?.avatar_path) {
    return (
      <div className={`${styles.avatar} ${sizeClass} ${className}`} {...props}>
        <img
          src={`${API_URL}${user.avatar_path}`}
          alt={user.first_name ? `${user.first_name} ${user.last_name}` : 'User avatar'}
          className={styles.avatarImage}
        />
      </div>
    )
  }

  if (showFallback) {
    return (
      <div className={`${styles.avatar} ${styles.avatarFallback} ${sizeClass} ${className}`} {...props}>
        <span className={styles.avatarInitials}>
          {getInitials(user)}
        </span>
      </div>
    )
  }

  return (
    <div className={`${styles.avatar} ${styles.avatarIcon} ${sizeClass} ${className}`} {...props}>
      <i className="fas fa-user"></i>
    </div>
  )
}