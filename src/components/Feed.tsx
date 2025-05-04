'use client';

import { useEffect } from 'react';
import usePostsStore from '@/store/posts';
import PostCard from './PostCard';
import CreatePostForm from './CreatePostForm';
import useAuthStore from '@/store/auth';
import { Loader } from 'lucide-react';

export default function Feed() {
  const { posts, isLoading, error, fetchPosts } = usePostsStore();
  const { user } = useAuthStore();
  
  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);
  
  if (!user) {
    return null;
  }
  
  return (
    <div className="max-w-2xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <CreatePostForm />
      
      {isLoading && posts.length === 0 ? (
        <div className="flex justify-center items-center py-10">
          <Loader className="animate-spin h-8 w-8 text-primary" />
        </div>
      ) : error ? (
        <div className="bg-error/10 text-error p-4 rounded-lg mt-4">
          <p>{error}</p>
          <button 
            onClick={() => fetchPosts()}
            className="mt-2 text-sm underline"
          >
            Try again
          </button>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {posts.map(post => (
            <PostCard key={post.id} post={post} />
          ))}
          
          {posts.length === 0 && (
            <div className="text-center py-10 text-gray-500">
              <p>No posts yet. Be the first to post!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}