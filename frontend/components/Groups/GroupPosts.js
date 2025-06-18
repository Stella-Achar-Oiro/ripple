'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiPost, isAuthError, getErrorMessage } from '../../utils/api'
import styles from './GroupPosts.module.css'

export default function GroupPosts({ 
  group, 
  posts, 
  isMember, 
  isLoading, 
  onPostsUpdate 
}) {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newPost, setNewPost] = useState({
    content: ''
  })
  const [isPosting, setIsPosting] = useState(false)
  const [postError, setPostError] = useState('')

  const router = useRouter()

  // Handle new post creation
  const handleCreatePost = async (e) => {
    e.preventDefault()
    
    if (!newPost.content.trim()) {
      setPostError('Post content is required')
      return
    }

    setIsPosting(true)
    setPostError('')

    try {
      await apiPost(`/api/groups/posts/${group.id}`, {
        content: newPost.content.trim()
      })
      
      setNewPost({ content: '' })
      setShowCreateForm(false)
      setPostError('')
      
      // Refresh posts list
      if (onPostsUpdate) {
        onPostsUpdate()
      }
      
    } catch (error) {
      if (isAuthError(error)) {
        router.push('/')
        return
      }
      setPostError(getErrorMessage(error))
    } finally {
      setIsPosting(false)
    }
  }

  // Format post date
  const formatPostDate = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now - date
    
    // Less than a minute
    if (diff < 60000) {
      return 'Just now'
    }
    
    // Less than an hour
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000)
      return `${minutes}m ago`
    }
    
    // Less than a day
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000)
      return `${hours}h ago`
    }
    
    // Less than a week
    if (diff < 604800000) {
      const days = Math.floor(diff / 86400000)
      return `${days}d ago`
    }
    
    // More than a week - show actual date
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    })
  }

  return (
    <div className={styles.groupPosts}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h3 className={styles.title}>
            Posts {posts.length > 0 && `(${posts.length})`}
          </h3>
          <p className={styles.subtitle}>
            {isMember 
              ? 'Share updates and discuss with group members'
              : 'See what group members are sharing'
            }
          </p>
        </div>
        
        {isMember && (
          <button
            className={styles.createPostBtn}
            onClick={() => setShowCreateForm(!showCreateForm)}
          >
            <i className="fas fa-plus"></i>
            Create Post
          </button>
        )}
      </div>

      {/* Create Post Form */}
      {showCreateForm && isMember && (
        <div className={styles.createPostSection}>
          <div className={styles.createPostCard}>
            <form onSubmit={handleCreatePost} className={styles.createPostForm}>
              <div className={styles.formHeader}>
                <h4>Create a new post</h4>
                <button
                  type="button"
                  className={styles.closeFormBtn}
                  onClick={() => {
                    setShowCreateForm(false)
                    setNewPost({ content: '' })
                    setPostError('')
                  }}
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
              
              <div className={styles.formBody}>
                <textarea
                  placeholder="What would you like to share with the group?"
                  value={newPost.content}
                  onChange={(e) => setNewPost({ content: e.target.value })}
                  className={styles.postTextarea}
                  rows={4}
                  disabled={isPosting}
                />
                
                <div className={styles.charCount}>
                  {newPost.content.length}/2000
                </div>
                
                {postError && (
                  <div className={styles.errorMessage}>
                    <i className="fas fa-exclamation-triangle"></i>
                    {postError}
                  </div>
                )}
              </div>
              
              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => {
                    setShowCreateForm(false)
                    setNewPost({ content: '' })
                    setPostError('')
                  }}
                  disabled={isPosting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.submitBtn}
                  disabled={isPosting || !newPost.content.trim()}
                >
                  {isPosting ? (
                    <span>
                      <div className={styles.loadingSpinner}></div>
                      Posting...
                    </span>
                  ) : (
                    <span>
                      <i className="fas fa-paper-plane"></i>
                      Post
                    </span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Posts List */}
      <div className={styles.postsSection}>
        {isLoading ? (
          <div key="loading-state" className={styles.loading}>
            <div className={styles.loadingSpinner}></div>
            <p>Loading posts...</p>
          </div>
        ) : posts.length === 0 ? (
          <div key="empty-state" className={styles.empty}>
            <i className="fas fa-comment"></i>
            <h4>No posts yet</h4>
            <p>
              {isMember 
                ? 'Be the first to share something with the group!'
                : 'No posts have been shared in this group yet.'
              }
            </p>
            {isMember && (
              <button
                className={styles.createFirstPostBtn}
                onClick={() => setShowCreateForm(true)}
              >
                Create First Post
              </button>
            )}
          </div>
        ) : (
          <div key="posts-list" className={styles.postsList}>
            {posts.map((post, index) => (
              <div key={post.id || `post-${index}`} className={styles.postCard}>
                <div className={styles.postHeader}>
                  <div className={styles.authorInfo}>
                    <div className={styles.authorAvatar}>
                      {post.author_avatar ? (
                        <img 
                          src={post.author_avatar} 
                          alt={post.author_name}
                          className={styles.avatarImage}
                        />
                      ) : (
                        <div className={styles.avatarPlaceholder}>
                          {post.author_name?.charAt(0) || '?'}
                        </div>
                      )}
                    </div>
                    
                    <div className={styles.authorDetails}>
                      <div className={styles.authorName}>
                        {post.author_name || 'Unknown User'}
                      </div>
                      <div className={styles.postMeta}>
                        <span className={styles.postDate}>
                          {formatPostDate(post.created_at)}
                        </span>
                        {post.is_edited && (
                          <span className={styles.editedBadge}>
                            • Edited
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className={styles.postActions}>
                    <button
                      className={styles.actionBtn}
                      onClick={() => {/* Handle post menu */}}
                    >
                      <i className="fas fa-ellipsis-h"></i>
                    </button>
                  </div>
                </div>
                
                <div className={styles.postContent}>
                  <p>{post.content}</p>
                </div>
                
                <div className={styles.postFooter}>
                  <div className={styles.postStats}>
                    {post.likes_count > 0 && (
                      <span key={`likes-${post.id}`} className={styles.statItem}>
                        <i className="fas fa-heart"></i>
                        {post.likes_count}
                      </span>
                    )}
                    {post.comments_count > 0 && (
                      <span key={`comments-${post.id}`} className={styles.statItem}>
                        <i className="fas fa-comment"></i>
                        {post.comments_count}
                      </span>
                    )}
                  </div>
                  
                  <div className={styles.postInteractions}>
                    <button className={styles.interactionBtn}>
                      <i className="fas fa-heart"></i>
                      Like
                    </button>
                    <button className={styles.interactionBtn}>
                      <i className="fas fa-comment"></i>
                      Comment
                    </button>
                    <button className={styles.interactionBtn}>
                      <i className="fas fa-share"></i>
                      Share
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Non-member notice */}
      {!isMember && posts.length > 0 && (
        <div className={styles.memberOnlyFooter}>
          <p>Join this group to create posts and interact with content.</p>
        </div>
      )}
    </div>
  )
}