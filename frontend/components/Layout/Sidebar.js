'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import styles from './Sidebar.module.css'

export default function Sidebar({ currentPage, isOpen, onClose }) {
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)
      
      const response = await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      })
      
      if (!response.ok) {
        const data = await response.json()
        console.error('Logout failed:', data.message || 'Unknown error')
      }
      
      // Redirect to login page regardless of response
      // This ensures the user is logged out on the frontend even if the backend request fails
      router.push('/')
    } catch (error) {
      console.error('Logout error:', error)
      // Still redirect to login page on error
      router.push('/')
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
          href="/profile" 
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
          <span className={styles.badge}>3</span>
        </Link>
        <a href="#" className={styles.sidebarItem}>
          <i className="fas fa-video"></i>
          Video Calls
        </a>
      </div>
      
      <div className={styles.sidebarSection}>
        <div className={styles.sidebarTitle}>More</div>
        <a href="#" className={styles.sidebarItem}>
          <i className="fas fa-cog"></i>
          Settings
        </a>
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
