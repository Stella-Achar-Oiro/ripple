// src/hooks/useNotifications.js
import { useState, useCallback } from 'react';
import { initialNotifications } from '../data/mockData';

export const useNotifications = () => {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [loading, setLoading] = useState(false);

  const markAsRead = useCallback((notificationId) => {
    setNotifications(prevNotifications =>
      prevNotifications.map(notif =>
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prevNotifications =>
      prevNotifications.map(notif => ({ ...notif, read: true }))
    );
  }, []);

  const addNotification = useCallback((notificationData) => {
    const newNotification = {
      id: Date.now(),
      ...notificationData,
      time: 'now',
      read: false
    };
    setNotifications(prevNotifications => [newNotification, ...prevNotifications]);
  }, []);

  const deleteNotification = useCallback((notificationId) => {
    setNotifications(prevNotifications =>
      prevNotifications.filter(notif => notif.id !== notificationId)
    );
  }, []);

  const getUnreadCount = useCallback(() => {
    return notifications.filter(notif => !notif.read).length;
  }, [notifications]);

  const getRecentNotifications = useCallback((limit = 10) => {
    return notifications.slice(0, limit);
  }, [notifications]);

  return {
    notifications,
    loading,
    markAsRead,
    markAllAsRead,
    addNotification,
    deleteNotification,
    getUnreadCount,
    getRecentNotifications
  };
};