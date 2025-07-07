'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import Avatar from '../shared/Avatar'
import styles from './NewMessageModal.module.css'

export default function NewMessageModal({ isOpen, onClose, onSelectUser }) {
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [socialConnections, setSocialConnections] = useState(null)
  const [messageableUsers, setMessageableUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('connections') // 'connections' or 'all'

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

  useEffect(() => {
    if (isOpen) {
      fetchSocialConnections()
      fetchMessageableUsers()
    }
  }, [isOpen])

  const fetchSocialConnections = async () => {
    try {
      const response = await fetch(`${API_URL}/api/chat/social-connections`, {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setSocialConnections(data.data.connections)
      } else {
        throw new Error('Failed to fetch social connections')
      }
    } catch (err) {
      console.error('Error fetching social connections:', err)
      setError('Failed to load social connections')
    }
  }

  const fetchMessageableUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/api/chat/messageable-users`, {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setMessageableUsers(data.data.users || [])
      } else {
        throw new Error('Failed to fetch messageable users')
      }
    } catch (err) {
      console.error('Error fetching messageable users:', err)
      setError('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const handleUserSelect = (selectedUser) => {
    onSelectUser(selectedUser)
    onClose()
    setSearchQuery('')
  }

  const filterUsers = (users) => {
    if (!searchQuery.trim()) return users
    const query = searchQuery.toLowerCase()
    return users.filter(user => 
      user.first_name.toLowerCase().includes(query) ||
      user.last_name.toLowerCase().includes(query) ||
      (user.nickname && user.nickname.toLowerCase().includes(query))
    )
  }

  const renderUserList = (users, title, emptyMessage) => {
    const filteredUsers = filterUsers(users)
    
    if (filteredUsers.length === 0) {
      return (
        <div className={styles.emptyState}>
          <i className="fas fa-users"></i>
          <p>{searchQuery ? 'No users found matching your search' : emptyMessage}</p>
        </div>
      )
    }

    return (
      <div className={styles.userSection}>
        {title && <h4 className={styles.sectionTitle}>{title}</h4>}
        <div className={styles.userList}>
          {filteredUsers.map(user => (
            <div 
              key={user.id} 
              className={styles.userItem}
              onClick={() => handleUserSelect(user)}
            >
              <Avatar user={user} size="medium" />
              <div className={styles.userInfo}>
                <div className={styles.userName}>
                  {user.first_name} {user.last_name}
                  {user.nickname && <span className={styles.nickname}>@{user.nickname}</span>}
                </div>
                <div className={styles.userMeta}>
                  {user.is_public ? (
                    <span className={styles.publicProfile}>
                      <i className="fas fa-globe"></i> Public Profile
                    </span>
                  ) : (
                    <span className={styles.privateProfile}>
                      <i className="fas fa-lock"></i> Connected
                    </span>
                  )}
                </div>
              </div>
              <i className="fas fa-chevron-right"></i>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!isOpen) return null

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>New Message</h3>
          <button className={styles.closeButton} onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className={styles.searchSection}>
          <div className={styles.searchInput}>
            <i className="fas fa-search"></i>
            <input
              type="text"
              placeholder="Search people..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.tabSection}>
          <button 
            className={`${styles.tab} ${activeTab === 'connections' ? styles.active : ''}`}
            onClick={() => setActiveTab('connections')}
          >
            <i className="fas fa-user-friends"></i>
            Social Connections
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'all' ? styles.active : ''}`}
            onClick={() => setActiveTab('all')}
          >
            <i className="fas fa-users"></i>
            All Users
          </button>
        </div>

        <div className={styles.modalContent}>
          {loading ? (
            <div className={styles.loading}>
              <i className="fas fa-spinner fa-spin"></i>
              <p>Loading users...</p>
            </div>
          ) : error ? (
            <div className={styles.error}>
              <i className="fas fa-exclamation-triangle"></i>
              <p>{error}</p>
              <button onClick={() => {
                setError('')
                fetchSocialConnections()
                fetchMessageableUsers()
              }}>
                Try Again
              </button>
            </div>
          ) : (
            <>
              {activeTab === 'connections' && socialConnections && (
                <div className={styles.connectionsTab}>
                  {socialConnections.mutual_connections?.length > 0 && 
                    renderUserList(
                      socialConnections.mutual_connections, 
                      'Mutual Connections', 
                      'No mutual connections found'
                    )
                  }
                  {socialConnections.following?.length > 0 && 
                    renderUserList(
                      socialConnections.following, 
                      'Following', 
                      'You are not following anyone'
                    )
                  }
                  {socialConnections.followers?.length > 0 && 
                    renderUserList(
                      socialConnections.followers, 
                      'Followers', 
                      'No followers found'
                    )
                  }
                  {(!socialConnections.mutual_connections?.length && 
                    !socialConnections.following?.length && 
                    !socialConnections.followers?.length) && (
                    <div className={styles.emptyState}>
                      <i className="fas fa-user-plus"></i>
                      <p>No social connections yet</p>
                      <small>Follow other users to start messaging them</small>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'all' && 
                renderUserList(
                  messageableUsers, 
                  null, 
                  'No users available to message'
                )
              }
            </>
          )}
        </div>
      </div>
    </div>
  )
}
