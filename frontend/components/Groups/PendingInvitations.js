'use client'

import { useState, useEffect } from 'react'
import styles from './PendingInvitations.module.css'

export default function PendingInvitations({ onInvitationHandled }) {
  const [invitations, setInvitations] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [processingIds, setProcessingIds] = useState(new Set())

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

  // Fetch pending invitations
  const fetchInvitations = async () => {
    try {
      const response = await fetch(`${API_URL}/api/groups/invitations`, {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to fetch invitations')
      }

      const data = await response.json()
      setInvitations(data.data.invitations || [])
    } catch (err) {
      console.error('Error fetching invitations:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchInvitations()
  }, [])

  const handleInvitation = async (membershipId, action) => {
    setProcessingIds(prev => new Set(prev).add(membershipId))

    try {
      const response = await fetch(`${API_URL}/api/groups/handle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          membership_id: membershipId,
          action: action
        }),
        credentials: 'include',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || `Failed to ${action} invitation`)
      }

      // Remove the invitation from the list
      setInvitations(prev => prev.filter(inv => inv.id !== membershipId))
      
      if (onInvitationHandled) {
        onInvitationHandled()
      }
    } catch (err) {
      console.error(`Error ${action}ing invitation:`, err)
      alert(`Failed to ${action} invitation: ${err.message}`)
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(membershipId)
        return newSet
      })
    }
  }

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <i className="fas fa-spinner fa-spin"></i>
        <span>Loading invitations...</span>
      </div>
    )
  }

  if (invitations.length === 0) {
    return null
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>
          <i className="fas fa-envelope"></i>
          Group Invitations ({invitations.length})
        </h3>
        <p>You have been invited to join the following groups:</p>
      </div>

      <div className={styles.invitationsList}>
        {invitations.map(invitation => (
          <div key={invitation.id} className={styles.invitationCard}>
            <div className={styles.groupInfo}>
              <div className={styles.groupIcon}>
                {invitation.group.avatar_path ? (
                  <img 
                    src={`${API_URL}${invitation.group.avatar_path}`} 
                    alt={`${invitation.group.title} avatar`}
                  />
                ) : (
                  <span>{invitation.group.title?.charAt(0)?.toUpperCase() || 'G'}</span>
                )}
              </div>
              <div className={styles.groupDetails}>
                <h4>{invitation.group.title}</h4>
                {invitation.group.description && (
                  <p className={styles.groupDescription}>
                    {invitation.group.description.length > 100 
                      ? `${invitation.group.description.substring(0, 100)}...` 
                      : invitation.group.description
                    }
                  </p>
                )}
                <div className={styles.invitationMeta}>
                  <span className={styles.memberCount}>
                    <i className="fas fa-users"></i>
                    {invitation.group.member_count} member{invitation.group.member_count !== 1 ? 's' : ''}
                  </span>
                  {invitation.invited_by && (
                    <span className={styles.invitedBy}>
                      <i className="fas fa-user"></i>
                      Invited by {invitation.invited_by.first_name} {invitation.invited_by.last_name}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className={styles.actions}>
              <button
                className="btn-primary"
                onClick={() => handleInvitation(invitation.id, 'accept')}
                disabled={processingIds.has(invitation.id)}
              >
                {processingIds.has(invitation.id) ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    Accepting...
                  </>
                ) : (
                  <>
                    <i className="fas fa-check"></i>
                    Accept
                  </>
                )}
              </button>
              <button
                className="btn-outline"
                onClick={() => handleInvitation(invitation.id, 'decline')}
                disabled={processingIds.has(invitation.id)}
              >
                {processingIds.has(invitation.id) ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    Declining...
                  </>
                ) : (
                  <>
                    <i className="fas fa-times"></i>
                    Decline
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
