// src/components/layout/Header.js
import { Search, Bell, Home, Users, MessageCircle, User } from 'lucide-react';
import NotificationDropdown from '../notifications/NotificationDropdown';

export default function Header({ 
  currentView, 
  setCurrentView, 
  showNotifications, 
  setShowNotifications, 
  notifications, 
  markNotificationAsRead,
  unreadCount = 0
}) {
  return (
    <header className="header">
      <div className="header-content">
        <div className="flex items-center space-x-4">
          <h1 className="logo">SocialNet</h1>
          <div className="search-container">
            <Search className="search-icon" />
            <input
              type="text"
              placeholder="Search posts, people, tags..."
              className="search-input"
            />
          </div>
        </div>
        
        <nav className="nav-menu">
          <button
            onClick={() => setCurrentView('feed')}
            className={`nav-item ${currentView === 'feed' ? 'active' : ''}`}
          >
            <Home size={24} />
          </button>
          <button
            onClick={() => setCurrentView('users')}
            className={`nav-item ${currentView === 'users' ? 'active' : ''}`}
          >
            <Users size={24} />
          </button>
          <button
            onClick={() => setCurrentView('groups')}
            className={`nav-item ${currentView === 'groups' ? 'active' : ''}`}
          >
            <Users size={24} />
          </button>
          <button
            onClick={() => setCurrentView('chat')}
            className={`nav-item ${currentView === 'chat' ? 'active' : ''}`}
          >
            <MessageCircle size={24} />
          </button>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="nav-item"
            >
              <Bell size={24} />
              {unreadCount > 0 && (
                <span className="notification-badge">
                  {unreadCount}
                </span>
              )}
            </button>
            {showNotifications && (
              <NotificationDropdown 
                notifications={notifications} 
                markNotificationAsRead={markNotificationAsRead} 
              />
            )}
          </div>
          <button
            onClick={() => setCurrentView('profile')}
            className={`nav-item ${currentView === 'profile' ? 'active' : ''}`}
          >
            <User size={24} />
          </button>
        </nav>
      </div>
    </header>
  );
}