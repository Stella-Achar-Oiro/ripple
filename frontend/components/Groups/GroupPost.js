'use client'

import { useState, useEffect, useRef } from 'react'
import GroupComments from './GroupComments'
import { useAuth } from '../../contexts/AuthContext'
import ImageModal from '../shared/ImageModal'
import styles from './GroupPost.module.css'

export default function GroupPost({ post, onPostDeleted, isGroupMember }) {
  const { user } = useAuth()
  const [showComments, setShowComments] = useState(false)
  const [commentCount, setCommentCount] = useState(post.CommentCount || 0)
  const [expanded, setExpanded] = useState(false)
  const [activeMenuPostId, setActiveMenuPostId] = useState(null)
  const [editingPost, setEditingPost] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLiked, setIsLiked] = useState(post.is_liked || false)
  const [likeCount, setLikeCount] = useState(post.LikesCount || 0)
  const [showImageModal, setShowImageModal] = useState(false)
  const menuRef = useRef(null)

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

  const MAX_PREVIEW_LENGTH = 350
  const content = post.Content || post.content // fallback for different post object shapes
  const isLong = content && content.length > MAX_PREVIEW_LENGTH
  const previewContent = isLong ? content.slice(0, MAX_PREVIEW_LENGTH) + '...' : content

  // Handle clicking outside the dropdown menu
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setActiveMenuPostId(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Helper function to generate initials from author's first and last name
  const getAuthorInitials = (author) => {
    if (!author) return 'U'
    const firstInitial = author.first_name?.[0] || ''
    const lastInitial = author.last_name?.[0] || ''
    return (firstInitial + lastInitial).toUpperCase() || 'U'
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now - date) / (1000 * 60 * 60)

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now - date) / (1000 * 60))
      return diffInMinutes <= 1 ? 'Just now' : `${diffInMinutes}m ago`
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  const handleCommentToggle = () => {
    setShowComments(!showComments)
  }

  const handleCommentAdded = () => {
    setCommentCount(prev => prev + 1)
  }

  const handleDeletePost = async () => {
    if (!window.confirm('Are you sure you want to delete this post?')) {
      return
    }

    try {
      setIsLoading(true)
      const response = await fetch(`${API_URL}/api/groups/posts/delete/${post.ID}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Failed to delete post')
      }

      if (onPostDeleted) {
        onPostDeleted(post.ID)
      }
      setActiveMenuPostId(null)
    } catch (err) {
      console.error('Error deleting post:', err)
      alert(err.message || 'An error occurred while deleting the post')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdatePost = async () => {
    if (!editingPost) return

    try {
      setIsLoading(true)
      const response = await fetch(`${API_URL}/api/groups/posts/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          post_id: editingPost.ID,
          content: editingPost.Content,
        }),
        credentials: 'include',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Failed to update post')
      }

      const updatedPost = await response.json()
      
      // Update the post in the parent component
      if (onPostDeleted) {
        // We'll use onPostDeleted as a callback to refresh the posts
        onPostDeleted(null, updatedPost.data)
      }
      
      setEditingPost(null)
      setActiveMenuPostId(null)
    } catch (err) {
      console.error('Error updating post:', err)
      alert(err.message || 'An error occurred while updating the post')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLikeToggle = async () => {
    if (isLoading) return
    setIsLoading(true)
    const prevLiked = isLiked
    setIsLiked(!prevLiked)
    setLikeCount(prev => prevLiked ? prev - 1 : prev + 1)
    try {
      const response = await fetch(`${API_URL}/api/groups/posts/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: post.ID }),
        credentials: 'include',
      })
      if (!response.ok) {
        throw new Error('Failed to update like')
      }
      const data = await response.json()
      setIsLiked(data.data?.liked ?? !prevLiked)
      setLikeCount(data.data?.like_count ?? (prevLiked ? likeCount - 1 : likeCount + 1))
    } catch (err) {
      setIsLiked(prevLiked)
      setLikeCount(prev => prevLiked ? prev + 1 : prev - 1)
      alert(err.message || 'Failed to update like')
    } finally {
      setIsLoading(false)
    }
  }

  const isPostCreator = user && user.id === post.Author?.id

  return (
    <div className="card">
      <div className={styles.post}>
        <div className={styles.postHeader}>
          <div className={styles.postUser}>
            <div className={styles.userAvatar}>
              {post.Author?.avatar_path ? (
                <img
                  src={`${API_URL}${post.Author.avatar_path}`}
                  alt={`${post.Author.first_name} ${post.Author.last_name}`}
                />
              ) : (
                <div className={styles.avatarPlaceholder}>
                  {getAuthorInitials(post.Author)}
                </div>
              )}
            </div>
            <div className={styles.postUserInfo}>
              <h4>{post.Author?.first_name} {post.Author?.last_name}</h4>
              <div className={styles.postMeta}>
                {formatDate(post.CreatedAt)} • <i className="fas fa-users"></i> Group Post
              </div>
            </div>
          </div>
          {isPostCreator && (
            <div className={styles.postMenu}>
              <button 
                onClick={() => setActiveMenuPostId(activeMenuPostId === post.ID ? null : post.ID)} 
                className={styles.menuButton}
                disabled={isLoading}
              >
                <i className="fas fa-ellipsis-h"></i>
              </button>
              {activeMenuPostId === post.ID && (
                <div className={styles.dropdownMenu} ref={menuRef}>
                  <button onClick={() => setEditingPost({ ...post })} disabled={isLoading}>
                    Edit
                  </button>
                  <button onClick={handleDeletePost} disabled={isLoading}>
                    Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {editingPost && editingPost.ID === post.ID ? (
          <div className={styles.editPost}>
            <textarea
              value={editingPost.Content}
              onChange={(e) => setEditingPost({ ...editingPost, Content: e.target.value })}
              className={styles.editTextArea}
              disabled={isLoading}
            />
            <div className={styles.editActions}>
              <button onClick={() => setEditingPost(null)} className={styles.cancelButton} disabled={isLoading}>
                Cancel
              </button>
              <button onClick={handleUpdatePost} className={styles.saveButton} disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.postContent}>
            {post.Content}
          </div>
        )}

        {post.ImagePath && (
          <div className={styles.postImage} onClick={() => setShowImageModal(true)}>
            <img
              src={`${API_URL}${post.ImagePath}`}
              alt="Post attachment"
              loading="lazy"
              onLoad={() => {
                console.log('Image loaded successfully:', `${API_URL}${post.ImagePath}`)
              }}
              onError={(e) => {
                console.error('Image failed to load:', e.target.src)
                e.target.style.display = 'none'
              }}
            />
          </div>
        )}

        <div className={styles.postStats}>
          <span>{likeCount} like{likeCount !== 1 ? 's' : ''} • {commentCount} comment{commentCount !== 1 ? 's' : ''}</span>
        </div>

        <div className={styles.postActionsRow}>
          <div
            className={`${styles.postAction} ${isLiked ? styles.liked : ''}`}
            onClick={handleLikeToggle}
            disabled={isLoading}
            style={{ cursor: isLoading ? 'not-allowed' : 'pointer' }}
          >
            <i className={isLiked ? 'fas fa-heart' : 'far fa-heart'}></i>
            Like
          </div>
          <div
            className={styles.postAction}
            onClick={handleCommentToggle}
          >
            <i className="far fa-comment"></i>
            Comment
          </div>
        </div>

        {/* Comments Section */}
        {showComments && (
          <GroupComments
            postId={post.ID}
            isGroupMember={isGroupMember}
            onCommentAdded={handleCommentAdded}
          />
        )}
      </div>

      {/* Image Modal */}
      {post.ImagePath && (
        <ImageModal
          src={`${API_URL}${post.ImagePath}`}
          alt="Post attachment"
          isOpen={showImageModal}
          onClose={() => setShowImageModal(false)}
        />
      )}
    </div>
  )
}
