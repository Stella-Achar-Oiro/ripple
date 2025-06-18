'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './EventForm.module.css'

export default function EventForm({ userGroups, onEventCreated, onCancel }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_date: '',
    event_time: '',
    location: '',
    group_id: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  const router = useRouter()
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Clear field error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  // Validate form fields
  const validateForm = () => {
    const errors = {}

    if (!formData.title.trim()) {
      errors.title = 'Event title is required'
    } else if (formData.title.length < 3) {
      errors.title = 'Event title must be at least 3 characters'
    } else if (formData.title.length > 100) {
      errors.title = 'Event title must be less than 100 characters'
    }

    if (!formData.group_id) {
      errors.group_id = 'Please select a group for this event'
    }

    if (!formData.event_date) {
      errors.event_date = 'Event date is required'
    } else {
      const selectedDate = new Date(formData.event_date + 'T' + (formData.event_time || '00:00'))
      const now = new Date()
      if (selectedDate <= now) {
        errors.event_date = 'Event date must be in the future'
      }
    }

    if (!formData.event_time) {
      errors.event_time = 'Event time is required'
    }

    if (formData.description && formData.description.length > 500) {
      errors.description = 'Description must be less than 500 characters'
    }

    if (formData.location && formData.location.length > 200) {
      errors.location = 'Location must be less than 200 characters'
    }

    return errors
  }

  // Format datetime for API
  const formatDateTime = () => {
    if (!formData.event_date || !formData.event_time) return ''
    return `${formData.event_date}T${formData.event_time}:00`
  }

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validate form
    const errors = validateForm()
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setIsLoading(true)
    setError('')
    setFieldErrors({})

    try {
      const eventDateTime = formatDateTime()
      
      const response = await fetch(`${API_URL}/api/events/${formData.group_id}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title.trim(),
          description: formData.description.trim(),
          event_date: eventDateTime,
          location: formData.location.trim()
        })
      })

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/')
          return
        }
        
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to create event')
      }

      const data = await response.json()
      
      if (onEventCreated) {
        onEventCreated(data.data)
      }

    } catch (error) {
      console.error('Error creating event:', error)
      setError(error.message || 'Failed to create event. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Get minimum date (today)
  const getMinDate = () => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  }

  // Get minimum time (current time if date is today)
  const getMinTime = () => {
    if (!formData.event_date) return ''
    
    const today = new Date()
    const selectedDate = new Date(formData.event_date)
    
    if (selectedDate.toDateString() === today.toDateString()) {
      // If today, minimum time is current time + 1 hour
      const minTime = new Date(today.getTime() + 60 * 60 * 1000)
      return minTime.toTimeString().slice(0, 5)
    }
    
    return ''
  }

  return (
    <form onSubmit={handleSubmit} className={styles.eventForm}>
      <div className={styles.formHeader}>
        <h2 className={styles.formTitle}>Event Details</h2>
        <p className={styles.formSubtitle}>
          Fill in the information below to create your event
        </p>
      </div>

      {error && (
        <div className={styles.errorAlert}>
          <i className="fas fa-exclamation-triangle"></i>
          <span>{error}</span>
        </div>
      )}

      <div className={styles.formGrid}>
        {/* Event Title */}
        <div className={styles.formGroup}>
          <label className={styles.label} htmlFor="title">
            Event Title *
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="Enter event title"
            className={`${styles.input} ${fieldErrors.title ? styles.error : ''}`}
            disabled={isLoading}
            maxLength={100}
          />
          {fieldErrors.title && (
            <span className={styles.fieldError}>{fieldErrors.title}</span>
          )}
          <div className={styles.charCount}>
            {formData.title.length}/100
          </div>
        </div>

        {/* Group Selection */}
        <div className={styles.formGroup}>
          <label className={styles.label} htmlFor="group_id">
            Group *
          </label>
          <select
            id="group_id"
            name="group_id"
            value={formData.group_id}
            onChange={handleChange}
            className={`${styles.select} ${fieldErrors.group_id ? styles.error : ''}`}
            disabled={isLoading}
          >
            <option value="">Select a group</option>
            {userGroups.map(group => (
              <option key={group.id} value={group.id}>
                {group.title}
              </option>
            ))}
          </select>
          {fieldErrors.group_id && (
            <span className={styles.fieldError}>{fieldErrors.group_id}</span>
          )}
        </div>

        {/* Event Date */}
        <div className={styles.formGroup}>
          <label className={styles.label} htmlFor="event_date">
            Date *
          </label>
          <input
            type="date"
            id="event_date"
            name="event_date"
            value={formData.event_date}
            onChange={handleChange}
            min={getMinDate()}
            className={`${styles.input} ${fieldErrors.event_date ? styles.error : ''}`}
            disabled={isLoading}
          />
          {fieldErrors.event_date && (
            <span className={styles.fieldError}>{fieldErrors.event_date}</span>
          )}
        </div>

        {/* Event Time */}
        <div className={styles.formGroup}>
          <label className={styles.label} htmlFor="event_time">
            Time *
          </label>
          <input
            type="time"
            id="event_time"
            name="event_time"
            value={formData.event_time}
            onChange={handleChange}
            min={getMinTime()}
            className={`${styles.input} ${fieldErrors.event_time ? styles.error : ''}`}
            disabled={isLoading}
          />
          {fieldErrors.event_time && (
            <span className={styles.fieldError}>{fieldErrors.event_time}</span>
          )}
        </div>
      </div>

      {/* Location */}
      <div className={styles.formGroup}>
        <label className={styles.label} htmlFor="location">
          Location
        </label>
        <input
          type="text"
          id="location"
          name="location"
          value={formData.location}
          onChange={handleChange}
          placeholder="Enter event location (optional)"
          className={`${styles.input} ${fieldErrors.location ? styles.error : ''}`}
          disabled={isLoading}
          maxLength={200}
        />
        {fieldErrors.location && (
          <span className={styles.fieldError}>{fieldErrors.location}</span>
        )}
        <div className={styles.charCount}>
          {formData.location.length}/200
        </div>
      </div>

      {/* Description */}
      <div className={styles.formGroup}>
        <label className={styles.label} htmlFor="description">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Describe your event (optional)"
          rows={4}
          className={`${styles.textarea} ${fieldErrors.description ? styles.error : ''}`}
          disabled={isLoading}
          maxLength={500}
        />
        {fieldErrors.description && (
          <span className={styles.fieldError}>{fieldErrors.description}</span>
        )}
        <div className={styles.charCount}>
          {formData.description.length}/500
        </div>
      </div>

      {/* Form Actions */}
      <div className={styles.formActions}>
        <button
          type="button"
          onClick={onCancel}
          className={styles.cancelBtn}
          disabled={isLoading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className={styles.submitBtn}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <div className={styles.loadingSpinner}></div>
              Creating...
            </>
          ) : (
            <>
              <i className="fas fa-calendar-plus"></i>
              Create Event
            </>
          )}
        </button>
      </div>
    </form>
  )
}