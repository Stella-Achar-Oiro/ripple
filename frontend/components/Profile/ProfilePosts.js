import { useState, useEffect } from 'react'
import Post from '../Feed/Post'
import styles from './ProfilePosts.module.css'

export default function ProfilePosts({ userId }) {
  const [posts, setPosts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
  const POSTS_PER_PAGE = 10
  
  useEffect(() => {
    const fetchPosts = async () => {
      if (page === 1) {
        setIsLoading(true)
      }
      
      try {
        const response = await fetch(
          `${API_URL}/api/posts/user/${userId}?limit=${POSTS_PER_PAGE}&offset=${(page - 1) * POSTS_PER_PAGE}`,
          { credentials: 'include' }
        )
        
        if (!response.ok) {
          throw new Error('Failed to fetch posts')
        }
        
        const data = await response.json()
        
        if (page === 1) {
          setPosts(data)
        } else {
          setPosts(prev => [...prev, ...data])
        }
        
        // If we got fewer posts than requested, there are no more
        setHasMore(data.length === POSTS_PER_PAGE)
      } catch (err) {
        console.error('Error fetching posts:', err)
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchPosts()
  }, [userId, page, API_URL])
  
  const loadMore = () => {
    if (!isLoading && hasMore) {
      setPage(prev => prev + 1)
    }
  }
  
  if (isLoading && page === 1) {
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
          onClick={() => {
            setError(null)
            setPage(1)
          }}
        >
          Retry
        </button>
      </div>
    )
  }
  
  if (posts.length === 0) {
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
      
      {hasMore && (
        <div className={styles.loadMoreContainer}>
          <button 
            className={styles.loadMoreButton}
            onClick={loadMore}
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  )
}