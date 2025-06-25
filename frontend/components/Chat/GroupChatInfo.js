'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import styles from './GroupChatInfo.module.css'

export default function GroupChatInfo({ group, onClose }) {
  const { user } = useAuth()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

  useEffect(() => {
    if (group?.id) {
      fetchGroupMembers()
    }
  }, [group?.id])

  const fetchGroupMembers = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/api/groups/${group.id}/members`, {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to fetch group members')
      }

      const data = await response.json()
      if (data.success) {
        setMembers(data.data || [])
      }
    } catch (err) {
      console.error('Error fetching group members:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleInviteUser = async (e) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return

    try {
      const response = await fetch(`${API_URL}/api/groups/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          group_id: group.id,
          email: inviteEmail.trim()
        })
      })

      if (!response.ok) {
        throw new Error('Failed to invite user')
      }

      const data = await response.json()
      if (data.success) {
        setInviteEmail('')
        setShowInviteModal(false)
        // Could show success notification
      }
    } catch (error) {
      console.error('Error inviting user:', error)
      // Could show error notification
    }
  }

  const isCreator = group?.creator_id === user?.id

  if (!group) {
    return null
  }

  return (
    <div className={styles.groupInfo}>
      <div className={styles.header}>
        <h3>Group Info</h3>
        <button onClick={onClose} className={styles.closeBtn}>
          <i className="fas fa-times"></i>
        </button>
      </div>

      <div className={styles.groupDetails}>
        <div className={styles.groupAvatar}>
          {group.avatar_path ? (
            <img 
              src={`${API_URL}${group.avatar_path}`} 
              alt={group.title}
            />
          ) : (
            <div className={styles.defaultAvatar}>
              <i className="fas fa-users"></i>
            </div>
          )}
        </div>
        
        <div className={styles.groupInfo}>
          <h4>{group.title}</h4>
          <p>{group.description || 'No description'}</p>
          <span className={styles.memberCount}>
            {members.length} member{members.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {isCreator && (
        <div className={styles.actions}>
          <button 
            onClick={() => setShowInviteModal(true)}
            className={styles.inviteBtn}
          >
            <i className="fas fa-user-plus"></i>
            Invite Members
          </button>
        </div>
      )}

      <div className={styles.membersSection}>
        <h4>Members</h4>
        {loading ? (
          <div className={styles.loading}>
            <i className="fas fa-spinner fa-spin"></i>
            Loading members...
          </div>
        ) : error ? (
          <div className={styles.error}>
            <i className="fas fa-exclamation-triangle"></i>
            {error}
          </div>
        ) : (
          <div className={styles.membersList}>
            {members.map(member => (
              <div key={member.id} className={styles.member}>
                <div className={styles.memberAvatar}>
                  {member.user?.avatar_path ? (
                    <img 
                      src={`${API_URL}${member.user.avatar_path}`} 
                      alt={`${member.user.first_name} ${member.user.last_name}`}
                    />
                  ) : (
                    <div className={styles.memberInitials}>
                      {`${member.user?.first_name?.charAt(0) || ''}${member.user?.last_name?.charAt(0) || ''}`}
                    </div>
                  )}
                </div>
                <div className={styles.memberInfo}>
                  <span className={styles.memberName}>
                    {`${member.user?.first_name || ''} ${member.user?.last_name || ''}`}
                  </span>
                  {member.user_id === group.creator_id && (
                    <span className={styles.creatorBadge}>Creator</span>
                  )}
                </div>
                <div className={styles.memberStatus}>
                  <span className={`${styles.status} ${styles[member.status]}`}>
                    {member.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showInviteModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h4>Invite to Group</h4>
              <button 
                onClick={() => setShowInviteModal(false)}
                className={styles.closeBtn}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleInviteUser}>
              <div className={styles.formGroup}>
                <label htmlFor="inviteEmail">Email Address</label>
                <input
                  type="email"
                  id="inviteEmail"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="Enter email address"
                  required
                />
              </div>
              <div className={styles.modalActions}>
                <button 
                  type="button" 
                  onClick={() => setShowInviteModal(false)}
                  className={styles.cancelBtn}
                >
                  Cancel
                </button>
                <button type="submit" className={styles.submitBtn}>
                  Send Invite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
} 