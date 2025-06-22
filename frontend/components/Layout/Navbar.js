'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../contexts/AuthContext'
import { useNotifications } from '../../contexts/NotificationContext'
import { useWebSocket } from '../../contexts/WebSocketContext'
import NotificationPanel from '../Notifications/NotificationPanel'
import styles from './Navbar.module.css'

export default function Navbar() {
  const [searchQuery, setSearchQuery] = useState('')
  const [showNotifications, setShowNotifications] = useState(false)
  const router = useRouter()
  const { user } = useAuth()
  const { unreadCount } = useNotifications()
  const { isConnected } = useWebSocket()

  // Calculate total unread message count
  const messageUnreadCount = 0 // This would need to be calculated from all conversations

  const handleSearch = (e) => {
    e.preventDefault()
    // Handle search functionality
    console.log('Searching for:', searchQuery)
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
          <Link href="/chat" className={styles.navIcon}>
            <i className="fas fa-comments"></i>
            <span className="notification-badge">3</span>
          </Link>
          <div 
            className={styles.navIcon}
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <i className="fas fa-bell"></i>
            <span className="notification-badge">5</span>
          </div>
          <Link 
            href={user ? `/profile/${user.id}` : '/profile'} 
            className={styles.profileAvatar}
            title="My Profile"
          >
            {user?.avatar_path ? (
              <img 
                src={`${process.env.NEXT_PUBLIC_API_URL}${user.avatar_path}`}
                alt={`${user.first_name} ${user.last_name}`}
              />
            ) : (
              <i className="fas fa-user"></i>
            )}
          </Link>
        </div>
      </div>
      
      {showNotifications && (
        <div className={styles.notificationPanel}>
          <div className={styles.notificationItem}>
            <div className={styles.notificationContent}>
              Sarah Anderson liked your post
            </div>
            <div className={styles.notificationTime}>2 minutes ago</div>
          </div>
          <div className={styles.notificationItem}>
            <div className={styles.notificationContent}>
              Mike Torres commented on your photo
            </div>
            <div className={styles.notificationTime}>1 hour ago</div>
          </div>
          <div className={styles.notificationItem}>
            <div className={styles.notificationContent}>
              You have a new message from Alex Liu
            </div>
            <div className={styles.notificationTime}>3 hours ago</div>
          </div>
        </div>
      )}
    </nav>
  )
}
