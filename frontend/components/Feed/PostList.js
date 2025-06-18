'use client'

import { useState, useEffect } from 'react'
import WorkingPost from './WorkingPost'
import styles from './PostList.module.css'

export default function PostList({ refreshTrigger }) {
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
  }, [refreshTrigger])

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
        <WorkingPost key={post.id} post={post} />
      ))}
    </div>
  )
} 