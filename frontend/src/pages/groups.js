// src/pages/groups.js
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/router';
import { useGroups } from '../hooks/useGroups';
import { useSearch } from '../hooks/useSearch';
import Layout from '../components/layout/Layout';
import { Plus, Users, Search } from 'lucide-react';

export default function Groups() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [currentView, setCurrentView] = useState('groups');

  // Custom hooks
  const { groups, joinGroup, getJoinedGroups, getSuggestedGroups } = useGroups();
  const { query, results, updateQuery } = useSearch(groups, ['name']);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading...</div>;
  }

  if (!user) return null;

  const handleJoinGroup = (groupId) => {
    joinGroup(groupId);
  };

  const renderGroupCard = (group) => (
    <div key={group.id} className="bg-white rounded-xl shadow border p-6">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
        <div style={{
          width: '3rem',
          height: '3rem',
          backgroundColor: '#e5e7eb',
          borderRadius: '0.75rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.5rem'
        }}>
          {group.avatar}
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontWeight: '600', color: '#1f2937' }}>{group.name}</h3>
          <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
            {group.members.toLocaleString()} members
          </p>
        </div>
        <button
          onClick={() => handleJoinGroup(group.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            backgroundColor: group.joined ? '#f3f4f6' : '#3b82f6',
            color: group.joined ? '#374151' : 'white',
            borderRadius: '0.5rem',
            fontWeight: '500',
            transition: 'all 0.15s ease-in-out'
          }}
        >
          {group.joined ? (
            <>
              <Users size={16} />
              Joined
            </>
          ) : (
            <>
              <Plus size={16} />
              Join
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
            Groups
          </h1>
          <p style={{ color: '#6b7280' }}>Join communities and connect with like-minded people</p>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
          <Search style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', width: '1rem', height: '1rem' }} />
          <input
            type="text"
            placeholder="Search groups..."
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

        {/* My Groups */}
        {!query && getJoinedGroups().length > 0 && (
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', marginBottom: '1rem' }}>
              My Groups
            </h2>
            <div className="space-y-4">
              {getJoinedGroups().map(renderGroupCard)}
            </div>
          </div>
        )}

        {/* Suggested Groups */}
        {!query && (
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', marginBottom: '1rem' }}>
              Suggested Groups
            </h2>
            <div className="space-y-4">
              {getSuggestedGroups().map(renderGroupCard)}
            </div>
          </div>
        )}

        {/* Search Results or All Groups */}
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', marginBottom: '1rem' }}>
            {query ? `Search Results (${results.length})` : 'All Groups'}
          </h2>
          <div className="space-y-4">
            {(query ? results : groups).map(renderGroupCard)}
          </div>
        </div>
      </div>
    </Layout>
  );
}