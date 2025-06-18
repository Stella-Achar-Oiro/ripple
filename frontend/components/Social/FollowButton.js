'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import styles from './FollowButton.module.css'

export default function FollowButton({ 
  userId,
  initialFollowStatus = null,
  isPrivateUser = false,
  size = 'medium', // 'small', 'medium', 'large'
  variant = 'primary', // 'primary', 'outline', 'minimal'
  onFollowChange = null,
  className = '',
  disabled = false
}) {
  const [followStatus, setFollowStatus] = useState(initialFollowStatus)




  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

  // Follow statuses: null (not following), 'following', 'pending', 'requested'
  const isFollowing = followStatus === 'following'
  const isPending = followStatus === 'pending' || followStatus === 'requested'

  useEffect(() => {
    // If no initial status provided, fetch current status
    if (initialFollowStatus === null && userId) {
      fetchFollowStatus()
    }
  }, [userId, initialFollowStatus])

  const fetchFollowStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/api/follow/status/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      })

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/')
          return
        }
        throw new Error('Failed to fetch follow status')
      }

      const data = await response.json()
      // API returns is_following boolean, map to our status system
      if (data.success && data.data) {
        const isFollowing = data.data.is_following
        setFollowStatus(isFollowing ? 'following' : null)
      }
    } catch (error) {
      console.error('Error fetching follow status:', error)
      setError('Failed to load follow status')
    }
  }

  const handleFollowAction = async () => {
    if (disabled || isLoading) return

    setIsLoading(true)
    setError('')

    try {
      let endpoint = ''
      let method = 'POST'
      let body = null

      if (isFollowing) {
        // Unfollow
        endpoint = `${API_URL}/api/unfollow`
        method = 'POST'
        body = JSON.stringify({ user_id: userId })
      } else if (isPending) {
        // Cancel pending request (use unfollow for now)
        endpoint = `${API_URL}/api/unfollow`
        method = 'POST'
        body = JSON.stringify({ user_id: userId })
      } else {
        // Follow
        endpoint = `${API_URL}/api/follow`
        method = 'POST'
        body = JSON.stringify({ user_id: userId })
      }

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body,
        credentials: 'include'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to update follow status')
      }

      const data = await response.json()
      
      // Determine new follow status based on action and response
      let updatedStatus
      if (isFollowing || isPending) {
        updatedStatus = null // Unfollowed/cancelled
      } else {
        // Following - check if user is private or response indicates pending
        if (data.data?.follow_request?.status === 'pending') {
          updatedStatus = 'pending'
        } else {
          updatedStatus = 'following'
        }
      }

      setFollowStatus(updatedStatus)

      // Notify parent component of change
      if (onFollowChange) {
        onFollowChange({
          userId,
          status: updatedStatus || newStatus,
          wasFollowing: isFollowing,
          wasPending: isPending
        })
      }

    } catch (error) {
      console.error('Error updating follow status:', error)
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const getButtonText = () => {
    if (isLoading) {
      if (isFollowing) return 'Unfollowing...'
      if (isPending) return 'Cancelling...'
      return 'Following...'
    }

    if (isFollowing) return 'Following'
    if (isPending) return 'Requested'
    return 'Follow'
  }

  const getButtonIcon = () => {
    if (isLoading) return 'fas fa-spinner fa-spin'
    if (isFollowing) return 'fas fa-check'
    if (isPending) return 'fas fa-clock'
    return 'fas fa-plus'
  }

  const getButtonClasses = () => {
    const baseClass = styles.followButton
    const sizeClass = styles[`size${size.charAt(0).toUpperCase() + size.slice(1)}`]
    const variantClass = styles[`variant${variant.charAt(0).toUpperCase() + variant.slice(1)}`]
    
    let statusClass = ''
    if (isFollowing) statusClass = styles.following
    else if (isPending) statusClass = styles.pending
    else statusClass = styles.notFollowing

    return `${baseClass} ${sizeClass} ${variantClass} ${statusClass} ${className}`.trim()
  }

  if (error && !isLoading) {
    return (
      <button 
        className={`${styles.followButton} ${styles.error} ${className}`}
        onClick={() => {
          setError('')
          handleFollowAction()
        }}
        title={error}
      >
        <i className="fas fa-exclamation-triangle"></i>
        <span>Retry</span>
      </button>
    )
  }

  return (
    <button
      className={getButtonClasses()}
      onClick={handleFollowAction}
      disabled={disabled || isLoading}
      title={
        isFollowing ? 'Click to unfollow' :
        isPending ? 'Follow request pending' :
        isPrivateUser ? 'Send follow request' :
        'Follow this user'
      }
    >
      <i className={getButtonIcon()}></i>
      <span className={styles.buttonText}>{getButtonText()}</span>
    </button>
  )
}