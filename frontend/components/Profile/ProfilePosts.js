import { useState, useEffect } from 'react'
import Post from '../Feed/Post'
import styles from './ProfilePosts.module.css'

export default function ProfilePosts({ userId }) {
  const [posts, setPosts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

  // Simple retry function
  const retryFetch = () => {
    setError(null)
    setRefreshTrigger(prev => prev + 1) // This will trigger useEffect
  }

  useEffect(() => {
    if (!userId) return

    console.log('ProfilePosts: Starting fetch for userId:', userId) // Debug log

    const fetchAllPosts = async () => {
      setIsLoading(true)
      setError(null)

      try {
        // Fetch all posts for this user (no pagination limit)
        const response = await fetch(
          `${API_URL}/api/posts/user/${userId}?limit=1000&offset=0`,
          { credentials: 'include' }
        )

        if (!response.ok) {
          throw new Error('Failed to fetch posts')
        }

        const result = await response.json()
        console.log('Posts API response:', result) // Debug log

        // Handle the response structure from backend
        let postsData = []
        if (result.data && Array.isArray(result.data.posts)) {
          postsData = result.data.posts
        } else if (result.data && Array.isArray(result.data)) {
          postsData = result.data
        } else if (Array.isArray(result)) {
          postsData = result
        } else {
          console.error('Unexpected response structure:', result)
          postsData = []
        }

        setPosts(postsData)
      } catch (err) {
        console.error('Error fetching posts:', err)
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAllPosts()
  }, [userId, API_URL, refreshTrigger]) // Re-run when userId, API_URL, or refreshTrigger changes
  
  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Loading posts...</p>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className={styles.errorContainer}>
        <p>Error loading posts: {error}</p>
        <button
          className={styles.retryButton}
          onClick={retryFetch}
        >
          Retry
        </button>
      </div>
    )
  }
  
  if (!posts || !Array.isArray(posts) || posts.length === 0) {
    return (
      <div className={styles.emptyContainer}>
        <i className="fas fa-file-alt"></i>
        <h3>No posts yet</h3>
        <p>When this user creates posts, they'll appear here.</p>
      </div>
    )
  }

  return (
    <div className={styles.postsContainer}>
      {posts.map(post => (
        <Post key={post.id} post={post} />
      ))}
    </div>
  )
}