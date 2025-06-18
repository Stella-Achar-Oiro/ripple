'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import SearchResults from './SearchResults'
import styles from './SearchBar.module.css'

export default function SearchBar() {
  const [query, setQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const [showResults, setShowResults] = useState(false)
  const [error, setError] = useState('')
  
  const searchRef = useRef(null)
  const router = useRouter()
  const debounceTimer = useRef(null)

  // Get API URL from environment variable
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
    }
  }, [])

  // Debounced search function
  const performSearch = async (searchQuery) => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      setShowResults(false)
      return
    }

    setIsSearching(true)
    setError('')

    try {
      // For now, simulate API call since endpoint doesn't exist yet
      // TODO: Replace with actual API call when backend is ready
      console.log('Would search for:', searchQuery)
      
      // Simulate some results for testing
      const mockResults = [
        {
          id: '1',
          first_name: 'John',
          last_name: 'Doe',
          email: 'john.doe@example.com',
          avatar_path: null,
          follower_count: 125,
          is_following: false
        },
        {
          id: '2', 
          first_name: 'Jane',
          last_name: 'Smith',
          email: 'jane.smith@example.com',
          avatar_path: null,
          follower_count: 89,
          is_following: true
        }
      ].filter(user => 
        user.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
      )
      
      setSearchResults(mockResults)
      setShowResults(true)
      
      /* 
      // Uncomment when backend API is ready:
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL}/api/users/search?q=${encodeURIComponent(searchQuery)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/')
          return
        }
        throw new Error('Search failed')
      }

      const data = await response.json()
      setSearchResults(data.data?.users || [])
      setShowResults(true)
      */
    } catch (error) {
      setError('Failed to search users')
      setSearchResults([])
      console.error('Search error:', error)
    } finally {
      setIsSearching(false)
    }
  }

  const handleInputChange = (e) => {
    const value = e.target.value
    setQuery(value)

    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }

    // Set new timer for debounced search
    if (value.trim()) {
      debounceTimer.current = setTimeout(() => {
        performSearch(value)
      }, 300) // 300ms delay
    } else {
      setSearchResults([])
      setShowResults(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (query.trim()) {
      performSearch(query)
    }
  }

  const handleClearSearch = () => {
    setQuery('')
    setSearchResults([])
    setShowResults(false)
    setError('')
  }

  const handleResultSelect = (user) => {
    setQuery('')
    setShowResults(false)
    router.push(`/profile/${user.id}`)
  }

  const hasQuery = query.trim().length > 0

  return (
    <div className={styles.searchContainer} ref={searchRef}>
      <form className={styles.searchForm} onSubmit={handleSubmit}>
        <div className={styles.searchInputWrapper}>
          <i className={`fas fa-search ${styles.searchIcon}`}></i>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search people..."
            value={query}
            onChange={handleInputChange}
            autoComplete="off"
          />
          {(hasQuery || isSearching) && (
            <button
              type="button"
              className={styles.clearButton}
              onClick={handleClearSearch}
              disabled={isSearching}
            >
              {isSearching ? (
                <i className="fas fa-spinner fa-spin"></i>
              ) : (
                <i className="fas fa-times"></i>
              )}
            </button>
          )}
        </div>
      </form>

      {showResults && hasQuery && (
        <SearchResults
          results={searchResults}
          isLoading={isSearching}
          error={error}
          query={query}
          onResultSelect={handleResultSelect}
          onClose={() => setShowResults(false)}
        />
      )}
    </div>
  )
}