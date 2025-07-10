'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useWebSocket } from '../../contexts/WebSocketContext'
import { useGroupChatNotifications } from '../../contexts/GroupChatNotificationContext'
import styles from './Sidebar.module.css'

export default function Sidebar({ currentPage, isOpen, onClose }) {
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const { user, logout } = useAuth()
  const { getTotalPrivateUnreadCount } = useWebSocket()
  const { totalUnreadCount: groupUnreadCount } = useGroupChatNotifications()

  const privateUnreadCount = getTotalPrivateUnreadCount ? getTotalPrivateUnreadCount() : 0
  const totalUnreadCount = privateUnreadCount + groupUnreadCount

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)
      await logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setIsLoggingOut(false)
    }
  }

  const sidebarClass = `${styles.sidebar} ${isOpen ? styles.mobileOpen : ''}`

  return (
    <aside className={sidebarClass}>
      <div className={styles.sidebarSection}>
        <div className={styles.sidebarTitle}>Navigation</div>
        <Link 
          href="/feed" 
          className={`${styles.sidebarItem} ${currentPage === 'feed' ? styles.active : ''}`}
        >
          <i className="fas fa-home"></i>
          News Feed
        </Link>
        <Link 
          href={user ? `/profile/${user.id}` : "/profile"} 
          className={`${styles.sidebarItem} ${currentPage === 'profile' ? styles.active : ''}`}
        >
          <i className="fas fa-user"></i>
          My Profile
        </Link>
        <Link 
          href="/groups" 
          className={`${styles.sidebarItem} ${currentPage === 'groups' ? styles.active : ''}`}
        >
          <i className="fas fa-users"></i>
          Groups
        </Link>
        <Link 
          href="/events" 
          className={`${styles.sidebarItem} ${currentPage === 'events' ? styles.active : ''}`}
        >
          <i className="fas fa-calendar"></i>
          Events
        </Link>
      </div>
      
      <div className={styles.sidebarSection}>
        <div className={styles.sidebarTitle}>Messages</div>
        <Link 
          href="/chat" 
          className={`${styles.sidebarItem} ${currentPage === 'chat' ? styles.active : ''}`}
        >
          <i className="fas fa-comments"></i>
          Messages
          {totalUnreadCount > 0 && (
            <span className={styles.badge}>{totalUnreadCount}</span>
          )}
        </Link>
      </div>
      
      <div className={styles.sidebarSection}>
        <div className={styles.sidebarTitle}>More</div>
        <Link 
          href="/settings" 
          className={`${styles.sidebarItem} ${currentPage === 'settings' ? styles.active : ''}`}
        >
          <i className="fas fa-cog"></i>
          Settings
        </Link>
        <a href="#" className={styles.sidebarItem}>
          <i className="fas fa-question-circle"></i>
          Help
        </a>
        <button 
          className={styles.sidebarItem} 
          onClick={handleLogout}
          disabled={isLoggingOut}
        >
          <i className="fas fa-sign-out-alt"></i>
          {isLoggingOut ? 'Logging out...' : 'Logout'}
        </button>
      </div>
    </aside>
  )
}
