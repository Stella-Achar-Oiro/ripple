'use client'

import { useState, useEffect, useCallback } from 'react'
import EventCard from './EventCard'
import styles from './EventList.module.css'

export default function EventList({ groupId, showGroupInfo = false, title = "Events" }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
  const EVENTS_PER_PAGE = 10

  const fetchEvents = useCallback(async (offset = 0, isLoadMore = false) => {
    try {
      if (!isLoadMore) {
        setLoading(true)
        setError(null)
      } else {
        setLoadingMore(true)
      }

      const url = groupId 
        ? `${API_URL}/api/groups/${groupId}/events?limit=${EVENTS_PER_PAGE}&offset=${offset}`
        : `${API_URL}/api/events?limit=${EVENTS_PER_PAGE}&offset=${offset}`

      const response = await fetch(url, {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to fetch events')
      }

      const data = await response.json()
      const newEvents = Array.isArray(data.data) ? data.data : []

      if (isLoadMore) {
        setEvents(prev => {
          const prevEvents = Array.isArray(prev) ? prev : []
          return [...prevEvents, ...newEvents]
        })
      } else {
        setEvents(newEvents)
      }

      setHasMore(newEvents.length === EVENTS_PER_PAGE)

    } catch (err) {
      console.error('Error fetching events:', err)
      setError(err.message)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [API_URL, groupId, EVENTS_PER_PAGE])

  const handleEventResponse = useCallback((eventId, response) => {
    setEvents(prev => {
      const prevEvents = Array.isArray(prev) ? prev : []
      return prevEvents.map(event => {
      if (event.id === eventId) {
        const updatedEvent = { ...event, user_response: response }
        
        // Update counts based on previous and new response
        if (event.user_response === 'going' && response === 'not_going') {
          updatedEvent.going_count = Math.max(0, event.going_count - 1)
          updatedEvent.not_going_count = event.not_going_count + 1
        } else if (event.user_response === 'not_going' && response === 'going') {
          updatedEvent.going_count = event.going_count + 1
          updatedEvent.not_going_count = Math.max(0, event.not_going_count - 1)
        } else if (!event.user_response) {
          if (response === 'going') {
            updatedEvent.going_count = event.going_count + 1
          } else {
            updatedEvent.not_going_count = event.not_going_count + 1
          }
        }
        
        return updatedEvent
      }
      return event
    })
    })
  }, [])

  const loadMoreEvents = () => {
    if (!loadingMore && hasMore) {
      const currentLength = Array.isArray(events) ? events.length : 0
      fetchEvents(currentLength, true)
    }
  }

  const refreshEvents = useCallback(() => {
    fetchEvents(0, false)
  }, [fetchEvents])

  // Add new event to the list (called from parent components)
  // const addNewEvent = useCallback((newEvent) => {
  //   setEvents(prev => {
  //     const prevEvents = Array.isArray(prev) ? prev : []
  //     return [newEvent, ...prevEvents]
  //   })
  // }, [])

  useEffect(() => {
    if (groupId) {
      fetchEvents()
    }
  }, [groupId, fetchEvents])

  // Separate events into upcoming and past
  const now = new Date()
  const safeEvents = Array.isArray(events) ? events : []
  const upcomingEvents = safeEvents.filter(event => new Date(event.event_date) > now)
  const pastEvents = safeEvents.filter(event => new Date(event.event_date) <= now)

  if (loading) {
    return (
      <div className={styles.eventList}>
        <div className={styles.eventListHeader}>
          <h3>{title}</h3>
        </div>
        <div className={styles.loadingState}>
          <i className="fas fa-spinner fa-spin"></i>
          <span>Loading events...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.eventList}>
        <div className={styles.eventListHeader}>
          <h3>{title}</h3>
        </div>
        <div className={styles.errorState}>
          <i className="fas fa-exclamation-triangle"></i>
          <p>Failed to load events</p>
          <button onClick={refreshEvents} className="btn-outline">
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (safeEvents.length === 0) {
    return (
      <div className={styles.eventList}>
        <div className={styles.eventListHeader}>
          <h3>{title}</h3>
        </div>
        <div className={styles.emptyState}>
          <i className="fas fa-calendar"></i>
          <p>No events yet</p>
          <span>Events will appear here when created</span>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.eventList}>
      <div className={styles.eventListHeader}>
        <h3>{title}</h3>
        <div className={styles.eventStats}>
          {upcomingEvents.length > 0 && (
            <span className={styles.upcomingCount}>
              {upcomingEvents.length} upcoming
            </span>
          )}
          {pastEvents.length > 0 && (
            <span className={styles.pastCount}>
              {pastEvents.length} past
            </span>
          )}
        </div>
      </div>

      <div className={styles.eventsContainer}>
        {/* Upcoming Events */}
        {upcomingEvents.length > 0 && (
          <div className={styles.eventSection}>
            <h4 className={styles.sectionTitle}>
              <i className="fas fa-clock"></i>
              Upcoming Events
            </h4>
            {upcomingEvents.map(event => (
              <EventCard
                key={event.id}
                event={event}
                onRespond={handleEventResponse}
                showGroupInfo={showGroupInfo}
              />
            ))}
          </div>
        )}

        {/* Past Events */}
        {pastEvents.length > 0 && (
          <div className={styles.eventSection}>
            <h4 className={styles.sectionTitle}>
              <i className="fas fa-history"></i>
              Past Events
            </h4>
            {pastEvents.map(event => (
              <EventCard
                key={event.id}
                event={event}
                onRespond={handleEventResponse}
                showGroupInfo={showGroupInfo}
              />
            ))}
          </div>
        )}

        {/* Load More Button */}
        {hasMore && (
          <div className={styles.loadMoreContainer}>
            <button
              onClick={loadMoreEvents}
              disabled={loadingMore}
              className="btn-outline"
            >
              {loadingMore ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Loading...
                </>
              ) : (
                <>
                  <i className="fas fa-plus"></i>
                  Load More Events
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}