import { useState, useEffect } from 'react'
import Link from 'next/link'
import styles from './ProfileConnections.module.css'

export default function ProfileFollowing({ userId }) {
  const [following, setFollowing] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
  
  useEffect(() => {
    const fetchFollowing = async () => {
      console.log('ProfileFollowing: Fetching following for userId:', userId) // Debug log
      setIsLoading(true)

      try {
        const response = await fetch(
          `${API_URL}/api/follow/following/${userId}`,
          { credentials: 'include' }
        )
        
        if (!response.ok) {
          throw new Error('Failed to fetch following')
        }
        
        const result = await response.json()
        console.log('Following API response:', result) // Debug log

        // Handle the response structure from backend
        // Backend returns: { success: true, data: { following: [...] } }
        const followingData = result.data?.following || []

        // Ensure followingData is always an array
        if (Array.isArray(followingData)) {
          setFollowing(followingData)
        } else {
          console.error('Following data is not an array:', followingData)
          setFollowing([])
        }
      } catch (err) {
        console.error('Error fetching following:', err)
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchFollowing()
  }, [userId, API_URL])
  
  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Loading following...</p>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className={styles.errorContainer}>
        <p>Error loading following: {error}</p>
      </div>
    )
  }
  
  if (following.length === 0) {
    return (
      <div className={styles.emptyContainer}>
        <i className="fas fa-user-plus"></i>
        <h3>Not following anyone yet</h3>
        <p>When this user follows people, they'll appear here.</p>
      </div>
    )
  }
  
  return (
    <div className={styles.connectionsContainer}>
      {following.map(user => (
        <Link 
          href={`/profile/${user.id}`} 
          key={user.id}
          className={styles.connectionCard}
        >
          <div className={styles.connectionAvatar}>
            {user.avatar_path ? (
              <img 
                src={`${API_URL}${user.avatar_path}`} 
                alt={`${user.first_name} ${user.last_name}`} 
              />
            ) : (
              <div className={styles.avatarPlaceholder}>
                {user.first_name.charAt(0)}{user.last_name.charAt(0)}
              </div>
            )}
          </div>
          <div className={styles.connectionInfo}>
            <h3 className={styles.connectionName}>
              {user.first_name} {user.last_name}
              {user.nickname && <span className={styles.nickname}>({user.nickname})</span>}
            </h3>
            {user.about_me && (
              <p className={styles.connectionBio}>{
                user.about_me.length > 50 
                  ? user.about_me.slice(0, 50) + '...' 
                  : user.about_me
              }</p>
            )}
          </div>
        </Link>
      ))}
    </div>
  )
}