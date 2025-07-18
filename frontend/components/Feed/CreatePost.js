'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import styles from './CreatePost.module.css'

export default function CreatePost({ onPostCreated }) {
  const { user } = useAuth()
  const [postContent, setPostContent] = useState('')
  const [privacy, setPrivacy] = useState('public')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [mediaFile, setMediaFile] = useState(null)
  const [mediaPreview, setMediaPreview] = useState(null)

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  const [followers, setFollowers] = useState([])
  const [selectedFollowers, setSelectedFollowers] = useState([])

  useEffect(() => {
    if (privacy === 'private' && user?.id) {
      const fetchFollowers = async () => {
        try {
          const response = await fetch(`${API_URL}/api/follow/followers/${user.id}`, { credentials: 'include' })
          if (!response.ok) throw new Error('Failed to fetch followers')
          const result = await response.json()
          setFollowers(result.data?.followers || [])
        } catch (err) {
          setFollowers([])
        }
      }
      fetchFollowers()
    }
  }, [privacy, user])

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setMediaFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setMediaPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handlePrivacyChange = (newPrivacy) => {
    setPrivacy(newPrivacy)
    if (newPrivacy !== 'private') setSelectedFollowers([])
  }

  const handleFollowerSelect = (e) => {
    const options = Array.from(e.target.selectedOptions)
    setSelectedFollowers(options.map(opt => parseInt(opt.value)))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!postContent.trim() && !mediaFile) return

    setIsLoading(true)
    setError('')

    try {
      let imagePath = null

      // If there's a media file, upload it first
      if (mediaFile) {
        const formData = new FormData()
        formData.append('image', mediaFile)

        const response = await fetch(`${API_URL}/api/upload/post`, {
          method: 'POST',
          body: formData,
          credentials: 'include',
        })

        if (!response.ok) {
          throw new Error('Failed to upload media')
        }

        const uploadData = await response.json()
        imagePath = uploadData.data.file_path
      }

      // Create the post
      const postBody = {
        content: postContent.trim(),
        privacy_level: privacy.toLowerCase(),
        image_path: imagePath,
      }
      if (privacy === 'private' && selectedFollowers.length > 0) {
        postBody.allowed_users = selectedFollowers
      }
      const responsePost = await fetch(`${API_URL}/api/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postBody),
        credentials: 'include',
      })

      const data = await responsePost.json()

      if (!responsePost.ok) {
        throw new Error(data.message || 'Failed to create post')
      }

      // Clear the form after successful post
      setPostContent('')
      setMediaFile(null)
      setMediaPreview(null)
      setSelectedFollowers([])
      if (onPostCreated) onPostCreated()
    } catch (err) {
      setError(err.message || 'An error occurred while creating the post')
      console.error('Post creation error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const getAuthorInitials = (user) => {
    if (!user) return 'U'
    const firstInitial = user.first_name?.[0] || ''
    const lastInitial = user.last_name?.[0] || ''
    return (firstInitial + lastInitial).toUpperCase() || 'U'
  }

  return (
    <div className="card">
      <div className={styles.createPost}>
        <div className={styles.createPostHeader}>
          <div className="user-avatar">
            {user?.avatar_path ? (
              <img 
                src={`${API_URL}${user.avatar_path}`}
                alt={`${user.first_name} ${user.last_name}`}
                className={styles.avatarImage}
              />
            ) : (
              <span className={styles.avatarText}>
                {user?.first_name?.charAt(0)}{user?.last_name?.charAt(0)}
              </span>
            )}
          </div>
          <textarea 
            className={styles.postInput}
            placeholder={`What's on your mind, ${user?.first_name || 'there'}?`}
            value={postContent}
            onChange={(e) => setPostContent(e.target.value)}
            disabled={isLoading}
          />
        </div>
        {mediaPreview && (
          <div className={styles.imagePreview}>
            <img src={mediaPreview} alt="Preview" />
            <button 
              className={styles.removeImage}
              onClick={() => {
                setMediaFile(null)
                setMediaPreview(null)
              }}
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        )}
        {error && <div className={styles.errorMessage}>{error}</div>}
        <div className={styles.postActions}>
          <div className={styles.postOptions}>
            <label className={styles.postOption}>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
                disabled={isLoading}
              />
              <i className="fas fa-image"></i>
              Photo
            </label>

          </div>
          <div className={styles.postSubmitArea}>
            <div className={styles.privacySelector}>
              <select
                value={privacy}
                onChange={(e) => handlePrivacyChange(e.target.value)}
                disabled={isLoading}
              >
                <option value="public">Public</option>
                <option value="almost_private">Almost Private</option>
                <option value="private">Private</option>
              </select>
            </div>
            {privacy === 'private' && (
              <div style={{ marginTop: 12, minWidth: 200 }}>
                <label style={{ fontWeight: 500, marginBottom: 4, display: 'block' }}>Select followers who can see this post:</label>
                <select
                  multiple
                  value={selectedFollowers.map(String)}
                  onChange={handleFollowerSelect}
                  style={{ width: '100%', minHeight: 80, borderRadius: 8, border: '1px solid #ccc', padding: 6 }}
                  disabled={isLoading || followers.length === 0}
                >
                  {followers.length === 0 ? (
                    <option disabled>No followers found</option>
                  ) : (
                    followers.map(f => (
                      <option key={f.id} value={f.id}>
                        {f.first_name} {f.last_name} {f.nickname ? `(${f.nickname})` : ''}
                      </option>
                    ))
                  )}
                </select>
              </div>
            )}
            <button 
              className="btn-primary"
              onClick={handleSubmit}
              disabled={(!postContent.trim() && !mediaFile) || isLoading}
            >
              {isLoading ? 'Posting...' : 'Post'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
