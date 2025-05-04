'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Heart, MessageCircle, MoreHorizontal } from 'lucide-react';
import { Post } from '@/types/post';
import usePostsStore from '@/store/posts';

interface PostCardProps {
  post: Post;
}

export default function PostCard({ post }: PostCardProps) {
  const { likePost } = usePostsStore();
  const [isLiked, setIsLiked] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  
  const handleLike = () => {
    if (!isLiked) {
      likePost(post.id);
      setIsLiked(true);
    }
  };
  
  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-4">
      {/* Post header */}
      <div className="flex justify-between items-center mb-3">
        <Link href={`/profile/${post.author.username}`} className="flex items-center">
          <img 
            src={post.author.avatar || '/default-avatar.png'} 
            alt={post.author.name}
            className="w-10 h-10 rounded-full mr-3"
          />
          <div>
            <h3 className="font-medium">{post.author.name}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
            </p>
          </div>
        </Link>
        
        <div className="relative">
          <button 
            onClick={toggleDropdown}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <MoreHorizontal size={20} />
          </button>
          
          {showDropdown && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setShowDropdown(false)}
              />
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg z-20">
                <button 
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => {
                    // Copy link functionality
                    navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
                    setShowDropdown(false);
                  }}
                >
                  Copy link
                </button>
                <button 
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-error"
                  onClick={() => {
                    // Report functionality would go here
                    setShowDropdown(false);
                  }}
                >
                  Report
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* Post content */}
      <div className="mb-4">
        <p className="whitespace-pre-wrap">{post.content}</p>
        
        {post.image && (
          <img 
            src={post.image} 
            alt="Post attachment" 
            className="mt-3 rounded-lg max-h-96 w-full object-cover"
          />
        )}
      </div>
      
      {/* Post actions */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
        <button 
          onClick={handleLike}
          className={`flex items-center space-x-1 ${isLiked ? 'text-primary' : ''}`}
        >
          <Heart size={20} fill={isLiked ? 'currentColor' : 'none'} />
          <span>{post.likes + (isLiked ? 1 : 0)}</span>
        </button>
        
        <Link href={`/post/${post.id}`} className="flex items-center space-x-1">
          <MessageCircle size={20} />
          <span>{post.comments}</span>
        </Link>
      </div>
    </div>
  );
}