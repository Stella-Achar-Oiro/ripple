'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../contexts/AuthContext'
import { useNotifications } from '../../contexts/NotificationContext'
import { useWebSocket } from '../../contexts/WebSocketContext'
import NotificationPanel from '../Notifications/NotificationPanel'
import SearchDropdown from './SearchDropdown'
import Avatar from '../shared/Avatar'
import styles from './Navbar.module.css'

export default function Navbar() {
  const [searchQuery, setSearchQuery] = useState('')
  const [showNotifications, setShowNotifications] = useState(false)
  const [showSearchDropdown, setShowSearchDropdown] = useState(false)
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const searchInputRef = useRef(null)
  const searchContainerRef = useRef(null)
  const router = useRouter()
  const { user } = useAuth()
  const { unreadCount } = useNotifications()
  const { isConnected, getTotalUnreadCount } = useWebSocket()

  // Calculate total unread message count
  const messageUnreadCount = getTotalUnreadCount ? getTotalUnreadCount() : 0

  // Handle search input changes
  const handleSearchChange = (e) => {
    const value = e.target.value
    setSearchQuery(value)
    setShowSearchDropdown(value.length > 0 && isSearchFocused)
  }

  // Handle search input focus
  const handleSearchFocus = () => {
    setIsSearchFocused(true)
    setShowSearchDropdown(searchQuery.length > 0)
  }

  // Handle search input blur
  const handleSearchBlur = () => {
    // Delay hiding dropdown to allow for clicks
    setTimeout(() => {
      setIsSearchFocused(false)
      setShowSearchDropdown(false)
    }, 200)
  }

  // Handle search form submission
  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
      setShowSearchDropdown(false)
      searchInputRef.current?.blur()
    }
  }

  // Handle user selection from dropdown
  const handleUserSelect = (user) => {
    setSearchQuery('')
    setShowSearchDropdown(false)
    searchInputRef.current?.blur()
    router.push(`/profile/${user.id}`)
  }

  // Handle clicking outside search
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setShowSearchDropdown(false)
        setIsSearchFocused(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Clear search when navigating away
  useEffect(() => {
    const handleRouteChange = () => {
      setSearchQuery('')
      setShowSearchDropdown(false)
      setIsSearchFocused(false)
    }

    // Listen for route changes (this is a simple approach)
    window.addEventListener('beforeunload', handleRouteChange)

    return () => {
      window.removeEventListener('beforeunload', handleRouteChange)
    }
  }, [])

  return (
    <nav className={styles.navbar}>
      <div className={styles.navContainer}>
        <Link href="/feed" className={styles.navBrand}>
          Ripple
        </Link>
        
        <div className={styles.navSearch} ref={searchContainerRef}>
          <form onSubmit={handleSearch}>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={handleSearchFocus}
              onBlur={handleSearchBlur}
              autoComplete="off"
            />
            <i className="fas fa-search"></i>
          </form>
          <SearchDropdown
            searchQuery={searchQuery}
            isVisible={showSearchDropdown}
            onClose={() => setShowSearchDropdown(false)}
            onUserSelect={handleUserSelect}
          />
        </div>
        
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
