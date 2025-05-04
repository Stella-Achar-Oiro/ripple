'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Send, Heart } from 'lucide-react';
import Avatar from './Avatar';
import useAuthStore from '@/store/auth';
import { formatDistanceToNow } from 'date-fns';

// Mock comments data
const mockComments = [
  {
    id: '1',
    content: 'This is amazing! Thanks for sharing.',
    author: {
      id: '2',
      username: 'janedoe',
      name: 'Jane Doe',
      avatar: '/default-avatar.png',
    },
    likes: 3,
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
  },
  {
    id: '2',
    content: 'I\'ve been looking for something like this for a while!',
    author: {
      id: '3',
      username: 'alexsmith',
      name: 'Alex Smith',
      avatar: '/default-avatar.png',
    },
    likes: 1,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
  },
];

const commentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(500, 'Comment is too long'),
});

type CommentFormData = z.infer<typeof commentSchema>;

interface CommentSectionProps {
  postId: string;
}

export default function CommentSection({ postId }: CommentSectionProps) {
  const { user } = useAuthStore();
  const [comments, setComments] = useState(mockComments);
  const [likedComments, setLikedComments] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CommentFormData>({
    resolver: zodResolver(commentSchema),
  });
  
  const onSubmit = async (data: CommentFormData) => {
    if (!user) return;
    
    setIsSubmitting(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Add new comment
    const newComment = {
      id: `new-${Date.now()}`,
      content: data.content,
      author: {
        id: user.id,
        username: user.username,
        name: user.name,
        avatar: user.avatar,
      },
      likes: 0,
      createdAt: new Date().toISOString(),
    };
    
    setComments([newComment, ...comments]);
    reset();
    setIsSubmitting(false);
  };
  
  const handleLikeComment = (commentId: string) => {
    if (likedComments.includes(commentId)) return;
    
    setLikedComments([...likedComments, commentId]);
    setComments(
      comments.map(comment => 
        comment.id === commentId 
          ? { ...comment, likes: comment.likes + 1 } 
          : comment
      )
    );
  };
  
  return (
    <div className="p-4 space-y-4">
      {/* Comment form */}
      <form onSubmit={handleSubmit(onSubmit)} className="flex items-start space-x-2">
        <Avatar 
          src={user?.avatar} 
          alt={user?.name || 'User'} 
          size="sm"
        />
        
        <div className="flex-1 relative">
          <textarea
            {...register('content')}
            placeholder="Write a comment..."
            className="w-full p-2 pr-10 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-none min-h-[2.5rem] max-h-32 dark:bg-gray-800"
            rows={1}
            disabled={isSubmitting}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = `${Math.min(target.scrollHeight, 128)}px`;
            }}
          />
          
          <button
            type="submit"
            disabled={isSubmitting}
            className="absolute right-2 bottom-2 text-primary hover:text-primary/80 disabled:text-gray-400"
          >
            <Send size={18} />
          </button>
        </div>
      </form>
      
      {errors.content && (
        <p className="text-error text-sm ml-10">{errors.content.message}</p>
      )}
      
      {/* Comments list */}
      <div className="space-y-4 mt-2">
        {comments.map((comment) => (
          <div key={comment.id} className="flex space-x-2 animate-fadeIn">
            <Avatar 
              src={comment.author.avatar} 
              alt={comment.author.name} 
              size="sm"
            />
            
            <div className="flex-1">
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2">
                <div className="flex justify-between items-start">
                  <span className="font-medium text-sm">{comment.author.name}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm mt-1">{comment.content}</p>
              </div>
              
              <div className="flex items-center mt-1 ml-1 text-xs">
                <button 
                  onClick={() => handleLikeComment(comment.id)}
                  className={`flex items-center mr-3 ${
                    likedComments.includes(comment.id) ? 'text-primary' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  <Heart 
                    size={12} 
                    className="mr-1" 
                    fill={likedComments.includes(comment.id) ? 'currentColor' : 'none'} 
                  />
                  <span>{comment.likes + (likedComments.includes(comment.id) ? 1 : 0)}</span>
                </button>
                <button className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                  Reply
                </button>
              </div>
            </div>
          </div>
        ))}
        
        {comments.length === 0 && (
          <p className="text-center text-gray-500 dark:text-gray-400 text-sm py-4">
            No comments yet. Be the first to comment!
          </p>
        )}
      </div>
    </div>
  );
}