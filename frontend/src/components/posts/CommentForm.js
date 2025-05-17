// frontend/src/components/posts/CommentForm.js
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

const CommentForm = ({ postId, onCommentAdded }) => {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (content.trim() === '') {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // In a real app, we'd send this to the API
      const newComment = {
        id: Date.now().toString(),
        postId,
        content,
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          avatarPath: user.avatarPath,
        },
        createdAt: new Date().toISOString(),
      };
      
      // Reset form
      setContent('');
      
      // Notify parent component
      if (onCommentAdded) {
        onCommentAdded(newComment);
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="flex items-start gap-2 mt-3">
      <div className="w-8 h-8 bg-navy-200 rounded-full flex items-center justify-center text-navy-700 font-bold text-xs">
        {user?.firstName.charAt(0)}{user?.lastName.charAt(0)}
      </div>
      <div className="flex-1 relative">
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write a comment..."
          className="w-full px-3 py-2 bg-gray-100 rounded-full focus:outline-none focus:ring-1 focus:ring-navy-500 pr-12"
        />
        <button
          type="submit"
          disabled={isSubmitting || content.trim() === ''}
          className={`absolute right-2 top-1/2 transform -translate-y-1/2 text-navy-600 ${
            isSubmitting || content.trim() === '' ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          📨
        </button>
      </div>
    </form>
  );
};

export default CommentForm;