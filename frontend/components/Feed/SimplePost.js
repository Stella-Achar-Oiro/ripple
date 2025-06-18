'use client'

import { useState } from 'react'
import styles from './Post.module.css'

export default function SimplePost({ post }) {
  // Local state for UI interactions
  const [isLiked, setIsLiked] = useState(post.isLiked || false)
  const [likeCount, setLikeCount] = useState(post.likes_count || 0)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')

  // Simple like toggle (local only for now)
  const handleLike = () => {
    const wasLiked = isLiked
    setIsLiked(!wasLiked)
    setLikeCount(prev => wasLiked ? prev - 1 : prev + 1)
    
    // Log the action so user can see it's working
    console.log(`${wasLiked ? 'Unliked' : 'Liked'} post ${post.id}`)
  }

  // Simple comment toggle
  const handleCommentToggle = () => {
    setShowComments(!showComments)
    // Mock comments for demo
    if (!showComments && comments.length === 0) {
      setComments([
        {
          id: 1,
          content: 'Great post!',
          author: { first_name: 'Demo', last_name: 'User' },
          created_at: new Date().toISOString()
        }
      ])
    }
  }

  // Simple comment add
  const handleAddComment = (e) => {
    e.preventDefault()
    if (!newComment.trim()) return

    const comment = {
      id: Date.now(),
      content: newComment.trim(),
      author: { first_name: 'Current', last_name: 'User' },
      created_at: new Date().toISOString()
    }
    
    setComments(prev => [comment, ...prev])
    setNewComment('')
    console.log(`Added comment to post ${post.id}:`, comment.content)
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

        {post.image_path && (
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
        )}

        <div className={styles.postStats}>
          <span>{likeCount} likes • {comments.length} comments</span>
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

            {/* Simple Comment Form */}
            <form onSubmit={handleAddComment} style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
              <input
                type="text"
                placeholder="Write a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '20px',
                  fontSize: '14px'
                }}
              />
              <button
                type="submit"
                disabled={!newComment.trim()}
                style={{
                  padding: '8px 16px',
                  background: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '20px',
                  fontSize: '14px',
                  cursor: newComment.trim() ? 'pointer' : 'not-allowed',
                  opacity: newComment.trim() ? 1 : 0.6
                }}
              >
                Post
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}