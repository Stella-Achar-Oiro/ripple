// src/pages/users.js
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/router';
import { useUsers } from '../hooks/useUsers';
import { useSearch } from '../hooks/useSearch';
import Layout from '../components/layout/Layout';
import { UserPlus, UserCheck, Search } from 'lucide-react';

export default function Users() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [currentView, setCurrentView] = useState('users');

  // Custom hooks
  const { users, followUser, getFollowing, getSuggested } = useUsers();
  const { query, results, updateQuery } = useSearch(users, ['name']);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading...</div>;
  }

  if (!user) return null;

  const handleFollowUser = (userId) => {
    followUser(userId);
  };

  const renderUserCard = (userData) => (
    <div key={userData.id} className="bg-white rounded-xl shadow border p-6">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
        <div style={{
          width: '3rem',
          height: '3rem',
          backgroundColor: '#e5e7eb',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.5rem'
        }}>
          {userData.avatar}
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontWeight: '600', color: '#1f2937' }}>{userData.name}</h3>
          <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
            {userData.followers} followers • {userData.following} following
          </p>
        </div>
        <button
          onClick={() => handleFollowUser(userData.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            backgroundColor: userData.isFollowing ? '#f3f4f6' : '#3b82f6',
            color: userData.isFollowing ? '#374151' : 'white',
            borderRadius: '0.5rem',
            fontWeight: '500',
            transition: 'all 0.15s ease-in-out'
          }}
        >
          {userData.isFollowing ? (
            <>
              <UserCheck size={16} />
              Following
            </>
          ) : (
            <>
              <UserPlus size={16} />
              Follow
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <Layout currentView={currentView} setCurrentView={setCurrentView}>
      <div style={{ maxWidth: '42rem', margin: '0 auto' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.875rem', fontWeight: '700', color: '#1f2937', marginBottom: '0.5rem' }}>
            Discover People
          </h1>
          <p style={{ color: '#6b7280' }}>Find and connect with amazing people in the community</p>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
          <Search style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', width: '1rem', height: '1rem' }} />
          <input
            type="text"
            placeholder="Search people..."
            value={query}
            onChange={(e) => updateQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem 0.75rem 0.75rem 2.5rem',
              backgroundColor: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '0.5rem',
              fontSize: '0.875rem'
            }}
          />
        </div>

        {/* Suggested Users */}
        {!query && (
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', marginBottom: '1rem' }}>
              Suggested for You
            </h2>
            <div className="space-y-4">
              {getSuggested().map(renderUserCard)}
            </div>
          </div>
        )}

        {/* Search Results or All Users */}
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', marginBottom: '1rem' }}>
            {query ? `Search Results (${results.length})` : 'All Users'}
          </h2>
          <div className="space-y-4">
            {(query ? results : users).map(renderUserCard)}
          </div>
        </div>
      </div>
    </Layout>
  );
}
