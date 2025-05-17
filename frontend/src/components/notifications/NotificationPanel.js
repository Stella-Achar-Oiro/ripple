import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

const NotificationPanel = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  
  useEffect(() => {
    if (!user) return;
    
    const fetchNotifications = async () => {
      try {
        // Mock data for now
        setNotifications([
          {
            id: '1',
            type: 'follow_request',
            sourceName: 'John Doe',
            createdAt: new Date().toISOString()
          },
          {
            id: '2',
            type: 'group_invitation',
            sourceName: 'Web Dev Group',
            createdAt: new Date().toISOString()
          }
        ]);
      } catch (error) {
        console.error('Error fetching notifications:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchNotifications();
    
    // Mock websocket for now
    const mockWebSocketUpdates = setInterval(() => {
      // Randomly add a new notification sometimes
      if (Math.random() > 0.8) {
        const types = ['follow_request', 'group_invitation', 'group_request', 'event_creation'];
        const newNotification = {
          id: Date.now().toString(),
          type: types[Math.floor(Math.random() * types.length)],
          sourceName: 'New User ' + Math.floor(Math.random() * 100),
          createdAt: new Date().toISOString()
        };
        setNotifications(prev => [newNotification, ...prev].slice(0, 8)); // Keep max 8 notifications
      }
    }, 30000); // Check every 30 seconds
    
    return () => {
      clearInterval(mockWebSocketUpdates);
    };
  }, [user]);
  
  const handleAccept = async (id, type) => {
    try {
      // Mock API call
      console.log(`Accepted notification ${id} of type ${type}`);
      // Update the UI without refetching everything
      setNotifications(notifications.filter((n) => n.id !== id));
    } catch (error) {
      console.error('Error accepting notification:', error);
    }
  };
  
  const handleDecline = async (id) => {
    try {
      // Mock API call
      console.log(`Declined notification ${id}`);
      setNotifications(notifications.filter((n) => n.id !== id));
    } catch (error) {
      console.error('Error declining notification:', error);
    }
  };
  
  if (loading) {
    return (
      <div className="w-72 border-l border-gray-200 p-4">
        <div className="text-lg font-semibold mb-4">Notifications</div>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <div className="w-72 border-l border-gray-200 p-4">
      <div className="text-lg font-semibold mb-4">Notifications</div>
      {notifications.length === 0 ? (
        <div className="text-gray-500 text-center py-8">No notifications</div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div key={notification.id} className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div className="flex-1 text-sm">
                  <span className="font-medium">{notification.sourceName}</span>{' '}
                  {getNotificationText(notification.type)}
                </div>
              </div>
              {needsResponse(notification.type) && (
                <div className="flex gap-2 mt-2 justify-end">
                  <button
                    onClick={() => handleDecline(notification.id)}
                    className="px-3 py-1 bg-gray-200 rounded text-xs"
                  >
                    Decline
                  </button>
                  <button
                    onClick={() => handleAccept(notification.id, notification.type)}
                    className="px-3 py-1 bg-navy-600 rounded text-xs text-white"
                  >
                    Accept
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Helper functions
const getNotificationText = (type) => {
  switch (type) {
    case 'follow_request':
      return 'sent you a follow request';
    case 'group_invitation':
      return 'invited you to join a group';
    case 'group_request':
      return 'wants to join your group';
    case 'event_creation':
      return 'created a new event';
    default:
      return 'sent you a notification';
  }
};

const needsResponse = (type) => {
  return ['follow_request', 'group_invitation', 'group_request'].includes(type);
};

export default NotificationPanel;
