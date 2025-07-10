'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Avatar from '../shared/Avatar'
import styles from './Comments.module.css'

export default function Comments({ postId }) {
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)

  const fetchComments = async () => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
      const response = await fetch(`${API_URL}/api/posts/comments/${postId}`, {
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch comments')
      }

      setComments(data.data.comments || [])
    } catch (err) {
      setError(err.message || 'An error occurred while fetching comments')
    }
  }

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

  const removeImage = () => {
    setImageFile(null)
    setImagePreview(null)
  }

  const handleSubmitComment = async (e) => {
    e.preventDefault()
    if (!newComment.trim() && !imageFile) return

    setIsLoading(true)
    setError('')

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
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

      // Create the comment
      const response = await fetch(`${API_URL}/api/posts/comments/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postId: postId,
          content: newComment.trim(),
          image_path: imagePath,
        }),
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create comment')
      }

      setNewComment('')
      setImageFile(null)
      setImagePreview(null)
      fetchComments()
    } catch (err) {
      setError(err.message || 'An error occurred while creating the comment')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (postId) {
      fetchComments()
    }
  }, [postId])


  return (
    <div className={styles.commentsSection}>
      <form onSubmit={handleSubmitComment} className={styles.commentForm}>
        <div className={styles.commentInputContainer}>
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment..."
            disabled={isLoading}
            className={styles.commentTextarea}
          />
          <div className={styles.commentActions}>
            <label className={styles.imageUploadButton}>
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/gif"
                onChange={handleImageChange}
                style={{ display: 'none' }}
                disabled={isLoading}
              />
              📷
            </label>
            <button
              type="submit"
              disabled={isLoading || (!newComment.trim() && !imageFile)}
              className={styles.submitButton}
            >
              {isLoading ? 'Posting...' : 'Post'}
            </button>
          </div>
        </div>

        {imagePreview && (
          <div className={styles.imagePreview}>
            <img src={imagePreview} alt="Preview" className={styles.previewImage} />
            <button
              type="button"
              onClick={removeImage}
              className={styles.removeImageButton}
              disabled={isLoading}
            >
              ✕
            </button>
          </div>
        )}
      </form>
      <div className={styles.commentsList}>
        {error && <div className={styles.error}>{error}</div>}
        {comments.length > 0 ? (
          comments.map((comment) => (
            <div key={comment.id} className={styles.comment}>
               <div className={styles.commentHeader}>
                <Link href={`/profile/${comment.author?.id}`} className={styles.avatarLink}>
                  <Avatar user={comment.author} size="small" />
                </Link>
                <div className={styles.commentDetails}>
                  <Link href={`/profile/${comment.author?.id}`} className={styles.userNameLink}>
                    <span className={styles.userName}>
                      {comment.author?.first_name} {comment.author?.last_name}
                    </span>
                  </Link>
                  <span className={styles.commentTime}>
                    {new Date(comment.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className={styles.commentContent}>
                {comment.content && <p>{comment.content}</p>}
                {comment.image_path && (
                  <div className={styles.commentImage}>
                    <img
                      src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}${comment.image_path}`}
                      alt="Comment attachment"
                      className={styles.commentImageFile}
                    />
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          !error && <div className={styles.noComments}>No comments yet.</div>
        )}
      </div>
    </div>
  )
} 