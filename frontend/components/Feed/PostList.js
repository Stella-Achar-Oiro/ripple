'use client'

import { useState, useEffect, forwardRef, useImperativeHandle, useRef } from 'react'
import Link from 'next/link'
import styles from './PostList.module.css'
import Comments from './Comments'
import Avatar from '../shared/Avatar'
import { useAuth } from '../../contexts/AuthContext'

const PostList = forwardRef(function PostList(_, ref) {
  const { user } = useAuth()
  const [posts, setPosts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [visibleCommentsPostId, setVisibleCommentsPostId] = useState(null)
  const [activeMenuPostId, setActiveMenuPostId] = useState(null)
  const [editingPost, setEditingPost] = useState(null)
  const [likingPosts, setLikingPosts] = useState(new Set()) // Track ongoing like operations
  const likeOperationsRef = useRef(new Set()) // Track ongoing like operations
  const [toastMessage, setToastMessage] = useState('')

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

  const fetchPosts = async () => {
    try {
      setIsLoading(true)
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

  // Expose refresh function to parent
  useImperativeHandle(ref, () => ({
    refreshPosts: fetchPosts
  }))

  const handleLikeToggle = async (postId, isLiked) => {
    // Prevent double-clicking/concurrent operations
    if (likeOperationsRef.current.has(postId)) {
      return
    }

    const post = posts.find(p => p.id === postId)
    if (!post) return

    // Mark operation as in progress
    likeOperationsRef.current.add(postId)
    setLikingPosts(new Set([...likingPosts, postId]))

    // Optimistically update UI immediately
    setPosts(prevPosts => prevPosts.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          is_liked: !isLiked,
          like_count: !isLiked ? (p.like_count || 0) + 1 : Math.max(0, (p.like_count || 1) - 1)
        }
      }
      return p
    }))

    try {
      // Simple approach - use UI state to determine action
      const endpoint = isLiked ? 'unlike' : 'like'
      const response = await fetch(`${API_URL}/api/posts/${endpoint}/${postId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })

      if (!response.ok) {
        // Revert optimistic update on failure
        setPosts(prevPosts => prevPosts.map(p => {
          if (p.id === postId) {
            return {
              ...p,
              is_liked: isLiked,
              like_count: isLiked ? (p.like_count || 0) + 1 : Math.max(0, (p.like_count || 1) - 1)
            }
          }
          return p
        }))
        
        // If conflict, just refresh to get current state
        if (response.status === 409) {
          fetchPosts()
        }
      }
      
    } catch (err) {
      console.error('Error toggling like:', err)
      // Revert optimistic update on error
      setPosts(prevPosts => prevPosts.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            is_liked: isLiked,
            like_count: isLiked ? (p.like_count || 0) + 1 : Math.max(0, (p.like_count || 1) - 1)
          }
        }
        return p
      }))
    } finally {
      // Always remove from ongoing operations
      likeOperationsRef.current.delete(postId)
      setLikingPosts(prev => {
        const newSet = new Set(prev)
        newSet.delete(postId)
        return newSet
      })
    }
  }

  const handleShare = async (postId) => {
    try {
      // For now, implement basic sharing (copy link)
      const postUrl = `${window.location.origin}/posts/${postId}`
      
      if (navigator.share) {
        // Use native sharing if available
        await navigator.share({
          title: 'Check out this post',
          url: postUrl,
        })
      } else if (navigator.clipboard) {
        // Fallback to copying link
        await navigator.clipboard.writeText(postUrl)
        setToastMessage('Link copied to clipboard!')
        // Clear the message after 3 seconds
        setTimeout(() => setToastMessage(''), 3000)
      } else {
        // Final fallback
        setToastMessage('Sharing not supported on this device')
        setTimeout(() => setToastMessage(''), 3000)
      }
    } catch (err) {
      console.error('Error sharing post:', err)
      setToastMessage('Failed to share post')
      setTimeout(() => setToastMessage(''), 3000)
    }
  }

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post?')) {
      return
    }

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
      const response = await fetch(`${API_URL}/api/posts/delete/${postId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Failed to delete post')
      }

      setPosts(posts.filter((p) => p.id !== postId))
      setActiveMenuPostId(null)
    } catch (err) {
      setError(err.message || 'An error occurred while deleting the post')
      console.error('Error deleting post:', err)
    }
  }

  const handleUpdatePost = async () => {
    if (!editingPost) return

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
      const response = await fetch(`${API_URL}/api/posts/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          post_id: editingPost.id,
          content: editingPost.content,
        }),
        credentials: 'include',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Failed to update post')
      }

      const updatedPost = await response.json()

      setPosts(posts.map((p) => (p.id === updatedPost.data.id ? updatedPost.data : p)))
      setEditingPost(null)
      setActiveMenuPostId(null)
    } catch (err) {
      setError(err.message || 'An error occurred while updating the post')
      console.error('Error updating post:', err)
    }
  }

  useEffect(() => {
    fetchPosts()
  }, [])

  if (isLoading) {
    return <div className={styles.loading}>Loading posts...</div>
  }

  if (error) {
    return <div className={styles.error}>{typeof error === 'string' ? error : JSON.stringify(error)}</div>
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
              <Link href={`/profile/${post.author?.id}`} className={styles.avatarLink}>
                <Avatar user={post.author} size="medium" />
              </Link>
              <div className={styles.userDetails}>
                <Link href={`/profile/${post.author?.id}`} className={styles.userNameLink}>
                  <span className={styles.userName}>
                    {post.author?.first_name} {post.author?.last_name}
                  </span>
                </Link>
                <span className={styles.postTime}>
                  {new Date(post.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
            <div className={styles.postPrivacy}>
              <i className={`fas fa-${post.privacy_level === 'public' ? 'globe' : 'lock'}`}></i>
            </div>
            {user && user.id === post.author?.id && (
              <div className={styles.postMenu}>
                <button onClick={() => setActiveMenuPostId(activeMenuPostId === post.id ? null : post.id)} className={styles.menuButton}>
                  <i className="fas fa-ellipsis-h"></i>
                </button>
                {activeMenuPostId === post.id && (
                  <div className={styles.dropdownMenu}>
                    <button onClick={() => setEditingPost({ ...post })}>Edit</button>
                    <button onClick={() => handleDeletePost(post.id)}>Delete</button>
                  </div>
                )}
              </div>
            )}
          </div>
          {editingPost && editingPost.id === post.id ? (
            <div className={styles.editPost}>
              <textarea
                value={editingPost.content}
                onChange={(e) => setEditingPost({ ...editingPost, content: e.target.value })}
                className={styles.editTextArea}
              />
              <div className={styles.editActions}>
                <button onClick={() => setEditingPost(null)} className={styles.cancelButton}>Cancel</button>
                <button onClick={handleUpdatePost} className={styles.saveButton}>Save</button>
              </div>
            </div>
          ) : (
            <div className={styles.postContent}>{post.content}</div>
          )}
          {post.image_path && (
            <div className={styles.postImage}>
              <img src={`${API_URL}${post.image_path}`} alt="Post attachment" />
            </div>
          )}
          <div className={styles.postActions}>
            <button 
              className={`${styles.actionButton} ${post.is_liked ? styles.liked : ''}`}
              onClick={() => handleLikeToggle(post.id, post.is_liked)}
              disabled={likingPosts.has(post.id)}
            >
              {likingPosts.has(post.id) ? (
                <i className="fas fa-spinner fa-spin"></i>
              ) : (
                <i className={`${post.is_liked ? 'fas' : 'far'} fa-heart`}></i>
              )}
              Like {post.like_count ? `(${post.like_count})` : ''}
            </button>
            <button
              className={styles.actionButton}
              onClick={() =>
                setVisibleCommentsPostId(
                  visibleCommentsPostId === post.id ? null : post.id
                )
              }
            >
              <i className="far fa-comment"></i> Comment ({post.comment_count || 0})
            </button>
            <button
              className={styles.actionButton}
              onClick={() => handleShare(post.id)}
            >
              <i className="fas fa-share"></i> Share
            </button>
          </div>
          {visibleCommentsPostId === post.id && <Comments postId={post.id} />}
        </div>
      ))}
      {toastMessage && (
        <div className={styles.toast}>
          <i className="fas fa-check-circle"></i>
          {toastMessage}
        </div>
      )}
    </div>
  )
})

export default PostList 