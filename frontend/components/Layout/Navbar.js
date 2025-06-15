'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useNotifications } from '../../contexts/NotificationContext'
import NotificationPanel from '../Notifications/NotificationPanel'
import styles from './Navbar.module.css'

export default function Navbar() {
  const [searchQuery, setSearchQuery] = useState('')
  const [showNotifications, setShowNotifications] = useState(false)
  const router = useRouter()
  const { unreadCount } = useNotifications()

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
            {unreadCount > 0 && (
              <span className="notification-badge">{unreadCount}</span>
            )}
          </div>
          <div className={styles.profileAvatar} onClick={handleLogout}>
            <i className="fas fa-user"></i>
          </div>
        </div>
      </div>
      
      <NotificationPanel
        isVisible={showNotifications}
        onClose={() => setShowNotifications(false)}
      />
    </nav>
  )
}
