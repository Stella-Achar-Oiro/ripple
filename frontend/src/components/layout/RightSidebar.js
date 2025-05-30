// src/components/layout/RightSidebar.js
import { TrendingUp, Hash, Plus, UserPlus } from 'lucide-react';

export default function RightSidebar({ trendingTags, groups, users, onTagClick }) {
  return (
    <div className="right-sidebar">
      <div style={{ padding: '1.5rem' }}>
        {/* Trending Tags */}
        <div className="widget">
          <div className="widget-title">
            <TrendingUp size={20} />
            <h3>Trending Tags</h3>
          </div>
          <div className="space-y-2">
            {trendingTags.slice(0, 8).map((trend, index) => (
              <button
                key={trend.tag}
                onClick={() => onTagClick(trend.tag)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.5rem',
                  backgroundColor: 'white',
                  borderRadius: '0.5rem',
                  textAlign: 'left',
                  transition: 'background-color 0.15s ease-in-out'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#f9fafb'}
                onMouseOut={(e) => e.target.style.backgroundColor = 'white'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: '500', color: '#6b7280' }}>#{index + 1}</span>
                  <Hash size={16} style={{ color: '#2563eb' }} />
                  <span style={{ fontWeight: '500', color: '#1f2937' }}>{trend.tag}</span>
                </div>
                <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>{trend.posts}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Suggested Groups */}
        <div className="widget">
          <h3 className="widget-title">Suggested Groups</h3>
          <div className="space-y-3">
            {groups.filter(g => !g.joined).slice(0, 3).map(group => (
              <div key={group.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.5rem',
                backgroundColor: 'white',
                borderRadius: '0.5rem'
              }}>
                <div style={{
                  width: '2rem',
                  height: '2rem',
                  backgroundColor: '#e5e7eb',
                  borderRadius: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.875rem'
                }}>
                  {group.avatar}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: '500', color: '#1f2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {group.name}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>{group.members} members</p>
                </div>
                <button style={{ color: '#2563eb' }}>
                  <Plus size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* People You May Know */}
        <div className="widget">
          <h3 className="widget-title">People You May Know</h3>
          <div className="space-y-3">
            {users.filter(u => !u.isFollowing).slice(0, 3).map(user => (
              <div key={user.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.5rem',
                backgroundColor: 'white',
                borderRadius: '0.5rem'
              }}>
                <div style={{
                  width: '2rem',
                  height: '2rem',
                  backgroundColor: '#e5e7eb',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.875rem'
                }}>
                  {user.avatar}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: '500', color: '#1f2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.name}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>{user.followers} followers</p>
                </div>
                <button style={{ color: '#2563eb' }}>
                  <UserPlus size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div style={{
          background: 'linear-gradient(135deg, #eff6ff 0%, #f3e8ff 100%)',
          borderRadius: '0.5rem',
          padding: '1rem'
        }}>
          <h3 style={{ fontWeight: '600', color: '#1f2937', marginBottom: '0.75rem' }}>Your Activity</h3>
          <div className="space-y-2">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Posts this week</span>
              <span style={{ fontWeight: '500', color: '#1f2937' }}>12</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>New followers</span>
              <span style={{ fontWeight: '500', color: '#1f2937' }}>8</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Profile views</span>
              <span style={{ fontWeight: '500', color: '#1f2937' }}>156</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}