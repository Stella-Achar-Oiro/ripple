"use client";
import { useEffect, useRef } from 'react';
import usePostStore from '@/store/posts';
import PostCard from './PostCard';
import { Loader2 } from 'lucide-react';

interface PostListProps {
  username?: string;
}

export default function PostList({ username }: PostListProps) {
  const { posts, isLoading, error, nextCursor, fetchPosts, fetchMorePosts } = usePostStore();
  const loadingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && nextCursor) {
          fetchMorePosts();
        }
      },
      { threshold: 0.1 }
    );

    if (loadingRef.current) {
      observer.observe(loadingRef.current);
    }

    return () => observer.disconnect();
  }, [nextCursor, fetchMorePosts]);

  useEffect(() => {
    fetchPosts(username);
    return () => usePostStore.getState().reset();
  }, [username, fetchPosts]);

  if (isLoading && posts.length === 0) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="animate-spin" size={24} />
      </div>
    );
  }

  if (error && posts.length === 0) {
    return (
      <div className="text-error text-center p-8">
        {error}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center text-gray-500 p-8">
        No posts yet. Be the first to post!
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
      {nextCursor && (
        <div ref={loadingRef} className="flex justify-center p-4">
          {isLoading && <Loader2 className="animate-spin" size={24} />}
        </div>
      )}
    </div>
  );
}