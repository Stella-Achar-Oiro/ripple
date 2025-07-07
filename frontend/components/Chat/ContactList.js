'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useWebSocket } from '../../contexts/WebSocketContext'
import Avatar from '../shared/Avatar'
import styles from './ContactList.module.css'

export default function ContactList({ onSelectContact, selectedContactId }) {
  const { user } = useAuth()
  const { isUserOnline } = useWebSocket()
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

  useEffect(() => {
    fetchContacts()
  }, [])

  const fetchContacts = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/api/chat/messageable-users`, {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setContacts(data.data.users || [])
      } else {
        throw new Error('Failed to fetch contacts')
      }
    } catch (err) {
      console.error('Error fetching contacts:', err)
      setError('Failed to load contacts')
    } finally {
      setLoading(false)
    }
  }

  const handleContactSelect = (contact) => {
    onSelectContact({
      id: contact.id,
      name: `${contact.first_name} ${contact.last_name}`,
      first_name: contact.first_name,
      last_name: contact.last_name,
      nickname: contact.nickname,
      avatar_path: contact.avatar_path,
      is_public: contact.is_public,
      isGroup: false
    })
  }

  const filteredContacts = contacts.filter(contact => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    return (
      contact.first_name.toLowerCase().includes(query) ||
      contact.last_name.toLowerCase().includes(query) ||
      (contact.nickname && contact.nickname.toLowerCase().includes(query))
    )
  })

  if (loading) {
    return (
      <div className={styles.contactList}>
        <div className={styles.header}>
          <h3>Contacts</h3>
        </div>
        <div className={styles.loading}>
          <i className="fas fa-spinner fa-spin"></i>
          <p>Loading contacts...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.contactList}>
        <div className={styles.header}>
          <h3>Contacts</h3>
        </div>
        <div className={styles.error}>
          <i className="fas fa-exclamation-triangle"></i>
          <p>{error}</p>
          <button onClick={fetchContacts}>Retry</button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.contactList}>
      <div className={styles.header}>
        <h3>Contacts</h3>
        <span className={styles.count}>({contacts.length})</span>
      </div>

      <div className={styles.searchSection}>
        <div className={styles.searchInput}>
          <i className="fas fa-search"></i>
          <input
            type="text"
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.contacts}>
        {filteredContacts.length === 0 ? (
          <div className={styles.emptyState}>
            {searchQuery ? (
              <>
                <i className="fas fa-search"></i>
                <p>No contacts found</p>
                <small>Try a different search term</small>
              </>
            ) : (
              <>
                <i className="fas fa-user-friends"></i>
                <p>No contacts yet</p>
                <small>Follow other users to start messaging them</small>
              </>
            )}
          </div>
        ) : (
          filteredContacts.map(contact => {
            const isOnline = isUserOnline(contact.id)
            const isSelected = selectedContactId === contact.id
            
            return (
              <div
                key={contact.id}
                className={`${styles.contactItem} ${isSelected ? styles.selected : ''}`}
                onClick={() => handleContactSelect(contact)}
              >
                <div className={styles.avatarContainer}>
                  <Avatar user={contact} size="medium" />
                  {isOnline && <div className={styles.onlineIndicator}></div>}
                </div>
                
                <div className={styles.contactInfo}>
                  <div className={styles.contactName}>
                    {contact.first_name} {contact.last_name}
                  </div>
                  <div className={styles.contactMeta}>
                    {contact.nickname && (
                      <span className={styles.nickname}>@{contact.nickname}</span>
                    )}
                    {isOnline ? (
                      <span className={styles.onlineStatus}>
                        <i className="fas fa-circle"></i> Online
                      </span>
                    ) : (
                      <span className={styles.offlineStatus}>Offline</span>
                    )}
                  </div>
                </div>

                <div className={styles.contactActions}>
                  {contact.is_public ? (
                    <i className="fas fa-globe" title="Public profile"></i>
                  ) : (
                    <i className="fas fa-user-friends" title="Connected"></i>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
