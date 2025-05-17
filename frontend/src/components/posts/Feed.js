// frontend/src/components/posts/Feed.js
import { useState, useEffect } from 'react';
import PostForm from './PostForm';
import PostCard from './PostCard';
import { postsAPI } from '../../services/api';

const Feed = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    limit: 10,
    offset: 0,
    hasMore: true
  });
  
  const fetchPosts = async (reset = false) => {
    try {
      const offset = reset ? 0 : pagination.offset;
      const { posts: newPosts, pagination: newPagination } = await postsAPI.getFeed(pagination.limit, offset);
      
      setPosts(prev => reset ? newPosts : [...prev, ...newPosts]);
      setPagination(prev => ({
        ...prev,
        offset: offset + newPosts.length,
        hasMore: newPosts.length === pagination.limit
      }));
      setError(null);
    } catch (err) {
      console.error('Error fetching feed:', err);
      setError('Failed to load posts. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchPosts(true);
  }, []);
  
  const handlePostCreated = (newPost) => {
    setPosts([newPost, ...posts]);
  };
  
  const handleLoadMore = () => {
    if (!loading && pagination.hasMore) {
      setLoading(true);
      fetchPosts();
    }
  };
  
  const handleLikeToggle = async (postId, isLiked) => {
    try {
      if (isLiked) {
        await postsAPI.unlikePost(postId);
      } else {
        await postsAPI.likePost(postId);
      }
      
      // Update the post in state
      setPosts(posts.map(post => 
        post.id === postId 
          ? { 
              ...post, 
              isLiked: !isLiked,
              likesCount: isLiked ? post.likesCount - 1 : post.likesCount + 1 
            } 
          : post
      ));
    } catch (err) {
      console.error('Error toggling like:', err);
    }
  };
  
  const handleDeletePost = async (postId) => {
    try {
      await postsAPI.deletePost(postId);
      setPosts(posts.filter(post => post.id !== postId));
    } catch (err) {
      console.error('Error deleting post:', err);
    }
  };
  
  const handleAddComment = async (postId, content, image = null) => {
    try {
      const newComment = await postsAPI.createComment(postId, { content, image });
      
      // Update the post comments count in state
      setPosts(posts.map(post => 
        post.id === postId 
          ? { ...post, commentsCount: post.commentsCount + 1 } 
          : post
      ));
      
      return newComment;
    } catch (err) {
      console.error('Error adding comment:', err);
      throw err;
    }
  };
  
  if (loading && posts.length === 0) {
    return (
      <div className="space-y-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 animate-pulse">
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 animate-pulse">
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
        <p className="text-red-700">{error}</p>
        <button 
          onClick={() => fetchPosts(true)}
          className="mt-2 px-4 py-2 bg-navy-600 text-white rounded-md"
        >
          Try Again
        </button>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <PostForm onPostCreated={handlePostCreated} />
      
      {posts.map((post) => (
        <PostCard 
          key={post.id} 
          post={post} 
          onLikeToggle={handleLikeToggle}
          onDeletePost={handleDeletePost}
          onAddComment={handleAddComment}
        />
      ))}
      
      {posts.length === 0 && (
        <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center">
          <p className="text-gray-500">No posts yet. Be the first to share something!</p>
        </div>
      )}
      
      {pagination.hasMore && (
        <div className="text-center py-4">
          <button
            onClick={handleLoadMore}
            disabled={loading}
            className={`px-4 py-2 bg-navy-600 text-white rounded-md ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-navy-700'}`}
          >
            {loading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  );
};

export default Feed;