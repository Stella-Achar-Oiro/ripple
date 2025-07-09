'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Avatar from '../shared/Avatar'
import styles from './SearchDropdown.module.css'

export default function SearchDropdown({ 
  searchQuery, 
  isVisible, 
  onClose, 
  onUserSelect 
}) {
  const [searchResults, setSearchResults] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const dropdownRef = useRef(null)
  const debounceRef = useRef(null)

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

  // Debounced search function
  const performSearch = async (query) => {
    if (!query || query.length < 2) {
      setSearchResults([])
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError('')
      
      const response = await fetch(`${API_URL}/api/auth/search?q=${encodeURIComponent(query)}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Search failed')
      }

      const data = await response.json()
      if (data.success && data.data) {
        setSearchResults(data.data.users || [])
      } else {
        setSearchResults([])
      }
    } catch (err) {
      console.error('Search error:', err)
      setError('Search failed. Please try again.')
      setSearchResults([])
    } finally {
      setIsLoading(false)
    }
  }

  // Debounce search queries
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (searchQuery && searchQuery.length >= 2) {
      setIsLoading(true)
      debounceRef.current = setTimeout(() => {
        performSearch(searchQuery)
      }, 300)
    } else {
      setSearchResults([])
      setIsLoading(false)
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [searchQuery])

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(-1)
  }, [searchResults])

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!isVisible || searchResults.length === 0) return

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault()
          setSelectedIndex(prev => 
            prev < searchResults.length - 1 ? prev + 1 : 0
          )
          break
        case 'ArrowUp':
          event.preventDefault()
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : searchResults.length - 1
          )
          break
        case 'Enter':
          event.preventDefault()
          if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
            const selectedUser = searchResults[selectedIndex]
            onUserSelect(selectedUser)
          }
          break
        case 'Escape':
          event.preventDefault()
          onClose()
          break
      }
    }

    if (isVisible) {
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isVisible, searchResults, selectedIndex, onUserSelect, onClose])

  if (!isVisible) return null

  return (
    <div className={styles.searchDropdown} ref={dropdownRef}>
      {isLoading && (
        <div className={styles.loadingState}>
          <i className="fas fa-spinner fa-spin"></i>
          <span>Searching...</span>
        </div>
      )}

      {error && (
        <div className={styles.errorState}>
          <i className="fas fa-exclamation-triangle"></i>
          <span>{error}</span>
        </div>
      )}

      {!isLoading && !error && searchQuery && searchQuery.length < 2 && (
        <div className={styles.hintState}>
          <i className="fas fa-search"></i>
          <span>Type at least 2 characters to search</span>
        </div>
      )}

      {!isLoading && !error && searchQuery && searchQuery.length >= 2 && searchResults.length === 0 && (
        <div className={styles.emptyState}>
          <i className="fas fa-user-slash"></i>
          <span>No users found for "{searchQuery}"</span>
        </div>
      )}

      {!isLoading && !error && searchResults.length > 0 && (
        <div className={styles.resultsContainer}>
          <div className={styles.resultsHeader}>
            <span>Users ({searchResults.length})</span>
          </div>
          <div className={styles.resultsList}>
            {searchResults.map((user, index) => (
              <Link
                key={user.id}
                href={`/profile/${user.id}`}
                className={`${styles.userResult} ${
                  index === selectedIndex ? styles.selected : ''
                }`}
                onClick={() => onUserSelect(user)}
              >
                <div className={styles.userAvatar}>
                  <Avatar user={user} size="small" />
                </div>
                <div className={styles.userInfo}>
                  <div className={styles.userName}>
                    {user.first_name} {user.last_name}
                  </div>
                  <div className={styles.userUsername}>
                    {user.nickname ? `@${user.nickname}` : user.email}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
