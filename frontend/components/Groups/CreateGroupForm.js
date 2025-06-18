'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiPost, isAuthError, getErrorMessage } from '../../utils/api'
import styles from './CreateGroupForm.module.css'

export default function CreateGroupForm({ onClose, onGroupCreated }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_private: false,
    icon: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [validationErrors, setValidationErrors] = useState({})

  const router = useRouter()

  // Available icons for groups
  const availableIcons = [
    { icon: 'fas fa-users', label: 'General' },
    { icon: 'fas fa-camera', label: 'Photography' },
    { icon: 'fas fa-code', label: 'Programming' },
    { icon: 'fas fa-music', label: 'Music' },
    { icon: 'fas fa-book', label: 'Reading' },
    { icon: 'fas fa-gamepad', label: 'Gaming' },
    { icon: 'fas fa-utensils', label: 'Food & Cooking' },
    { icon: 'fas fa-map-marked-alt', label: 'Travel' },
    { icon: 'fas fa-dumbbell', label: 'Fitness' },
    { icon: 'fas fa-palette', label: 'Art & Design' },
    { icon: 'fas fa-briefcase', label: 'Business' },
    { icon: 'fas fa-graduation-cap', label: 'Education' },
    { icon: 'fas fa-heart', label: 'Health & Wellness' },
    { icon: 'fas fa-leaf', label: 'Nature' },
    { icon: 'fas fa-film', label: 'Movies & TV' },
    { icon: 'fas fa-shopping-bag', label: 'Shopping' }
  ]

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))

    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  // Validate form
  const validateForm = () => {
    const errors = {}

    if (!formData.name.trim()) {
      errors.name = 'Group name is required'
    } else if (formData.name.trim().length < 3) {
      errors.name = 'Group name must be at least 3 characters'
    } else if (formData.name.trim().length > 50) {
      errors.name = 'Group name must be less than 50 characters'
    }

    if (!formData.description.trim()) {
      errors.description = 'Group description is required'
    } else if (formData.description.trim().length < 10) {
      errors.description = 'Description must be at least 10 characters'
    } else if (formData.description.trim().length > 500) {
      errors.description = 'Description must be less than 500 characters'
    }

    if (!formData.icon) {
      errors.icon = 'Please select an icon for your group'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const groupData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        is_private: formData.is_private,
        icon: formData.icon
      }

      const response = await apiPost('/api/groups', groupData)
      
      // Success - close form and refresh
      if (onGroupCreated) {
        onGroupCreated(response.data)
      }
      
      // Optionally navigate to the new group
      if (response.data?.id) {
        router.push(`/groups/${response.data.id}`)
      }
      
    } catch (error) {
      if (isAuthError(error)) {
        router.push('/')
        return
      }
      
      const errorMessage = getErrorMessage(error)
      setError(errorMessage)
      
      // Handle specific validation errors from backend
      if (error.status === 400 && error.response) {
        try {
          const errorData = await error.response.json()
          if (errorData.validation_errors) {
            setValidationErrors(errorData.validation_errors)
          }
        } catch (e) {
          // Ignore JSON parsing errors
        }
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle backdrop click to close
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div className={styles.overlay} onClick={handleBackdropClick}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>Create New Group</h2>
          <button 
            className={styles.closeBtn}
            onClick={onClose}
            disabled={isSubmitting}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          {/* Group Name */}
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="name">
              Group Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className={`${styles.input} ${validationErrors.name ? styles.error : ''}`}
              placeholder="Enter group name..."
              maxLength={50}
              disabled={isSubmitting}
            />
            {validationErrors.name && (
              <span className={styles.errorText}>{validationErrors.name}</span>
            )}
            <div className={styles.charCount}>
              {formData.name.length}/50
            </div>
          </div>

          {/* Group Description */}
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="description">
              Description *
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className={`${styles.textarea} ${validationErrors.description ? styles.error : ''}`}
              placeholder="Describe what your group is about..."
              rows={4}
              maxLength={500}
              disabled={isSubmitting}
            />
            {validationErrors.description && (
              <span className={styles.errorText}>{validationErrors.description}</span>
            )}
            <div className={styles.charCount}>
              {formData.description.length}/500
            </div>
          </div>

          {/* Group Icon */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Choose an Icon *
            </label>
            <div className={styles.iconGrid}>
              {availableIcons.map((iconOption) => (
                <button
                  key={iconOption.icon}
                  type="button"
                  className={`${styles.iconOption} ${
                    formData.icon === iconOption.icon ? styles.selected : ''
                  }`}
                  onClick={() => setFormData(prev => ({ ...prev, icon: iconOption.icon }))}
                  disabled={isSubmitting}
                  title={iconOption.label}
                >
                  <i className={iconOption.icon}></i>
                  <span className={styles.iconLabel}>{iconOption.label}</span>
                </button>
              ))}
            </div>
            {validationErrors.icon && (
              <span className={styles.errorText}>{validationErrors.icon}</span>
            )}
          </div>

          {/* Privacy Setting */}
          <div className={styles.formGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                name="is_private"
                checked={formData.is_private}
                onChange={handleInputChange}
                className={styles.checkbox}
                disabled={isSubmitting}
              />
              <span className={styles.checkboxText}>
                <strong>Private Group</strong>
                <small>Only invited members can join and see content</small>
              </span>
            </label>
          </div>

          {/* Error Message */}
          {error && (
            <div className={styles.errorMessage}>
              <i className="fas fa-exclamation-triangle"></i>
              {error}
            </div>
          )}

          {/* Form Actions */}
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className={styles.loadingSpinner}></div>
                  Creating...
                </>
              ) : (
                <>
                  <i className="fas fa-plus"></i>
                  Create Group
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}