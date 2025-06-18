'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../contexts/AuthContext'
import WorkingPost from './WorkingPost'
import styles from './PostList.module.css'

export default function PostList({ refreshTrigger }) {
  const [posts, setPosts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAuth()

  const fetchPosts = async () => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
      const response = await fetch(`${API_URL}/api/posts/feed`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        if (response.status === 401) {
          // User not authenticated, redirect to login
          console.log('User not authenticated, redirecting to login')
          router.push('/')
          return
        }
        
        let errorMessage = 'Failed to fetch posts'
        try {
          const data = await response.json()
          errorMessage = data.message || errorMessage
        } catch {
          errorMessage = `Server error: ${response.status}`
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()
      if (data.success && data.data && data.data.posts) {
        setPosts(data.data.posts)
        setError('') // Clear any previous errors
      } else {
        console.error('Invalid response format or empty data:', data);
        throw new Error('Invalid response format or no posts received');
      }
    } catch (err) {
      if (err.message.includes('not authenticated')) {
        return // Don't set error if redirecting
      }
      setError(err.message || 'An error occurred while fetching posts')
      console.error('Error fetching posts:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Only fetch posts if authentication is established and user is authenticated
    if (!authLoading && isAuthenticated) {
      fetchPosts()
    } else if (!authLoading && !isAuthenticated) {
      // If not authenticated after auth loading is complete, redirect
      router.push('/')
    }
  }, [refreshTrigger, authLoading, isAuthenticated])

  // Show loading while auth is being checked or posts are being fetched
  if (authLoading || isLoading) {
    return <div className={styles.loading}>Loading posts...</div>
  }

  // If not authenticated, don't show anything (RouteGuard should handle redirect)
  if (!isAuthenticated) {
    return null
  }

  if (error) {
    return (
      <div className={styles.error}>
        {error}
        <button 
          onClick={() => {
            setError('')
            fetchPosts()
          }}
          style={{ marginLeft: '10px', padding: '5px 10px' }}
        >
          Retry
        </button>
      </div>
    )
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