'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useWebSocket } from '../../contexts/WebSocketContext'
import styles from './OnlineFriends.module.css'

export default function OnlineFriends() {
  const { user } = useAuth()
  const { onlineUsers } = useWebSocket()
  
  const [friends, setFriends] = useState([])
  const [loading, setLoading] = useState(true)

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

  const fetchOnlineFriends = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/api/chat/online`, {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to fetch online friends')
      }

      const data = await response.json()
      
      if (data.success && data.data) {
        // Filter for users who are currently online and are followed by current user
        const onlineFriends = data.data
          .filter(friend => onlineUsers.includes(friend.id))
          .map(friend => ({
            id: friend.id,
            name: `${friend.first_name} ${friend.last_name}`,
            initials: `${friend.first_name?.charAt(0) || ''}${friend.last_name?.charAt(0) || ''}`,
            avatar_path: friend.avatar_path,
            isOnline: true
          }))
          .slice(0, 8) // Limit to 8 friends for widget

        setFriends(onlineFriends)
      }
    } catch (err) {
      console.error('Error fetching online friends:', err)
      // Keep existing friends data on error
    } finally {
      setLoading(false)
    }
  }, [API_URL, onlineUsers])

  // Fetch friends when component mounts or online users change
  useEffect(() => {
    if (user && onlineUsers.length > 0) {
      fetchOnlineFriends()
    } else if (user) {
      setLoading(false)
    }
  }, [user, onlineUsers.length, fetchOnlineFriends])

  if (loading) {
    return (
      <div className={styles.widget}>
        <div className={styles.widgetHeader}>
          Online Friends
        </div>
        <div className={styles.widgetContent}>
          <div className={styles.loadingState}>
            <i className="fas fa-spinner fa-spin"></i>
            <span>Loading...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.widget}>
      <div className={styles.widgetHeader}>
        Online Friends ({friends.length})
      </div>
      <div className={styles.widgetContent}>
        {friends.length === 0 ? (
          <div className={styles.emptyState}>
            <i className="fas fa-user-friends"></i>
            <span>No friends online</span>
          </div>
        ) : (
          <div className={styles.onlineFriends}>
            {friends.map(friend => (
              <div key={friend.id} className={styles.friendItem}>
                <div className="friend-avatar">
                  {friend.avatar_path ? (
                    <img 
                      src={`${API_URL}${friend.avatar_path}`} 
                      alt={friend.name}
                    />
                  ) : (
                    friend.initials
                  )}
                  <div className="online-indicator"></div>
                </div>
                <div className={styles.friendName}>{friend.name}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}