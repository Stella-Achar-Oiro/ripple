'use client'

import { useState } from 'react'
import { useChat } from '../../contexts/ChatContext'
import styles from './ChatSidebar.module.css'

export default function ChatSidebar() {
  const [searchQuery, setSearchQuery] = useState('')
  
  const {
    conversations,
    selectedConversation,
    setSelectedConversation,
    isLoadingConversations,
    onlineUsers
  } = useChat()

  const filteredConversations = conversations.filter(conv =>
    conv.name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatTime = (timestamp) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'now'
    if (diffMins < 60) return `${diffMins}m`
    if (diffHours < 24) return `${diffHours}h`
    if (diffDays < 7) return `${diffDays}d`
    return date.toLocaleDateString()
  }

  const handleSelectConversation = (conversation) => {
    setSelectedConversation(conversation)
  }

  return (
    <div className={styles.chatSidebar}>
      <div className={styles.chatSearch}>
        <div className={styles.searchContainer}>
          <i className="fas fa-search"></i>
          <input 
            type="text" 
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      <div className={styles.chatList}>
        {isLoadingConversations ? (
          <div className={styles.loadingState}>
            <i className="fas fa-spinner fa-spin"></i>
            <span>Loading conversations...</span>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className={styles.emptyState}>
            {searchQuery ? (
              <>
                <i className="fas fa-search"></i>
                <p>No conversations found for "{searchQuery}"</p>
              </>
            ) : (
              <>
                <i className="far fa-comments"></i>
                <p>No conversations yet</p>
                <span>Start a new conversation to get chatting!</span>
              </>
            )}
          </div>
        ) : (
          filteredConversations.map(conversation => {
            const isSelected = conversation.id === selectedConversation?.id
            const isOnline = conversation.isGroup ? false : onlineUsers.has(conversation.userId)
            
            return (
              <div 
                key={conversation.id}
                className={`${styles.chatItem} ${isSelected ? styles.active : ''}`}
                onClick={() => handleSelectConversation(conversation)}
              >
                <div className={styles.chatAvatar}>
                  <div className="friend-avatar">
                    {conversation.isGroup ? (
                      <i className="fas fa-users"></i>
                    ) : (
                      <>
                        {conversation.initials || conversation.name?.charAt(0) || 'U'}
                        {isOnline && <div className="online-indicator"></div>}
                      </>
                    )}
                  </div>
                </div>
                
                <div className={styles.chatItemInfo}>
                  <div className={styles.chatItemHeader}>
                    <div className={styles.chatItemName}>
                      {conversation.name || 'Unknown User'}
                    </div>
                    <div className={styles.chatItemTime}>
                      {formatTime(conversation.lastMessageTime)}
                    </div>
                  </div>
                  
                  <div className={styles.chatItemFooter}>
                    <div className={styles.chatItemPreview}>
                      {conversation.lastMessage || 'No messages yet'}
                    </div>
                    {conversation.unread > 0 && (
                      <div className={styles.unreadBadge}>
                        {conversation.unread > 99 ? '99+' : conversation.unread}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
