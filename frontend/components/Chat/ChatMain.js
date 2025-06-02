'use client'

import { useState } from 'react'
import styles from './ChatMain.module.css'

export default function ChatMain({ conversation, messages }) {
  const [newMessage, setNewMessage] = useState('')

  const handleSendMessage = (e) => {
    e.preventDefault()
    if (newMessage.trim()) {
      // Handle sending message
      console.log('Sending message:', newMessage)
      setNewMessage('')
    }
  }

  if (!conversation) {
    return (
      <div className={styles.chatMain}>
        <div className={styles.noConversation}>
          Select a conversation to start chatting
        </div>
      </div>
    )
  }

  return (
    <div className={styles.chatMain}>
      <div className={styles.chatHeader}>
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
        <div>
          <div className={styles.chatHeaderName}>{conversation.name}</div>
          <div className={styles.chatHeaderStatus}>
            {conversation.isOnline ? 'Active now' : 'Last seen recently'}
          </div>
        </div>
        <div className={styles.chatHeaderActions}>
          <i className="fas fa-phone"></i>
          <i className="fas fa-video"></i>
          <i className="fas fa-info-circle"></i>
        </div>
      </div>
      
      <div className={styles.chatMessages}>
        {messages.map(message => (
          <div 
            key={message.id} 
            className={`${styles.message} ${message.isOwn ? styles.own : ''}`}
          >
            <div className={styles.messageBubble}>
              {message.content}
              <div className={styles.messageTime}>{message.time}</div>
            </div>
          </div>
        ))}
      </div>
      
      <div className={styles.chatInput}>
        <form className={styles.chatInputContainer} onSubmit={handleSendMessage}>
          <i className="fas fa-smile"></i>
          <input 
            type="text" 
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
          />
          <i className="fas fa-paperclip"></i>
          <button type="submit" className={styles.chatSendBtn}>
            <i className="fas fa-paper-plane"></i>
          </button>
        </form>
      </div>
    </div>
  )
}
