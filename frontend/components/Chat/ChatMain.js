'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useWebSocket } from '../../contexts/WebSocketContext'
import GroupChatInfo from './GroupChatInfo'
import styles from './ChatMain.module.css'
import Avatar from '../shared/Avatar'
import EmojiPicker from '../shared/EmojiPicker'

export default function ChatMain({ conversation, onConversationStarted }) {
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
  const [showGroupInfo, setShowGroupInfo] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [chatMessages, setChatMessages] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const messagesEndRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  const fileInputRef = useRef(null)
  const messageInputRef = useRef(null)

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

  // Get conversation ID and messages
  const conversationId = conversation 
    ? getConversationId(
        conversation.isGroup ? null : user?.id,
        conversation.isGroup ? null : conversation.id,
        conversation.isGroup ? conversation.id : null
      )
    : null

  const wsMessages = conversationId ? getConversationMessages(conversationId) : []
  const typingUsers = conversationId ? getTypingUsers(conversationId) : []

  // Effect to fetch historical messages when conversation changes
  useEffect(() => {
    // Don't fetch for new, unsaved conversations
    if (!conversation?.id || conversation.isNew) {
      setChatMessages([])
      setIsLoading(false)
      setError(null)
      return
    }

    const fetchMessageHistory = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const endpoint = conversation.isGroup
          ? `${API_URL}/api/chat/messages/group/${conversation.id}`
          : `${API_URL}/api/chat/messages/private/${conversation.id}`

        const response = await fetch(endpoint, {
          credentials: 'include',
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error?.message || 'Failed to fetch message history')
        }

        const data = await response.json()
        if (data.success && data.data?.messages) {
          // API returns newest first, reverse to show oldest first
          const processed = data.data.messages
            .map(m => ({
              ...m,
              timestamp: m.created_at, // Standardize timestamp property
              isOwn: m.sender?.id === user.id,
            }))
            .reverse()
          setChatMessages(processed)
        } else {
          setChatMessages([])
        }
      } catch (err) {
        console.error('Error fetching message history:', err)
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchMessageHistory()
  }, [conversation?.id, conversation?.isNew, conversation?.isGroup, user?.id, API_URL])

  // Combine historical and real-time messages
  const messages = useMemo(() => {
    // Create a Set of IDs from wsMessages to avoid duplicates if messages arrive while fetching
    const wsMessageIds = new Set(wsMessages.map(m => m.id))
    const uniqueHistoricalMessages = chatMessages.filter(m => !wsMessageIds.has(m.id))
    return [...uniqueHistoricalMessages, ...wsMessages]
  }, [chatMessages, wsMessages])

  // Auto scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom()
    }
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

  // Clean up typing timeout on unmount or conversation change
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      // Stop typing indicator when component unmounts or conversation changes
      if (isTyping) {
        handleTyping(false)
      }
    }
  }, [conversation?.id, handleTyping, isTyping])

  const handleInputChange = (e) => {
    setNewMessage(e.target.value)
    
    // Clear existing timeout first
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    
    // Handle typing indicator
    if (e.target.value.trim()) {
      if (!isTyping) {
        handleTyping(true)
      }
      
      // Set timeout to stop typing indicator after 3 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        handleTyping(false)
      }, 3000)
    } else {
      handleTyping(false)
    }
  }

  const handleEmojiSelect = (emoji) => {
    setNewMessage(prev => prev + emoji)
    setShowEmojiPicker(false)
    setTimeout(() => {
      messageInputRef.current?.focus()
    }, 100)
  }

  const handleEmojiButtonClick = () => {
    setShowEmojiPicker(!showEmojiPicker)
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

    // Stop typing indicator immediately when sending
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = null
    }
    handleTyping(false)

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

    // Optimistically add message to UI
    const tempMessage = {
      id: Date.now(), // Temporary ID
      content: messageContent,
      from: user.id,
      timestamp: new Date().toISOString(),
      isOwn: true,
      isPending: true // Flag to show it's being sent
    }

    // Add to messages immediately for better UX
    const conversationId = getConversationId(
      conversation.isGroup ? null : user?.id,
      conversation.isGroup ? null : conversation.id,
      conversation.isGroup ? conversation.id : null
    )

    // Send message via WebSocket first
    const wsSuccess = conversation.isGroup 
      ? sendGroupMessage(conversation.id, messageContent)
      : sendPrivateMessage(conversation.id, messageContent)

    if (!wsSuccess) {
      // WebSocket not available, fallback to REST API
      try {
        const endpoint = conversation.isGroup 
          ? `${API_URL}/api/chat/messages/group`
          : `${API_URL}/api/chat/messages/private`
        
        const requestBody = conversation.isGroup 
          ? { group_id: conversation.id, content: messageContent }
          : { receiver_id: conversation.id, content: messageContent }

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(requestBody)
        })

        if (!response.ok) {
          throw new Error('Failed to send message')
        }

        const data = await response.json()
        if (data.success) {
          // Message sent successfully via REST API
          console.log('Message sent via REST API')
        }
      } catch (error) {
        console.error('Failed to send message:', error)
        // Could show error notification here
      }
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
    
    if (!conversation?.isGroup && conversation?.id === userId) {
      return conversation.name || conversation.first_name || `User ${userId}`
    }
    
    // Fallback
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
            <Avatar user={conversation} size="large" />
          )}
          {isOnline && !conversation.isGroup && <div className="online-indicator"></div>}
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
          {conversation.isGroup && (
            <i 
              className="fas fa-info-circle"
              onClick={() => setShowGroupInfo(true)}
              style={{ cursor: 'pointer' }}
            ></i>
          )}
        </div>
      </div>
      
      <div className={styles.chatMessages}>
        {isLoading ? (
          <div className={styles.loadingState}>
            <i className="fas fa-spinner fa-spin"></i>
            <span>Loading messages...</span>
          </div>
        ) : error ? (
          <div className={styles.errorState}>
            <i className="fas fa-exclamation-triangle"></i>
            <span>{error}</span>
          </div>
        ) : messages.length === 0 ? (
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
                    {message.sender?.first_name || `User ${message.from}`}
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
                    <div className={styles.messageContent}>
                      {message.content}
                      {message.isPending && (
                        <span className={styles.pendingIndicator}>
                          <i className="fas fa-clock"></i>
                        </span>
                      )}
                    </div>
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
        
        {typingUsers.length > 0 && (
          <div className={styles.typingIndicator}>
            <i className="fas fa-ellipsis-h"></i>
            <span>
              {typingUsers.length === 1 
                ? `${getUserName(typingUsers[0])} is typing...`
                : typingUsers.length === 2
                ? `${getUserName(typingUsers[0])} and ${getUserName(typingUsers[1])} are typing...`
                : `${getUserName(typingUsers[0])} and ${typingUsers.length - 1} others are typing...`
              }
            </span>
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
        <form onSubmit={handleSendMessage} className={styles.chatInput}>
          <div className={styles.inputWrapper}>
            <input
              ref={messageInputRef}
              type="text"
              value={newMessage}
              onChange={handleInputChange}
              placeholder={`Message ${conversation.isGroup ? 'group' : conversation.name}...`}
              className={styles.messageInput}
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
              onClick={handleEmojiButtonClick}
            >
              <i className="fas fa-smile"></i>
            </button>
            <button 
              type="button"
              className={styles.attachmentBtn}
              onClick={() => fileInputRef.current.click()}
            >
              <i className="fas fa-image"></i>
            </button>
            
            <button 
              type="submit" 
              disabled={!newMessage.trim() && !selectedImage}
              className={styles.sendButton}
            >
              <i className="fas fa-paper-plane"></i>
            </button>
          </div>
        </form>

        {showEmojiPicker && (
          <EmojiPicker
            isOpen={showEmojiPicker}
            onClose={() => setShowEmojiPicker(false)}
            onEmojiSelect={handleEmojiSelect}
          />
        )}

        {showGroupInfo && conversation.isGroup && (
          <div className={styles.groupInfoOverlay}>
            <GroupChatInfo 
              group={conversation}
              onClose={() => setShowGroupInfo(false)}
            />
          </div>
        )}
      </div>
    </div>
  )
}
