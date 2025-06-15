'use client'

import { useState } from 'react'
import GroupComments from './GroupComments'
import styles from './GroupPost.module.css'

export default function GroupPost({ post, onPostDeleted, isGroupMember }) {
  const [showComments, setShowComments] = useState(false)
  const [commentCount, setCommentCount] = useState(post.comment_count || 0)

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

  // Helper function to generate initials from author's first and last name
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

  const handleCommentToggle = () => {
    setShowComments(!showComments)
  }

  const handleCommentAdded = () => {
    setCommentCount(prev => prev + 1)
  }

  return (
    <div className="card">
      <div className={styles.post}>
        <div className={styles.postHeader}>
          <div className={styles.postUser}>
            <div className={styles.userAvatar}>
              {post.author?.avatar_path ? (
                <img
                  src={`${API_URL}${post.author.avatar_path}`}
                  alt={`${post.author.first_name} ${post.author.last_name}`}
                />
              ) : (
                <div className={styles.avatarPlaceholder}>
                  {getAuthorInitials(post.author)}
                </div>
              )}
            </div>
            <div className={styles.postUserInfo}>
              <h4>{post.author?.first_name} {post.author?.last_name}</h4>
              <div className={styles.postMeta}>
                {formatDate(post.created_at)} • <i className="fas fa-users"></i> Group Post
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
              src={`${API_URL}${post.image_path}`}
              alt="Post attachment"
            />
          </div>
        )}

        <div className={styles.postStats}>
          <span>{commentCount} comment{commentCount !== 1 ? 's' : ''}</span>
        </div>

        <div className={styles.postActionsRow}>
          <div
            className={styles.postAction}
            onClick={handleCommentToggle}
          >
            <i className="far fa-comment"></i>
            Comment
          </div>
        </div>

        {/* Comments Section */}
        {showComments && (
          <GroupComments 
            postId={post.id}
            isGroupMember={isGroupMember}
            onCommentAdded={handleCommentAdded}
          />
        )}
      </div>
    </div>
  )
}
