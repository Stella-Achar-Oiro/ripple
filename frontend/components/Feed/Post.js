'use client'

import { useState } from 'react'
import ImageModal from '../shared/ImageModal'
import styles from './Post.module.css'

export default function Post({ post }) {
  const [isLiked, setIsLiked] = useState(post.isLiked)
  const [likeCount, setLikeCount] = useState(post.likes_count)
  const [showImageModal, setShowImageModal] = useState(false)

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

  const handleLike = () => {
    setIsLiked(!isLiked)
    setLikeCount(prev => isLiked ? prev - 1 : prev + 1)
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
          <div className={styles.postImage} onClick={() => setShowImageModal(true)}>
            <img
              src={`${API_URL}${post.image_path}`}
              alt="Post attachment"
              loading="lazy"
              onLoad={() => {
                console.log('Image loaded successfully:', `${API_URL}${post.image_path}`)
              }}
              onError={(e) => {
                console.error('Image failed to load:', e.target.src)
                e.target.style.display = 'none'
              }}
            />
          </div>
        ) : null}

        <div className={styles.postStats}>
          <span>{likeCount} likes • {post.comment_count || 0} comments</span>
          <span>{post.stats?.shares || 0} shares</span>
        </div>

        <div className={styles.postActionsRow}>
          <div
            className={`${styles.postAction} ${isLiked ? styles.liked : ''}`}
            onClick={handleLike}
          >
            <i className={isLiked ? 'fas fa-heart' : 'far fa-heart'}></i>
            Like
          </div>
          <div className={styles.postAction}>
            <i className="far fa-comment"></i>
            Comment
          </div>
          <div className={styles.postAction}>
            <i className="fas fa-share"></i>
            Share
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {post.image_path && (
        <ImageModal
          src={`${API_URL}${post.image_path}`}
          alt="Post attachment"
          isOpen={showImageModal}
          onClose={() => setShowImageModal(false)}
        />
      )}
    </div>
  )
}
