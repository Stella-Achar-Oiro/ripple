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

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

  // Fetch conversations from the backend
  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/api/chat/conversations`, {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to fetch conversations')
      }

      const data = await response.json()
      
      if (data.success && data.data && Array.isArray(data.data)) {
        // Transform conversations for display
        const transformedConversations = data.data.map(conv => {
          const isGroup = !!conv.group_id
          const conversationId = getConversationId(
            isGroup ? null : user?.id,
            isGroup ? null : conv.user_id || conv.id,
            isGroup ? conv.group_id : null
          )
          
          return {
            id: isGroup ? conv.group_id : (conv.user_id || conv.id),
            conversationId,
            name: isGroup ? conv.group_name : `${conv.first_name} ${conv.last_name}`,
            isGroup,
            avatar_path: isGroup ? conv.group_avatar : conv.avatar_path,
            initials: isGroup 
              ? conv.group_name?.charAt(0)?.toUpperCase() 
              : `${conv.first_name?.charAt(0) || ''}${conv.last_name?.charAt(0) || ''}`,
            lastMessage: conv.last_message || 'No messages yet',
            lastMessageTime: conv.last_message_time,
            isOnline: isGroup ? true : isUserOnline(conv.user_id || conv.id),
            unread: getUnreadCount(conversationId),
            memberCount: isGroup ? conv.member_count : null
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

  // Load conversations on mount
  useEffect(() => {
    if (user) {
      fetchConversations()
    }
  }, [user, fetchConversations])

  // Update conversations when online status or unread counts change
  useEffect(() => {
    if (conversations.length > 0) {
      setConversations(prev => prev.map(conv => ({
        ...conv,
        isOnline: conv.isGroup ? true : isUserOnline(conv.id),
        unread: getUnreadCount(conv.conversationId)
      })))
    }
  }, [conversations.length, isUserOnline, getUnreadCount])

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

  const filteredConversations = conversations.filter(conv =>
    conv.name.toLowerCase().includes(searchQuery.toLowerCase())
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

  if (loading) {
    return (
      <div className={styles.chatSidebar}>
        <div className={styles.chatSearch}>
          <input 
            type="text" 
            placeholder="Search conversations..."
            disabled
          />
        </div>
        <div className={styles.loadingState}>
          <i className="fas fa-spinner fa-spin"></i>
          <span>Loading conversations...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.chatSidebar}>
        <div className={styles.chatSearch}>
          <input 
            type="text" 
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className={styles.errorState}>
          <i className="fas fa-exclamation-triangle"></i>
          <span>Failed to load conversations</span>
          <button onClick={fetchConversations} className="btn-outline">
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.chatSidebar}>
      <div className={styles.chatSearch}>
        <i className="fas fa-search"></i>
        <input 
          type="text" 
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      
      <div className={styles.chatList}>
        {sortedConversations.length === 0 ? (
          <div className={styles.emptyState}>
            {searchQuery ? (
              <>
                <i className="fas fa-search"></i>
                <p>No conversations match your search</p>
              </>
            ) : (
              <>
                <i className="fas fa-comments"></i>
                <p>No conversations yet</p>
                <span>Start chatting with your friends!</span>
              </>
            )}
          </div>
        ) : (
          sortedConversations.map(conversation => (
            <div 
              key={conversation.conversationId}
              className={`${styles.chatItem} ${conversation.id === selectedChat ? styles.active : ''}`}
              onClick={() => onSelectChat(conversation)}
            >
              <div className="friend-avatar">
                {conversation.isGroup ? (
                  <i className="fas fa-users"></i>
                ) : (
                  <>
                    {conversation.avatar_path ? (
                      <img 
                        src={`${API_URL}${conversation.avatar_path}`} 
                        alt={conversation.name}
                      />
                    ) : (
                      conversation.initials
                    )}
                    {conversation.isOnline && <div className="online-indicator"></div>}
                  </>
                )}
              </div>
              
              <div className={styles.chatItemInfo}>
                <div className={styles.chatItemName}>
                  {conversation.name}
                  {conversation.isGroup && (
                    <span className={styles.groupIndicator}>
                      <i className="fas fa-users"></i>
                    </span>
                  )}
                </div>
                <div className={styles.chatItemPreview}>
                  {conversation.lastMessage}
                </div>
              </div>
              
              <div className={styles.chatItemMeta}>
                <div className={styles.chatItemTime}>
                  {formatTime(conversation.lastMessageTime)}
                </div>
                {conversation.unread > 0 && (
                  <div className={styles.unreadBadge}>
                    {conversation.unread > 99 ? '99+' : conversation.unread}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}