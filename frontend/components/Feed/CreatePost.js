'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../contexts/AuthContext'
import styles from './CreatePost.module.css'

export default function CreatePost({ onPostCreated }) {
  const [postContent, setPostContent] = useState('')
  const [privacy, setPrivacy] = useState('public')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAuth()

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
    
    // Check authentication before allowing post creation
    if (!isAuthenticated) {
      setError('You must be logged in to create a post')
      router.push('/')
      return
    }
    
    if (!postContent.trim() && !imageFile) return

    setIsLoading(true)
    setError('')

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
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
          if (uploadResponse.status === 401) {
            console.log('User not authenticated, redirecting to login')
            router.push('/')
            return
          }
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
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          content: postContent.trim(),
          privacy_level: privacy.toLowerCase(),
          image_path: imagePath,
        }),
        credentials: 'include',
      })

      if (!response.ok) {
        if (response.status === 401) {
          console.log('User not authenticated, redirecting to login')
          router.push('/')
          return
        }
        
        let errorMessage = 'Failed to create post'
        try {
          const data = await response.json()
          errorMessage = data.message || errorMessage
        } catch {
          errorMessage = `Server error: ${response.status}`
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()

      // Clear the form after successful post
      setPostContent('')
      setImageFile(null)
      setImagePreview(null)
      
      // Trigger refresh of posts list
      if (onPostCreated) {
        onPostCreated(data.data)
      }
    } catch (err) {
      setError(err.message || 'An error occurred while creating the post')
      console.error('Post creation error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Show loading state while authentication is being verified
  if (authLoading) {
    return (
      <div className="card">
        <div className={styles.createPost}>
          <div className={styles.createPostHeader}>
            <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
              Loading...
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Don't show create post form if not authenticated
  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="card">
      <form onSubmit={handleSubmit} className={styles.createPost}>
        <div className={styles.createPostHeader}>
          <div className="user-avatar">JD</div>
          <textarea 
            className={styles.postInput}
            placeholder="What's on your mind, John?"
            value={postContent}
            onChange={(e) => setPostContent(e.target.value)}
            disabled={isLoading || authLoading}
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
              type="submit"
              className="btn-primary"
              disabled={(!postContent.trim() && !imageFile) || isLoading}
            >
              {isLoading ? 'Posting...' : 'Post'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
