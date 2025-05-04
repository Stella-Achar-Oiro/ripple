'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import Avatar from '@/components/Avatar';
import { Heart, MessageCircle, UserPlus, Star } from 'lucide-react';

// Mock notification data
const mockNotifications = [
  {
    id: '1',
    type: 'like',
    user: {
      id: '2',
      name: 'Jane Doe',
      username: 'janedoe',
      avatar: '/default-avatar.png',
    },
    content: 'liked your post',
    target: 'Just launched my new website! Check it out at example.com',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
  },
  {
    id: '2',
    type: 'comment',
    user: {
      id: '3',
      name: 'Alex Smith',
      username: 'alexsmith',
      avatar: '/default-avatar.png',
    },
    content: 'commented on your post',
    target: 'This is amazing! Thanks for sharing.',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
  },
  {
    id: '3',
    type: 'follow',
    user: {
      id: '4',
      name: 'Sarah Jones',
      username: 'sarahjones',
      avatar: '/default-avatar.png',
    },
    content: 'started following you',
    read: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
  },
  {
    id: '4',
    type: 'mention',
    user: {
      id: '5',
      name: 'Mike Brown',
      username: 'mikebrown',
      avatar: '/default-avatar.png',
    },
    content: 'mentioned you in a comment',
    target: 'Hey @johndoe, what do you think about this?',
    read: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
  },
];

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState(mockNotifications);
  
  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };
  
  const markAsRead = (id: string) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  };
  
  // Get notification icon based on type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="text-primary" size={16} />;
      case 'comment':
        return <MessageCircle className="text-secondary" size={16} />;
      case 'follow':
        return <UserPlus className="text-success" size={16} />;
      case 'mention':
        return <Star className="text-warning" size={16} />;
      default:
        return null;
    }
  };
  
  const unreadCount = notifications.filter(n => !n.read).length;
  
  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Notifications</h1>
        
        {unreadCount > 0 && (
          <button 
            onClick={markAllAsRead}
            className="text-primary hover:text-primary/80 text-sm font-medium"
          >
            Mark all as read
          </button>
        )}
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
        {notifications.length > 0 ? (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {notifications.map((notification) => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className={`p-4 flex items-start hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors ${
                  !notification.read ? 'bg-primary/5' : ''
                }`}
                onClick={() => markAsRead(notification.id)}
              >
                <div className="mr-4 mt-1">
                  {getNotificationIcon(notification.type)}
                </div>
                
                <Avatar 
                  src={notification.user.avatar} 
                  alt={notification.user.name} 
                  size="md"
                  className="mr-3 flex-shrink-0"
                />
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">{notification.user.name}</span>{' '}
                    <span className="text-gray-600 dark:text-gray-400">{notification.content}</span>
                  </p>
                  
                  {notification.target && (
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-1">
                      "{notification.target}"
                    </p>
                  )}
                  
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                    {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                  </p>
                </div>
                
                {!notification.read && (
                  <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">No notifications yet</p>
          </div>
        )}
      </div>
    </div>
  );
}