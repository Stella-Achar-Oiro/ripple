'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../contexts/AuthContext'
import RouteGuard from '../../components/Auth/RouteGuard'
import MainLayout from '../../components/Layout/MainLayout'
import EventCard from '../../components/Events/EventCard'
import styles from './events.module.css'

export default function EventsPage() {
  const [events, setEvents] = useState([])
  const [userGroups, setUserGroups] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('upcoming') // 'upcoming', 'past', 'all'
  const [selectedGroup, setSelectedGroup] = useState('all')
  
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

  // Fetch user's groups
  const fetchUserGroups = async () => {
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
      setUserGroups(data.data?.groups || [])
    } catch (error) {
      console.error('Error fetching user groups:', error)
    }
  }

  // Fetch events for all user's groups
  const fetchEvents = async () => {
    if (!isAuthenticated || authLoading) return

    setIsLoading(true)
    setError('')

    try {
      // If user has no groups, no events to fetch
      if (userGroups.length === 0) {
        setEvents([])
        setIsLoading(false)
        return
      }

      // Fetch events from all user's groups
      const eventPromises = userGroups.map(async (group) => {
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
            const groupEvents = data.data?.events || []
            // Add group info to each event
            return groupEvents.map(event => ({
              ...event,
              group: {
                id: group.id,
                title: group.title,
                description: group.description
              }
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

  // Filter events based on selected criteria
  const getFilteredEvents = () => {
    let filtered = events

    // Filter by group
    if (selectedGroup !== 'all') {
      filtered = filtered.filter(event => event.group?.id === parseInt(selectedGroup))
    }

    // Filter by time
    const now = new Date()
    switch (filter) {
      case 'upcoming':
        filtered = filtered.filter(event => new Date(event.event_date) >= now)
        break
      case 'past':
        filtered = filtered.filter(event => new Date(event.event_date) < now)
        break
      case 'all':
      default:
        break
    }

    return filtered
  }

  // Initialize data
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchUserGroups()
    }
  }, [authLoading, isAuthenticated])

  // Fetch events when groups are loaded
  useEffect(() => {
    if (userGroups.length > 0) {
      fetchEvents()
    } else if (userGroups.length === 0 && !isLoading) {
      setEvents([])
      setIsLoading(false)
    }
  }, [userGroups])

  const filteredEvents = getFilteredEvents()

  return (
    <RouteGuard requireAuth={true}>
      <MainLayout currentPage="events">
        <div className={styles.container}>
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.titleSection}>
              <h1 className={styles.title}>Events</h1>
              <p className={styles.subtitle}>
                Discover and manage events from your groups
              </p>
            </div>

            <div className={styles.headerActions}>
              <button
                className={styles.createBtn}
                onClick={() => router.push('/events/create')}
              >
                <i className="fas fa-plus"></i>
                Create Event
              </button>
              <button
                className={styles.calendarBtn}
                onClick={() => router.push('/events/calendar')}
              >
                <i className="fas fa-calendar"></i>
                Calendar View
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className={styles.filters}>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Time:</label>
              <div className={styles.filterButtons}>
                <button
                  className={`${styles.filterBtn} ${filter === 'upcoming' ? styles.active : ''}`}
                  onClick={() => setFilter('upcoming')}
                >
                  Upcoming
                </button>
                <button
                  className={`${styles.filterBtn} ${filter === 'past' ? styles.active : ''}`}
                  onClick={() => setFilter('past')}
                >
                  Past
                </button>
                <button
                  className={`${styles.filterBtn} ${filter === 'all' ? styles.active : ''}`}
                  onClick={() => setFilter('all')}
                >
                  All
                </button>
              </div>
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Group:</label>
              <select
                className={styles.groupSelect}
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
              >
                <option value="all">All Groups</option>
                {userGroups.map(group => (
                  <option key={group.id} value={group.id}>
                    {group.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Content */}
          <div className={styles.content}>
            {isLoading ? (
              <div className={styles.loading}>
                <div className={styles.loadingSpinner}></div>
                <p>Loading events...</p>
              </div>
            ) : error ? (
              <div className={styles.error}>
                <i className="fas fa-exclamation-triangle"></i>
                <p>{error}</p>
                <button onClick={fetchEvents} className={styles.retryBtn}>
                  Try Again
                </button>
              </div>
            ) : userGroups.length === 0 ? (
              <div className={styles.empty}>
                <div className={styles.emptyIcon}>👥</div>
                <h3>No Groups Yet</h3>
                <p>Join some groups first to see and create events.</p>
                <button
                  className={styles.joinGroupsBtn}
                  onClick={() => router.push('/groups')}
                >
                  Explore Groups
                </button>
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className={styles.empty}>
                <div className={styles.emptyIcon}>📅</div>
                <h3>No Events Found</h3>
                <p>
                  {filter === 'upcoming' 
                    ? "No upcoming events. Why not create one?"
                    : filter === 'past'
                    ? "No past events to show."
                    : "No events found for the selected criteria."
                  }
                </p>
                {filter === 'upcoming' && (
                  <button
                    className={styles.createEventBtn}
                    onClick={() => router.push('/events/create')}
                  >
                    Create Your First Event
                  </button>
                )}
              </div>
            ) : (
              <div className={styles.eventsList}>
                {filteredEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onEventUpdate={fetchEvents}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </MainLayout>
    </RouteGuard>
  )
}