'use client'

import { useState, useEffect, useRef } from 'react'
import styles from './InviteUsersModal.module.css'

export default function InviteUsersModal({ isOpen, onClose, onSuccess, groupId, groupTitle }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [selectedUsers, setSelectedUsers] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [isInviting, setIsInviting] = useState(false)
  const [error, setError] = useState('')
  const [hasSearched, setHasSearched] = useState(false)
  
  const searchTimeoutRef = useRef(null)
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

  // Search users with debouncing
  const searchUsers = async (query) => {
    if (!query.trim()) {
      setSearchResults([])
      setHasSearched(false)
      return
    }

    setIsSearching(true)
    setError('')

    try {
      const response = await fetch(
        `${API_URL}/api/auth/search?q=${encodeURIComponent(query)}&limit=20`,
        {
          credentials: 'include',
        }
      )

      if (!response.ok) {
        throw new Error('Failed to search users')
      }

      const data = await response.json()
      setSearchResults(data.data.users || [])
      setHasSearched(true)
    } catch (err) {
      setError(err.message || 'Failed to search users')
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  // Handle search input change with debouncing
  const handleSearchChange = (e) => {
    const query = e.target.value
    setSearchQuery(query)

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    // Set new timeout for search
    searchTimeoutRef.current = setTimeout(() => {
      searchUsers(query)
    }, 300)
  }

  // Toggle user selection
  const toggleUserSelection = (user) => {
    setSelectedUsers(prev => {
      const isSelected = prev.find(u => u.id === user.id)
      if (isSelected) {
        return prev.filter(u => u.id !== user.id)
      } else {
        return [...prev, user]
      }
    })
  }

  // Send invitations
  const handleSendInvites = async () => {
    if (selectedUsers.length === 0) return

    setIsInviting(true)
    setError('')

    try {
      const userIds = selectedUsers.map(user => user.id)
      
      const response = await fetch(`${API_URL}/api/groups/${groupId}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_ids: userIds
        }),
        credentials: 'include',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Failed to send invitations')
      }

      // Success
      onSuccess()
      handleClose()
    } catch (err) {
      setError(err.message || 'Failed to send invitations')
    } finally {
      setIsInviting(false)
    }
  }

  // Handle modal close
  const handleClose = () => {
    if (!isInviting) {
      setSearchQuery('')
      setSearchResults([])
      setSelectedUsers([])
      setError('')
      setHasSearched(false)
      onClose()
    }
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  if (!isOpen) return null

  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Invite Users to {groupTitle}</h2>
          <p className={styles.modalSubtitle}>
            Invited users will receive an invitation they can accept or decline
          </p>
          <button
            className={styles.closeButton}
            onClick={handleClose}
            disabled={isInviting}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className={styles.modalBody}>
          {/* Search Section */}
          <div className={styles.searchSection}>
            <div className={styles.searchInputContainer}>
              <i className="fas fa-search"></i>
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={searchQuery}
                onChange={handleSearchChange}
                className={styles.searchInput}
                disabled={isInviting}
              />
              {isSearching && (
                <i className="fas fa-spinner fa-spin"></i>
              )}
            </div>
          </div>

          {/* Selected Users */}
          {selectedUsers.length > 0 && (
            <div className={styles.selectedSection}>
              <h3>Selected Users ({selectedUsers.length})</h3>
              <div className={styles.selectedUsers}>
                {selectedUsers.map(user => (
                  <div key={user.id} className={styles.selectedUser}>
                    <div className={styles.userAvatar}>
                      {user.avatar_path ? (
                        <img 
                          src={`${API_URL}${user.avatar_path}`} 
                          alt={`${user.first_name} ${user.last_name}`}
                        />
                      ) : (
                        <div className={styles.avatarPlaceholder}>
                          {user.first_name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                      )}
                    </div>
                    <span className={styles.userName}>
                      {user.first_name} {user.last_name}
                    </span>
                    <button
                      className={styles.removeButton}
                      onClick={() => toggleUserSelection(user)}
                      disabled={isInviting}
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search Results */}
          <div className={styles.resultsSection}>
            {error && (
              <div className={styles.errorMessage}>
                <i className="fas fa-exclamation-triangle"></i>
                {error}
              </div>
            )}

            {hasSearched && searchResults.length === 0 && !isSearching && !error && (
              <div className={styles.noResults}>
                <i className="fas fa-search"></i>
                <p>No users found for "{searchQuery}"</p>
                <small>Try searching with different keywords</small>
              </div>
            )}

            {searchResults.length > 0 && (
              <div className={styles.searchResults}>
                <h3>Search Results</h3>
                <div className={styles.usersList}>
                  {searchResults.map(user => {
                    const isSelected = selectedUsers.find(u => u.id === user.id)
                    return (
                      <div 
                        key={user.id} 
                        className={`${styles.userItem} ${isSelected ? styles.selected : ''}`}
                        onClick={() => toggleUserSelection(user)}
                      >
                        <div className={styles.userAvatar}>
                          {user.avatar_path ? (
                            <img 
                              src={`${API_URL}${user.avatar_path}`} 
                              alt={`${user.first_name} ${user.last_name}`}
                            />
                          ) : (
                            <div className={styles.avatarPlaceholder}>
                              {user.first_name?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                          )}
                        </div>
                        <div className={styles.userInfo}>
                          <h4>{user.first_name} {user.last_name}</h4>
                          {user.nickname && (
                            <p className={styles.userNickname}>@{user.nickname}</p>
                          )}
                          <p className={styles.userEmail}>{user.email}</p>
                        </div>
                        <div className={styles.selectionIndicator}>
                          {isSelected ? (
                            <i className="fas fa-check-circle"></i>
                          ) : (
                            <i className="far fa-circle"></i>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {!hasSearched && !isSearching && (
              <div className={styles.searchPrompt}>
                <i className="fas fa-user-friends"></i>
                <p>Search for users to invite to your group</p>
                <small>Start typing a name or email address</small>
              </div>
            )}
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button
            className="btn-outline"
            onClick={handleClose}
            disabled={isInviting}
          >
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={handleSendInvites}
            disabled={selectedUsers.length === 0 || isInviting}
          >
            {isInviting ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                Sending Invites...
              </>
            ) : (
              <>
                <i className="fas fa-paper-plane"></i>
                Send {selectedUsers.length} Invite{selectedUsers.length !== 1 ? 's' : ''}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
