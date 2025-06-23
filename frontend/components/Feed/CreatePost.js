'use client'

import { useState } from 'react'
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
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!postContent.trim() && !mediaFile) return

    setIsLoading(true)
    setError('')

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
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
      const responsePost = await fetch(`${API_URL}/api/posts/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: postContent.trim(),
          privacy_level: privacy.toLowerCase(),
          image_path: imagePath,
        }),
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
          <textarea
            className={styles.postInput}
            placeholder={`What's on your mind, ${user?.first_name || 'User'}?`}
            value={postContent}
            onChange={(e) => setPostContent(e.target.value)}
            disabled={isLoading}
          />
        </div>
        {mediaPreview && (
          <div className={styles.imagePreview}>
            {mediaFile.type.startsWith('video/') ? (
              <video src={mediaPreview} controls />
            ) : (
              <img src={mediaPreview} alt="Preview" />
            )}
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
                accept="image/*,video/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
                disabled={isLoading}
              />
              <i className="fas fa-photo-video"></i>
              Photo/Video
            </label>
            <div className={styles.postOption}>
              <i className="fas fa-smile"></i>
              Feeling
            </div>
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
