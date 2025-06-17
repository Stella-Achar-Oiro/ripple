'use client'

import { useState } from 'react'
import styles from './CreateEventModal.module.css'

export default function CreateEventModal({ isOpen, onClose, onSuccess, groupId, groupTitle }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_date: '',
    event_time: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState({})

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.title.trim()) {
      newErrors.title = 'Event title is required'
    } else if (formData.title.length > 200) {
      newErrors.title = 'Title must be less than 200 characters'
    }

    if (formData.description.length > 1000) {
      newErrors.description = 'Description must be less than 1000 characters'
    }

    if (!formData.event_date) {
      newErrors.event_date = 'Event date is required'
    } else {
      const selectedDate = new Date(formData.event_date + 'T' + (formData.event_time || '00:00'))
      const now = new Date()
      if (selectedDate <= now) {
        newErrors.event_date = 'Event must be scheduled for a future date and time'
      }
    }

    if (!formData.event_time) {
      newErrors.event_time = 'Event time is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    try {
      // Combine date and time into ISO format
      const eventDateTime = new Date(formData.event_date + 'T' + formData.event_time).toISOString()

      const response = await fetch(`${API_URL}/api/events/${groupId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          title: formData.title.trim(),
          description: formData.description.trim(),
          event_date: eventDateTime
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Failed to create event')
      }

      const data = await response.json()
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        event_date: '',
        event_time: ''
      })
      setErrors({})
      
      if (onSuccess) {
        onSuccess(data.data)
      }
      
      onClose()
    } catch (error) {
      console.error('Error creating event:', error)
      setErrors({ submit: error.message })
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      setFormData({
        title: '',
        description: '',
        event_date: '',
        event_time: ''
      })
      setErrors({})
      onClose()
    }
  }

  // Get minimum date (today) in YYYY-MM-DD format
  const getMinDate = () => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  }

  if (!isOpen) return null

  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Create New Event</h2>
          <button 
            className={styles.closeButton} 
            onClick={handleClose}
            disabled={isLoading}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {groupTitle && (
          <div className={styles.groupInfo}>
            <i className="fas fa-users"></i>
            <span>Creating event for: <strong>{groupTitle}</strong></span>
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.eventForm}>
          <div className={styles.formGroup}>
            <label htmlFor="title">Event Title *</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Enter event title..."
              maxLength={200}
              className={errors.title ? styles.error : ''}
              disabled={isLoading}
            />
            {errors.title && (
              <div className={styles.errorMessage}>{errors.title}</div>
            )}
            <div className={styles.charCount}>
              {formData.title.length}/200
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe your event..."
              rows={4}
              maxLength={1000}
              className={errors.description ? styles.error : ''}
              disabled={isLoading}
            />
            {errors.description && (
              <div className={styles.errorMessage}>{errors.description}</div>
            )}
            <div className={styles.charCount}>
              {formData.description.length}/1000
            </div>
          </div>

          <div className={styles.dateTimeRow}>
            <div className={styles.formGroup}>
              <label htmlFor="event_date">Event Date *</label>
              <input
                type="date"
                id="event_date"
                name="event_date"
                value={formData.event_date}
                onChange={handleChange}
                min={getMinDate()}
                className={errors.event_date ? styles.error : ''}
                disabled={isLoading}
              />
              {errors.event_date && (
                <div className={styles.errorMessage}>{errors.event_date}</div>
              )}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="event_time">Event Time *</label>
              <input
                type="time"
                id="event_time"
                name="event_time"
                value={formData.event_time}
                onChange={handleChange}
                className={errors.event_time ? styles.error : ''}
                disabled={isLoading}
              />
              {errors.event_time && (
                <div className={styles.errorMessage}>{errors.event_time}</div>
              )}
            </div>
          </div>

          {errors.submit && (
            <div className={styles.submitError}>
              <i className="fas fa-exclamation-triangle"></i>
              {errors.submit}
            </div>
          )}

          <div className={styles.modalActions}>
            <button
              type="button"
              className="btn-outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
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
      </div>
    </div>
  )
}