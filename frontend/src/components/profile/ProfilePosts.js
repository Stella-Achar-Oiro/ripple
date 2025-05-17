// frontend/src/components/profile/ProfilePosts.js
import { useState, useEffect } from 'react';
import PostCard from '../posts/PostCard';

const ProfilePosts = ({ userId }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      
      try {
        // In a real app, we'd fetch posts from the API
        // For now, let's use mock data
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const mockPosts = [
          {
            id: '101',
            content: "Just updated my profile on Ripple! Loving the new design.",
            imagePath: null,
            privacy: 'public',
            user: {
              id: userId,
              firstName: 'Jane',
              lastName: 'Doe',
              avatarPath: null,
            },
            createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
            likes: 15,
            comments: [],
          },
          {
            id: '102',
            content: 'Beautiful sunset from my balcony tonight! 🌇',
            imagePath: 'https://images.unsplash.com/photo-1472120435266-53107fd0c44a?w=800',
            privacy: 'public',
            user: {
              id: userId,
              firstName: 'Jane',
              lastName: 'Doe',
              avatarPath: null,
            },
            createdAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
            likes: 42,
            comments: [
              {
                id: '201',
                postId: '102',
                content: 'Wow, gorgeous view!',
                user: {
                  id: '3',
                  firstName: 'John',
                  lastName: 'Smith',
                  avatarPath: null,
                },
                createdAt: new Date(Date.now() - 170000000).toISOString(),
              }
            ],
          },
        ];
        
        setPosts(mockPosts);
      } catch (error) {
        console.error('Error fetching posts:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPosts();
  }, [userId]);
  
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
  
  if (posts.length === 0) {
    return (
      <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center">
        <p className="text-gray-500">No posts yet.</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
};

export default ProfilePosts;