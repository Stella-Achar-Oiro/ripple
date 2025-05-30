// src/components/posts/Post.js
import { Heart, MessageCircle, Share2, Hash } from 'lucide-react';

export default function Post({ post, onLike, onTagClick }) {
  return (
    <div className="post">
      <div className="post-header">
        <div className="post-avatar">
          {post.avatar}
        </div>
        <div>
          <h3 className="post-author">{post.author}</h3>
          <p className="post-time">{post.time}</p>
        </div>
      </div>
      
      <div className="post-content">
        <div className="post-text">{post.content}</div>
        
        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="post-tags">
            {post.tags.map(tag => (
              <button
                key={tag}
                onClick={() => onTagClick(tag)}
                className="tag"
              >
                <Hash size={12} />
                <span>{tag}</span>
              </button>
            ))}
          </div>
        )}
        
        {post.image && (
          <div className="post-image">
            {post.image}
          </div>
        )}
      </div>
      
      <div className="post-actions">
        <button
          onClick={() => onLike(post.id)}
          className={`action-btn ${post.liked ? 'liked' : ''}`}
        >
          <Heart size={20} style={{ fill: post.liked ? 'currentColor' : 'none' }} />
          <span>{post.likes}</span>
        </button>
        
        <button className="action-btn">
          <MessageCircle size={20} />
          <span>{post.comments}</span>
        </button>
        
        <button className="action-btn">
          <Share2 size={20} />
          <span>{post.shares}</span>
        </button>
      </div>
    </div>
  );
}