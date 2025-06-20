'use client'

import { useState, useEffect, useRef } from 'react'
import styles from './GroupSettingsModal.module.css'

export default function GroupSettingsModal({ isOpen, onClose, onGroupUpdated, group }) {
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
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

  // Initialize form data when group changes
  useEffect(() => {
    if (group) {
      setFormData({
        title: group.title || '',
        description: group.description || ''
      })
      setAvatarPreview(group.avatar_path ? `${API_URL}${group.avatar_path}` : null)
      setCoverPreview(group.cover_path ? `${API_URL}${group.cover_path}` : null)
    }
  }, [group, API_URL])

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
    if (file) {
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({
          ...prev,
          avatar: 'Avatar image must be less than 5MB'
        }))
        return
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({
          ...prev,
          avatar: 'Please select a valid image file'
        }))
        return
      }

      setAvatarFile(file)
      setAvatarPreview(URL.createObjectURL(file))
      
      // Clear any previous errors
      setErrors(prev => ({
        ...prev,
        avatar: ''
      }))
    }
  }

  const handleCoverChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        setErrors(prev => ({
          ...prev,
          cover: 'Cover image must be less than 10MB'
        }))
        return
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({
          ...prev,
          cover: 'Please select a valid image file'
        }))
        return
      }

      setCoverFile(file)
      setCoverPreview(URL.createObjectURL(file))
      
      // Clear any previous errors
      setErrors(prev => ({
        ...prev,
        cover: ''
      }))
    }
  }

  const uploadImage = async (file, type) => {
    const formData = new FormData()
    formData.append('image', file)

    const endpoint = type === 'avatar' ? '/api/upload/group-avatar' : '/api/upload/group-cover'
    
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      credentials: 'include',
      body: formData
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || `Failed to upload ${type}`)
    }

    const data = await response.json()
    return data.data.path
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setErrors({})

    try {
      let avatarPath = group.avatar_path
      let coverPath = group.cover_path

      // Upload new avatar if selected
      if (avatarFile) {
        avatarPath = await uploadImage(avatarFile, 'avatar')
      }

      // Upload new cover if selected
      if (coverFile) {
        coverPath = await uploadImage(coverFile, 'cover')
      }

      // Update group
      const response = await fetch(`${API_URL}/api/groups/${group.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          title: formData.title.trim(),
          description: formData.description.trim(),
          avatar_path: avatarPath,
          cover_path: coverPath
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        if (errorData.errors) {
          // Handle validation errors
          const newErrors = {}
          errorData.errors.forEach(error => {
            newErrors[error.field] = error.message
          })
          setErrors(newErrors)
        } else {
          setErrors({ general: errorData.error || 'Failed to update group' })
        }
        return
      }

      const data = await response.json()
      onGroupUpdated(data.data.group)
      handleClose()
    } catch (error) {
      console.error('Error updating group:', error)
      setErrors({ general: error.message || 'Failed to update group' })
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

  const removeAvatar = () => {
    setAvatarFile(null)
    setAvatarPreview(null)
    if (avatarInputRef.current) {
      avatarInputRef.current.value = ''
    }
  }

  const removeCover = () => {
    setCoverFile(null)
    setCoverPreview(null)
    if (coverInputRef.current) {
      coverInputRef.current.value = ''
    }
  }

  if (!isOpen || !group) return null

  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Edit Group Settings</h2>
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
            <label htmlFor="title">Group Name *</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Enter group name"
              disabled={isLoading}
              className={errors.title ? styles.inputError : ''}
            />
            {errors.title && (
              <span className={styles.errorMessage}>{errors.title}</span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Describe your group..."
              rows={4}
              disabled={isLoading}
              className={errors.description ? styles.inputError : ''}
            />
            {errors.description && (
              <span className={styles.errorMessage}>{errors.description}</span>
            )}
          </div>

          <div className={styles.imageSection}>
            <div className={styles.imageGroup}>
              <label>Cover Photo</label>
              <div 
                className={styles.coverUpload}
                onClick={() => !isLoading && coverInputRef.current?.click()}
                style={{
                  backgroundImage: coverPreview ? `url(${coverPreview})` : 'none'
                }}
              >
                {!coverPreview && (
                  <div className={styles.uploadPlaceholder}>
                    <i className="fas fa-image"></i>
                    <span>Click to add cover photo</span>
                  </div>
                )}
                {coverPreview && (
                  <div className={styles.imageOverlay}>
                    <button
                      type="button"
                      className={styles.removeImageButton}
                      onClick={(e) => {
                        e.stopPropagation()
                        removeCover()
                      }}
                      disabled={isLoading}
                    >
                      <i className="fas fa-trash"></i>
                    </button>
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
              {errors.cover && (
                <span className={styles.errorMessage}>{errors.cover}</span>
              )}
            </div>

            <div className={styles.imageGroup}>
              <label>Group Avatar</label>
              <div 
                className={styles.avatarUpload}
                onClick={() => !isLoading && avatarInputRef.current?.click()}
              >
                {avatarPreview ? (
                  <img 
                    src={avatarPreview} 
                    alt="Group avatar preview" 
                    className={styles.avatarPreviewImage}
                  />
                ) : (
                  <div className={styles.avatarPlaceholder}>
                    <i className="fas fa-users"></i>
                  </div>
                )}
                <div className={styles.avatarOverlay}>
                  {avatarPreview && (
                    <button
                      type="button"
                      className={styles.removeImageButton}
                      onClick={(e) => {
                        e.stopPropagation()
                        removeAvatar()
                      }}
                      disabled={isLoading}
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  )}
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
              {errors.avatar && (
                <span className={styles.errorMessage}>{errors.avatar}</span>
              )}
            </div>
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
              {isLoading ? 'Updating...' : 'Update Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
