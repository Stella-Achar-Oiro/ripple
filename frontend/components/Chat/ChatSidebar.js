'use client'

import { useState } from 'react'
import styles from './ChatSidebar.module.css'

export default function ChatSidebar({ conversations, selectedChat, onSelectChat }) {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredConversations = conversations.filter(conv =>
    conv.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

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
      <div className={styles.chatList}>
        {filteredConversations.map(conversation => (
          <div 
            key={conversation.id}
            className={`${styles.chatItem} ${conversation.id === selectedChat ? styles.active : ''}`}
            onClick={() => onSelectChat(conversation.id)}
          >
            <div className="friend-avatar">
              {conversation.isGroup ? (
                <i className="fas fa-users"></i>
              ) : (
                <>
                  {conversation.initials}
                  {conversation.isOnline && <div className="online-indicator"></div>}
                </>
              )}
            </div>
            <div className={styles.chatItemInfo}>
              <div className={styles.chatItemName}>{conversation.name}</div>
              <div className={styles.chatItemPreview}>{conversation.lastMessage}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className={styles.chatItemTime}>{conversation.time}</div>
              {conversation.unread > 0 && (
                <div className={styles.unreadBadge}>{conversation.unread}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
