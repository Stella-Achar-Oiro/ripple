'use client'

import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import styles from './EventCard.module.css'

export default function EventCard({ event, onRespond, showGroupInfo = false }) {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [userResponse, setUserResponse] = useState(event.user_response)

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

  const formatEventDate = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInDays = Math.ceil((date - now) / (1000 * 60 * 60 * 24))
    
    const dateStr = date.toLocaleDateString([], { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
    const timeStr = date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })

    let timeInfo = ''
    if (diffInDays === 0) {
      timeInfo = 'Today'
    } else if (diffInDays === 1) {
      timeInfo = 'Tomorrow'
    } else if (diffInDays > 0) {
      timeInfo = `In ${diffInDays} days`
    } else {
      timeInfo = 'Past event'
    }

    return { dateStr, timeStr, timeInfo, isPast: diffInDays < 0 }
  }

  const handleRespond = async (response) => {
    if (isLoading) return

    setIsLoading(true)
    try {
      const apiResponse = await fetch(`${API_URL}/api/events/respond/${event.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ response })
      })

      if (!apiResponse.ok) {
        throw new Error('Failed to respond to event')
      }

      setUserResponse(response)
      if (onRespond) {
        onRespond(event.id, response)
      }
    } catch (error) {
      console.error('Error responding to event:', error)
      alert('Failed to respond to event. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const { dateStr, timeStr, timeInfo, isPast } = formatEventDate(event.event_date)

  return (
    <div className={`${styles.eventCard} ${isPast ? styles.pastEvent : ''}`}>
      <div className={styles.eventHeader}>
        <div className={styles.eventTitle}>
          <h3>{event.title}</h3>
          {event.is_creator && (
            <span className={styles.creatorBadge}>
              <i className="fas fa-crown"></i>
              Creator
            </span>
          )}
        </div>
        {showGroupInfo && event.group_title && (
          <div className={styles.groupInfo}>
            <i className="fas fa-users"></i>
            {event.group_title}
          </div>
        )}
      </div>

      <div className={styles.eventDateTime}>
        <div className={styles.dateTime}>
          <div className={styles.date}>
            <i className="fas fa-calendar"></i>
            {dateStr}
          </div>
          <div className={styles.time}>
            <i className="fas fa-clock"></i>
            {timeStr}
          </div>
        </div>
        <div className={`${styles.timeInfo} ${isPast ? styles.pastTime : ''}`}>
          {timeInfo}
        </div>
      </div>

      {event.description && (
        <div className={styles.eventDescription}>
          {event.description}
        </div>
      )}

      <div className={styles.eventStats}>
        <div className={styles.responseStats}>
          <span className={styles.goingCount}>
            <i className="fas fa-check-circle"></i>
            {event.going_count} going
          </span>
          <span className={styles.notGoingCount}>
            <i className="fas fa-times-circle"></i>
            {event.not_going_count} not going
          </span>
        </div>
        
        {event.creator && (
          <div className={styles.creatorInfo}>
            Created by {event.creator.first_name} {event.creator.last_name}
          </div>
        )}
      </div>

      {!isPast && (
        <div className={styles.eventActions}>
          <button
            className={`${styles.responseBtn} ${styles.goingBtn} ${userResponse === 'going' ? styles.active : ''}`}
            onClick={() => handleRespond('going')}
            disabled={isLoading}
          >
            <i className="fas fa-check"></i>
            {userResponse === 'going' ? 'Going' : 'Go'}
          </button>
          <button
            className={`${styles.responseBtn} ${styles.notGoingBtn} ${userResponse === 'not_going' ? styles.active : ''}`}
            onClick={() => handleRespond('not_going')}
            disabled={isLoading}
          >
            <i className="fas fa-times"></i>
            {userResponse === 'not_going' ? 'Not Going' : 'Can\'t Go'}
          </button>
        </div>
      )}

      {isLoading && (
        <div className={styles.loadingOverlay}>
          <i className="fas fa-spinner fa-spin"></i>
        </div>
      )}
    </div>
  )
}