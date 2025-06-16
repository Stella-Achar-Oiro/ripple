'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import styles from './ChatSidebar.module.css'

export default function ChatSidebar({ conversations, selectedChat, onSelectChat }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredConversations, setFilteredConversations] = useState(conversations)

  useEffect(() => {
    if (searchQuery) {
      const filtered = conversations.filter(conv =>
        conv.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredConversations(filtered)
    } else {
      setFilteredConversations(conversations)
    }
  }, [searchQuery, conversations])

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
          <Link 
            key={conversation.id}
            href={`/chat/private/${conversation.id}`}
            className={`${styles.chatItem} ${conversation.id === selectedChat ? styles.active : ''}`}
            onClick={(e) => {
              e.preventDefault()
              onSelectChat(conversation.id)
            }}
          >
            <div className={styles.friendAvatar}>
              {conversation.isGroup ? (
                <i className="fas fa-users"></i>
              ) : (
                <>
                  {conversation.initials}
                  {conversation.isOnline && <div className={styles.onlineIndicator}></div>}
                </>
              )}
            </div>
            <div className={styles.chatItemInfo}>
              <div className={styles.chatItemName}>{conversation.name}</div>
              <div className={styles.chatItemPreview}>{conversation.lastMessage}</div>
            </div>
            <div className={styles.chatItemMeta}>
              <div className={styles.chatItemTime}>{conversation.time}</div>
              {conversation.unread > 0 && (
                <div className={styles.unreadBadge}>{conversation.unread}</div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
