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
  const [likingPosts, setLikingPosts] = useState(new Set())
  const likeOperationsRef = useRef(new Set())
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState('success') // 'success' or 'error'
  const [expandedPosts, setExpandedPosts] = useState({})

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  const MAX_PREVIEW_LENGTH = 350

  const fetchPosts = async () => {
    try {
      setIsLoading(true)
      let url
      if (typeof _.userId !== 'undefined' && _.userId !== null) {
        url = `${API_URL}/api/posts/user/${_.userId}`
      } else {
        url = `${API_URL}/api/posts/feed`
      }
      const response = await fetch(url, {
        credentials: 'include',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Failed to fetch posts')
      }

      const data = await response.json()
      if (data.success) {
        if (!data.data.posts) {
          setPosts([])
        } else {
          setPosts(data.data.posts)
        }
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
          likes_count: !isLiked ? (p.likes_count || 0) + 1 : Math.max(0, (p.likes_count || 1) - 1)
        }
      }
      return p
    }))

    try {
      // Use the single toggle endpoint from main branch
      const response = await fetch(`${API_URL}/api/posts/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ post_id: postId }),
        credentials: 'include',
      })

      if (!response.ok) {
        // Revert optimistic update on failure
        setPosts(prevPosts => prevPosts.map(p => {
          if (p.id === postId) {
            return {
              ...p,
              is_liked: isLiked,
              likes_count: isLiked ? (p.likes_count || 0) + 1 : Math.max(0, (p.likes_count || 1) - 1)
            }
          }
          return p
        }))
        
        // Show error message to user
        setToastType('error')
        setToastMessage('Failed to update like. Please try again.')
        setTimeout(() => setToastMessage(''), 3000)
        
        // If conflict, refresh to get current state
        if (response.status === 409) {
          fetchPosts()
        }
      } else {
        // Update with actual server response for consistency
        const data = await response.json()
        if (data.success && data.data) {
          setPosts(prevPosts => prevPosts.map(p => {
            if (p.id === postId) {
              return {
                ...p,
                is_liked: data.data.liked,
                likes_count: data.data.like_count
              }
            }
            return p
          }))
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
            likes_count: isLiked ? (p.likes_count || 0) + 1 : Math.max(0, (p.likes_count || 1) - 1)
          }
        }
        return p
      }))
      
      // Show error message to user
      setToastType('error')
      setToastMessage('Network error. Please check your connection.')
      setTimeout(() => setToastMessage(''), 3000)
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
        setToastType('success')
        setToastMessage('Link copied to clipboard!')
        // Clear the message after 3 seconds
        setTimeout(() => setToastMessage(''), 3000)
      } else {
        // Final fallback
        setToastType('error')
        setToastMessage('Sharing not supported on this device')
        setTimeout(() => setToastMessage(''), 3000)
      }
    } catch (err) {
      console.error('Error sharing post:', err)
      setToastType('error')
      setToastMessage('Failed to share post')
      setTimeout(() => setToastMessage(''), 3000)
    }
  }

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post?')) {
      return
    }

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
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
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
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

  // Helper to get privacy icon class
  const getPrivacyIcon = (privacy) => {
    return privacy === 'Public' || privacy === 'public' ? 'fas fa-globe' : 'fas fa-users'
  }
  const handleLike = async (postId) => {
    try {
      const response = await fetch(`${API_URL}/api/posts/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ post_id: postId }),
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to like post');
      }

      const result = await response.json();
      if (result.success) {
        const { liked, like_count } = result.data;
        setPosts(
          posts.map((p) =>
            p.id === postId ? { ...p, is_liked: liked, likes_count: like_count } : p
          )
        );
      } else {
        throw new Error(result.message || 'Failed to process like');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while liking the post');
      console.error('Error liking post:', err);
    }
  };

  const handleToggleExpand = (postId) => {
    setExpandedPosts((prev) => ({ ...prev, [postId]: !prev[postId] }))
  }

  useEffect(() => {
    fetchPosts()
  }, [])

  if (isLoading) {
    return <div className={styles.loading}>Loading posts...</div>
  }

  if (posts.length === 0) {
    return <div className={styles.noPosts}>No posts yet.</div>
  }

  if (error) {
    return <div className={styles.error}>{typeof error === 'string' ? error : JSON.stringify(error)}</div>
  }

  return (
    <div className={styles.postList}>
      {posts.map((post) => {
        const isLong = post.content && post.content.length > MAX_PREVIEW_LENGTH
        const previewContent = isLong ? post.content.slice(0, MAX_PREVIEW_LENGTH) + '...' : post.content
        const expanded = expandedPosts[post.id] || false
        return (
          <div key={post.id} className={styles.postCard}>
            <div className={styles.postHeader}>
              <div className={styles.userInfo}>
                <div className="user-avatar">
                  {`${post.author?.first_name?.[0] || ''}${post.author?.last_name?.[0] || ''}`.toUpperCase() || 'U'}
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
              <div className={styles.postContent}>
                {expanded || !isLong ? post.content : previewContent}
                {isLong && (
                  <span
                    style={{ color: 'var(--primary-purple)', cursor: 'pointer', marginLeft: 8, fontWeight: 500 }}
                    onClick={() => handleToggleExpand(post.id)}
                  >
                    {expanded ? ' Show less' : ' Read more'}
                  </span>
                )}
              </div>
            )}
            {post.image_path && (
              <div className={styles.postImage}>
                {post.image_path.endsWith('.mp4') || post.image_path.endsWith('.webm') || post.image_path.endsWith('.mov') ? (
                  <video src={`${API_URL}${post.image_path}`} controls />
                ) : (
                  <img src={`${API_URL}${post.image_path}`} alt="Post attachment" />
                )}
              </div>
            )}
            <div className={styles.postActions}>
              <button
                className={`${styles.actionButton} ${post.is_liked ? styles.liked : ''}`}
                onClick={() => handleLike(post.id)}
              >
                <i className={post.is_liked ? 'fas fa-heart' : 'far fa-heart'}></i> Like ({post.likes_count || 0})
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
              <button className={styles.actionButton}>
                <i className="far fa-share-square"></i> Share
              </button>
            </div>
            {visibleCommentsPostId === post.id && <Comments postId={post.id} />}
          </div>
        )
      })}
    </div>
  )
})

export default PostList