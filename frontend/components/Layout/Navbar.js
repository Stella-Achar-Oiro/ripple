'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../contexts/AuthContext'
import { useNotifications } from '../../contexts/NotificationContext'
import { useWebSocket } from '../../contexts/WebSocketContext'
import NotificationPanel from '../Notifications/NotificationPanel'
import Avatar from '../shared/Avatar'
import styles from './Navbar.module.css'

export default function Navbar() {
  const [searchQuery, setSearchQuery] = useState('')
  const [showNotifications, setShowNotifications] = useState(false)
  const router = useRouter()
  const { user } = useAuth()
  const { unreadCount } = useNotifications()
  const { isConnected, getTotalUnreadCount } = useWebSocket()

  // Calculate total unread message count
  const messageUnreadCount = getTotalUnreadCount ? getTotalUnreadCount() : 0

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  const handleLogout = () => {
    // Handle logout
    router.push('/')
  }

  return (
    <nav className={styles.navbar}>
      <div className={styles.navContainer}>
        <Link href="/feed" className={styles.navBrand}>
          Ripple
        </Link>
        
        <form className={styles.navSearch} onSubmit={handleSearch}>
          <input 
            type="text" 
            placeholder="Search Ripple..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <i className="fas fa-search"></i>
        </form>
        
        <div className={styles.navActions}>
          <Link href="/feed" className={styles.navIcon}>
            <i className="fas fa-home"></i>
          </Link>
          <Link href="/groups" className={styles.navIcon}>
            <i className="fas fa-users"></i>
          </Link>
          <Link href="/chat" className={`${styles.navIcon} ${styles.chatIcon}`}>
            <i className="fas fa-comments"></i>
            {!isConnected && (
              <i className={`fas fa-exclamation-triangle ${styles.connectionWarning}`} title="Chat offline"></i>
            )}
            {messageUnreadCount > 0 && (
              <span className="notification-badge">{messageUnreadCount}</span>
            )}
          </Link>
          <div
            className={styles.navIcon}
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <i className="fas fa-bell"></i>
            {unreadCount > 0 && (
              <span className="notification-badge">{unreadCount}</span>
            )}
          </div>
          <Link 
            href={user ? `/profile/${user.id}` : '/profile'} 
            className={styles.profileAvatar}
            title="My Profile"
          >
            <Avatar user={user} size="medium" showFallback={false} />
          </Link>
        </div>
      </div>
      
      <NotificationPanel
        isVisible={showNotifications}
        onClose={() => setShowNotifications(false)}
      />
    </nav>
  )
}
