'use client'

import { useState, useEffect } from 'react'
import styles from './JoinRequestsManager.module.css'

export default function JoinRequestsManager({ groupId, isVisible, onRequestHandled }) {
  const [joinRequests, setJoinRequests] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [processingIds, setProcessingIds] = useState(new Set())

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

  // Fetch pending join requests
  const fetchJoinRequests = async () => {
    if (!groupId) return

    try {
      setIsLoading(true)
      const response = await fetch(`${API_URL}/api/groups/${groupId}/requests`, {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to fetch join requests')
      }

      const data = await response.json()
      setJoinRequests(data.data?.join_requests || [])
    } catch (err) {
      console.error('Error fetching join requests:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle join request (accept/decline)
  const handleJoinRequest = async (membershipId, action) => {
    if (processingIds.has(membershipId)) return

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
        throw new Error(data.error?.message || `Failed to ${action} join request`)
      }

      // Remove the request from the list
      setJoinRequests(prev => prev.filter(req => req.id !== membershipId))
      
      if (onRequestHandled) {
        onRequestHandled()
      }
    } catch (err) {
      console.error(`Error ${action}ing join request:`, err)
      alert(`Failed to ${action} join request: ${err.message}`)
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(membershipId)
        return newSet
      })
    }
  }

  // Fetch requests when component becomes visible
  useEffect(() => {
    if (isVisible && groupId) {
      fetchJoinRequests()
    }
  }, [isVisible, groupId])

  if (!isVisible) return null

  return (
    <div className={styles.joinRequestsManager}>
      <div className={styles.header}>
        <h3>
          <i className="fas fa-user-plus"></i>
          Join Requests
        </h3>
        {joinRequests.length > 0 && (
          <span className={styles.requestCount}>
            {joinRequests.length} pending
          </span>
        )}
      </div>

      <div className={styles.content}>
        {isLoading ? (
          <div className={styles.loadingState}>
            <i className="fas fa-spinner fa-spin"></i>
            <span>Loading join requests...</span>
          </div>
        ) : joinRequests.length === 0 ? (
          <div className={styles.emptyState}>
            <i className="fas fa-inbox"></i>
            <span>No pending join requests</span>
          </div>
        ) : (
          <div className={styles.requestsList}>
            {joinRequests.map(request => (
              <div key={request.id} className={styles.requestItem}>
                <div className={styles.userInfo}>
                  <div className={styles.userAvatar}>
                    {request.user?.avatar_path ? (
                      <img 
                        src={`${API_URL}${request.user.avatar_path}`} 
                        alt={`${request.user.first_name} ${request.user.last_name}`}
                      />
                    ) : (
                      <i className="fas fa-user"></i>
                    )}
                  </div>
                  <div className={styles.userDetails}>
                    <div className={styles.userName}>
                      {request.user?.first_name} {request.user?.last_name}
                    </div>
                    <div className={styles.userEmail}>
                      {request.user?.email}
                    </div>
                    <div className={styles.requestTime}>
                      Requested {new Date(request.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                
                <div className={styles.requestActions}>
                  <button
                    className={`${styles.actionButton} ${styles.acceptButton}`}
                    onClick={() => handleJoinRequest(request.id, 'accept')}
                    disabled={processingIds.has(request.id)}
                  >
                    {processingIds.has(request.id) ? (
                      <i className="fas fa-spinner fa-spin"></i>
                    ) : (
                      <>
                        <i className="fas fa-check"></i>
                        Accept
                      </>
                    )}
                  </button>
                  <button
                    className={`${styles.actionButton} ${styles.declineButton}`}
                    onClick={() => handleJoinRequest(request.id, 'decline')}
                    disabled={processingIds.has(request.id)}
                  >
                    {processingIds.has(request.id) ? (
                      <i className="fas fa-spinner fa-spin"></i>
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
        )}
      </div>
    </div>
  )
}
