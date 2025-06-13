'use client'

import { useState, useRef } from 'react'
import styles from './CreateGroupModal.module.css'

export default function CreateGroupModal({ isOpen, onClose, onGroupCreated }) {
  const [formData, setFormData] = useState({
    title: '',
    description: ''
  })
  const [avatarFile, setAvatarFile] = useState(null)
  const [coverFile, setCoverFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [coverPreview, setCoverPreview] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState({})

  const avatarInputRef = useRef(null)
  const coverInputRef = useRef(null)

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

  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      setErrors(prev => ({
        ...prev,
        avatar: 'Image size should be less than 5MB'
      }))
      return
    }

    if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
      setErrors(prev => ({
        ...prev,
        avatar: 'Only JPEG, PNG and GIF images are allowed'
      }))
      return
    }

    setAvatarFile(file)
    const reader = new FileReader()
    reader.onload = (e) => {
      setAvatarPreview(e.target.result)
    }
    reader.readAsDataURL(file)
    setErrors(prev => ({ ...prev, avatar: '' }))
  }

  const handleCoverChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) { // 10MB limit for cover photos
      setErrors(prev => ({
        ...prev,
        cover: 'Image size should be less than 10MB'
      }))
      return
    }

    if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
      setErrors(prev => ({
        ...prev,
        cover: 'Only JPEG, PNG and GIF images are allowed'
      }))
      return
    }

    setCoverFile(file)
    const reader = new FileReader()
    reader.onload = (e) => {
      setCoverPreview(e.target.result)
    }
    reader.readAsDataURL(file)
    setErrors(prev => ({ ...prev, cover: '' }))
  }

  const uploadFile = async (file, type) => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
    const formData = new FormData()

    if (type === 'avatar') {
      formData.append('avatar', file)
    } else {
      formData.append('cover', file)
    }

    const endpoint = type === 'avatar' ? 'group-avatar' : 'group-cover'
    const response = await fetch(`${API_URL}/api/upload/${endpoint}`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    })

    if (!response.ok) {
      throw new Error(`Failed to upload ${type}`)
    }

    const data = await response.json()
    return data.data.file_path
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

      // Upload images first if they exist
      let avatarPath = null
      let coverPath = null

      if (avatarFile) {
        avatarPath = await uploadFile(avatarFile, 'avatar')
      }

      if (coverFile) {
        coverPath = await uploadFile(coverFile, 'cover')
      }

      const response = await fetch(`${API_URL}/api/groups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title.trim(),
          description: formData.description.trim(),
          avatar_path: avatarPath,
          cover_path: coverPath
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
      setAvatarFile(null)
      setCoverFile(null)
      setAvatarPreview(null)
      setCoverPreview(null)
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
      setAvatarFile(null)
      setCoverFile(null)
      setAvatarPreview(null)
      setCoverPreview(null)
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

          {/* Cover Photo Section */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Cover Photo <span className={styles.optional}>(optional)</span>
            </label>
            <div className={styles.coverContainer}>
              <div
                className={styles.coverPreview}
                style={{
                  backgroundImage: coverPreview ? `url(${coverPreview})` : 'none'
                }}
                onClick={() => coverInputRef.current?.click()}
              >
                {!coverPreview && (
                  <div className={styles.coverPlaceholder}>
                    <i className="fas fa-image"></i>
                    <span>Click to add cover photo</span>
                  </div>
                )}
                {coverPreview && (
                  <div className={styles.coverOverlay}>
                    <i className="fas fa-camera"></i>
                    <span>Change Cover</span>
                  </div>
                )}
              </div>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                onChange={handleCoverChange}
                style={{ display: 'none' }}
                disabled={isLoading}
              />
            </div>
            {errors.cover && (
              <span className={styles.errorMessage}>{errors.cover}</span>
            )}
          </div>

          {/* Avatar Section */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Group Avatar <span className={styles.optional}>(optional)</span>
            </label>
            <div className={styles.avatarContainer}>
              <div
                className={styles.avatarPreview}
                onClick={() => avatarInputRef.current?.click()}
              >
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Avatar preview"
                    className={styles.avatarImage}
                  />
                ) : (
                  <div className={styles.avatarPlaceholder}>
                    <i className="fas fa-users"></i>
                  </div>
                )}
                <div className={styles.avatarOverlay}>
                  <i className="fas fa-camera"></i>
                </div>
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                style={{ display: 'none' }}
                disabled={isLoading}
              />
            </div>
            {errors.avatar && (
              <span className={styles.errorMessage}>{errors.avatar}</span>
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
