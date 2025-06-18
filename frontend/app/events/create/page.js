'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../../contexts/AuthContext'
import RouteGuard from '../../../components/Auth/RouteGuard'
import MainLayout from '../../../components/Layout/MainLayout'
import EventForm from '../../../components/Events/EventForm'
import styles from './create.module.css'

export default function CreateEventPage() {
  const [userGroups, setUserGroups] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

  // Fetch user's groups where they can create events
  const fetchUserGroups = async () => {
    if (!isAuthenticated || authLoading) return

    try {
      const response = await fetch(`${API_URL}/api/groups/user`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/')
          return
        }
        throw new Error('Failed to fetch groups')
      }

      const data = await response.json()
      const groups = data.data?.groups || []
      
      // Filter groups where user can create events (members or admins)
      const eligibleGroups = groups.filter(group => 
        group.user_role === 'member' || 
        group.user_role === 'admin' || 
        group.user_role === 'creator'
      )
      
      setUserGroups(eligibleGroups)
    } catch (error) {
      console.error('Error fetching user groups:', error)
      setError('Failed to load your groups')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle successful event creation
  const handleEventCreated = (newEvent) => {
    // Redirect to the events page or the specific event
    router.push('/events')
  }

  // Initialize data
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchUserGroups()
    }
  }, [authLoading, isAuthenticated])

  return (
    <RouteGuard requireAuth={true}>
      <MainLayout currentPage="events">
        <div className={styles.container}>
          {/* Header */}
          <div className={styles.header}>
            <button 
              className={styles.backBtn}
              onClick={() => router.back()}
            >
              <i className="fas fa-arrow-left"></i>
              Back
            </button>
            
            <div className={styles.titleSection}>
              <h1 className={styles.title}>Create New Event</h1>
              <p className={styles.subtitle}>
                Plan and organize events for your groups
              </p>
            </div>
          </div>

          {/* Content */}
          <div className={styles.content}>
            {isLoading ? (
              <div className={styles.loading}>
                <div className={styles.loadingSpinner}></div>
                <p>Loading your groups...</p>
              </div>
            ) : error ? (
              <div className={styles.error}>
                <i className="fas fa-exclamation-triangle"></i>
                <p>{error}</p>
                <button onClick={fetchUserGroups} className={styles.retryBtn}>
                  Try Again
                </button>
              </div>
            ) : userGroups.length === 0 ? (
              <div className={styles.empty}>
                <div className={styles.emptyIcon}>👥</div>
                <h3>No Groups Available</h3>
                <p>
                  You need to be a member of at least one group to create events.
                  Join or create a group first.
                </p>
                <div className={styles.emptyActions}>
                  <button
                    className={styles.exploreGroupsBtn}
                    onClick={() => router.push('/groups')}
                  >
                    Explore Groups
                  </button>
                  <button
                    className={styles.createGroupBtn}
                    onClick={() => router.push('/groups/create')}
                  >
                    Create Group
                  </button>
                </div>
              </div>
            ) : (
              <div className={styles.formContainer}>
                <EventForm 
                  userGroups={userGroups}
                  onEventCreated={handleEventCreated}
                  onCancel={() => router.back()}
                />
              </div>
            )}
          </div>
        </div>
      </MainLayout>
    </RouteGuard>
  )
}