'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import styles from './EventDetails.module.css'

export default function EventDetails({ event, onEventUpdate }) {
  const [userResponse, setUserResponse] = useState(null)
  const [responses, setResponses] = useState([])
  const [responseCount, setResponseCount] = useState({
    going: 0,
    not_going: 0,
    maybe: 0
  })
  const [isLoading, setIsLoading] = useState(false)
  const [showAllResponses, setShowAllResponses] = useState(false)
  
  const router = useRouter()
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

  // Format date and time
  const formatDateTime = (dateString) => {
    const date = new Date(dateString)
    const options = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }
    return date.toLocaleDateString('en-US', options)
  }

  // Check if event is in the past
  const isPastEvent = () => {
    return new Date(event.event_date) < new Date()
  }

  // Get event status
  const getEventStatus = () => {
    const eventDate = new Date(event.event_date)
    const now = new Date()
    const hoursUntilEvent = (eventDate - now) / (1000 * 60 * 60)

    if (hoursUntilEvent < 0) {
      return { text: 'Event has ended', color: '#6b7280', bgColor: '#f3f4f6' }
    } else if (hoursUntilEvent < 2) {
      return { text: 'Starting very soon!', color: '#ef4444', bgColor: '#fee2e2' }
    } else if (hoursUntilEvent < 24) {
      return { text: 'Starting today', color: '#f59e0b', bgColor: '#fef3c7' }
    } else if (hoursUntilEvent < 48) {
      return { text: 'Starting tomorrow', color: '#10b981', bgColor: '#d1fae5' }
    } else {
      const daysUntil = Math.ceil(hoursUntilEvent / 24)
      return { text: `${daysUntil} days to go`, color: '#3b82f6', bgColor: '#dbeafe' }
    }
  }

  // Fetch event responses
  const fetchResponses = async () => {
    try {
      const response = await fetch(`${API_URL}/api/events/responses/${event.id}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        }
      })

      if (response.ok) {
        const data = await response.json()
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
      }
    } catch (error) {
      console.error('Error fetching event responses:', error)
    }
  }

  // Handle RSVP response
  const handleResponse = async (responseType) => {
    if (isLoading || isPastEvent()) return

    setIsLoading(true)

    try {
      const response = await fetch(`${API_URL}/api/events/respond/${event.id}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          response: responseType
        })
      })

      if (response.ok) {
        setUserResponse(responseType)
        // Refresh responses to get updated counts
        await fetchResponses()
        
        if (onEventUpdate) {
          onEventUpdate()
        }
      } else {
        const errorData = await response.json()
        console.error('Failed to respond to event:', errorData.message)
      }
    } catch (error) {
      console.error('Error responding to event:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Load responses on component mount
  useEffect(() => {
    if (event?.id) {
      fetchResponses()
    }
  }, [event?.id])

  if (!event) return null

  const status = getEventStatus()
  const displayedResponses = showAllResponses ? responses : responses.slice(0, 12)

  return (
    <div className={styles.eventDetails}>
      {/* Event Header */}
      <div className={styles.eventHeader}>
        <div className={styles.headerContent}>
          <div className={styles.titleSection}>
            <h1 className={styles.eventTitle}>{event.title}</h1>
            <div 
              className={styles.statusBadge}
              style={{ 
                color: status.color, 
                backgroundColor: status.bgColor 
              }}
            >
              {status.text}
            </div>
          </div>
          
          <div className={styles.groupInfo}>
            <i className="fas fa-users"></i>
            <span 
              className={styles.groupName}
              onClick={() => router.push(`/groups/${event.group_id}`)}
            >
              Hosted by {event.group_name || 'Group'}
            </span>
          </div>
        </div>
      </div>

      {/* Event Info */}
      <div className={styles.eventInfo}>
        <div className={styles.infoCard}>
          <div className={styles.infoItem}>
            <div className={styles.infoIcon}>
              <i className="fas fa-calendar-alt"></i>
            </div>
            <div className={styles.infoContent}>
              <h4>Date & Time</h4>
              <p>{formatDateTime(event.event_date)}</p>
            </div>
          </div>

          {event.location && (
            <div className={styles.infoItem}>
              <div className={styles.infoIcon}>
                <i className="fas fa-map-marker-alt"></i>
              </div>
              <div className={styles.infoContent}>
                <h4>Location</h4>
                <p>{event.location}</p>
              </div>
            </div>
          )}

          <div className={styles.infoItem}>
            <div className={styles.infoIcon}>
              <i className="fas fa-users"></i>
            </div>
            <div className={styles.infoContent}>
              <h4>Attendees</h4>
              <p>{responseCount.going} going, {responseCount.maybe} maybe</p>
            </div>
          </div>
        </div>
      </div>

      {/* Event Description */}
      {event.description && (
        <div className={styles.descriptionSection}>
          <h3>About this event</h3>
          <div className={styles.description}>
            <p>{event.description}</p>
          </div>
        </div>
      )}

      {/* RSVP Section */}
      {!isPastEvent() && (
        <div className={styles.rsvpSection}>
          <h3>Will you attend?</h3>
          <div className={styles.responseButtons}>
            <button
              className={`${styles.responseBtn} ${styles.goingBtn} ${
                userResponse === 'going' ? styles.active : ''
              }`}
              onClick={() => handleResponse('going')}
              disabled={isLoading}
            >
              <i className="fas fa-check"></i>
              <span>Going</span>
              {responseCount.going > 0 && (
                <span className={styles.count}>{responseCount.going}</span>
              )}
            </button>
            <button
              className={`${styles.responseBtn} ${styles.maybeBtn} ${
                userResponse === 'maybe' ? styles.active : ''
              }`}
              onClick={() => handleResponse('maybe')}
              disabled={isLoading}
            >
              <i className="fas fa-question"></i>
              <span>Maybe</span>
              {responseCount.maybe > 0 && (
                <span className={styles.count}>{responseCount.maybe}</span>
              )}
            </button>
            <button
              className={`${styles.responseBtn} ${styles.notGoingBtn} ${
                userResponse === 'not_going' ? styles.active : ''
              }`}
              onClick={() => handleResponse('not_going')}
              disabled={isLoading}
            >
              <i className="fas fa-times"></i>
              <span>Can't go</span>
              {responseCount.not_going > 0 && (
                <span className={styles.count}>{responseCount.not_going}</span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Current User Response for Past Events */}
      {isPastEvent() && userResponse && (
        <div className={styles.pastResponseSection}>
          <h3>Your Response</h3>
          <div className={styles.pastResponse}>
            <span className={styles.responseIcon}>
              {userResponse === 'going' ? '✅' : 
               userResponse === 'maybe' ? '❓' : 
               '❌'}
            </span>
            <span>
              You responded: {userResponse === 'going' ? 'Going' : 
                              userResponse === 'maybe' ? 'Maybe' : 
                              'Not going'}
            </span>
          </div>
        </div>
      )}

      {/* Responses List */}
      {responses.length > 0 && (
        <div className={styles.responsesSection}>
          <div className={styles.responsesHeader}>
            <h3>Event Responses ({responses.length})</h3>
            {responses.length > 12 && (
              <button
                className={styles.toggleResponsesBtn}
                onClick={() => setShowAllResponses(!showAllResponses)}
              >
                {showAllResponses ? 'Show Less' : `View All (${responses.length})`}
              </button>
            )}
          </div>
          
          <div className={styles.responsesGrid}>
            {displayedResponses.map((response, index) => (
              <div key={index} className={styles.responseItem}>
                <div className={styles.responseUser}>
                  <div className={styles.userAvatar}>
                    {response.user_avatar ? (
                      <img src={response.user_avatar} alt={response.user_name} />
                    ) : (
                      <span>{response.user_name?.charAt(0) || '?'}</span>
                    )}
                  </div>
                  <div className={styles.userInfo}>
                    <span className={styles.userName}>{response.user_name}</span>
                    <span className={styles.responseType}>
                      {response.response_type === 'going' && (
                        <><i className="fas fa-check"></i> Going</>
                      )}
                      {response.response_type === 'maybe' && (
                        <><i className="fas fa-question"></i> Maybe</>
                      )}
                      {response.response_type === 'not_going' && (
                        <><i className="fas fa-times"></i> Not going</>
                      )}
                    </span>
                  </div>
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