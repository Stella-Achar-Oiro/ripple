'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useWebSocket } from '../../contexts/WebSocketContext'
import styles from './ChatMain.module.css'

export default function ChatMain({ conversation }) {
  const { user } = useAuth()
  const {
    sendPrivateMessage,
    sendGroupMessage,
    sendTypingIndicator,
    markAsRead,
    getConversationMessages,
    getConversationId,
    getTypingUsers,
    isUserOnline,
    markConversationAsRead
  } = useWebSocket()

  const [newMessage, setNewMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef(null)
  const typingTimeoutRef = useRef(null)

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

  // Get conversation ID and messages
  const conversationId = conversation 
    ? getConversationId(
        conversation.isGroup ? null : user?.id,
        conversation.isGroup ? null : conversation.id,
        conversation.isGroup ? conversation.id : null
      )
    : null

  const messages = conversationId ? getConversationMessages(conversationId) : []
  const typingUsers = conversationId ? getTypingUsers(conversationId) : []

  // Auto scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Mark conversation as read when it's selected
  useEffect(() => {
    if (conversationId) {
      markConversationAsRead(conversationId)
      
      // Send read status to other user for private conversations
      if (!conversation?.isGroup && conversation?.id) {
        markAsRead(conversation.id)
      }
    }
  }, [conversationId, conversation, markConversationAsRead, markAsRead])

  // Handle typing indicator
  const handleTyping = useCallback((isCurrentlyTyping) => {
    if (isCurrentlyTyping !== isTyping) {
      setIsTyping(isCurrentlyTyping)
      
      if (conversation) {
        if (conversation.isGroup) {
          sendTypingIndicator(null, conversation.id, isCurrentlyTyping)
        } else {
          sendTypingIndicator(conversation.id, null, isCurrentlyTyping)
        }
      }
    }
  }, [isTyping, conversation, sendTypingIndicator])

  const handleInputChange = (e) => {
    setNewMessage(e.target.value)
    
    // Handle typing indicator
    if (e.target.value.trim() && !isTyping) {
      handleTyping(true)
    }
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    
    // Set timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      handleTyping(false)
    }, 3000)
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !conversation) return

    const messageContent = newMessage.trim()
    setNewMessage('')
    
    // Stop typing indicator
    handleTyping(false)
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Send message via WebSocket
    const success = conversation.isGroup 
      ? sendGroupMessage(conversation.id, messageContent)
      : sendPrivateMessage(conversation.id, messageContent)

    if (!success) {
      // WebSocket not available, could fallback to REST API
      console.warn('WebSocket not available, message queued')
    }
  }

  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = (now - date) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    }
  }

  const getUserName = (userId) => {
    // In a real app, you'd have user data available
    // For now, return a placeholder
    return `User ${userId}`
  }

  if (!conversation) {
    return (
      <div className={styles.chatMain}>
        <div className={styles.noConversation}>
          <i className="fas fa-comments"></i>
          <h3>Select a conversation to start chatting</h3>
          <p>Choose from your existing conversations or start a new one</p>
        </div>
      </div>
    )
  }

  const isOnline = conversation.isGroup ? true : isUserOnline(conversation.id)

  return (
    <div className={styles.chatMain}>
      <div className={styles.chatHeader}>
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
              {isOnline && <div className="online-indicator"></div>}
            </>
          )}
        </div>
        <div>
          <div className={styles.chatHeaderName}>{conversation.name}</div>
          <div className={styles.chatHeaderStatus}>
            {conversation.isGroup ? (
              `${conversation.memberCount || 0} members`
            ) : (
              isOnline ? 'Active now' : 'Last seen recently'
            )}
          </div>
        </div>
        <div className={styles.chatHeaderActions}>
          <i className="fas fa-phone"></i>
          <i className="fas fa-video"></i>
          <i className="fas fa-info-circle"></i>
        </div>
      </div>
      
      <div className={styles.chatMessages}>
        {messages.length === 0 ? (
          <div className={styles.emptyMessages}>
            <i className="fas fa-comments"></i>
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map(message => (
            <div 
              key={message.id} 
              className={`${styles.message} ${message.isOwn ? styles.own : ''}`}
            >
              {!message.isOwn && conversation.isGroup && (
                <div className={styles.messageSender}>
                  {getUserName(message.from)}
                </div>
              )}
              <div className={styles.messageBubble}>
                {message.content}
                <div className={styles.messageTime}>
                  {formatTime(message.timestamp)}
                  {message.isOwn && !conversation.isGroup && (
                    <i className={`fas ${message.read_at ? 'fa-check-double' : 'fa-check'} ${styles.readStatus}`}></i>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        
        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className={styles.typingIndicator}>
            <div className={styles.typingBubble}>
              <div className={styles.typingDots}>
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
            <div className={styles.typingText}>
              {conversation.isGroup && typingUsers.length === 1 
                ? `${getUserName(typingUsers[0])} is typing...`
                : conversation.isGroup && typingUsers.length > 1
                ? `${typingUsers.length} people are typing...`
                : 'typing...'}
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      <div className={styles.chatInput}>
        <form className={styles.chatInputContainer} onSubmit={handleSendMessage}>
          <i className="fas fa-smile"></i>
          <input 
            type="text" 
            placeholder="Type a message..."
            value={newMessage}
            onChange={handleInputChange}
            maxLength={2000}
          />
          <i className="fas fa-paperclip"></i>
          <button 
            type="submit" 
            className={styles.chatSendBtn}
            disabled={!newMessage.trim()}
          >
            <i className="fas fa-paper-plane"></i>
          </button>
        </form>
      </div>
    </div>
  )
}