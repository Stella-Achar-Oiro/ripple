'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import styles from './CommentForm.module.css'

export default function CommentForm({ postId, onCommentAdded }) {
  const [comment, setComment] = useState('')
  const [selectedImage, setSelectedImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  
  const fileInputRef = useRef(null)
  const router = useRouter()
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

  const handleImageSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file')
        return
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size must be less than 5MB')
        return
      }

      setSelectedImage(file)
      
      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target.result)
      }
      reader.readAsDataURL(file)
      setError('')
    }
  }

  const removeImage = () => {
    setSelectedImage(null)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!comment.trim() && !selectedImage) {
      setError('Please enter a comment or select an image')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('content', comment.trim())
      
      if (selectedImage) {
        formData.append('image', selectedImage)
      }

      const response = await fetch(`${API_URL}/api/posts/comment/${postId}`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      })

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/')
          return
        }
        throw new Error('Failed to add comment')
      }

      const data = await response.json()
      
      // Reset form
      setComment('')
      setSelectedImage(null)
      setImagePreview(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      // Notify parent component
      if (onCommentAdded) {
        onCommentAdded(data.data?.comment)
      }

    } catch (error) {
      console.error('Error adding comment:', error)
      setError('Failed to add comment. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className={styles.commentForm} onSubmit={handleSubmit}>
      {error && (
        <div className={styles.errorMessage}>
          {error}
        </div>
      )}

      <div className={styles.commentInputWrapper}>
        <div className={styles.commentAvatar}>
          <div className="user-avatar">You</div>
        </div>
        
        <div className={styles.commentInputContainer}>
          <textarea
            className={styles.commentInput}
            placeholder="Write a comment..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            disabled={isSubmitting}
          />

          {imagePreview && (
            <div className={styles.imagePreview}>
              <img src={imagePreview} alt="Preview" />
              <button
                type="button"
                className={styles.removeImageButton}
                onClick={removeImage}
                disabled={isSubmitting}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
          )}

          <div className={styles.commentActions}>
            <div className={styles.commentTools}>
              <button
                type="button"
                className={styles.imageButton}
                onClick={() => fileInputRef.current?.click()}
                disabled={isSubmitting}
                title="Add image"
              >
                <i className="fas fa-image"></i>
              </button>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className={styles.hiddenFileInput}
              />
            </div>

            <button
              type="submit"
              className={styles.submitButton}
              disabled={isSubmitting || (!comment.trim() && !selectedImage)}
            >
              {isSubmitting ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Posting...
                </>
              ) : (
                <>
                  <i className="fas fa-paper-plane"></i>
                  Post
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </form>
  )
}