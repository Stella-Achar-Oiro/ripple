'use client'

import { useState } from 'react'
import styles from './CreatePost.module.css'

export default function CreatePost() {
  const [postContent, setPostContent] = useState('')
  const [privacy, setPrivacy] = useState('Public')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (postContent.trim()) {
      // Handle post creation
      console.log('Creating post:', postContent)
      setPostContent('')
    }
  }

  return (
    <div className="card">
      <div className={styles.createPost}>
        <div className={styles.createPostHeader}>
          <div className="user-avatar">JD</div>
          <textarea 
            className={styles.postInput}
            placeholder="What's on your mind, John?"
            value={postContent}
            onChange={(e) => setPostContent(e.target.value)}
          />
        </div>
        <div className={styles.postActions}>
          <div className={styles.postOptions}>
            <div className={styles.postOption}>
              <i className="fas fa-image"></i>
              Photo
            </div>
            <div className={styles.postOption}>
              <i className="fas fa-video"></i>
              Video
            </div>
            <div className={styles.postOption}>
              <i className="fas fa-smile"></i>
              Feeling
            </div>
          </div>
          <div className={styles.postSubmitArea}>
            <div className={styles.privacySelector}>
              <i className="fas fa-globe"></i>
              {privacy}
            </div>
            <button 
              className="btn-primary"
              onClick={handleSubmit}
              disabled={!postContent.trim()}
            >
              Post
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
