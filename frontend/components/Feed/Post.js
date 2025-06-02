'use client'

import { useState } from 'react'
import styles from './Post.module.css'

export default function Post({ post }) {
  const [isLiked, setIsLiked] = useState(post.isLiked)
  const [likeCount, setLikeCount] = useState(post.stats.likes)

  const handleLike = () => {
    setIsLiked(!isLiked)
    setLikeCount(prev => isLiked ? prev - 1 : prev + 1)
  }

  const getPrivacyIcon = (privacy) => {
    return privacy === 'Public' ? 'fas fa-globe' : 'fas fa-users'
  }

  return (
    <div className="card">
      <div className={styles.post}>
        <div className={styles.postHeader}>
          <div className={styles.postUser}>
            <div className="user-avatar">{post.user.initials}</div>
            <div className={styles.postUserInfo}>
              <h4>{post.user.name}</h4>
              <div className={styles.postMeta}>
                {post.timestamp} • <i className={getPrivacyIcon(post.privacy)}></i> {post.privacy}
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
        
        {post.hasImage && (
          <div className={styles.postImage}>
            <i className="fas fa-image" style={{ fontSize: '24px' }}></i>
            <span style={{ marginLeft: '10px' }}>{post.imageDescription}</span>
          </div>
        )}
        
        <div className={styles.postStats}>
          <span>{likeCount} likes • {post.stats.comments} comments</span>
          <span>{post.stats.shares} shares</span>
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
    </div>
  )
}
