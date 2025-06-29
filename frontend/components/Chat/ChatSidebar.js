'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useWebSocket } from '../../contexts/WebSocketContext'
import styles from './ChatSidebar.module.css'

export default function ChatSidebar({ selectedChat, onSelectChat }) {
  const { user } = useAuth()
  const { isUserOnline, getUnreadCount, getConversationId } = useWebSocket()

  const [searchQuery, setSearchQuery] = useState('')
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [allUsers, setAllUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [usersError, setUsersError] = useState(null)

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

  // Fetch conversations from the backend
  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`${API_URL}/api/chat/conversations`, {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to fetch conversations')
      }

      const data = await response.json()

      if (data.success && data.data?.conversations && Array.isArray(data.data.conversations)) {
        // Transform conversations for display
        const transformedConversations = data.data.conversations.map(conv => {
          const isGroup = !!conv.group_id
          const conversationId = getConversationId(
            isGroup ? null : user?.id,
            isGroup ? null : conv.user_id || conv.id,
            isGroup ? conv.group_id : null
          )
          
          const participant = conv.participant || {}

          return {
            id: isGroup ? conv.group_id : participant.id,
            conversationId,
            name: isGroup ? conv.title : `${participant.first_name} ${participant.last_name}`,
            isGroup,
            avatar_path: isGroup ? conv.group_info?.avatar_path : participant.avatar_path,
            initials: isGroup ? conv.title?.charAt(0)?.toUpperCase() : `${participant.first_name?.charAt(0) || ''}${participant.last_name?.charAt(0) || ''}`,
            lastMessage: conv.last_message || 'No messages yet',
            lastMessageTime: conv.last_message_at,
            isOnline: isGroup ? false : isUserOnline(participant.id),
            unread: getUnreadCount(conversationId),
            memberCount: isGroup ? conv.group_info?.member_count : null
          }
        })

        setConversations(transformedConversations)
      } else {
        // No conversations or empty data
        setConversations([])
      }
    } catch (err) {
      console.error('Error fetching conversations:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [API_URL, user?.id, getConversationId, isUserOnline, getUnreadCount])

  // Fetch all users for starting new chats
  const fetchAllUsers = useCallback(async () => {
    try {
      setUsersLoading(true)
      setUsersError(null)
      const response = await fetch(`${API_URL}/api/chat/users`, {
        credentials: 'include',
      })
      if (!response.ok) {
        throw new Error('Failed to fetch users')
      }
      const data = await response.json()
      if (data.success && data.data?.users) {
        const transformed = data.data.users.map(u => ({
          ...u,
          initials: `${u.first_name?.charAt(0) || ''}${u.last_name?.charAt(0) || ''}`.toUpperCase(),
          isOnline: isUserOnline(u.id),
        }))
        setAllUsers(transformed)
      } else {
        setAllUsers([])
      }
    } catch (err) {
      console.error('Error fetching all users:', err)
      setUsersError(err.message)
    } finally {
      setUsersLoading(false)
    }
  }, [API_URL, isUserOnline])

  // Load conversations and all users on mount
  useEffect(() => {
    if (user) {
      fetchConversations()
      fetchAllUsers()
    }
  }, [user, fetchConversations, fetchAllUsers])

  // Update lists when online status or unread counts change
  useEffect(() => {
    if (conversations.length > 0) {
      setConversations(prev => prev.map(conv => ({
        ...conv,
        isOnline: conv.isGroup ? true : isUserOnline(conv.id),
        unread: getUnreadCount(conv.conversationId),
      })))
    }
    if (allUsers.length > 0) {
      setAllUsers(prev => prev.map(u => ({
        ...u,
        isOnline: isUserOnline(u.id),
      })))
    }
  }, [isUserOnline, getUnreadCount]) // Removed length dependencies to avoid re-renders

  // Listen for select-chat-by-user event
  useEffect(() => {
    function handleSelectChatByUser(e) {
      const userId = e.detail.userId
      // Try to find the conversation
      const conv = conversations.find(c => !c.isGroup && c.id === userId)
      if (conv) {
        onSelectChat(conv)
      } else {
        // Try to get user info from window.__onlineFriends (set by OnlineFriends.js)
        let friendInfo = null
        if (typeof window !== 'undefined' && window.__onlineFriends) {
          friendInfo = window.__onlineFriends.find(f => f.id === userId)
        }
        // If not found, fallback to minimal info
        const tempConv = {
          id: userId,
          conversationId: `private_${user?.id}_${userId}`,
          name: friendInfo ? friendInfo.name : 'New Conversation',
          isGroup: false,
          avatar_path: friendInfo ? friendInfo.avatar_path : null,
          initials: friendInfo ? friendInfo.initials : '?',
          lastMessage: '',
          lastMessageTime: null,
          isOnline: true,
          unread: 0,
          memberCount: null
        }
        onSelectChat(tempConv)
      }
    }
    window.addEventListener('select-chat-by-user', handleSelectChatByUser)
    return () => window.removeEventListener('select-chat-by-user', handleSelectChatByUser)
  }, [conversations, onSelectChat, user?.id])

  const handleStartNewChat = (targetUser) => {
    // Check if a conversation with this user already exists
    const existingConv = conversations.find(c => !c.isGroup && c.id === targetUser.id)
    if (existingConv) {
      onSelectChat(existingConv)
      return
    }

    // If not, create a temporary conversation object to pass to the main chat view
    const tempConv = {
      id: targetUser.id,
      conversationId: getConversationId(user?.id, targetUser.id, null),
      name: `${targetUser.first_name} ${targetUser.last_name}`,
      isGroup: false,
      avatar_path: targetUser.avatar_path,
      initials: targetUser.initials,
      isOnline: isUserOnline(targetUser.id),
      isNew: true, // Flag to indicate this is a new chat that isn't in the conversation list yet
    }
    onSelectChat(tempConv)
  }

  const formatTime = (timestamp) => {
    if (!timestamp) return ''
    
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = (now - date) / (1000 * 60 * 60)
    const diffInDays = diffInHours / 24

    if (diffInHours < 1) {
      return 'now'
    } else if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (diffInDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' })
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    }
  }

  // Create a set of user IDs that are already in conversations
  const conversationUserIds = new Set(
    conversations.map(c => !c.isGroup && c.id).filter(Boolean)
  )
  // Filter all users to get only those who are not in existing conversations
  const otherUsers = allUsers.filter(u => !conversationUserIds.has(u.id))

  const filteredConversations = conversations.filter(conv => {
    const name = conv.name || ''
    return name.toLowerCase().includes(searchQuery.toLowerCase())
  })

  const filteredUsers = otherUsers.filter(u =>
    `${u.first_name} ${u.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.nickname?.toLowerCase().includes(searchQuery.toLowerCase())
  )
  
  // Sort conversations by last message time and unread status
  const sortedConversations = [...filteredConversations].sort((a, b) => {
    // Unread conversations first
    if (a.unread > 0 && b.unread === 0) return -1
    if (a.unread === 0 && b.unread > 0) return 1
    
    // Then by last message time
    const timeA = new Date(a.lastMessageTime || 0)
    const timeB = new Date(b.lastMessageTime || 0)
    return timeB - timeA
  })

  const renderLoadingState = (message) => (
    <div className={styles.loadingState}>
      <i className="fas fa-spinner fa-spin"></i>
      <span>{message}</span>
    </div>
  )

  const renderErrorState = (message, onRetry) => (
    <div className={styles.errorState}>
      <i className="fas fa-exclamation-triangle"></i>
      <span>{message}</span>
      <button onClick={onRetry} className="btn-outline">
        Retry
      </button>
    </div>
  )

  const renderEmptyState = (icon, title, subtitle) => (
    <div className={styles.emptyState}>
      <i className={`fas ${icon}`}></i>
      <p>{title}</p>
      {subtitle && <span>{subtitle}</span>}
    </div>
  )

  const renderUserItem = (item, isConv) => {
    const isSelectedItem = selectedChat && item.id === selectedChat.id && (isConv ? !selectedChat.isNew : selectedChat.isNew)

    return (
      <div
        key={isConv ? item.conversationId : `user-${item.id}`}
        className={`${styles.chatItem} ${isSelectedItem ? styles.active : ''}`}
        onClick={() => (isConv ? onSelectChat(item) : handleStartNewChat(item))}
      >
        <div className="friend-avatar">
          {item.isGroup ? (
            <i className="fas fa-users"></i>
          ) : (
            <>
              {item.avatar_path ? (
                <img src={`${API_URL}${item.avatar_path}`} alt={item.name} />
              ) : (
                item.initials
              )}
              {item.isOnline && <div className="online-indicator"></div>}
            </>
          )}
        </div>

        <div className={styles.chatItemInfo}>
          <div className={styles.chatItemName}>
            {item.name}
            {item.isGroup && (
              <span className={styles.groupIndicator}>
                <i className="fas fa-users"></i>
              </span>
            )}
          </div>
          {isConv && (
            <div className={styles.chatItemPreview}>
              {item.lastMessage}
            </div>
          )}
        </div>

        {isConv && (
          <div className={styles.chatItemMeta}>
            <div className={styles.chatItemTime}>
              {formatTime(item.lastMessageTime)}
            </div>
            {item.unread > 0 && (
              <div className={styles.unreadBadge}>
                {item.unread > 99 ? '99+' : item.unread}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={styles.chatSidebar}>
      <div className={styles.chatSearch}>
        <i className="fas fa-search"></i>
        <input
          type="text"
          placeholder="Search or start a new chat..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className={styles.chatList}>
        {(loading || usersLoading) && renderLoadingState('Loading...')}
        {error && renderErrorState('Failed to load conversations', fetchConversations)}
        {usersError && !error && renderErrorState('Failed to load users', fetchAllUsers)}

        {!(loading || usersLoading || error || usersError) && (
          <>
            {/* Render conversations */}
            {sortedConversations.map(conv => renderUserItem(conv, true))}

            {/* Render separator if both lists have items and we are not searching */}
            {searchQuery === '' && sortedConversations.length > 0 && filteredUsers.length > 0 && (
              <h3 className={styles.listHeader}>Start a new chat</h3>
            )}

            {/* Render other users */}
            {filteredUsers.map(u => renderUserItem(u, false))}

            {/* Handle empty states */}
            {sortedConversations.length === 0 && filteredUsers.length === 0 && (
              searchQuery ?
                renderEmptyState('fa-search', 'No results found', 'Try a different name.') :
                renderEmptyState('fa-comments', 'No conversations yet', 'Your conversations will appear here.')
            )}
          </>
        )}
      </div>
    </div>
  )
}