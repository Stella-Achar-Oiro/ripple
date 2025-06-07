import { useState, useRef } from 'react'
import styles from './ProfileEditModal.module.css'

export default function ProfileEditModal({ profile, isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    first_name: profile?.first_name || '',
    last_name: profile?.last_name || '',
    nickname: profile?.nickname || '',
    about_me: profile?.about_me || ''
  })
  const [avatarFile, setAvatarFile] = useState(null)
  const [coverFile, setCoverFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(profile?.avatar_path)
  const [coverPreview, setCoverPreview] = useState(profile?.cover_path)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  
  const avatarInputRef = useRef(null)
  const coverInputRef = useRef(null)
  
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setAvatarFile(file)
      const reader = new FileReader()
      reader.onload = (e) => setAvatarPreview(e.target.result)
      reader.readAsDataURL(file)
    }
  }

  const handleCoverChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setCoverFile(file)
      const reader = new FileReader()
      reader.onload = (e) => setCoverPreview(e.target.result)
      reader.readAsDataURL(file)
    }
  }

  const uploadFile = async (file, endpoint) => {
    const formData = new FormData()
    const fieldName = endpoint === 'avatar' ? 'avatar' : 'cover'
    formData.append(fieldName, file)

    const response = await fetch(`${API_URL}/api/upload/${endpoint}`, {
      method: 'POST',
      body: formData,
      credentials: 'include'
    })

    if (!response.ok) {
      throw new Error(`Failed to upload ${endpoint}`)
    }

    const result = await response.json()
    return result.data.file_path
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const updates = { ...formData }

      // Upload avatar if changed
      if (avatarFile) {
        const avatarPath = await uploadFile(avatarFile, 'avatar')
        updates.avatar_path = avatarPath
      }

      // Upload cover if changed
      if (coverFile) {
        const coverPath = await uploadFile(coverFile, 'cover')
        updates.cover_path = coverPath
      }

      // Update profile
      const response = await fetch(`${API_URL}/api/auth/profile/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates),
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to update profile')
      }

      const result = await response.json()
      onSave(result.data)
      onClose()
    } catch (err) {
      console.error('Error updating profile:', err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Edit Profile</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.editForm}>
          {error && (
            <div className={styles.errorMessage}>
              {error}
            </div>
          )}

          {/* Cover Photo Section */}
          <div className={styles.photoSection}>
            <label>Cover Photo</label>
            <div className={styles.coverContainer}>
              <div 
                className={styles.coverPreview}
                style={{
                  backgroundImage: coverPreview 
                    ? `url(${coverPreview.startsWith('/') ? API_URL + coverPreview : coverPreview})`
                    : 'none'
                }}
              >
                <button
                  type="button"
                  className={styles.photoButton}
                  onClick={() => coverInputRef.current?.click()}
                >
                  <i className="fas fa-camera"></i>
                  {coverPreview ? 'Change Cover' : 'Add Cover'}
                </button>
              </div>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                onChange={handleCoverChange}
                style={{ display: 'none' }}
              />
            </div>
          </div>

          {/* Avatar Section */}
          <div className={styles.photoSection}>
            <label>Profile Picture</label>
            <div className={styles.avatarContainer}>
              <div className={styles.avatarPreview}>
                {avatarPreview ? (
                  <img 
                    src={avatarPreview.startsWith('/') ? API_URL + avatarPreview : avatarPreview}
                    alt="Avatar preview" 
                  />
                ) : (
                  <div className={styles.avatarPlaceholder}>
                    {formData.first_name.charAt(0)}{formData.last_name.charAt(0)}
                  </div>
                )}
                <button
                  type="button"
                  className={styles.avatarButton}
                  onClick={() => avatarInputRef.current?.click()}
                >
                  <i className="fas fa-camera"></i>
                </button>
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                style={{ display: 'none' }}
              />
            </div>
          </div>

          {/* Form Fields */}
          <div className={styles.formGroup}>
            <label htmlFor="first_name">First Name</label>
            <input
              type="text"
              id="first_name"
              name="first_name"
              value={formData.first_name}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="last_name">Last Name</label>
            <input
              type="text"
              id="last_name"
              name="last_name"
              value={formData.last_name}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="nickname">Nickname</label>
            <input
              type="text"
              id="nickname"
              name="nickname"
              value={formData.nickname}
              onChange={handleInputChange}
              placeholder="Optional"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="about_me">About Me</label>
            <textarea
              id="about_me"
              name="about_me"
              value={formData.about_me}
              onChange={handleInputChange}
              placeholder="Tell us about yourself..."
              rows={4}
            />
          </div>

          <div className={styles.modalActions}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.saveButton}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className={styles.spinner}></span>
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
