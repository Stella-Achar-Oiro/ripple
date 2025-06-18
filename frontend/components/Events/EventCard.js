'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiGet, apiPost, isAuthError, getErrorMessage } from '../../utils/api'
import styles from './EventCard.module.css'

export default function EventCard({ event, onEventUpdate, compact = false }) {
  const [userResponse, setUserResponse] = useState(null)
  const [responseCount, setResponseCount] = useState({
    going: 0,
    not_going: 0,
    maybe: 0
  })
  const [isLoading, setIsLoading] = useState(false)
  const [showResponses, setShowResponses] = useState(false)
  const [responses, setResponses] = useState([])
  
  const router = useRouter()

  // Format date and time
  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const timeOptions = { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    }

    const time = date.toLocaleTimeString('en-US', timeOptions)

    if (date.toDateString() === today.toDateString()) {
      return `Today at ${time}`
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return `Tomorrow at ${time}`
    } else {
      const dateOptions = { 
        weekday: 'short',
        month: 'short', 
        day: 'numeric'
      }
      
      if (date.getFullYear() !== today.getFullYear()) {
        dateOptions.year = 'numeric'
      }

      return `${date.toLocaleDateString('en-US', dateOptions)} at ${time}`
    }
  }

  // Check if event is in the past
  const isPastEvent = () => {
    return new Date(event.event_date) < new Date()
  }

  // Get event status color and text
  const getEventStatus = () => {
    const eventDate = new Date(event.event_date)
    const now = new Date()
    const hoursUntilEvent = (eventDate - now) / (1000 * 60 * 60)

    if (hoursUntilEvent < 0) {
      return { text: 'Past', color: '#6b7280', bgColor: '#f3f4f6' }
    } else if (hoursUntilEvent < 2) {
      return { text: 'Starting soon', color: '#ef4444', bgColor: '#fee2e2' }
    } else if (hoursUntilEvent < 24) {
      return { text: 'Today', color: '#f59e0b', bgColor: '#fef3c7' }
    } else if (hoursUntilEvent < 48) {
      return { text: 'Tomorrow', color: '#10b981', bgColor: '#d1fae5' }
    } else {
      return { text: 'Upcoming', color: '#3b82f6', bgColor: '#dbeafe' }
    }
  }

  // Fetch event responses
  const fetchResponses = async () => {
    if (!event.id) return

    try {
      const data = await apiGet(`/api/events/responses/${event.id}`)
      const responseList = data.data?.responses || []
      setResponses(responseList)

      // Count responses
      const counts = responseList.reduce((acc, resp) => {
        acc[resp.response_type] = (acc[resp.response_type] || 0) + 1
        return acc
      }, { going: 0, not_going: 0, maybe: 0 })

      setResponseCount(counts)

      // Find current user's response
      const currentUserResponse = responseList.find(resp => resp.user_id === resp.current_user_id)
      setUserResponse(currentUserResponse?.response_type || null)
    } catch (error) {
      if (isAuthError(error)) {
        router.push('/')
        return
      }
      console.error('Error fetching event responses:', getErrorMessage(error))
    }
  }

  // Handle RSVP response
  const handleResponse = async (responseType) => {
    if (isLoading || isPastEvent()) return

    setIsLoading(true)

    try {
      await apiPost(`/api/events/respond/${event.id}`, {
        response: responseType
      })

      setUserResponse(responseType)
      // Refresh responses to get updated counts
      await fetchResponses()
      
      if (onEventUpdate) {
        onEventUpdate()
      }
    } catch (error) {
      if (isAuthError(error)) {
        router.push('/')
        return
      }
      console.error('Error responding to event:', getErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }

  // Load responses on component mount
  useEffect(() => {
    fetchResponses()
  }, [event.id])

  const status = getEventStatus()

  return (
    <div className={`${styles.eventCard} ${isPastEvent() ? styles.pastEvent : ''} ${compact ? styles.compact : ''}`}>
      {/* Event Status Badge */}
      <div 
        className={styles.statusBadge}
        style={{ 
          color: status.color, 
          backgroundColor: status.bgColor 
        }}
      >
        {status.text}
      </div>

      {/* Event Header */}
      <div className={styles.eventHeader}>
        <div className={styles.eventInfo}>
          <h3 
            className={styles.eventTitle}
            onClick={() => router.push(`/events/${event.id}`)}
          >
            {event.title}
          </h3>
          <div className={styles.groupInfo}>
            <i className="fas fa-users"></i>
            <span 
              className={styles.groupName}
              onClick={() => router.push(`/groups/${event.group?.id}`)}
            >
              {event.group?.title}
            </span>
          </div>
        </div>

        <div className={styles.eventDate}>
          <i className="fas fa-calendar-alt"></i>
          <span>{formatDate(event.event_date)}</span>
        </div>
      </div>

      {/* Event Description */}
      {event.description && (
        <div className={styles.eventDescription}>
          <p>{event.description}</p>
        </div>
      )}

      {/* Event Location */}
      {event.location && (
        <div className={styles.eventLocation}>
          <i className="fas fa-map-marker-alt"></i>
          <span>{event.location}</span>
        </div>
      )}

      {/* Response Counts */}
      <div className={styles.responseCounts}>
        <div className={styles.responseCount}>
          <span className={styles.responseIcon}>✅</span>
          <span>{responseCount.going} going</span>
        </div>
        <div className={styles.responseCount}>
          <span className={styles.responseIcon}>❌</span>
          <span>{responseCount.not_going} not going</span>
        </div>
        <div className={styles.responseCount}>
          <span className={styles.responseIcon}>❓</span>
          <span>{responseCount.maybe} maybe</span>
        </div>
        
        <button
          className={styles.viewResponsesBtn}
          onClick={() => setShowResponses(!showResponses)}
        >
          {showResponses ? 'Hide' : 'View'} Responses
        </button>
      </div>

      {/* User Response Buttons */}
      {!isPastEvent() && (
        <div className={styles.responseButtons}>
          <button
            className={`${styles.responseBtn} ${styles.goingBtn} ${
              userResponse === 'going' ? styles.active : ''
            }`}
            onClick={() => handleResponse('going')}
            disabled={isLoading}
          >
            <i className="fas fa-check"></i>
            Going
          </button>
          <button
            className={`${styles.responseBtn} ${styles.maybeBtn} ${
              userResponse === 'maybe' ? styles.active : ''
            }`}
            onClick={() => handleResponse('maybe')}
            disabled={isLoading}
          >
            <i className="fas fa-question"></i>
            Maybe
          </button>
          <button
            className={`${styles.responseBtn} ${styles.notGoingBtn} ${
              userResponse === 'not_going' ? styles.active : ''
            }`}
            onClick={() => handleResponse('not_going')}
            disabled={isLoading}
          >
            <i className="fas fa-times"></i>
            Can't go
          </button>
        </div>
      )}

      {/* Current User Response Display for Past Events */}
      {isPastEvent() && userResponse && (
        <div className={styles.pastResponse}>
          <span>You responded: </span>
          <span className={styles.responseValue}>
            {userResponse === 'going' ? '✅ Going' : 
             userResponse === 'maybe' ? '❓ Maybe' : 
             '❌ Not going'}
          </span>
        </div>
      )}

      {/* Responses List */}
      {showResponses && responses.length > 0 && (
        <div className={styles.responsesList}>
          <h4>Event Responses</h4>
          <div className={styles.responsesGrid}>
            {responses.map((response, index) => (
              <div key={index} className={styles.responseItem}>
                <div className={styles.responseUser}>
                  <div className={styles.userAvatar}>
                    {response.user_avatar ? (
                      <img src={response.user_avatar} alt={response.user_name} />
                    ) : (
                      <span>{response.user_name?.charAt(0) || '?'}</span>
                    )}
                  </div>
                  <span className={styles.userName}>{response.user_name}</span>
                </div>
                <div className={styles.responseType}>
                  {response.response_type === 'going' ? '✅' :
                   response.response_type === 'maybe' ? '❓' : '❌'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingSpinner}></div>
        </div>
      )}
    </div>
  )
}