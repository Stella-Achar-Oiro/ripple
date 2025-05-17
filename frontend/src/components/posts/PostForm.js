// frontend/src/components/posts/PostForm.js
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

const PostForm = ({ onPostCreated }) => {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [privacy, setPrivacy] = useState('public');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleRemoveImage = () => {
    setImage(null);
    setImagePreview(null);
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (content.trim() === '' && !image) {
      return; // Don't submit empty posts
    }
    
    setIsSubmitting(true);
    
    try {
      // In a real app, we'd send this to the API
      // For now, let's simulate a successful post creation
      const newPost = {
        id: Date.now().toString(),
        content,
        imagePath: imagePreview,
        privacy,
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          avatarPath: user.avatarPath,
        },
        createdAt: new Date().toISOString(),
        likes: 0,
        comments: [],
      };
      
      // Reset form
      setContent('');
      setImage(null);
      setImagePreview(null);
      setPrivacy('public');
      
      // Notify parent component
      if (onPostCreated) {
        onPostCreated(newPost);
      }
    } catch (error) {
      console.error('Error creating post:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      <form onSubmit={handleSubmit}>
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 bg-navy-200 rounded-full flex items-center justify-center text-navy-700 font-bold">
            {user?.firstName.charAt(0)}{user?.lastName.charAt(0)}
          </div>
          <textarea
            className="flex-1 h-20 px-3 py-2 bg-gray-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-navy-500 resize-none"
            placeholder={`What's on your mind, ${user?.firstName}?`}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>
        
        {/* Image Preview */}
        {imagePreview && (
          <div className="mb-3 relative">
            <img src={imagePreview} alt="Preview" className="max-h-64 rounded-lg mx-auto" />
            <button
              type="button"
              onClick={handleRemoveImage}
              className="absolute top-2 right-2 bg-gray-800 bg-opacity-70 text-white rounded-full w-8 h-8 flex items-center justify-center"
            >
              ✕
            </button>
          </div>
        )}
        
        <div className="flex flex-wrap justify-between gap-2">
          <div className="flex items-center gap-3">
            {/* Image Upload Button */}
            <label className="cursor-pointer text-gray-700 hover:text-navy-600 flex items-center gap-1">
              <span>📷</span>
              <span className="text-sm">Photo</span>
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleImageChange}
              />
            </label>
            
            {/* Privacy Selector */}
            <div className="flex items-center">
              <select
                value={privacy}
                onChange={(e) => setPrivacy(e.target.value)}
                className="text-sm bg-gray-100 border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-navy-500"
              >
                <option value="public">Public 🌎</option>
                <option value="almost_private">Followers 👥</option>
                <option value="private">Private 🔒</option>
              </select>
            </div>
          </div>
          
          {/* Post Button */}
          <button
            type="submit"
            disabled={isSubmitting || (content.trim() === '' && !image)}
            className={`px-4 py-1 bg-navy-600 text-white rounded hover:bg-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-500 focus:ring-offset-2 ${
              (isSubmitting || (content.trim() === '' && !image)) ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isSubmitting ? 'Posting...' : 'Post'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PostForm;