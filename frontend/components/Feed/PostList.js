'use client'

import { useState, useEffect } from 'react'
import styles from './PostList.module.css'
import Comments from './Comments'
import { useAuth } from '../../contexts/AuthContext'

export default function PostList() {
  const { user } = useAuth()
  const [posts, setPosts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [visibleCommentsPostId, setVisibleCommentsPostId] = useState(null)
  const [activeMenuPostId, setActiveMenuPostId] = useState(null)
  const [editingPost, setEditingPost] = useState(null)

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

  const fetchPosts = async () => {
    try {
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

  useEffect(() => {
    fetchPosts()
  }, [])

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
            <div className={styles.postContent}>{post.content}</div>
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
      ))}
    </div>
  )
} 