// frontend/src/components/posts/Feed.js
import { useState, useEffect } from 'react';
import PostForm from './PostForm';
import PostCard from './PostCard';

const Feed = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // In a real app, we'd fetch posts from the API
    // For now, let's use mock data
    const mockPosts = [
      {
        id: '1',
        content: 'Just launched Ripple! The next generation social network. What do you think?',
        imagePath: null,
        privacy: 'public',
        user: {
          id: '2',
          firstName: 'Jane',
          lastName: 'Doe',
          avatarPath: null,
        },
        createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        likes: 12,
        comments: [
          {
            id: '1',
            postId: '1',
            content: 'Looks amazing! Can\'t wait to try it out.',
            user: {
              id: '3',
              firstName: 'John',
              lastName: 'Smith',
              avatarPath: null,
            },
            createdAt: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
          }
        ],
      },
      {
        id: '2',
        content: 'Beautiful day for coding! ☀️',
        imagePath: 'https://images.unsplash.com/photo-1587620962725-abab7fe55159?w=800',
        privacy: 'almost_private',
        user: {
          id: '3',
          firstName: 'John',
          lastName: 'Smith',
          avatarPath: null,
        },
        createdAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
        likes: 5,
        comments: [],
      },
    ];
    
    // Simulate API delay
    setTimeout(() => {
      setPosts(mockPosts);
      setLoading(false);
    }, 1000);
  }, []);
  
  const handlePostCreated = (newPost) => {
    setPosts([newPost, ...posts]);
  };
  
  if (loading) {
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
  
  return (
    <div className="space-y-4">
      <PostForm onPostCreated={handlePostCreated} />
      
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
      
      {posts.length === 0 && (
        <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center">
          <p className="text-gray-500">No posts yet. Be the first to share something!</p>
        </div>
      )}
    </div>
  );
};

export default Feed;