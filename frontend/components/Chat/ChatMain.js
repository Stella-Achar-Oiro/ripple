'use client'

import { useState, useEffect, useRef } from 'react'
import { useChat } from '../../contexts/ChatContext'
import styles from './ChatMain.module.css'

export default function ChatMain() {
  const [newMessage, setNewMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef(null)
  const typingTimeoutRef = useRef(null)

  const {
    selectedConversation,
    messages,
    isConnected,
    connectionError,
    isLoadingMessages,
    typingUsers,
    sendMessage,
    sendTypingIndicator,
    loadMessages
  } = useChat()

  // Load messages when conversation changes
  useEffect(() => {
    if (selectedConversation?.id) {
      loadMessages(selectedConversation.id)
    }
  }, [selectedConversation?.id, loadMessages])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    
    if (!newMessage.trim() || !selectedConversation || !isConnected) {
      return
    }

    try {
      await sendMessage(selectedConversation.id, newMessage.trim())
      setNewMessage('')
      
      // Stop typing indicator
      if (isTyping) {
        sendTypingIndicator(selectedConversation.id, false)
        setIsTyping(false)
      }
      
    } catch (error) {
      console.error('Failed to send message:', error)
      // Could show error toast here
    }
  }

  const handleInputChange = (e) => {
    const value = e.target.value
    setNewMessage(value)

    // Handle typing indicators
    if (selectedConversation && isConnected) {
      if (!isTyping && value.trim()) {
        setIsTyping(true)
        sendTypingIndicator(selectedConversation.id, true)
      }

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }

      // Set timeout to stop typing indicator
      typingTimeoutRef.current = setTimeout(() => {
        if (isTyping) {
          setIsTyping(false)
          sendTypingIndicator(selectedConversation.id, false)
        }
      }, 1000)
    }
  }

  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const getMessageStatus = (status) => {
    switch (status) {
      case 'sending':
        return <i className="fas fa-clock" style={{ color: '#999' }}></i>
      case 'delivered':
        return <i className="fas fa-check" style={{ color: '#999' }}></i>
      case 'read':
        return <i className="fas fa-check-double" style={{ color: '#4CAF50' }}></i>
      default:
        return null
    }
  }

  const renderTypingIndicator = () => {
    if (typingUsers.size === 0) return null

    const typingUsersList = Array.from(typingUsers)
    const names = typingUsersList.slice(0, 2).join(', ')
    const text = typingUsersList.length === 1 
      ? `${names} is typing...`
      : typingUsersList.length === 2
      ? `${names} are typing...`
      : `${names} and ${typingUsersList.length - 2} others are typing...`

    return (
      <div className={styles.typingIndicator}>
        <div className={styles.typingDots}>
          <span></span>
          <span></span>
          <span></span>
        </div>
        <span className={styles.typingText}>{text}</span>
      </div>
    )
  }

  // Show connection error
  if (connectionError) {
    return (
      <div className={styles.chatMain}>
        <div className={styles.connectionError}>
          <i className="fas fa-exclamation-triangle"></i>
          <h3>Connection Error</h3>
          <p>{connectionError}</p>
          <button 
            className={styles.retryButton}
            onClick={() => window.location.reload()}
          >
            Retry Connection
          </button>
        </div>
      </div>
    )
  }

  // Show no conversation selected
  if (!selectedConversation) {
    return (
      <div className={styles.chatMain}>
        <div className={styles.noConversation}>
          <i className="far fa-comments"></i>
          <h3>Select a conversation</h3>
          <p>Choose a conversation from the sidebar to start chatting</p>
          {!isConnected && (
            <div className={styles.connectionStatus}>
              <i className="fas fa-spinner fa-spin"></i>
              Connecting to chat...
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={styles.chatMain}>
      {/* Connection status indicator */}
      {!isConnected && (
        <div className={styles.connectionBar}>
          <i className="fas fa-wifi"></i>
          Reconnecting to chat...
        </div>
      )}

      {/* Chat Header */}
      <div className={styles.chatHeader}>
        <div className="friend-avatar">
          {selectedConversation.isGroup ? (
            <i className="fas fa-users"></i>
          ) : (
            <>
              {selectedConversation.initials || selectedConversation.name?.charAt(0)}
              {selectedConversation.isOnline && <div className="online-indicator"></div>}
            </>
          )}
        </div>
        <div className={styles.chatHeaderInfo}>
          <div className={styles.chatHeaderName}>{selectedConversation.name}</div>
          <div className={styles.chatHeaderStatus}>
            {selectedConversation.isOnline ? 'Active now' : 'Last seen recently'}
          </div>
        </div>
        <div className={styles.chatHeaderActions}>
          <button className={styles.headerButton}>
            <i className="fas fa-phone"></i>
          </button>
          <button className={styles.headerButton}>
            <i className="fas fa-video"></i>
          </button>
          <button className={styles.headerButton}>
            <i className="fas fa-info-circle"></i>
          </button>
        </div>
      </div>
      
      {/* Messages Area */}
      <div className={styles.chatMessages}>
        {isLoadingMessages && (
          <div className={styles.loadingMessages}>
            <i className="fas fa-spinner fa-spin"></i>
            <span>Loading messages...</span>
          </div>
        )}
        
        {messages.map(message => (
          <div 
            key={message.id} 
            className={`${styles.message} ${message.senderId === 'current-user' ? styles.own : ''}`}
          >
            {message.senderId !== 'current-user' && (
              <div className={styles.messageAvatar}>
                <div className="user-avatar">
                  {message.senderName?.charAt(0) || 'U'}
                </div>
              </div>
            )}
            <div className={styles.messageBubble}>
              <div className={styles.messageContent}>{message.content}</div>
              <div className={styles.messageTime}>
                {formatMessageTime(message.timestamp)}
                {message.senderId === 'current-user' && (
                  <span className={styles.messageStatus}>
                    {getMessageStatus(message.status)}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {/* Typing Indicator */}
        {renderTypingIndicator()}
        
        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Chat Input */}
      <div className={styles.chatInput}>
        <form className={styles.chatInputContainer} onSubmit={handleSendMessage}>
          <button type="button" className={styles.inputButton}>
            <i className="fas fa-smile"></i>
          </button>
          <input 
            type="text" 
            placeholder={isConnected ? "Type a message..." : "Connecting..."}
            value={newMessage}
            onChange={handleInputChange}
            disabled={!isConnected}
            className={styles.messageInput}
          />
          <button type="button" className={styles.inputButton}>
            <i className="fas fa-paperclip"></i>
          </button>
          <button 
            type="submit" 
            className={styles.chatSendBtn}
            disabled={!newMessage.trim() || !isConnected}
          >
            <i className="fas fa-paper-plane"></i>
          </button>
        </form>
      </div>
    </div>
  )
}
