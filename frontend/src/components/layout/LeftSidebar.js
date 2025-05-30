// src/components/layout/LeftSidebar.js
import { Home, User, Users, MessageCircle, Bookmark, Calendar, Settings, Plus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function LeftSidebar({ currentUser, setCurrentView, currentView }) {
  const { logout } = useAuth();
  
  const menuItems = [
    { icon: Home, label: 'Feed', view: 'feed' },
    { icon: User, label: 'Profile', view: 'profile' },
    { icon: Users, label: 'Friends', view: 'users' },
    { icon: Users, label: 'Groups', view: 'groups' },
    { icon: MessageCircle, label: 'Messages', view: 'chat' },
    { icon: Bookmark, label: 'Saved', view: 'saved' },
    { icon: Calendar, label: 'Events', view: 'events' },
    { icon: Settings, label: 'Settings', view: 'settings' }
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-content">
        {/* User Info */}
        <div className="user-info">
          <div className="user-avatar">
            {currentUser?.avatar || '👤'}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{currentUser?.name || 'User'}</h3>
            <p className="text-sm text-gray-600">{currentUser?.followers || 0} followers</p>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav style={{ marginBottom: '2rem' }}>
          {menuItems.map((item) => (
            <button
              key={item.view}
              onClick={() => setCurrentView(item.view)}
              className={`menu-item ${currentView === item.view ? 'active' : ''}`}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Quick Actions */}
        <div>
          <h4 style={{ 
            fontSize: '0.875rem', 
            fontWeight: '600', 
            color: '#6b7280', 
            textTransform: 'uppercase', 
            letterSpacing: '0.05em', 
            marginBottom: '0.75rem' 
          }}>
            Quick Actions
          </h4>
          <div className="space-y-2">
            <button style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.75rem',
              backgroundColor: '#eff6ff',
              color: '#2563eb',
              borderRadius: '0.5rem',
              fontWeight: '500',
              transition: 'background-color 0.15s ease-in-out'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#dbeafe'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#eff6ff'}
            >
              <span>Create Post</span>
              <Plus size={16} />
            </button>
            <button style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.75rem',
              backgroundColor: '#f0fdf4',
              color: '#16a34a',
              borderRadius: '0.5rem',
              fontWeight: '500',
              transition: 'background-color 0.15s ease-in-out'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#dcfce7'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#f0fdf4'}
            >
              <span>Create Group</span>
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* Logout Button */}
        <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
          <button 
            onClick={logout}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: '#fef2f2',
              color: '#dc2626',
              borderRadius: '0.5rem',
              fontWeight: '500',
              transition: 'background-color 0.15s ease-in-out'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#fee2e2'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#fef2f2'}
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
