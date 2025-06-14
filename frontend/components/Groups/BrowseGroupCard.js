'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './BrowseGroupCard.module.css'

export default function BrowseGroupCard({ group, onJoinSuccess }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [membershipStatus, setMembershipStatus] = useState(group.member_status || 'not_member')

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

  // Generate a default icon based on group title
  const getGroupIcon = (title) => {
    const firstLetter = title?.charAt(0)?.toUpperCase() || 'G'
    return firstLetter
  }

  // Format member count
  const formatMemberCount = (count) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`
    }
    return count?.toString() || '0'
  }

  const handleViewGroup = () => {
    router.push(`/groups/${group.id}`)
  }

  const handleJoinRequest = async () => {
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch(`${API_URL}/api/groups/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          group_id: group.id
        }),
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send join request')
      }

      setMembershipStatus('pending')
      if (onJoinSuccess) {
        onJoinSuccess(group.id)
      }
    } catch (err) {
      setError(err.message || 'Failed to send join request')
      console.error('Join request error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const getActionButton = () => {
    if (group.is_creator) {
      return (
        <button className="btn-outline" onClick={handleViewGroup}>
          <i className="fas fa-crown"></i>
          Manage Group
        </button>
      )
    }

    if (group.is_member || membershipStatus === 'accepted') {
      return (
        <button className="btn-primary" onClick={handleViewGroup}>
          <i className="fas fa-users"></i>
          View Group
        </button>
      )
    }

    if (membershipStatus === 'pending') {
      return (
        <button className="btn-outline" disabled>
          <i className="fas fa-clock"></i>
          Request Pending
        </button>
      )
    }

    return (
      <button 
        className="btn-primary" 
        onClick={handleJoinRequest}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <i className="fas fa-spinner fa-spin"></i>
            Requesting...
          </>
        ) : (
          <>
            <i className="fas fa-user-plus"></i>
            Request to Join
          </>
        )}
      </button>
    )
  }

  const getStatusBadge = () => {
    if (group.is_creator) {
      return (
        <span className={styles.statusBadge + ' ' + styles.creator}>
          <i className="fas fa-crown"></i>
          Creator
        </span>
      )
    }

    if (group.is_member) {
      return (
        <span className={styles.statusBadge + ' ' + styles.member}>
          <i className="fas fa-check"></i>
          Member
        </span>
      )
    }

    if (membershipStatus === 'pending') {
      return (
        <span className={styles.statusBadge + ' ' + styles.pending}>
          <i className="fas fa-clock"></i>
          Pending
        </span>
      )
    }

    return null
  }

  return (
    <div className={styles.groupCard}>
      <div 
        className={styles.groupHeader}
        style={{
          backgroundImage: group.cover_path 
            ? `url(${API_URL}${group.cover_path})` 
            : 'linear-gradient(135deg, var(--primary-navy), var(--secondary-navy))'
        }}
      >
        <div className={styles.groupIcon}>
          {group.avatar_path ? (
            <img 
              src={`${API_URL}${group.avatar_path}`} 
              alt={`${group.title} avatar`}
              className={styles.groupAvatarImage}
            />
          ) : (
            getGroupIcon(group.title)
          )}
        </div>
        {getStatusBadge()}
      </div>

      <div className={styles.groupInfo}>
        <div className={styles.groupName}>{group.title}</div>
        {group.description && (
          <div className={styles.groupDescription}>
            {group.description.length > 120 
              ? `${group.description.substring(0, 120)}...` 
              : group.description
            }
          </div>
        )}
        <div className={styles.groupMeta}>
          <span className={styles.memberCount}>
            <i className="fas fa-users"></i>
            {formatMemberCount(group.member_count)} member{group.member_count !== 1 ? 's' : ''}
          </span>
          {group.creator && (
            <span className={styles.creatorInfo}>
              <i className="fas fa-user"></i>
              by {group.creator.first_name} {group.creator.last_name}
            </span>
          )}
        </div>

        {error && (
          <div className={styles.errorMessage}>
            <i className="fas fa-exclamation-triangle"></i>
            {error}
          </div>
        )}

        <div className={styles.groupActions}>
          {getActionButton()}
          <button className="btn-outline" onClick={handleViewGroup}>
            <i className="fas fa-eye"></i>
            View Details
          </button>
        </div>
      </div>
    </div>
  )
}
