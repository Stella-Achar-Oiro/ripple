'use client'

import { useState } from 'react'
import styles from './CreateGroupPost.module.css'

export default function CreateGroupPost({ groupId, onPostCreated }) {
  const [postContent, setPostContent] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [imageInfo, setImageInfo] = useState(null)

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

  // Helper function to format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setImageFile(file)

      // Store file info
      setImageInfo({
        name: file.name,
        size: file.size,
        type: file.type
      })

      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result)

        // Get image dimensions
        const img = new Image()
        img.onload = () => {
          setImageInfo(prev => ({
            ...prev,
            width: img.width,
            height: img.height
          }))
        }
        img.src = reader.result
      }
      reader.readAsDataURL(file)
    }
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

        const uploadResponse = await fetch(`${API_URL}/api/upload/post`, {
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

      // Create the group post
      const response = await fetch(`${API_URL}/api/groups/posts/${groupId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: postContent.trim(),
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
      setImageInfo(null)
      
      // Notify parent component
      if (onPostCreated) {
        onPostCreated()
      }
    } catch (err) {
      setError(err.message || 'An error occurred while creating the post')
      console.error('Group post creation error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="card">
      <div className={styles.createPost}>
        <div className={styles.createPostHeader}>
          <div className="user-avatar">
            {/* TODO: Replace with actual user avatar */}
            U
          </div>
          <textarea 
            className={styles.postInput}
            placeholder="Share something with the group..."
            value={postContent}
            onChange={(e) => setPostContent(e.target.value)}
            disabled={isLoading}
          />
        </div>
        
        {imagePreview && (
          <div className={styles.imagePreview}>
            <img src={imagePreview} alt="Preview" />
            {imageInfo && (
              <div className={styles.imageInfo}>
                <span className={styles.imageName}>{imageInfo.name}</span>
                <span className={styles.imageDetails}>
                  {imageInfo.width && imageInfo.height &&
                    `${imageInfo.width} × ${imageInfo.height} • `
                  }
                  {formatFileSize(imageInfo.size)}
                </span>
              </div>
            )}
            <button
              className={styles.removeImage}
              onClick={() => {
                setImageFile(null)
                setImagePreview(null)
                setImageInfo(null)
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
          </div>
          
          <button
            className={`btn-primary ${styles.postButton}`}
            onClick={handleSubmit}
            disabled={isLoading || (!postContent.trim() && !imageFile)}
          >
            {isLoading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                Posting...
              </>
            ) : (
              'Post'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
