// src/hooks/usePosts.js
import { useState, useCallback } from 'react';
import { initialPosts } from '../data/mockData';

export const usePosts = () => {
  const [posts, setPosts] = useState(initialPosts);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createPost = useCallback((postData) => {
    try {
      setLoading(true);
      const newPost = {
        id: Date.now(),
        ...postData,
        time: 'now',
        likes: 0,
        comments: 0,
        shares: 0,
        liked: false,
        image: null
      };
      setPosts(prevPosts => [newPost, ...prevPosts]);
      setError(null);
      return { success: true };
    } catch (err) {
      setError('Failed to create post');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const likePost = useCallback((postId) => {
    setPosts(prevPosts => 
      prevPosts.map(post => 
        post.id === postId 
          ? { 
              ...post, 
              liked: !post.liked, 
              likes: post.liked ? post.likes - 1 : post.likes + 1 
            }
          : post
      )
    );
  }, []);

  const deletePost = useCallback((postId) => {
    setPosts(prevPosts => prevPosts.filter(post => post.id !== postId));
  }, []);

  const getPostsByTag = useCallback((tag) => {
    return posts.filter(post => post.tags && post.tags.includes(tag));
  }, [posts]);

  const getPostsByUser = useCallback((userId) => {
    return posts.filter(post => post.userId === userId);
  }, [posts]);

  return {
    posts,
    loading,
    error,
    createPost,
    likePost,
    deletePost,
    getPostsByTag,
    getPostsByUser
  };
};
