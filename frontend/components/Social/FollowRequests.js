'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import styles from './FollowRequests.module.css'

export default function FollowRequests({ 
  showAsWidget = false,
  limit = null,
  onRequestChange = null 
}) {
  const [requests, setRequests] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [processingIds, setProcessingIds] = useState(new Set())
  const router = useRouter()

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

  useEffect(() => {
    fetchFollowRequests()
  }, [])

  const fetchFollowRequests = async () => {
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch(`${API_URL}/api/follows/requests`, {
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
        throw new Error('Failed to fetch follow requests')
      }

      const data = await response.json()
      const requestsData = data.data?.requests || []
      
      // Apply limit if specified
      const limitedRequests = limit ? requestsData.slice(0, limit) : requestsData
      setRequests(limitedRequests)
    } catch (error) {
      console.error('Error fetching follow requests:', error)
      setError('Failed to load follow requests')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRequest = async (requestId, action) => {
    if (processingIds.has(requestId)) return

    setProcessingIds(prev => new Set([...prev, requestId]))

    try {
      const response = await fetch(`${API_URL}/api/follows/handle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          requestId,
          action // 'accept' or 'decline'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `Failed to ${action} request`)
      }

      // Remove the request from the list
      setRequests(prev => prev.filter(req => req.id !== requestId))

      // Notify parent component
      if (onRequestChange) {
        onRequestChange({
          requestId,
          action,
          remainingCount: requests.length - 1
        })
      }

    } catch (error) {
      console.error(`Error ${action}ing follow request:`, error)
      setError(`Failed to ${action} request`)
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(requestId)
        return newSet
      })
    }
  }

  const handleUserClick = (userId) => {
    router.push(`/profile/${userId}`)
  }

  const getInitials = (user) => {
    if (user.first_name && user.last_name) {
      return `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`
    }
    if (user.email) {
      return user.email.charAt(0).toUpperCase()
    }
    return '?'
  }

  const getDisplayName = (user) => {
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`
    }
    if (user.nickname) {
      return user.nickname
    }
    return user.email || 'Unknown User'
  }

  if (isLoading) {
    return (
      <div className={`${styles.container} ${showAsWidget ? styles.widget : ''}`}>
        {showAsWidget && (
          <div className={styles.widgetHeader}>
            <h3>Follow Requests</h3>
          </div>
        )}
        <div className={styles.loadingState}>
          <i className="fas fa-spinner fa-spin"></i>
          <span>Loading requests...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`${styles.container} ${showAsWidget ? styles.widget : ''}`}>
        {showAsWidget && (
          <div className={styles.widgetHeader}>
            <h3>Follow Requests</h3>
          </div>
        )}
        <div className={styles.errorState}>
          <i className="fas fa-exclamation-triangle"></i>
          <span>{error}</span>
          <button 
            className={styles.retryButton}
            onClick={fetchFollowRequests}
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (requests.length === 0) {
    if (!showAsWidget) {
      return (
        <div className={styles.container}>
          <div className={styles.emptyState}>
            <i className="fas fa-user-check"></i>
            <h3>No pending requests</h3>
            <p>You don't have any follow requests at the moment.</p>
          </div>
        </div>
      )
    }
    return null // Don't show widget if no requests
  }

  return (
    <div className={`${styles.container} ${showAsWidget ? styles.widget : ''}`}>
      {showAsWidget && (
        <div className={styles.widgetHeader}>
          <h3>Follow Requests</h3>
          <span className={styles.requestCount}>{requests.length}</span>
        </div>
      )}
      
      <div className={styles.requestsList}>
        {requests.map((request) => (
          <div key={request.id} className={styles.requestItem}>
            <div 
              className={styles.userInfo}
              onClick={() => handleUserClick(request.user.id)}
            >
              <div className={styles.userAvatar}>
                {request.user.avatar_path ? (
                  <img
                    src={`${API_URL}${request.user.avatar_path}`}
                    alt={getDisplayName(request.user)}
                    className={styles.avatarImage}
                  />
                ) : (
                  <div className={styles.avatarPlaceholder}>
                    {getInitials(request.user)}
                  </div>
                )}
              </div>
              
              <div className={styles.userDetails}>
                <div className={styles.userName}>
                  {getDisplayName(request.user)}
                </div>
                <div className={styles.userSubtitle}>
                  {request.user.about_me ? (
                    request.user.about_me.length > 40 
                      ? `${request.user.about_me.substring(0, 40)}...`
                      : request.user.about_me
                  ) : (
                    request.user.email
                  )}
                </div>
                <div className={styles.requestTime}>
                  {new Date(request.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>

            <div className={styles.requestActions}>
              <button
                className={`${styles.actionButton} ${styles.acceptButton}`}
                onClick={() => handleRequest(request.id, 'accept')}
                disabled={processingIds.has(request.id)}
              >
                {processingIds.has(request.id) ? (
                  <i className="fas fa-spinner fa-spin"></i>
                ) : (
                  <i className="fas fa-check"></i>
                )}
                <span>Accept</span>
              </button>
              
              <button
                className={`${styles.actionButton} ${styles.declineButton}`}
                onClick={() => handleRequest(request.id, 'decline')}
                disabled={processingIds.has(request.id)}
              >
                {processingIds.has(request.id) ? (
                  <i className="fas fa-spinner fa-spin"></i>
                ) : (
                  <i className="fas fa-times"></i>
                )}
                <span>Decline</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {showAsWidget && requests.length >= (limit || 3) && (
        <div className={styles.widgetFooter}>
          <button 
            className={styles.viewAllButton}
            onClick={() => router.push('/follow-requests')}
          >
            View all requests
          </button>
        </div>
      )}
    </div>
  )
}