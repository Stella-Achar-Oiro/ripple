'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import styles from './FollowingList.module.css'

export default function FollowingList({ onStartConversation }) {
  const { user } = useAuth()
  const [following, setFollowing] = useState([])
  const [loading, setLoading] = useState(true)

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

  useEffect(() => {
    if (user?.id) {
      fetchFollowing()
    }
  }, [user?.id])

  const fetchFollowing = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/api/follow/following/${user.id}`, {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to fetch following')
      }

      const data = await response.json()
      
      if (data.success && data.data && data.data.following) {
        setFollowing(data.data.following)
      } else {
        setFollowing([])
      }
    } catch (err) {
      console.error('Error fetching following:', err)
      setFollowing([])
    } finally {
      setLoading(false)
    }
  }

  const handleStartConversation = (followingUser) => {
    // Transform the user data to match the conversation format
    const conversation = {
      id: followingUser.id,
      name: `${followingUser.first_name} ${followingUser.last_name}`,
      isGroup: false,
      avatar_path: followingUser.avatar_path,
      initials: `${followingUser.first_name?.charAt(0) || ''}${followingUser.last_name?.charAt(0) || ''}`
    }
    
    onStartConversation(conversation)
  }

  if (loading) {
    return (
      <div className={styles.followingList}>
        <div className={styles.loadingSpinner}>
          <i className="fas fa-spinner fa-spin"></i>
        </div>
      </div>
    )
  }

  if (following.length === 0) {
    return null // Don't show if no following users
  }

  return (
    <div className={styles.followingList}>
      <div className={styles.followingUsers}>
        {following.map(followingUser => (
          <div 
            key={followingUser.id}
            className={styles.followingUser}
            onClick={() => handleStartConversation(followingUser)}
          >
            <div className="friend-avatar">
              {followingUser.avatar_path ? (
                <img 
                  src={`${API_URL}${followingUser.avatar_path}`} 
                  alt={`${followingUser.first_name} ${followingUser.last_name}`}
                />
              ) : (
                `${followingUser.first_name?.charAt(0) || ''}${followingUser.last_name?.charAt(0) || ''}`
              )}
            </div>
            
            <div className={styles.followingUserInfo}>
              <div className={styles.followingUserName}>
                {followingUser.first_name} {followingUser.last_name}
              </div>
            </div>
            
            <i className="fas fa-comment"></i>
          </div>
        ))}
      </div>
    </div>
  )
}
