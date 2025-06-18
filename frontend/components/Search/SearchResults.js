'use client'

import { useEffect, useRef } from 'react'
import UserCard from './UserCard'
import styles from './SearchResults.module.css'

export default function SearchResults({ 
  results, 
  isLoading, 
  error, 
  query, 
  onResultSelect, 
  onClose 
}) {
  const resultsRef = useRef(null)

  // Auto-scroll to top when new results come in
  useEffect(() => {
    if (resultsRef.current && results.length > 0) {
      resultsRef.current.scrollTop = 0
    }
  }, [results])

  const handleViewAllResults = () => {
    // Navigate to a dedicated search results page
    if (onResultSelect) {
      onResultSelect({ type: 'view_all', query })
    }
  }

  if (isLoading && results.length === 0) {
    return (
      <div className={styles.searchResults}>
        <div className={styles.loadingState}>
          <div className={styles.loadingSpinner}>
            <i className="fas fa-spinner fa-spin"></i>
          </div>
          <span>Searching for "{query}"...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.searchResults}>
        <div className={styles.errorState}>
          <i className="fas fa-exclamation-triangle"></i>
          <span>{error}</span>
        </div>
      </div>
    )
  }

  if (!isLoading && results.length === 0 && query.trim()) {
    return (
      <div className={styles.searchResults}>
        <div className={styles.emptyState}>
          <i className="fas fa-search"></i>
          <span>No users found for "{query}"</span>
          <p className={styles.emptyHint}>
            Try searching for a different name or email
          </p>
        </div>
      </div>
    )
  }

  if (results.length === 0) {
    return null
  }

  const hasMoreResults = results.length >= 5 // Assuming we limit to 5 results in dropdown

  return (
    <div className={styles.searchResults} ref={resultsRef}>
      <div className={styles.resultsHeader}>
        <span className={styles.resultsCount}>
          {results.length} {results.length === 1 ? 'person' : 'people'} found
        </span>
        {isLoading && (
          <div className={styles.loadingIndicator}>
            <i className="fas fa-spinner fa-spin"></i>
          </div>
        )}
      </div>

      <div className={styles.resultsList}>
        {results.slice(0, 5).map((user) => (
          <UserCard
            key={user.id}
            user={user}
            onSelect={onResultSelect}
            showFollowButton={true}
          />
        ))}
      </div>

      {hasMoreResults && (
        <div className={styles.resultsFooter}>
          <button 
            className={styles.viewAllButton}
            onClick={handleViewAllResults}
          >
            <i className="fas fa-arrow-right"></i>
            View all results for "{query}"
          </button>
        </div>
      )}
    </div>
  )
}