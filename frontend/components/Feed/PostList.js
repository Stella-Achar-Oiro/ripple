'use client'

import { useState, useEffect } from 'react'
import styles from './PostList.module.css'

export default function PostList() {
  const [posts, setPosts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchPosts = async () => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
      const response = await fetch(`${API_URL}/api/posts/feed`, {
        credentials: 'include',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Failed to fetch posts')
      }

      const data = await response.json()
      if (data.success && data.data && data.data.posts) {
        setPosts(data.data.posts)
      } else {
        console.error('Invalid response format or empty data:', data);
        throw new Error('Invalid response format or no posts received');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while fetching posts')
      console.error('Error fetching posts:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPosts()
  }, [])

  if (isLoading) {
    return <div className={styles.loading}>Loading posts...</div>
  }

  if (error) {
    return <div className={styles.error}>{error}</div>
  }

  if (posts.length === 0) {
    return <div className={styles.noPosts}>No posts yet. Be the first to post!</div>
  }

  return (
    <div className={styles.postList}>
      {posts.map((post) => (
        <div key={post.id} className={styles.postCard}>
          <div className={styles.postHeader}>
            <div className={styles.userInfo}>
              <div className="user-avatar">
                {post.author?.nickname?.[0] || 'U'}
              </div>
              <div className={styles.userDetails}>
                <span className={styles.userName}>
                  {post.author?.first_name} {post.author?.last_name}
                </span>
                <span className={styles.postTime}>
                  {new Date(post.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
            <div className={styles.postPrivacy}>
              <i className={`fas fa-${post.privacy_level === 'public' ? 'globe' : 'lock'}`}></i>
            </div>
          </div>
          <div className={styles.postContent}>{post.content}</div>
          {post.image_path && (
            <div className={styles.postImage}>
              <img src={post.image_path} alt="Post attachment" />
            </div>
          )}
          <div className={styles.postActions}>
            <button className={styles.actionButton}>
              <i className="far fa-heart"></i> Like
            </button>
            <button className={styles.actionButton}>
              <i className="far fa-comment"></i> Comment ({post.comment_count || 0})
            </button>
            <button className={styles.actionButton}>
              <i className="far fa-share-square"></i> Share
            </button>
          </div>
        </div>
      ))}
    </div>
  )
} 