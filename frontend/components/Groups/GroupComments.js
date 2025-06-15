'use client'

import { useState, useEffect } from 'react'
import styles from './GroupComments.module.css'

export default function GroupComments({ postId, isGroupMember, onCommentAdded }) {
  const [comments, setComments] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [newComment, setNewComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)

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

  const fetchComments = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`${API_URL}/api/groups/comments/get/${postId}`, {
        credentials: 'include',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Failed to fetch comments')
      }

      const data = await response.json()
      if (data.success && data.data && data.data.comments) {
        setComments(data.data.comments)
      } else {
        setComments([])
      }
    } catch (err) {
      setError(err.message || 'An error occurred while fetching comments')
      console.error('Error fetching comments:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (postId) {
      fetchComments()
    }
  }, [postId])

  const handleSubmitComment = async (e) => {
    e.preventDefault()
    if ((!newComment.trim() && !imageFile) || !isGroupMember) return

    setIsSubmitting(true)
    setError('')

    try {
      let imagePath = null

      // If there's an image, upload it first
      if (imageFile) {
        const formData = new FormData()
        formData.append('image', imageFile)

        const uploadResponse = await fetch(`${API_URL}/api/upload/comment`, {
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

      const response = await fetch(`${API_URL}/api/groups/comments/${postId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newComment.trim(),
          image_path: imagePath,
        }),
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create comment')
      }

      // Clear the inputs
      setNewComment('')
      setImageFile(null)
      setImagePreview(null)

      // Refresh comments
      await fetchComments()

      // Notify parent component
      if (onCommentAdded) {
        onCommentAdded()
      }
    } catch (err) {
      setError(err.message || 'An error occurred while creating the comment')
      console.error('Comment creation error:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getAuthorInitials = (author) => {
    if (!author) return 'U'
    const firstInitial = author.first_name?.[0] || ''
    const lastInitial = author.last_name?.[0] || ''
    return (firstInitial + lastInitial).toUpperCase() || 'U'
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now - date) / (1000 * 60 * 60)

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now - date) / (1000 * 60))
      return diffInMinutes <= 1 ? 'Just now' : `${diffInMinutes}m ago`
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  if (isLoading) {
    return (
      <div className={styles.commentsSection}>
        <div className={styles.loadingContainer}>
          <i className="fas fa-spinner fa-spin"></i>
          <span>Loading comments...</span>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.commentsSection}>
      {error && (
        <div className={styles.errorMessage}>
          {error}
        </div>
      )}

      {/* Comments List */}
      <div className={styles.commentsList}>
        {comments.length === 0 ? (
          <div className={styles.noComments}>
            <p>No comments yet. {isGroupMember ? 'Be the first to comment!' : ''}</p>
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className={styles.comment}>
              <div className={styles.commentAvatar}>
                {comment.author?.avatar_path ? (
                  <img
                    src={`${API_URL}${comment.author.avatar_path}`}
                    alt={`${comment.author.first_name} ${comment.author.last_name}`}
                  />
                ) : (
                  <div className={styles.avatarPlaceholder}>
                    {getAuthorInitials(comment.author)}
                  </div>
                )}
              </div>
              <div className={styles.commentContent}>
                <div className={styles.commentHeader}>
                  <span className={styles.commentAuthor}>
                    {comment.author?.first_name} {comment.author?.last_name}
                  </span>
                  <span className={styles.commentTime}>
                    {formatDate(comment.created_at)}
                  </span>
                </div>
                <div className={styles.commentText}>
                  {comment.content}
                </div>
                {comment.image_path && (
                  <div className={styles.commentImage}>
                    <img
                      src={`${API_URL}${comment.image_path}`}
                      alt="Comment attachment"
                    />
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Comment Form - Only for group members */}
      {isGroupMember && (
        <form onSubmit={handleSubmitComment} className={styles.commentForm}>
          {imagePreview && (
            <div className={styles.imagePreview}>
              <img src={imagePreview} alt="Preview" />
              <button
                type="button"
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
          <div className={styles.commentInputContainer}>
            <div className={styles.commentAvatar}>
              {/* TODO: Replace with actual user avatar */}
              <div className={styles.avatarPlaceholder}>U</div>
            </div>
            <input
              type="text"
              className={styles.commentInput}
              placeholder="Write a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              disabled={isSubmitting}
            />
            <label className={styles.imageUploadButton}>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                style={{ display: 'none' }}
                disabled={isSubmitting}
              />
              <i className="fas fa-image"></i>
            </label>
            <button
              type="submit"
              className={styles.commentSubmit}
              disabled={isSubmitting || (!newComment.trim() && !imageFile)}
            >
              {isSubmitting ? (
                <i className="fas fa-spinner fa-spin"></i>
              ) : (
                <i className="fas fa-paper-plane"></i>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
