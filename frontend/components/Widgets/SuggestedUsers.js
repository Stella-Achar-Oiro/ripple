'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import UserCard from '../Search/UserCard'
import styles from './SuggestedUsers.module.css'

export default function SuggestedUsers({ limit = 3 }) {
  const [suggestedUsers, setSuggestedUsers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

  useEffect(() => {
    fetchSuggestedUsers()
  }, [])

  const fetchSuggestedUsers = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL}/api/users/suggested?limit=${limit}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/')
          return
        }
        throw new Error('Failed to fetch suggested users')
      }

      const data = await response.json()
      setSuggestedUsers(data.data?.users || [])
    } catch (error) {
      setError('Failed to load suggestions')
      console.error('Error fetching suggested users:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUserSelect = (user) => {
    router.push(`/profile/${user.id}`)
  }

  const handleViewMore = () => {
    router.push('/discover')
  }

  if (isLoading) {
    return (
      <div className={styles.widget}>
        <div className={styles.widgetHeader}>
          People you may know
        </div>
        <div className={styles.widgetContent}>
          <div className={styles.loadingState}>
            <i className="fas fa-spinner fa-spin"></i>
            <span>Loading suggestions...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error || suggestedUsers.length === 0) {
    return (
      <div className={styles.widget}>
        <div className={styles.widgetHeader}>
          People you may know
        </div>
        <div className={styles.widgetContent}>
          <div className={styles.emptyState}>
            <i className="fas fa-users"></i>
            <span>No suggestions available</span>
            <p>Connect with more people to get personalized suggestions</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.widget}>
      <div className={styles.widgetHeader}>
        <span className={styles.headerTitle}>People you may know</span>
        <button 
          className={styles.viewMoreButton}
          onClick={handleViewMore}
          title="View more suggestions"
        >
          <i className="fas fa-arrow-right"></i>
        </button>
      </div>
      
      <div className={styles.widgetContent}>
        <div className={styles.usersList}>
          {suggestedUsers.map((user) => (
            <div key={user.id} className={styles.userCardWrapper}>
              <UserCard
                user={user}
                onSelect={handleUserSelect}
                showFollowButton={true}
              />
            </div>
          ))}
        </div>
        
        {suggestedUsers.length >= limit && (
          <div className={styles.widgetFooter}>
            <button 
              className={styles.seeAllButton}
              onClick={handleViewMore}
            >
              See all suggestions
            </button>
          </div>
        )}
      </div>
    </div>
  )
}