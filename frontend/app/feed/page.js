'use client'

import { useState, useEffect } from 'react'
import RouteGuard from '../../components/Auth/RouteGuard'
import MainLayout from '../../components/Layout/MainLayout'
import CreatePost from '../../components/Feed/CreatePost'
import OnlineFriends from '../../components/Widgets/OnlineFriends'
import SuggestedGroups from '../../components/Widgets/SuggestedGroups'
import PostList from '../../components/Feed/PostList'
import styles from './page.module.css'

export default function FeedPage() {
  const [posts, setPosts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchPosts = async () => {
    setIsLoading(true)
    setError('')
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
        setPosts([]) // Set to empty array if no posts are returned
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

  return (
    <RouteGuard requireAuth={true}>
      <MainLayout currentPage="feed">
        <div className={styles.feedLayout}>
          <div className={styles.feedMain}>
            <CreatePost onPostCreated={fetchPosts} />
            <PostList
              posts={posts}
              setPosts={setPosts}
              isLoading={isLoading}
              error={error}
            />
          </div>

          <div className={styles.feedSidebar}>
            <OnlineFriends />
            <SuggestedGroups />
          </div>
        </div>
      </MainLayout>
    </RouteGuard>
  )
}
