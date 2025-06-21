'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useWebSocket } from '../../contexts/WebSocketContext'
import GroupChatMessage from './GroupChatMessage'
import styles from './GroupChat.module.css'

export default function GroupChat({ groupId, groupTitle }) {
  const { user } = useAuth()
  const {
    sendGroupMessage,
    sendTypingIndicator,
    getConversationMessages,
    getConversationId,
    getTypingUsers,
    markConversationAsRead
  } = useWebSocket()

  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef(null)
  const typingTimeoutRef = useRef(null)

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

  // Convert groupId to a number if it's not already
  const numericGroupId = typeof groupId === 'string' ? parseInt(groupId, 10) : groupId;

  // Get conversation ID for this group
  const conversationId = getConversationId(null, null, numericGroupId)

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Fetch message history from API
  const fetchMessages = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`${API_URL}/api/chat/messages/group/${groupId}`, {
        credentials: 'include',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Failed to fetch messages')
      }

      const data = await response.json()
      if (data.success && data.data && data.data.messages) {
        setMessages(data.data.messages)
      } else {
        setMessages([])
      }
    } catch (err) {
      setError(err.message || 'Failed to load messages')
      console.error('Error fetching group messages:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle typing indicator
  const handleTyping = (typing) => {
    if (typing !== isTyping) {
      setIsTyping(typing)
      sendTypingIndicator('group', numericGroupId, typing)
    }
  }

  // Handle message input change
  const handleMessageChange = (e) => {
    setNewMessage(e.target.value)
    
    // Send typing indicator
    if (!isTyping && e.target.value.trim()) {
      handleTyping(true)
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Set timeout to stop typing indicator
    if (e.target.value.trim()) {
      typingTimeoutRef.current = setTimeout(() => {
        handleTyping(false)
      }, 2000)
    } else {
      handleTyping(false)
    }
  }

  // Handle sending message
  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    const messageContent = newMessage.trim()
    setNewMessage('')
    
    // Stop typing indicator
    handleTyping(false)
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Send message via WebSocket
    const success = sendGroupMessage(numericGroupId, messageContent)

    if (!success) {
      // WebSocket not available, could fallback to REST API
      console.warn('WebSocket not available, message queued')
    }
  }

  // Load messages on component mount
  useEffect(() => {
    if (groupId) {
      fetchMessages()
    }
  }, [groupId])

  // Get real-time messages from WebSocket
  useEffect(() => {
    if (conversationId) {
      const wsMessages = getConversationMessages(conversationId)
      if (wsMessages && wsMessages.length > 0) {
        setMessages((prevMessages) => {
          // Merge and deduplicate by id (or created_at+sender_id if no id)
          const allMessages = [...prevMessages, ...wsMessages]
          const seen = new Set()
          return allMessages.filter(msg => {
            const key = msg.id || (msg.created_at + '-' + msg.sender_id)
            if (seen.has(key)) return false
            seen.add(key)
            return true
          })
        })
      }
    }
  }, [conversationId, getConversationMessages])

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Mark conversation as read when component mounts or messages change
  useEffect(() => {
    if (conversationId && messages.length > 0) {
      markConversationAsRead(conversationId)
    }
  }, [conversationId, messages, markConversationAsRead])

  // Get typing users for this group
  const typingUsers = getTypingUsers('group', groupId)

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <i className="fas fa-spinner fa-spin"></i>
        <span>Loading messages...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <i className="fas fa-exclamation-triangle"></i>
        <p>{error}</p>
        <button className="btn-primary" onClick={fetchMessages}>
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className={styles.groupChat}>
      <div className={styles.chatHeader}>
        <h3>
          <i className="fas fa-comments"></i>
          {'  '}
          {groupTitle} Chat
        </h3>
      </div>

      <div className={styles.messagesContainer}>
        {messages.length === 0 ? (
          <div className={styles.emptyState}>
            <i className="fas fa-comments"></i>
            <h4>No messages yet</h4>
            <p>Start the conversation with your group members!</p>
          </div>
        ) : (
          <div className={styles.messagesList}>
            {(messages
              .slice()
              .sort((a, b) => {
                // Prefer created_at, fallback to id
                if (a.created_at && b.created_at) {
                  return new Date(a.created_at) - new Date(b.created_at)
                }
                return a.id - b.id
              })
            ).map((message) => (
              <GroupChatMessage
                key={message.id}
                message={message}
                isOwnMessage={message.sender_id === user?.id}
              />
            ))}
            
            {/* Typing indicators */}
            {typingUsers.length > 0 && (
              <div className={styles.typingIndicator}>
                <div className={styles.typingDots}>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <span className={styles.typingText}>
                  {typingUsers.length === 1 
                    ? `${typingUsers[0]} is typing...`
                    : `${typingUsers.length} people are typing...`
                  }
                </span>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <form className={styles.messageForm} onSubmit={handleSendMessage}>
        <div className={styles.messageInputContainer}>
          <input
            type="text"
            className={styles.messageInput}
            placeholder={`Message ${groupTitle}...`}
            value={newMessage}
            onChange={handleMessageChange}
            maxLength={2000}
          />
          <button
            type="submit"
            className={styles.sendButton}
            disabled={!newMessage.trim()}
          >
            <i className="fas fa-paper-plane"></i>
          </button>
        </div>
      </form>
    </div>
  )
}
