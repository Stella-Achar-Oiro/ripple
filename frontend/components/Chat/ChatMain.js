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
  const [selectedImage, setSelectedImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const messagesEndRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  const fileInputRef = useRef(null)

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

  const handleImageSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      alert('Image size should be less than 5MB')
      return
    }

    if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
      alert('Only JPEG, PNG and GIF images are allowed')
      return
    }

    setSelectedImage(file)
    const reader = new FileReader()
    reader.onload = (e) => {
      setImagePreview(e.target.result)
    }
    reader.readAsDataURL(file)
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if ((!newMessage.trim() && !selectedImage) || !conversation) return

    // Handle image upload first if there's an image
    let imagePath = null
    if (selectedImage) {
      try {
        const formData = new FormData()
        formData.append('image', selectedImage)

        const response = await fetch(`${API_URL}/api/upload/chat`, {
          method: 'POST',
          body: formData,
          credentials: 'include',
        })

        if (!response.ok) {
          throw new Error('Failed to upload image')
        }

        const uploadData = await response.json()
        imagePath = uploadData.data.file_path
      } catch (error) {
        console.error('Image upload failed:', error)
        alert('Failed to upload image. Please try again.')
        return
      }
    }

    const messageContent = newMessage.trim() || (imagePath ? '[Image]' : '')
    setNewMessage('')
    setSelectedImage(null)
    setImagePreview(null)
    
    // Stop typing indicator
    handleTyping(false)
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Send message via WebSocket (note: may need backend changes to support image_path)
    const success = conversation.isGroup 
      ? sendGroupMessage(conversation.id, messageContent)
      : sendPrivateMessage(conversation.id, messageContent)

    if (!success) {
      // WebSocket not available, could fallback to REST API
      console.warn('WebSocket not available, message queued')
    }
  }

  const clearImagePreview = () => {
    setSelectedImage(null)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
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
                {message.image_path && (
                  <div className={styles.messageImage}>
                    <img 
                      src={`${API_URL}${message.image_path}`} 
                      alt="Shared image" 
                      loading="lazy"
                    />
                  </div>
                )}
                {message.content && message.content !== '[Image]' && (
                  <div className={styles.messageText}>{message.content}</div>
                )}
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
        {/* Image preview */}
        {imagePreview && (
          <div className={styles.imagePreviewContainer}>
            <div className={styles.imagePreview}>
              <img src={imagePreview} alt="Preview" />
              <button 
                type="button" 
                className={styles.removeImageBtn}
                onClick={clearImagePreview}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
          </div>
        )}
        
        <form className={styles.chatInputContainer} onSubmit={handleSendMessage}>
          <i className="fas fa-smile"></i>
          <input 
            type="text" 
            placeholder="Type a message..."
            value={newMessage}
            onChange={handleInputChange}
            maxLength={2000}
          />
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageSelect}
            accept="image/*"
            style={{ display: 'none' }}
          />
          <button 
            type="button"
            className={styles.attachmentBtn}
            onClick={() => fileInputRef.current.click()}
          >
            <i className="fas fa-image"></i>
          </button>
          <button 
            type="submit" 
            className={styles.chatSendBtn}
            disabled={!newMessage.trim() && !selectedImage}
          >
            <i className="fas fa-paper-plane"></i>
          </button>
        </form>
      </div>
    </div>
  )
}