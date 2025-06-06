import { useState, useEffect } from 'react'
import Link from 'next/link'
import styles from './ProfileConnections.module.css'

export default function ProfileFollowers({ userId }) {
  const [followers, setFollowers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
  
  useEffect(() => {
    const fetchFollowers = async () => {
      console.log('ProfileFollowers: Fetching followers for userId:', userId) // Debug log
      setIsLoading(true)

      try {
        const response = await fetch(
          `${API_URL}/api/follow/followers/${userId}`,
          { credentials: 'include' }
        )
        
        if (!response.ok) {
          throw new Error('Failed to fetch followers')
        }
        
        const result = await response.json()
        console.log('Followers API response:', result) // Debug log

        // Handle the response structure from backend
        // Backend returns: { success: true, data: { followers: [...] } }
        const followersData = result.data?.followers || []

        // Ensure followersData is always an array
        if (Array.isArray(followersData)) {
          setFollowers(followersData)
        } else {
          console.error('Followers data is not an array:', followersData)
          setFollowers([])
        }
      } catch (err) {
        console.error('Error fetching followers:', err)
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchFollowers()
  }, [userId, API_URL])
  
  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Loading followers...</p>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className={styles.errorContainer}>
        <p>Error loading followers: {error}</p>
      </div>
    )
  }
  
  if (followers.length === 0) {
    return (
      <div className={styles.emptyContainer}>
        <i className="fas fa-user-friends"></i>
        <h3>No followers yet</h3>
        <p>When people follow this user, they'll appear here.</p>
      </div>
    )
  }
  
  return (
    <div className={styles.connectionsContainer}>
      {followers.map(follower => (
        <Link 
          href={`/profile/${follower.id}`} 
          key={follower.id}
          className={styles.connectionCard}
        >
          <div className={styles.connectionAvatar}>
            {follower.avatar_path ? (
              <img 
                src={`${API_URL}${follower.avatar_path}`} 
                alt={`${follower.first_name} ${follower.last_name}`} 
              />
            ) : (
              <div className={styles.avatarPlaceholder}>
                {follower.first_name.charAt(0)}{follower.last_name.charAt(0)}
              </div>
            )}
          </div>
          <div className={styles.connectionInfo}>
            <h3 className={styles.connectionName}>
              {follower.first_name} {follower.last_name}
              {follower.nickname && <span className={styles.nickname}>({follower.nickname})</span>}
            </h3>
            {follower.about_me && (
              <p className={styles.connectionBio}>{
                follower.about_me.length > 50 
                  ? follower.about_me.slice(0, 50) + '...' 
                  : follower.about_me
              }</p>
            )}
          </div>
        </Link>
      ))}
    </div>
  )
}