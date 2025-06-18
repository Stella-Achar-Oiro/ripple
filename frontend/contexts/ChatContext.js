'use client'

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

const ChatContext = createContext()

export const useChat = () => {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider')
  }
  return context
}

export const ChatProvider = ({ children }) => {
  // WebSocket connection
  const [socket, setSocket] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState('')
  
  // Chat state
  const [conversations, setConversations] = useState([])
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [messages, setMessages] = useState({}) // { conversationId: [messages] }
  const [onlineUsers, setOnlineUsers] = useState(new Set())
  const [typingUsers, setTypingUsers] = useState({}) // { conversationId: Set(userIds) }
  
  // Loading states
  const [isLoadingConversations, setIsLoadingConversations] = useState(false)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  
  // Refs
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 5
  const reconnectTimeout = useRef(null)
  const typingTimeouts = useRef({})
  
  const router = useRouter()
  const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080/ws'
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

  // WebSocket connection management
  const connectWebSocket = useCallback(() => {
    try {
      console.log('Attempting to connect to WebSocket:', WS_URL)
      
      // Create WebSocket connection - credentials (cookies) are sent automatically
      // by the browser during the WebSocket handshake
      const ws = new WebSocket(WS_URL)
      
      ws.onopen = () => {
        console.log('WebSocket connected')
        setIsConnected(true)
        setConnectionError('')
        reconnectAttempts.current = 0
        
        // No auth message needed - authentication happens via session cookies
        // during WebSocket handshake. Backend automatically registers user.
        console.log('WebSocket authenticated via session cookies')
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          handleWebSocketMessage(data)
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }

      ws.onclose = (event) => {
        console.log(`WebSocket disconnected: ${event.code} ${event.reason || '(no reason)'}`)
        console.log('Close codes: 1000=Normal, 1001=Going Away, 1005=No Status, 1006=Abnormal')
        setIsConnected(false)
        setSocket(null)
        
        // Attempt reconnection if not intentional (avoid reconnecting on normal closure)
        if (event.code !== 1000 && event.code !== 1001 && reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000)
          console.log(`Reconnecting in ${delay}ms... (attempt ${reconnectAttempts.current + 1})`)
          
          reconnectTimeout.current = setTimeout(() => {
            reconnectAttempts.current++
            connectWebSocket()
          }, delay)
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          setConnectionError('Failed to connect to chat. Please refresh the page.')
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        setConnectionError('Connection error occurred')
      }

      setSocket(ws)
      
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error)
      setConnectionError('Failed to establish connection')
    }
  }, [WS_URL])

  // Handle incoming WebSocket messages
  const handleWebSocketMessage = useCallback((data) => {
    console.log('Received WebSocket message:', data)
    
    switch (data.type) {
      case 'private_message':
      case 'group_message':
        handleNewMessage(data)
        break
        
      case 'typing':
        handleTypingIndicator(data)
        break
        
      case 'user_list':
        // Handle user list updates from server
        if (data.data && data.data.users) {
          const userIds = data.data.users.map(user => user.id || user.user_id)
          setOnlineUsers(new Set(userIds))
          console.log('Updated online users:', userIds)
        }
        break
        
      case 'user_online':
        setOnlineUsers(prev => new Set([...prev, data.userId]))
        updateConversationOnlineStatus(data.userId, true)
        break
        
      case 'user_offline':
        setOnlineUsers(prev => {
          const newSet = new Set(prev)
          newSet.delete(data.userId)
          return newSet
        })
        updateConversationOnlineStatus(data.userId, false)
        break
        
      case 'message_delivered':
        updateMessageStatus(data.messageId, 'delivered')
        break
        
      case 'message_read':
        updateMessageStatus(data.messageId, 'read')
        break
        
      case 'heartbeat':
        // Handle heartbeat messages (keep connection alive)
        console.log('Received heartbeat')
        break
        
      case 'presence':
        // Handle presence updates
        if (data.data) {
          console.log('Presence update:', data.data)
        }
        break
        
      case 'notification':
        // Handle general notifications
        console.log('Notification:', data.content)
        break
        
      case 'delivered':
        // Handle delivery confirmations
        updateMessageStatus(data.messageId, 'delivered')
        break
        
      case 'read_status':
        // Handle read status updates
        updateMessageStatus(data.messageId, 'read')
        break
        
      case 'error':
        console.error('Server error:', data.content || data.message)
        setConnectionError(data.content || data.message || 'Server error occurred')
        break
        
      default:
        console.log('Unknown message type:', data.type, 'Full message:', data)
        // Don't treat unknown message types as errors, just log them
    }
  }, [])

  // Handle new incoming messages
  const handleNewMessage = useCallback((messageData) => {
    const conversationId = messageData.conversationId || messageData.senderId
    
    const newMessage = {
      id: messageData.id || Date.now().toString(),
      content: messageData.content,
      senderId: messageData.senderId,
      senderName: messageData.senderName,
      timestamp: messageData.timestamp || new Date().toISOString(),
      type: messageData.type,
      status: 'delivered'
    }

    setMessages(prev => ({
      ...prev,
      [conversationId]: [...(prev[conversationId] || []), newMessage]
    }))

    // Update conversation's last message
    setConversations(prev => prev.map(conv => 
      conv.id === conversationId 
        ? {
            ...conv,
            lastMessage: messageData.content,
            lastMessageTime: newMessage.timestamp,
            unread: conv.id === selectedConversation?.id ? 0 : (conv.unread || 0) + 1
          }
        : conv
    ))
  }, [selectedConversation])

  // Handle typing indicators
  const handleTypingIndicator = useCallback((data) => {
    const { conversationId, userId, isTyping } = data
    
    setTypingUsers(prev => {
      const conversationTyping = new Set(prev[conversationId] || [])
      
      if (isTyping) {
        conversationTyping.add(userId)
      } else {
        conversationTyping.delete(userId)
      }
      
      return {
        ...prev,
        [conversationId]: conversationTyping
      }
    })

    // Clear typing indicator after timeout
    if (isTyping) {
      if (typingTimeouts.current[`${conversationId}-${userId}`]) {
        clearTimeout(typingTimeouts.current[`${conversationId}-${userId}`])
      }
      
      typingTimeouts.current[`${conversationId}-${userId}`] = setTimeout(() => {
        setTypingUsers(prev => {
          const conversationTyping = new Set(prev[conversationId] || [])
          conversationTyping.delete(userId)
          return {
            ...prev,
            [conversationId]: conversationTyping
          }
        })
      }, 3000)
    }
  }, [])

  // Update conversation online status
  const updateConversationOnlineStatus = useCallback((userId, isOnline) => {
    setConversations(prev => prev.map(conv => 
      conv.userId === userId 
        ? { ...conv, isOnline }
        : conv
    ))
  }, [])

  // Update message status
  const updateMessageStatus = useCallback((messageId, status) => {
    setMessages(prev => {
      const updated = { ...prev }
      Object.keys(updated).forEach(conversationId => {
        updated[conversationId] = updated[conversationId].map(msg =>
          msg.id === messageId ? { ...msg, status } : msg
        )
      })
      return updated
    })
  }, [])

  // Send message via WebSocket
  const sendMessage = useCallback((conversationId, content, type = 'private_message') => {
    if (!socket || !isConnected) {
      throw new Error('Not connected to chat server')
    }

    // Format message according to backend WSMessage structure
    const message = {
      type,
      content,
      to: parseInt(conversationId), // Backend expects 'to' field for private messages
      timestamp: new Date().toISOString()
    }

    socket.send(JSON.stringify(message))
    
    // Add optimistic message to UI
    const optimisticMessage = {
      id: `temp-${Date.now()}`,
      content,
      senderId: 'current-user', // Should be replaced with actual user ID
      timestamp: message.timestamp,
      type,
      status: 'sending'
    }

    setMessages(prev => ({
      ...prev,
      [conversationId]: [...(prev[conversationId] || []), optimisticMessage]
    }))

    return optimisticMessage
  }, [socket, isConnected])

  // Send typing indicator
  const sendTypingIndicator = useCallback((conversationId, isTyping) => {
    if (!socket || !isConnected) return

    socket.send(JSON.stringify({
      type: 'typing',
      to: parseInt(conversationId),
      data: { is_typing: isTyping },
      timestamp: new Date().toISOString()
    }))
  }, [socket, isConnected])

  // Load conversations from API
  const loadConversations = useCallback(async () => {
    setIsLoadingConversations(true)
    try {
      const response = await fetch(`${API_URL}/api/chat/conversations`, {
        credentials: 'include'
      })

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/')
          return
        }
        throw new Error('Failed to load conversations')
      }

      const data = await response.json()
      setConversations(data.data?.conversations || [])
    } catch (error) {
      console.error('Error loading conversations:', error)
      setConnectionError('Failed to load conversations')
    } finally {
      setIsLoadingConversations(false)
    }
  }, [API_URL, router])

  // Load message history for a conversation
  const loadMessages = useCallback(async (conversationId) => {
    if (!conversationId) return

    setIsLoadingMessages(true)
    try {
      const response = await fetch(`${API_URL}/api/chat/messages/${conversationId}`, {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to load messages')
      }

      const data = await response.json()
      const conversationMessages = data.data?.messages || []
      
      setMessages(prev => ({
        ...prev,
        [conversationId]: conversationMessages
      }))

      // Mark conversation as read
      setConversations(prev => prev.map(conv =>
        conv.id === conversationId
          ? { ...conv, unread: 0 }
          : conv
      ))

    } catch (error) {
      console.error('Error loading messages:', error)
    } finally {
      setIsLoadingMessages(false)
    }
  }, [API_URL])

  // Initialize WebSocket connection
  useEffect(() => {
    connectWebSocket()
    loadConversations()

    return () => {
      if (socket) {
        socket.close(1000, 'Component unmounting')
      }
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current)
      }
      Object.values(typingTimeouts.current).forEach(timeout => clearTimeout(timeout))
    }
  }, [connectWebSocket, loadConversations])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (socket) {
        socket.close(1000, 'Component unmounting')
      }
    }
  }, [socket])

  const value = {
    // Connection state
    isConnected,
    connectionError,
    
    // Chat data
    conversations,
    selectedConversation,
    messages: messages[selectedConversation?.id] || [],
    onlineUsers,
    typingUsers: typingUsers[selectedConversation?.id] || new Set(),
    
    // Loading states
    isLoadingConversations,
    isLoadingMessages,
    
    // Actions
    sendMessage,
    sendTypingIndicator,
    setSelectedConversation,
    loadMessages,
    connectWebSocket
  }

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  )
}