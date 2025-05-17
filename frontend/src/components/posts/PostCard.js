// frontend/src/components/posts/PostCard.js
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import CommentForm from './CommentForm';
import CommentList from './CommentList';

const PostCard = ({ post }) => {
  const { user } = useAuth();
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes || 0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState(post.comments || []);
  
  const handleLike = () => {
    if (isLiked) {
      setLikesCount(likesCount - 1);
    } else {
      setLikesCount(likesCount + 1);
    }
    setIsLiked(!isLiked);
    
    // In a real app, we'd send this to the API
  };
  
  const handleAddComment = (newComment) => {
    setComments([...comments, newComment]);
    
    // In a real app, we'd send this to the API
  };
  
  // Format date to relative time (e.g., "2 hours ago")
  const getRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) {
      return 'just now';
    }
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'} ago`;
    }
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
    }
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) {
      return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;
    }
    
    const diffInMonths = Math.floor(diffInDays / 30);
    return `${diffInMonths} ${diffInMonths === 1 ? 'month' : 'months'} ago`;
  };
  
  // Get privacy icon
  const getPrivacyIcon = (privacy) => {
    switch (privacy) {
      case 'public':
        return '🌎';
      case 'almost_private':
        return '👥';
      case 'private':
        return '🔒';
      default:
        return '🌎';
    }
  };
  
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      {/* Post Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-navy-200 rounded-full flex items-center justify-center text-navy-700 font-bold">
          {post.user.firstName.charAt(0)}{post.user.lastName.charAt(0)}
        </div>
        <div className="flex-1">
          <div className="font-medium">{post.user.firstName} {post.user.lastName}</div>
          <div className="text-xs text-gray-500 flex items-center gap-1">
            {getRelativeTime(post.createdAt)} • {getPrivacyIcon(post.privacy)}
          </div>
        </div>
        
        {/* Post Menu (for future use) */}
        {post.user.id === user?.id && (
          <button className="text-gray-400 hover:text-gray-600">•••</button>
        )}
      </div>
      
      {/* Post Content */}
      <div className="mb-3">
        <p className="whitespace-pre-line">{post.content}</p>
      </div>
      
      {/* Post Image */}
      {post.imagePath && (
        <div className="mb-3">
          <img 
            src={post.imagePath} 
            alt="Post" 
            className="max-h-96 rounded-lg mx-auto"
          />
        </div>
      )}
      
      {/* Post Stats */}
      <div className="flex justify-between items-center text-sm text-gray-500 mb-2">
        <div>
          {likesCount > 0 && (
            <span>{likesCount} {likesCount === 1 ? 'like' : 'likes'}</span>
          )}
        </div>
        <div>
          {comments.length > 0 && (
            <button 
              onClick={() => setShowComments(!showComments)}
              className="hover:underline"
            >
              {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
            </button>
          )}
        </div>
      </div>
      
      {/* Post Actions */}
      <div className="flex border-t border-b border-gray-100 py-1 mb-3">
        <button 
          onClick={handleLike}
          className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-md ${
            isLiked ? 'text-navy-600' : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          {isLiked ? '❤️' : '🤍'} Like
        </button>
        <button 
          onClick={() => setShowComments(!showComments)}
          className="flex-1 flex items-center justify-center gap-1 py-1 text-gray-500 hover:bg-gray-50 rounded-md"
        >
          💬 Comment
        </button>
      </div>
      
      {/* Comments Section */}
      {showComments && (
        <div>
          <CommentList comments={comments} />
          <CommentForm 
            postId={post.id} 
            onCommentAdded={handleAddComment} 
          />
        </div>
      )}
    </div>
  );
};

export default PostCard;