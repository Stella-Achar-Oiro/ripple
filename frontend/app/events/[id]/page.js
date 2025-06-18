'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '../../../contexts/AuthContext'
import RouteGuard from '../../../components/Auth/RouteGuard'
import MainLayout from '../../../components/Layout/MainLayout'
import EventDetails from '../../../components/Events/EventDetails'
import styles from './eventDetails.module.css'

export default function EventDetailsPage() {
  const [event, setEvent] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const eventId = params.id
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

  // Fetch event details
  const fetchEvent = async () => {
    if (!isAuthenticated || authLoading || !eventId) return

    setIsLoading(true)
    setError('')

    try {
      const response = await fetch(`${API_URL}/api/events/get/${eventId}`, {
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
        } else if (response.status === 404) {
          setError('Event not found')
          return
        }
        throw new Error('Failed to load event')
      }

      const data = await response.json()
      setEvent(data.data)

    } catch (error) {
      console.error('Error fetching event:', error)
      setError('Failed to load event details')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle event updates (like RSVP changes)
  const handleEventUpdate = () => {
    fetchEvent()
  }

  // Initialize data
  useEffect(() => {
    if (!authLoading && isAuthenticated && eventId) {
      fetchEvent()
    }
  }, [authLoading, isAuthenticated, eventId])

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
              Back to Events
            </button>
          </div>

          {/* Content */}
          <div className={styles.content}>
            {isLoading ? (
              <div className={styles.loading}>
                <div className={styles.loadingSpinner}></div>
                <p>Loading event details...</p>
              </div>
            ) : error ? (
              <div className={styles.error}>
                <i className="fas fa-exclamation-triangle"></i>
                <h3>Error</h3>
                <p>{error}</p>
                <div className={styles.errorActions}>
                  <button onClick={fetchEvent} className={styles.retryBtn}>
                    Try Again
                  </button>
                  <button 
                    onClick={() => router.push('/events')} 
                    className={styles.backToEventsBtn}
                  >
                    Back to Events
                  </button>
                </div>
              </div>
            ) : event ? (
              <EventDetails 
                event={event}
                onEventUpdate={handleEventUpdate}
              />
            ) : null}
          </div>
        </div>
      </MainLayout>
    </RouteGuard>
  )
}