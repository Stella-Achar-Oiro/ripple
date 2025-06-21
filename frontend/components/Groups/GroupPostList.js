'use client'

import { useState, useEffect } from 'react'
import CreateGroupPost from './CreateGroupPost'
import GroupPost from './GroupPost'
import styles from './GroupPostList.module.css'

export default function GroupPostList({ groupId, isGroupMember }) {
  const [posts, setPosts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

  const fetchPosts = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`${API_URL}/api/groups/posts/get/${groupId}`, {
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
        setPosts([])
      }
    } catch (err) {
      setError(err.message || 'An error occurred while fetching posts')
      console.error('Error fetching group posts:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (groupId) {
      fetchPosts()
    }
  }, [groupId])

  const handlePostCreated = () => {
    // Refresh posts when a new post is created
    fetchPosts()
  }

  const handlePostDeleted = () => {
    // Refresh posts when a post is deleted
    fetchPosts()
  }

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <i className="fas fa-spinner fa-spin"></i>
        <span>Loading posts...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <i className="fas fa-exclamation-triangle"></i>
        <p>{error}</p>
        <button className="btn-primary" onClick={fetchPosts}>
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className={styles.postList}>
      {/* Create Post Section - Only for group members */}
      {isGroupMember && (
        <CreateGroupPost 
          groupId={groupId} 
          onPostCreated={handlePostCreated}
        />
      )}

      {/* Posts List */}
      {posts.length === 0 ? (
        <div className={styles.emptyState}>
          <i className="fas fa-comments"></i>
          <h3>No posts yet</h3>
          <p>
            {isGroupMember 
              ? "Be the first to share something with the group!" 
              : "Only group members can view and create posts."
            }
          </p>
        </div>
      ) : (
        <div className={styles.postsContainer}>
          {posts.map((post) => (
            <GroupPost 
              key={post.ID} 
              post={post} 
              onPostDeleted={handlePostDeleted}
              isGroupMember={isGroupMember}
            />
          ))}
        </div>
      )}
    </div>
  )
}
