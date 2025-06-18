'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../contexts/AuthContext'
import { useNotifications } from '../../contexts/NotificationContext'
import SearchBar from '../Search/SearchBar'
import NotificationPanel from '../Notifications/NotificationPanel'
import styles from './Navbar.module.css'

export default function Navbar() {
  const [showNotifications, setShowNotifications] = useState(false)
  const router = useRouter()
  const { user } = useAuth()
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification
  } = useNotifications()

  const handleLogout = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      })
      
      if (response.ok) {
        router.push('/')
      }
    } catch (error) {
      console.error('Logout error:', error)
      router.push('/')
    }
  }

  // Close notifications panel when clicking elsewhere
  useEffect(() => {
    const handleClickOutside = (event) => {
      // The NotificationPanel component handles its own click outside logic
      // This is just a backup in case the panel is not rendered
      if (showNotifications && !event.target.closest('.notification-panel')) {
        setShowNotifications(false)
      }
    }

    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showNotifications])


  return (
    <nav className={styles.navbar}>
      <div className={styles.navContainer}>
        <Link href="/feed" className={styles.navBrand}>
          Ripple
        </Link>
        
        <SearchBar />
        
        <div className={styles.navActions}>
          <Link href="/feed" className={styles.navIcon}>
            <i className="fas fa-home"></i>
          </Link>
          <Link href="/groups" className={styles.navIcon}>
            <i className="fas fa-users"></i>
          </Link>
          <Link href="/events" className={styles.navIcon}>
            <i className="fas fa-calendar-alt"></i>
          </Link>
          <Link href="/chat" className={styles.navIcon}>
            <i className="fas fa-comments"></i>
            {/* Chat badge - could be integrated with chat unread count later */}
          </Link>
          
          {/* Notification Bell */}
          <div 
            className={`${styles.navIcon} ${showNotifications ? styles.active : ''}`}
            onClick={() => setShowNotifications(!showNotifications)}
            title="Notifications"
          >
            <i className="fas fa-bell"></i>
            {unreadCount > 0 && (
              <span className={styles.notificationBadge}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
          
          {/* Profile Avatar */}
          <div className={styles.profileContainer}>
            <div 
              className={styles.profileAvatar} 
              onClick={handleLogout}
              title="Logout"
            >
              {user?.profile_picture ? (
                <img 
                  src={user.profile_picture} 
                  alt={user.first_name || 'Profile'} 
                  className={styles.profileImage}
                />
              ) : (
                <i className="fas fa-user"></i>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Notification Panel */}
      <NotificationPanel
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        notifications={notifications}
        unreadCount={unreadCount}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
        onDeleteNotification={deleteNotification}
        loading={isLoading}
      />
    </nav>
  )
}
