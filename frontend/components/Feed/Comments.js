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

  const handleSubmitComment = async (e) => {
    e.preventDefault()
    if (!newComment.trim()) return

    setIsLoading(true)
    setError('')

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
      const response = await fetch(`${API_URL}/api/posts/comments/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postId: postId,
          content: newComment.trim(),
        }),
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create comment')
      }

      setNewComment('')
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
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Write a comment..."
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading || !newComment.trim()}>
          {isLoading ? 'Posting...' : 'Post'}
        </button>
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
              <div className={styles.commentContent}>{comment.content}</div>
            </div>
          ))
        ) : (
          !error && <div className={styles.noComments}>No comments yet.</div>
        )}
      </div>
    </div>
  )
} 