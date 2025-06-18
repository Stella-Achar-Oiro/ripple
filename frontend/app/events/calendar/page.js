'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../../contexts/AuthContext'
import RouteGuard from '../../../components/Auth/RouteGuard'
import MainLayout from '../../../components/Layout/MainLayout'
import EventCalendar from '../../../components/Events/EventCalendar'
import styles from './calendar.module.css'

export default function EventsCalendarPage() {
  const [events, setEvents] = useState([])
  const [userGroups, setUserGroups] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

  // Fetch user groups
  const fetchUserGroups = async () => {
    if (!isAuthenticated || authLoading) return []

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
          return []
        }
        throw new Error('Failed to load groups')
      }

      const data = await response.json()
      return data.data || []
    } catch (error) {
      console.error('Error fetching user groups:', error)
      return []
    }
  }

  // Fetch events from all user groups
  const fetchEvents = async () => {
    if (!isAuthenticated || authLoading) return

    setIsLoading(true)
    setError('')

    try {
      // First get user's groups
      const groups = await fetchUserGroups()
      setUserGroups(groups)

      if (groups.length === 0) {
        setEvents([])
        setIsLoading(false)
        return
      }

      // Fetch events from all groups
      const eventPromises = groups.map(async (group) => {
        // Skip groups without valid ID
        if (!group?.id) {
          console.warn('Skipping group with invalid ID:', group)
          return []
        }
        
        try {
          const response = await fetch(`${API_URL}/api/events/group/${group.id}`, {
            method: 'GET',
            credentials: 'include',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            }
          })

          if (response.ok) {
            const data = await response.json()
            const groupEvents = data.data || []
            
            // Add group info to each event
            return groupEvents.map(event => ({
              ...event,
              group_name: group.name,
              group_id: group.id
            }))
          } else {
            // Log the specific error for debugging
            const errorText = await response.text()
            console.error(`Error fetching events for group ${group.id} (${response.status}):`, errorText)
            return []
          }
        } catch (error) {
          console.error(`Error fetching events for group ${group.id}:`, error)
          return []
        }
      })

      const eventArrays = await Promise.all(eventPromises)
      const allEvents = eventArrays.flat()
      
      // Sort events by date
      allEvents.sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
      
      setEvents(allEvents)

    } catch (error) {
      console.error('Error fetching events:', error)
      setError('Failed to load events')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle event updates
  const handleEventUpdate = () => {
    fetchEvents()
  }

  // Initialize data
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchEvents()
    }
  }, [authLoading, isAuthenticated])

  return (
    <RouteGuard requireAuth={true}>
      <MainLayout currentPage="events">
        <div className={styles.container}>
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.headerContent}>
              <div className={styles.titleSection}>
                <button 
                  className={styles.backBtn}
                  onClick={() => router.push('/events')}
                >
                  <i className="fas fa-arrow-left"></i>
                  Back to Events
                </button>
                <h1 className={styles.title}>Events Calendar</h1>
              </div>
              
              <div className={styles.headerActions}>
                <button
                  className={styles.createBtn}
                  onClick={() => router.push('/events/create')}
                >
                  <i className="fas fa-plus"></i>
                  Create Event
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className={styles.content}>
            {isLoading ? (
              <div className={styles.loading}>
                <div className={styles.loadingSpinner}></div>
                <p>Loading calendar...</p>
              </div>
            ) : error ? (
              <div className={styles.error}>
                <i className="fas fa-exclamation-triangle"></i>
                <h3>Error</h3>
                <p>{error}</p>
                <button onClick={fetchEvents} className={styles.retryBtn}>
                  Try Again
                </button>
              </div>
            ) : userGroups.length === 0 ? (
              <div className={styles.noGroups}>
                <i className="fas fa-users"></i>
                <h3>No Groups Found</h3>
                <p>You need to join a group to see events in the calendar.</p>
                <button
                  onClick={() => router.push('/groups')}
                  className={styles.joinGroupBtn}
                >
                  Browse Groups
                </button>
              </div>
            ) : (
              <EventCalendar 
                events={events}
                onEventUpdate={handleEventUpdate}
              />
            )}
          </div>
        </div>
      </MainLayout>
    </RouteGuard>
  )
}