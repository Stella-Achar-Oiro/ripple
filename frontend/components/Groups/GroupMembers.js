'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiPost, isAuthError, getErrorMessage } from '../../utils/api'
import styles from './GroupMembers.module.css'

export default function GroupMembers({ 
  group, 
  members, 
  isLoading, 
  onMembersUpdate 
}) {
  const [inviteEmail, setInviteEmail] = useState('')
  const [isInviting, setIsInviting] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [showInviteForm, setShowInviteForm] = useState(false)
  
  const router = useRouter()

  // Handle member invitation
  const handleInvite = async (e) => {
    e.preventDefault()
    
    if (!inviteEmail.trim()) {
      setInviteError('Email is required')
      return
    }

    setIsInviting(true)
    setInviteError('')

    try {
      await apiPost('/api/groups/invite', {
        group_id: group.id,
        email: inviteEmail.trim()
      })
      
      setInviteEmail('')
      setShowInviteForm(false)
      setInviteError('')
      
      // Refresh members list
      if (onMembersUpdate) {
        onMembersUpdate()
      }
      
    } catch (error) {
      if (isAuthError(error)) {
        router.push('/')
        return
      }
      setInviteError(getErrorMessage(error))
    } finally {
      setIsInviting(false)
    }
  }

  // Format join date
  const formatJoinDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })
  }

  // Get member role display
  const getMemberRole = (member) => {
    if (member.is_admin) return 'Admin'
    if (member.is_moderator) return 'Moderator'
    return 'Member'
  }

  // Get role badge style
  const getRoleBadgeClass = (member) => {
    if (member.is_admin) return styles.adminBadge
    if (member.is_moderator) return styles.moderatorBadge
    return styles.memberBadge
  }

  return (
    <div className={styles.groupMembers}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h3 className={styles.title}>
            Members ({members.length})
          </h3>
          <p className={styles.subtitle}>
            People who are part of this group
          </p>
        </div>
        
        <button
          className={styles.inviteBtn}
          onClick={() => setShowInviteForm(!showInviteForm)}
        >
          <i className="fas fa-user-plus"></i>
          Invite Members
        </button>
      </div>

      {/* Invite Form */}
      {showInviteForm && (
        <div className={styles.inviteSection}>
          <div className={styles.inviteCard}>
            <h4>Invite new member</h4>
            <form onSubmit={handleInvite} className={styles.inviteForm}>
              <div className={styles.inputGroup}>
                <input
                  type="email"
                  placeholder="Enter email address..."
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className={styles.emailInput}
                  disabled={isInviting}
                />
                <button
                  type="submit"
                  className={styles.sendInviteBtn}
                  disabled={isInviting || !inviteEmail.trim()}
                >
                  {isInviting ? (
                    <>
                      <div className={styles.loadingSpinner}></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-paper-plane"></i>
                      Send Invite
                    </>
                  )}
                </button>
              </div>
              
              {inviteError && (
                <div className={styles.errorMessage}>
                  <i className="fas fa-exclamation-triangle"></i>
                  {inviteError}
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Members List */}
      <div className={styles.membersSection}>
        {isLoading ? (
          <div className={styles.loading}>
            <div className={styles.loadingSpinner}></div>
            <p>Loading members...</p>
          </div>
        ) : members.length === 0 ? (
          <div className={styles.empty}>
            <i className="fas fa-users"></i>
            <h4>No members found</h4>
            <p>This group doesn't have any members yet.</p>
          </div>
        ) : (
          <div className={styles.membersList}>
            {members.map((member) => (
              <div key={member.id} className={styles.memberCard}>
                <div className={styles.memberInfo}>
                  <div className={styles.memberAvatar}>
                    {member.profile_picture ? (
                      <img 
                        src={member.profile_picture} 
                        alt={`${member.first_name} ${member.last_name}`}
                        className={styles.avatarImage}
                      />
                    ) : (
                      <div className={styles.avatarPlaceholder}>
                        {member.first_name?.charAt(0) || member.username?.charAt(0) || '?'}
                      </div>
                    )}
                  </div>
                  
                  <div className={styles.memberDetails}>
                    <div className={styles.memberName}>
                      {member.first_name && member.last_name 
                        ? `${member.first_name} ${member.last_name}`
                        : member.username || 'Unknown User'
                      }
                    </div>
                    
                    <div className={styles.memberMeta}>
                      <span className={getRoleBadgeClass(member)}>
                        {getMemberRole(member)}
                      </span>
                      
                      {member.joined_at && (
                        <span className={styles.joinDate}>
                          Joined {formatJoinDate(member.joined_at)}
                        </span>
                      )}
                    </div>
                    
                    {member.bio && (
                      <div className={styles.memberBio}>
                        {member.bio}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className={styles.memberActions}>
                  <button
                    className={styles.viewProfileBtn}
                    onClick={() => router.push(`/profile/${member.id}`)}
                  >
                    <i className="fas fa-user"></i>
                    View Profile
                  </button>
                  
                  {/* Add message button if not same user */}
                  {member.id !== member.current_user_id && (
                    <button
                      className={styles.messageBtn}
                      onClick={() => router.push(`/chat?user=${member.id}`)}
                    >
                      <i className="fas fa-envelope"></i>
                      Message
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}