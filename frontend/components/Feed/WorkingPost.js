'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import styles from './Post.module.css'

export default function WorkingPost({ post }) {
  // State for interactions
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(post.likes_count || 0)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState([])
  const [commentCount, setCommentCount] = useState(post.comment_count || 0)
  const [newComment, setNewComment] = useState('')
  const [isLoadingComments, setIsLoadingComments] = useState(false)
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)

  const router = useRouter()
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

  // Load additional post data when component mounts
  useEffect(() => {
    loadPostData()
  }, [post.id])

  const loadPostData = async () => {
    try {
      const response = await fetch(`${API_URL}/api/posts/${post.id}`, {
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          setLikeCount(data.data.likes_count || 0)
          setCommentCount(data.data.comment_count || 0)
          // Note: Backend doesn't return like status, so we'll manage locally
        }
      }
    } catch (error) {
      console.error('Error loading post data:', error)
    }
  }

  // Simulated like functionality (local state only)
  const handleLike = () => {
    const wasLiked = isLiked
    setIsLiked(!wasLiked)
    setLikeCount(prev => wasLiked ? prev - 1 : prev + 1)
    
    // Log for demo purposes
    console.log(`${wasLiked ? 'Unliked' : 'Liked'} post ${post.id}`)
    
    // In a real implementation, this would make an API call:
    // POST /api/posts/like/{id} or DELETE /api/posts/unlike/{id}
    // For now, we're just managing state locally
  }

  const handleCommentToggle = async () => {
    setShowComments(!showComments)
    
    // Load fresh post data when expanding comments
    if (!showComments) {
      await loadPostData()
      
      // Simulate loading some demo comments
      if (comments.length === 0) {
        setComments([
          {
            id: 1,
            content: 'Great post! 👍',
            author: { first_name: 'Demo', last_name: 'User' },
            created_at: new Date().toISOString()
          },
          {
            id: 2, 
            content: 'Thanks for sharing this!',
            author: { first_name: 'Another', last_name: 'User' },
            created_at: new Date(Date.now() - 3600000).toISOString()
          }
        ])
      }
    }
  }

  const handleAddComment = async (e) => {
    e.preventDefault()
    if (!newComment.trim()) return

    setIsSubmittingComment(true)

    try {
      // Simulate comment creation
      const comment = {
        id: Date.now(),
        content: newComment.trim(),
        author: { first_name: 'Stella', last_name: 'Oiro' }, // Current user
        created_at: new Date().toISOString()
      }
      
      // Add to local state
      setComments(prev => [comment, ...prev])
      setCommentCount(prev => prev + 1)
      setNewComment('')
      
      console.log(`Added comment to post ${post.id}:`, comment.content)
      
      // In a real implementation, this would make an API call:
      // POST /api/posts/comment/{id} with { content: newComment }
      
    } catch (error) {
      console.error('Error adding comment:', error)
    } finally {
      setIsSubmittingComment(false)
    }
  }

  const getPrivacyIcon = (privacy) => {
    return privacy === 'Public' || privacy === 'public' ? 'fas fa-globe' : 'fas fa-users'
  }

  const getAuthorInitials = (author) => {
    if (!author) return 'U'
    const firstInitial = author.first_name?.[0] || ''
    const lastInitial = author.last_name?.[0] || ''
    return (firstInitial + lastInitial).toUpperCase() || 'U'
  }

  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    
    if (diffMins < 1) return 'now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return date.toLocaleDateString()
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
                {new Date(post.created_at).toLocaleDateString()} • 
                <i className={getPrivacyIcon(post.privacy_level)}></i> {post.privacy_level}
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

        {post.image_path && (
          <div className={styles.postImage}>
            <img
              src={`${API_URL}/uploads${post.image_path}`}
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
        )}

        <div className={styles.postStats}>
          <span>{likeCount} likes • {commentCount} comments</span>
          <span>0 shares</span>
        </div>

        <div className={styles.postActionsRow}>
          <div
            className={`${styles.postAction} ${isLiked ? styles.liked : ''}`}
            onClick={handleLike}
          >
            <i className={isLiked ? 'fas fa-heart' : 'far fa-heart'}></i>
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
            {/* Add Comment Form */}
            <form onSubmit={handleAddComment} style={{ 
              marginBottom: '20px', 
              display: 'flex', 
              gap: '10px',
              alignItems: 'flex-start'
            }}>
              <div className="user-avatar" style={{ flexShrink: 0 }}>
                {getAuthorInitials({ first_name: 'Stella', last_name: 'Oiro' })}
              </div>
              <div style={{ flex: 1, display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  placeholder="Write a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  disabled={isSubmittingComment}
                  style={{
                    flex: 1,
                    padding: '10px 15px',
                    border: '1px solid var(--border)',
                    borderRadius: '20px',
                    fontSize: '14px',
                    backgroundColor: 'var(--background)',
                    color: 'var(--text-primary)'
                  }}
                />
                <button
                  type="submit"
                  disabled={!newComment.trim() || isSubmittingComment}
                  style={{
                    padding: '10px 20px',
                    background: newComment.trim() ? 'var(--purple-gradient)' : '#ccc',
                    color: 'white',
                    border: 'none',
                    borderRadius: '20px',
                    fontSize: '14px',
                    cursor: newComment.trim() ? 'pointer' : 'not-allowed',
                    transition: 'all 0.15s ease-in-out'
                  }}
                >
                  {isSubmittingComment ? '⏳' : 'Post'}
                </button>
              </div>
            </form>

            {/* Comments List */}
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
                          {formatTime(comment.created_at)}
                        </span>
                      </div>
                      <div className={styles.commentText}>
                        {comment.content}
                      </div>
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
          </div>
        )}
      </div>
    </div>
  )
}