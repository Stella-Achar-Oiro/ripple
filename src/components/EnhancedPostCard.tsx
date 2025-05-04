'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, 
  MessageCircle, 
  MoreHorizontal, 
  Share2, 
  Bookmark, 
  Globe, 
  Lock, 
  Users, 
  ChevronDown, 
  ChevronUp 
} from 'lucide-react';
import { Post } from '@/types/post';
import usePostsStore from '@/store/posts';
import Avatar from './Avatar';
import CommentSection from './CommentSection';

type PrivacyLevel = 'public' | 'private' | 'almost-private';

interface EnhancedPostCardProps {
  post: Post;
  showComments?: boolean;
}

export default function EnhancedPostCard({ post, showComments = false }: EnhancedPostCardProps) {
  const { likePost } = usePostsStore();
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [commentsVisible, setCommentsVisible] = useState(showComments);
  
  // For demo purposes, assign a random privacy level
  const privacyLevel: PrivacyLevel = ['public', 'private', 'almost-private'][
    Math.floor(Math.random() * 3)
  ] as PrivacyLevel;
  
  const handleLike = () => {
    if (!isLiked) {
      likePost(post.id);
      setIsLiked(true);
    }
  };
  
  const toggleSaved = () => {
    setIsSaved(!isSaved);
  };
  
  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };
  
  const toggleComments = () => {
    setCommentsVisible(!commentsVisible);
  };
  
  // Privacy level icon and text
  const privacyInfo = {
    'public': {
      icon: <Globe size={14} />,
      text: 'Public'
    },
    'private': {
      icon: <Lock size={14} />,
      text: 'Private'
    },
    'almost-private': {
      icon: <Users size={14} />,
      text: 'Connections only'
    }
  };
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
    >
      {/* Post header */}
      <div className="p-4 flex justify-between items-center">
        <Link href={`/profile/${post.author.username}`} className="flex items-center group">
          <Avatar 
            src={post.author.avatar} 
            alt={post.author.name}
            size="md"
            className="mr-3 transition-transform group-hover:scale-105"
          />
          <div>
            <h3 className="font-medium group-hover:text-primary transition-colors">
              {post.author.name}
            </h3>
            <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
              <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
              <span className="mx-1">•</span>
              <div className="flex items-center">
                {privacyInfo[privacyLevel].icon}
                <span className="ml-1">{privacyInfo[privacyLevel].text}</span>
              </div>
            </div>
          </div>
        </Link>
        
        <div className="relative">
          <button 
            onClick={toggleDropdown}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Post options"
          >
            <MoreHorizontal size={20} />
          </button>
          
          <AnimatePresence>
            {showDropdown && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowDropdown(false)}
                />
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-md shadow-lg z-20 py-1 border border-gray-200 dark:border-gray-700"
                >
                  <button 
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
                      setShowDropdown(false);
                    }}
                  >
                    <Share2 size={16} className="mr-2" />
                    Copy link
                  </button>
                  <button 
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                    onClick={() => {
                      toggleSaved();
                      setShowDropdown(false);
                    }}
                  >
                    <Bookmark size={16} className="mr-2" />
                    {isSaved ? 'Unsave post' : 'Save post'}
                  </button>
                  <hr className="my-1 border-gray-200 dark:border-gray-700" />
                  <button 
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-error flex items-center"
                    onClick={() => {
                      // Report functionality would go here
                      setShowDropdown(false);
                    }}
                  >
                    <span className="mr-2">⚠️</span>
                    Report post
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      {/* Post content */}
      <div className="px-4 pb-3">
        <p className="whitespace-pre-wrap text-gray-900 dark:text-gray-100">{post.content}</p>
      </div>
      
      {/* Post image */}
      {post.image && (
        <div className="relative">
          <img 
            src={post.image} 
            alt="Post attachment" 
            className="w-full object-cover max-h-[32rem]"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 hover:opacity-100 transition-opacity" />
        </div>
      )}
      
      {/* Post stats */}
      <div className="px-4 py-2 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <span className="flex items-center">
            <Heart size={14} className="mr-1 fill-primary text-primary" />
            <span>{post.likes + (isLiked ? 1 : 0)}</span>
          </span>
        </div>
        
        <button 
          onClick={toggleComments}
          className="flex items-center hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        >
          <span>{post.comments} comments</span>
        </button>
      </div>
      
      {/* Post actions */}
      <div className="flex items-center justify-around px-2 py-1 border-t border-gray-200 dark:border-gray-700">
        <button 
          onClick={handleLike}
          className={`
            flex items-center justify-center py-2 px-4 rounded-md w-full transition-colors
            ${isLiked 
              ? 'text-primary' 
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}
          `}
        >
          <Heart size={20} fill={isLiked ? 'currentColor' : 'none'} className="mr-2" />
          <span>Like</span>
        </button>
        
        <button 
          onClick={toggleComments}
          className="flex items-center justify-center py-2 px-4 rounded-md w-full text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <MessageCircle size={20} className="mr-2" />
          <span>Comment</span>
        </button>
        
        <button 
          onClick={() => {
            navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
          }}
          className="flex items-center justify-center py-2 px-4 rounded-md w-full text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <Share2 size={20} className="mr-2" />
          <span>Share</span>
        </button>
      </div>
      
      {/* Comments section */}
      <AnimatePresence>
        {commentsVisible && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="border-t border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            <CommentSection postId={post.id} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}