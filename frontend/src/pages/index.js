// src/pages/index.js
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/router';
import Layout from '../components/layout/Layout';
import Post from '../components/posts/Post';
import CreatePost from '../components/posts/CreatePost';
import { usePosts } from '../hooks/usePosts';
import { useTags } from '../hooks/useTags';
import { availableTags } from '../data/mockData';
import { Hash, X, Camera } from 'lucide-react';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [currentView, setCurrentView] = useState('feed');
  const [newPost, setNewPost] = useState('');
  const [filterTag, setFilterTag] = useState(null);

  // Custom hooks
  const { posts, loading: postsLoading, createPost, likePost } = usePosts();
  const { 
    selectedTags, 
    toggleTag, 
    clearTags, 
    getFilteredPosts,
    getPopularTags 
  } = useTags(posts);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '1.125rem'
      }}>
        Loading...
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleNewPost = async () => {
    if (newPost.trim()) {
      const result = await createPost({
        author: user.name,
        avatar: user.avatar,
        content: newPost,
        tags: selectedTags,
        userId: user.id
      });
      
      if (result.success) {
        setNewPost('');
        clearTags();
      }
    }
  };

  const handleTagClick = (tag) => {
    setFilterTag(filterTag === tag ? null : tag);
  };

  // Get filtered posts
  const filteredPosts = filterTag 
    ? posts.filter(post => post.tags && post.tags.includes(filterTag))
    : posts;

  const renderMainContent = () => {
    switch (currentView) {
      case 'feed':
        return (
          <div style={{ maxWidth: '42rem', margin: '0 auto' }}>
            {filterTag && (
              <div className="filter-tag">
                <div className="filter-tag-content">
                  <Hash size={20} />
                  <span className="filter-tag-text">Filtering by #{filterTag}</span>
                </div>
                <button
                  onClick={() => setFilterTag(null)}
                  className="filter-remove"
                >
                  <X size={20} />
                </button>
              </div>
            )}
            
            <CreatePost
              newPost={newPost}
              setNewPost={setNewPost}
              onNewPost={handleNewPost}
              availableTags={availableTags}
              selectedTags={selectedTags}
              onToggleTag={toggleTag}
              loading={postsLoading}
            />
            
            <div className="space-y-6">
              {filteredPosts.map(post => (
                <Post
                  key={post.id}
                  post={post}
                  onLike={likePost}
                  onTagClick={handleTagClick}
                />
              ))}
            </div>
          </div>
        );
      case 'profile':
        return (
          <div style={{ maxWidth: '64rem', margin: '0 auto' }}>
            <div className="bg-white rounded-xl shadow border">
              <div style={{
                height: '12rem',
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                borderRadius: '0.75rem 0.75rem 0 0',
                position: 'relative'
              }}>
                <button style={{
                  position: 'absolute',
                  bottom: '1rem',
                  right: '1rem',
                  background: 'white',
                  padding: '0.5rem',
                  borderRadius: '0.5rem',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}>
                  <Camera size={20} style={{ color: '#6b7280' }} />
                </button>
              </div>
              <div className="p-6">
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.5rem', marginTop: '-4rem' }}>
                  <div style={{ position: 'relative' }}>
                    <div style={{
                      width: '8rem',
                      height: '8rem',
                      backgroundColor: '#e5e7eb',
                      borderRadius: '50%',
                      border: '4px solid white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '2.5rem'
                    }}>
                      {user.avatar}
                    </div>
                    <button style={{
                      position: 'absolute',
                      bottom: '0.5rem',
                      right: '0.5rem',
                      background: 'white',
                      padding: '0.5rem',
                      borderRadius: '50%',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}>
                      <Camera size={16} style={{ color: '#6b7280' }} />
                    </button>
                  </div>
                  <div style={{ flex: 1, paddingTop: '4rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                      <div>
                        <h1 style={{ fontSize: '1.875rem', fontWeight: '700', color: '#1f2937' }}>{user.name}</h1>
                        <p style={{ color: '#6b7280' }}>{user.bio}</p>
                      </div>
                      <button className="btn-primary" style={{ width: 'auto' }}>
                        Edit Profile
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: '1.5rem' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1f2937' }}>{user.followers}</div>
                        <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Followers</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1f2937' }}>{user.following}</div>
                        <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Following</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1f2937' }}>{posts.filter(p => p.author === user.name).length}</div>
                        <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Posts</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div style={{ maxWidth: '42rem', margin: '0 auto' }}>
            <div className="bg-white rounded-xl shadow border p-6" style={{ textAlign: 'center' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1f2937', marginBottom: '1rem' }}>
                {currentView.charAt(0).toUpperCase() + currentView.slice(1)}
              </h2>
              <p style={{ color: '#6b7280' }}>This section is under development.</p>
            </div>
          </div>
        );
    }
  };

  return (
    <Layout 
      currentView={currentView} 
      setCurrentView={setCurrentView}
      onTagClick={handleTagClick}
    >
      {renderMainContent()}
    </Layout>
  );
}
