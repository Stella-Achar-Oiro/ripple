'use client'

import React, { useState } from 'react'
import { useNotifications } from '../../contexts/NotificationContext'
import NotificationItem from '../../components/Notifications/NotificationItem'
import MainLayout from '../../components/Layout/MainLayout'
import styles from './notifications.module.css'

export default function NotificationsPage() {
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    error
  } = useNotifications()

  const [filter, setFilter] = useState('all') // 'all', 'unread', 'read'
  const [sortBy, setSortBy] = useState('newest') // 'newest', 'oldest'

  // Filter notifications based on current filter
  const filteredNotifications = notifications.filter(notification => {
    switch (filter) {
      case 'unread':
        return !notification.is_read
      case 'read':
        return notification.is_read
      default:
        return true
    }
  })

  // Sort notifications
  const sortedNotifications = [...filteredNotifications].sort((a, b) => {
    const dateA = new Date(a.created_at)
    const dateB = new Date(b.created_at)
    
    return sortBy === 'newest' ? dateB - dateA : dateA - dateB
  })

  // Group notifications by date
  const groupedNotifications = sortedNotifications.reduce((groups, notification) => {
    const date = new Date(notification.created_at)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    let groupKey
    if (date.toDateString() === today.toDateString()) {
      groupKey = 'Today'
    } else if (date.toDateString() === yesterday.toDateString()) {
      groupKey = 'Yesterday'
    } else if (date > new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)) {
      groupKey = 'This week'
    } else if (date > new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)) {
      groupKey = 'This month'
    } else {
      groupKey = 'Older'
    }

    if (!groups[groupKey]) {
      groups[groupKey] = []
    }
    groups[groupKey].push(notification)
    return groups
  }, {})

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter)
  }

  const handleSortChange = (newSort) => {
    setSortBy(newSort)
  }

  return (
    <MainLayout>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.titleSection}>
            <h1 className={styles.title}>
              Notifications
              {unreadCount > 0 && (
                <span className={styles.unreadBadge}>{unreadCount}</span>
              )}
            </h1>
            <p className={styles.subtitle}>
              Stay updated with your latest activity
            </p>
          </div>

          <div className={styles.headerActions}>
            {unreadCount > 0 && (
              <button
                className={styles.markAllReadBtn}
                onClick={markAllAsRead}
                disabled={isLoading}
              >
                Mark all as read
              </button>
            )}
          </div>
        </div>

        {/* Filters and Sort */}
        <div className={styles.controls}>
          <div className={styles.filters}>
            <button
              className={`${styles.filterBtn} ${filter === 'all' ? styles.active : ''}`}
              onClick={() => handleFilterChange('all')}
            >
              All ({notifications.length})
            </button>
            <button
              className={`${styles.filterBtn} ${filter === 'unread' ? styles.active : ''}`}
              onClick={() => handleFilterChange('unread')}
            >
              Unread ({unreadCount})
            </button>
            <button
              className={`${styles.filterBtn} ${filter === 'read' ? styles.active : ''}`}
              onClick={() => handleFilterChange('read')}
            >
              Read ({notifications.length - unreadCount})
            </button>
          </div>

          <div className={styles.sortControls}>
            <label className={styles.sortLabel}>Sort by:</label>
            <select
              className={styles.sortSelect}
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value)}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className={styles.error}>
            <p>{error}</p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && notifications.length === 0 ? (
          <div className={styles.loading}>
            <div className={styles.loadingSpinner}></div>
            <p>Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          /* Empty State */
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>🔔</div>
            <h3>No notifications yet</h3>
            <p>
              You'll see notifications for likes, comments, follows, and more here.
            </p>
          </div>
        ) : sortedNotifications.length === 0 ? (
          /* No Results for Filter */
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>🔍</div>
            <h3>No {filter} notifications</h3>
            <p>
              Try changing your filter to see more notifications.
            </p>
          </div>
        ) : (
          /* Notifications List */
          <div className={styles.notificationsList}>
            {Object.entries(groupedNotifications).map(([groupName, groupNotifications]) => (
              <div key={groupName} className={styles.notificationGroup}>
                <h3 className={styles.groupHeader}>{groupName}</h3>
                <div className={styles.groupItems}>
                  {groupNotifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={markAsRead}
                      onDelete={deleteNotification}
                      showActions={true}
                      compact={false}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Load More Button */}
        {sortedNotifications.length > 0 && sortedNotifications.length < notifications.length && (
          <div className={styles.loadMore}>
            <button className={styles.loadMoreBtn}>
              Load more notifications
            </button>
          </div>
        )}
      </div>
    </MainLayout>
  )
}