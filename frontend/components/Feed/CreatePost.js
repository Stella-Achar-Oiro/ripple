'use client'

import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import styles from './CreatePost.module.css'

export default function CreatePost() {
  const { user } = useAuth()
  const [postContent, setPostContent] = useState('')
  const [privacy, setPrivacy] = useState('public')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [mediaFile, setMediaFile] = useState(null)
  const [mediaPreview, setMediaPreview] = useState(null)

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handlePrivacyChange = (newPrivacy) => {
    setPrivacy(newPrivacy)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!postContent.trim() && !imageFile) return

    setIsLoading(true)
    setError('')

    try {
      let imagePath = null

      // If there's an image, upload it first
      if (imageFile) {
        const formData = new FormData()
        formData.append('image', imageFile)

        const uploadResponse = await fetch(`${API_URL}/api/upload/post-image`, {
          method: 'POST',
          body: formData,
          credentials: 'include',
        })

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload image')
        }

        const uploadData = await uploadResponse.json()
        imagePath = uploadData.data.file_path
      }

      // Create the post
      const response = await fetch(`${API_URL}/api/posts`, {
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

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create post')
      }

      // Clear the form after successful post
      setPostContent('')
      setImageFile(null)
      setImagePreview(null)
      // You might want to trigger a refresh of the posts list here
      // This can be done through a callback prop or using a state management solution
    } catch (err) {
      setError(err.message || 'An error occurred while creating the post')
      console.error('Post creation error:', err)
    } finally {
      setIsLoading(false)
    }
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
        {imagePreview && (
          <div className={styles.imagePreview}>
            <img src={imagePreview} alt="Preview" />
            <button 
              className={styles.removeImage}
              onClick={() => {
                setImageFile(null)
                setImagePreview(null)
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
                onChange={handleImageChange}
                style={{ display: 'none' }}
                disabled={isLoading}
              />
              <i className="fas fa-image"></i>
              Photo
            </label>
            <div className={styles.postOption}>
              <i className="fas fa-video"></i>
              Video
            </div>
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
              disabled={(!postContent.trim() && !imageFile) || isLoading}
            >
              {isLoading ? 'Posting...' : 'Post'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
