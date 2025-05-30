// src/components/notifications/NotificationDropdown.js
import { Heart, MessageCircle, UserPlus, Users } from 'lucide-react';

export default function NotificationDropdown({ notifications, markNotificationAsRead }) {
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'like':
        return <Heart size={20} style={{ color: '#ef4444' }} />;
      case 'comment':
        return <MessageCircle size={20} style={{ color: '#3b82f6' }} />;
      case 'follow':
        return <UserPlus size={20} style={{ color: '#10b981' }} />;
      case 'group':
        return <Users size={20} style={{ color: '#8b5cf6' }} />;
      default:
        return <div />;
    }
  };

  return (
    <div className="notification-dropdown">
      <div className="notification-header">
        <h3 className="font-semibold">Notifications</h3>
      </div>
      <div className="notification-list">
        {notifications.map(notif => (
          <div
            key={notif.id}
            className={`notification-item ${!notif.read ? 'unread' : ''}`}
            onClick={() => markNotificationAsRead(notif.id)}
          >
            <div className="notification-icon">
              {getNotificationIcon(notif.type)}
            </div>
            <div className="notification-content">
              <p className="notification-text">
                <span className="notification-user">{notif.user}</span> {notif.action}
              </p>
              <p className="notification-time">{notif.time}</p>
            </div>
            {!notif.read && <div className="notification-dot"></div>}
          </div>
        ))}
      </div>
    </div>
  );
}