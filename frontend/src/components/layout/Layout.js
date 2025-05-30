// src/components/layout/Layout.js
import { useState } from 'react';
import Header from './Header';
import LeftSidebar from './LeftSidebar';
import RightSidebar from './RightSidebar';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../hooks/useNotifications';
import { useUsers } from '../../hooks/useUsers';
import { useGroups } from '../../hooks/useGroups';
import { useTags } from '../../hooks/useTags';

export default function Layout({ children, currentView, setCurrentView, onTagClick }) {
  const { user } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  
  // Custom hooks
  const { 
    notifications, 
    markAsRead: markNotificationAsRead,
    getUnreadCount 
  } = useNotifications();
  
  const { getSuggested: getSuggestedUsers } = useUsers();
  const { getSuggestedGroups } = useGroups();
  const { getPopularTags } = useTags();

  return (
    <div className="layout">
      <Header
        currentView={currentView}
        setCurrentView={setCurrentView}
        showNotifications={showNotifications}
        setShowNotifications={setShowNotifications}
        notifications={notifications}
        markNotificationAsRead={markNotificationAsRead}
        unreadCount={getUnreadCount()}
      />
      
      <div className="main-layout">
        <LeftSidebar
          currentUser={user}
          setCurrentView={setCurrentView}
          currentView={currentView}
        />
        
        <main className="main-content">
          {children}
        </main>
        
        <RightSidebar
          trendingTags={getPopularTags()}
          groups={getSuggestedGroups()}
          users={getSuggestedUsers()}
          onTagClick={onTagClick}
        />
      </div>
      
      {showNotifications && (
        <div 
          className="fixed inset-0 z-40" 
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 40 }}
          onClick={() => setShowNotifications(false)}
        />
      )}
    </div>
  );
}