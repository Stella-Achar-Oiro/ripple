'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import CommentForm from './CommentForm'
import styles from './Post.module.css'

export default function Post({ post }) {
  const [isLiked, setIsLiked] = useState(post.isLiked || false)
  const [likeCount, setLikeCount] = useState(post.likes_count || 0)
  const [isLikeLoading, setIsLikeLoading] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState([])
  const [isCommentsLoading, setIsCommentsLoading] = useState(false)
  const [commentCount, setCommentCount] = useState(post.comment_count || 0)
  const [likeError, setLikeError] = useState('')
  const [commentsError, setCommentsError] = useState('')

  const router = useRouter()
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

  const handleLike = async () => {
    if (isLikeLoading) return

    // Optimistic update
    const wasLiked = isLiked
    const previousCount = likeCount
    setIsLiked(!wasLiked)
    setLikeCount(prev => wasLiked ? prev - 1 : prev + 1)
    setLikeError('')
    setIsLikeLoading(true)

    try {
      const endpoint = wasLiked 
        ? `${API_URL}/api/posts/unlike/${post.id}`
        : `${API_URL}/api/posts/like/${post.id}`
      
      const method = wasLiked ? 'DELETE' : 'POST'

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      })

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/')
          return
        }
        throw new Error('Failed to update like status')
      }

      const data = await response.json()
      // Update with actual counts from server if provided
      if (data.data?.likes_count !== undefined) {
        setLikeCount(data.data.likes_count)
      }
      if (data.data?.is_liked !== undefined) {
        setIsLiked(data.data.is_liked)
      }

    } catch (error) {
      console.error('Error updating like status:', error)
      // Revert optimistic update on error
      setIsLiked(wasLiked)
      setLikeCount(previousCount)
      setLikeError('Failed to update like. Please try again.')
    } finally {
      setIsLikeLoading(false)
    }
  }

  const handleCommentToggle = async () => {
    setShowComments(!showComments)
    
    // Fetch comments if showing for the first time
    if (!showComments && comments.length === 0) {
      await fetchComments()
    }
  }

  const fetchComments = async () => {
    setIsCommentsLoading(true)
    setCommentsError('')

    try {
      const response = await fetch(`${API_URL}/api/posts/comments/${post.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      })

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/')
          return
        }
        throw new Error('Failed to fetch comments')
      }

      const data = await response.json()
      setComments(data.data?.comments || [])
      if (data.data?.comment_count !== undefined) {
        setCommentCount(data.data.comment_count)
      }

    } catch (error) {
      console.error('Error fetching comments:', error)
      setCommentsError('Failed to load comments')
    } finally {
      setIsCommentsLoading(false)
    }
  }

  const handleCommentAdded = (newComment) => {
    if (newComment) {
      setComments(prev => [newComment, ...prev])
      setCommentCount(prev => prev + 1)
    }
    // Refresh comments to get latest data
    fetchComments()
  }

  const getPrivacyIcon = (privacy) => {
    return privacy === 'Public' ? 'fas fa-globe' : 'fas fa-users'
  }

  // Helper function to generate initials from author's first and last name
  const getAuthorInitials = (author) => {
    if (!author) return 'U'
    const firstInitial = author.first_name?.[0] || ''
    const lastInitial = author.last_name?.[0] || ''
    return (firstInitial + lastInitial).toUpperCase() || 'U'
  }

  return (
    <div className="card">
      <div className={styles.post}>
        <div className={styles.postHeader}>
          <div className={styles.postUser}>
            <div className="user-avatar">{getAuthorInitials(post.author)}</div>
            <div className={styles.postUserInfo}>
              <h4>{post.author?.first_name} {post.author?.last_name}</h4>
              <div className={styles.postMeta}>
                {new Date(post.created_at).toLocaleDateString()} • <i className={getPrivacyIcon(post.privacy_level)}></i> {post.privacy_level}
              </div>
            </div>
          </div>
          <div className={styles.postMenu}>
            <i className="fas fa-ellipsis-h"></i>
          </div>
        </div>

        <div className={styles.postContent}>
          {post.content}
        </div>

        {post.image_path ? (
          <div className={styles.postImage}>
            <img
              src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/uploads${post.image_path}`}
              alt="Post attachment"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                borderRadius: '8px'
              }}
              onError={(e) => {
                e.target.style.display = 'none'
              }}
            />
          </div>
        ) : null}

        <div className={styles.postStats}>
          <span>{likeCount} likes • {commentCount} comments</span>
          <span>{post.stats?.shares || 0} shares</span>
        </div>

        {likeError && (
          <div className={styles.errorMessage}>
            {likeError}
          </div>
        )}

        <div className={styles.postActionsRow}>
          <div
            className={`${styles.postAction} ${isLiked ? styles.liked : ''} ${isLikeLoading ? styles.loading : ''}`}
            onClick={handleLike}
            disabled={isLikeLoading}
          >
            {isLikeLoading ? (
              <i className="fas fa-spinner fa-spin"></i>
            ) : (
              <i className={isLiked ? 'fas fa-heart' : 'far fa-heart'}></i>
            )}
            Like
          </div>
          <div 
            className={`${styles.postAction} ${showComments ? styles.active : ''}`}
            onClick={handleCommentToggle}
          >
            <i className="far fa-comment"></i>
            Comment
          </div>
          <div className={styles.postAction}>
            <i className="fas fa-share"></i>
            Share
          </div>
        </div>

        {/* Comments Section */}
        {showComments && (
          <div className={styles.commentsSection}>
            {commentsError && (
              <div className={styles.errorMessage}>
                {commentsError}
                <button 
                  className={styles.retryButton}
                  onClick={fetchComments}
                >
                  Retry
                </button>
              </div>
            )}

            {isCommentsLoading ? (
              <div className={styles.commentsLoading}>
                <i className="fas fa-spinner fa-spin"></i>
                <span>Loading comments...</span>
              </div>
            ) : (
              <>
                {comments.length > 0 ? (
                  <div className={styles.commentsList}>
                    {comments.map((comment) => (
                      <div key={comment.id} className={styles.commentItem}>
                        <div className={styles.commentAvatar}>
                          <div className="user-avatar">{getAuthorInitials(comment.author)}</div>
                        </div>
                        <div className={styles.commentContent}>
                          <div className={styles.commentHeader}>
                            <span className={styles.commentAuthor}>
                              {comment.author?.first_name} {comment.author?.last_name}
                            </span>
                            <span className={styles.commentTime}>
                              {new Date(comment.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <div className={styles.commentText}>
                            {comment.content}
                          </div>
                          {comment.image_path && (
                            <div className={styles.commentImage}>
                              <img
                                src={`${API_URL}/uploads${comment.image_path}`}
                                alt="Comment attachment"
                                onError={(e) => {
                                  e.target.style.display = 'none'
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.noComments}>
                    <i className="far fa-comment"></i>
                    <span>No comments yet. Be the first to comment!</span>
                  </div>
                )}

                {/* Comment Form */}
                <CommentForm 
                  postId={post.id}
                  onCommentAdded={handleCommentAdded}
                />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
