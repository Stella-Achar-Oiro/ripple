// src/components/posts/CreatePost.js
import { useState } from 'react';
import { Image, Video, Hash, X } from 'lucide-react';

export default function CreatePost({ 
  newPost, 
  setNewPost, 
  onNewPost, 
  availableTags, 
  selectedTags, 
  onToggleTag,
  loading = false
}) {
  const [showTagSelector, setShowTagSelector] = useState(false);

  return (
    <div className="create-post">
      <div className="create-post-form">
        <div className="create-post-avatar">
          👤
        </div>
        <div className="create-post-content">
          <textarea
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            placeholder="What's on your mind?"
            className="create-post-textarea"
            disabled={loading}
          />
          
          {/* Selected Tags */}
          {selectedTags.length > 0 && (
            <div className="selected-tags">
              {selectedTags.map(tag => (
                <span key={tag} className="selected-tag">
                  <Hash size={12} />
                  <span>{tag}</span>
                  <button
                    onClick={() => onToggleTag(tag)}
                    className="tag-remove"
                    disabled={loading}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
          
          <div className="create-post-actions">
            <div className="create-post-tools">
              <button className="tool-btn" disabled={loading}>
                <Image size={20} />
                <span>Photo</span>
              </button>
              <button className="tool-btn" disabled={loading}>
                <Video size={20} />
                <span>Video</span>
              </button>
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowTagSelector(!showTagSelector)}
                  className="tool-btn"
                  disabled={loading}
                >
                  <Hash size={20} />
                  <span>Tags</span>
                </button>
                
                {showTagSelector && (
                  <div className="tag-selector">
                    <div className="tag-grid">
                      {availableTags.map(tag => (
                        <button
                          key={tag}
                          onClick={() => onToggleTag(tag)}
                          className={`tag-option ${
                            selectedTags.includes(tag) ? 'selected' : ''
                          }`}
                          disabled={loading}
                        >
                          #{tag}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={onNewPost}
              disabled={!newPost.trim() || loading}
              className="post-btn"
            >
              {loading ? 'Posting...' : 'Post'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}