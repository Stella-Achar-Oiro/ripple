'use client'

import { useState } from 'react'
import styles from './CreateGroupModal.module.css'

export default function CreateGroupModal({ isOpen, onClose, onGroupCreated }) {
  const [formData, setFormData] = useState({
    title: '',
    description: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState({})

  const handleInputChange = (e) => {
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
      newErrors.title = 'Group title is required'
    } else if (formData.title.trim().length < 3) {
      newErrors.title = 'Group title must be at least 3 characters'
    } else if (formData.title.trim().length > 100) {
      newErrors.title = 'Group title must be less than 100 characters'
    }
    
    if (formData.description.trim().length > 500) {
      newErrors.description = 'Description must be less than 500 characters'
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
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
      
      const response = await fetch(`${API_URL}/api/groups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title.trim(),
          description: formData.description.trim()
        }),
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.errors) {
          // Handle validation errors from backend
          setErrors(data.errors)
        } else {
          throw new Error(data.message || 'Failed to create group')
        }
        return
      }

      // Success - reset form and close modal
      setFormData({ title: '', description: '' })
      setErrors({})
      onClose()
      
      // Notify parent component about successful creation
      if (onGroupCreated) {
        onGroupCreated(data.data.group)
      }

    } catch (err) {
      setErrors({ 
        general: err.message || 'An error occurred while creating the group' 
      })
      console.error('Group creation error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      setFormData({ title: '', description: '' })
      setErrors({})
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Create New Group</h2>
          <button 
            className={styles.closeButton}
            onClick={handleClose}
            disabled={isLoading}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="title" className={styles.label}>
              Group Title *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className={`${styles.input} ${errors.title ? styles.inputError : ''}`}
              placeholder="Enter group title"
              disabled={isLoading}
              maxLength={100}
            />
            {errors.title && (
              <span className={styles.errorMessage}>{errors.title}</span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="description" className={styles.label}>
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className={`${styles.textarea} ${errors.description ? styles.inputError : ''}`}
              placeholder="Describe what this group is about (optional)"
              disabled={isLoading}
              rows={4}
              maxLength={500}
            />
            <div className={styles.charCount}>
              {formData.description.length}/500
            </div>
            {errors.description && (
              <span className={styles.errorMessage}>{errors.description}</span>
            )}
          </div>

          {errors.general && (
            <div className={styles.generalError}>{errors.general}</div>
          )}

          <div className={styles.formActions}>
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
              disabled={isLoading || !formData.title.trim()}
            >
              {isLoading ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
