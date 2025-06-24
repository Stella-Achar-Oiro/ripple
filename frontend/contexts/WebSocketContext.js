'use client'

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react'
import { useAuth } from './AuthContext'
import { useNotifications } from './NotificationContext'

const WebSocketContext = createContext(null)

export const useWebSocket = () => {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider')
  }
  return context
}

export const WebSocketProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth()
  const { addNotification } = useNotifications()
  
  // Connection state
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionError, setConnectionError] = useState(null)
  
  // Real-time data
  const [onlineUsers, setOnlineUsers] = useState(new Set())
  const [typingUsers, setTypingUsers] = useState(new Map()) // user_id -> timeout
  const [messages, setMessages] = useState(new Map()) // conversation_id -> messages[]
  const [unreadCounts, setUnreadCounts] = useState(new Map()) // conversation_id -> count
  
  // WebSocket and refs
  const wsRef = useRef(null)
  const reconnectTimeoutRef = useRef(null)
  const reconnectAttemptsRef = useRef(0)
  const messageQueueRef = useRef([])
  const heartbeatIntervalRef = useRef(null)
  const processMessageRef = useRef(null)
  const connectRef = useRef(null)
  const disconnectRef = useRef(null)
  
  // Constants
  const MAX_RECONNECT_ATTEMPTS = 5
  const RECONNECT_INTERVAL = 3000
  const HEARTBEAT_INTERVAL = 30000
  const TYPING_TIMEOUT = 3000
  
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
  const WS_URL = API_URL.replace('http://', 'ws://').replace('https://', 'wss://') + '/ws'

  // Helper functions
  const getConversationId = useCallback((userId1, userId2, groupId = null) => {
    if (groupId) return `group_${groupId}`
    const sorted = [userId1, userId2].sort((a, b) => a - b)
    return `private_${sorted[0]}_${sorted[1]}`
  }, [])

  const processMessage = useCallback((wsMessage) => {
    if (!user?.id) return // Early return if no user
    
    const { type, content, from, to, group_id, message_id, timestamp, data } = wsMessage
    
    // Helper function to create conversation ID
    const createConversationId = (userId1, userId2, groupId = null) => {
      if (groupId) return `group_${groupId}`
      const sorted = [userId1, userId2].sort((a, b) => a - b)
      return `private_${sorted[0]}_${sorted[1]}`
    }

    switch (type) {
      case 'private_message':
        if (data?.message) {
          const conversationId = createConversationId(from, to)
          const message = {
            id: message_id,
            content,
            from,
            to,
            timestamp,
            isOwn: from === user.id,
            ...data.message
          }
          
          setMessages(prev => {
            const updated = new Map(prev)
            const existing = updated.get(conversationId) || []
            updated.set(conversationId, [...existing, message])
            return updated
          })

          // Update unread count if not from current user
          if (from !== user.id) {
            setUnreadCounts(prev => {
              const updated = new Map(prev)
              updated.set(conversationId, (updated.get(conversationId) || 0) + 1)
              return updated
            })
          }
        }
        break

      case 'group_message':
        console.log('[WebSocket] Processing group message:', wsMessage) // Debug log
        if (data?.message) {
          const conversationId = createConversationId(null, null, group_id)
          const message = {
            id: message_id,
            content,
            from,
            group_id,
            timestamp,
            isOwn: from === user.id,
            ...data.message
          }
          
          console.log('[WebSocket] Adding group message to conversation:', conversationId, message) // Debug log
          
          setMessages(prev => {
            const updated = new Map(prev)
            const existing = updated.get(conversationId) || []
            updated.set(conversationId, [...existing, message])
            return updated
          })

          // Update unread count if not from current user
          if (from !== user.id) {
            setUnreadCounts(prev => {
              const updated = new Map(prev)
              updated.set(conversationId, (updated.get(conversationId) || 0) + 1)
              return updated
            })
          }
        } else {
          console.warn('[WebSocket] Group message missing data.message:', wsMessage) // Debug log
        }
        break

      case 'typing':
        if (from !== user.id) {
          setTypingUsers(prev => {
            const updated = new Map(prev)
            const conversationId = to ? createConversationId(from, to) : createConversationId(null, null, group_id)
            
            // Clear existing timeout
            const existingTimeout = updated.get(`${conversationId}_${from}`)
            if (existingTimeout) {
              clearTimeout(existingTimeout)
            }

            if (data?.is_typing) {
              // Set new timeout
              const timeout = setTimeout(() => {
                setTypingUsers(current => {
                  const newMap = new Map(current)
                  newMap.delete(`${conversationId}_${from}`)
                  return newMap
                })
              }, TYPING_TIMEOUT)
              
              updated.set(`${conversationId}_${from}`, timeout)
            } else {
              updated.delete(`${conversationId}_${from}`)
            }
            
            return updated
          })
        }
        break

      case 'read_status':
        if (data?.read_by && from !== user.id) {
          const conversationId = createConversationId(from, to)
          setMessages(prev => {
            const updated = new Map(prev)
            const messages = updated.get(conversationId) || []
            const updatedMessages = messages.map(msg => 
              msg.from === user.id ? { ...msg, read_at: timestamp } : msg
            )
            updated.set(conversationId, updatedMessages)
            return updated
          })
        }
        break

      case 'user_online':
        if (data?.user_id) {
          setOnlineUsers(prev => new Set([...prev, data.user_id]))
        }
        break

      case 'user_offline':
        if (data?.user_id) {
          setOnlineUsers(prev => {
            const updated = new Set(prev)
            updated.delete(data.user_id)
            return updated
          })
        }
        break

      case 'user_list':
        if (data?.online_users) {
          setOnlineUsers(new Set(data.online_users))
        }
        break

      case 'notification':
        if (data && addNotification) {
          addNotification({
            id: data.id,
            type: data.type,
            title: data.title || 'New Notification',
            message: data.message,
            related_id: data.related_id,
            related_type: data.related_type,
            is_read: false,
            created_at: timestamp,
            from_user: data.from_user
          })
        }
        break

      case 'error':
        console.error('WebSocket error:', content)
        setConnectionError(content)
        break
        
      case 'ping':
        // Respond to server ping with pong
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'pong' }))
        }
        break
        
      case 'pong':
        // Server acknowledged our ping, connection is healthy
        break

      default:
        console.warn('Unknown message type:', type, 'Message:', wsMessage)
    }
  }, [user?.id, addNotification])

  // Update refs when functions change
  useEffect(() => {
    processMessageRef.current = processMessage
  }, [processMessage])

  const connect = useCallback(() => {
    if (!isAuthenticated || isConnecting) return

    setIsConnecting(true)
    setConnectionError(null)

    try {
      const ws = new WebSocket(WS_URL)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('WebSocket connected')
        setIsConnected(true)
        setIsConnecting(false)
        setConnectionError(null)
        reconnectAttemptsRef.current = 0

        // Send queued messages
        if (messageQueueRef.current.length > 0) {
          messageQueueRef.current.forEach(message => {
            ws.send(JSON.stringify(message))
          })
          messageQueueRef.current = []
        }

        // Start heartbeat
        heartbeatIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }))
          }
        }, HEARTBEAT_INTERVAL)
      }

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          console.log('[WebSocket] Received:', message) // Debug log for all incoming messages
          if (processMessageRef.current) {
            processMessageRef.current(message)
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }

      ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason)
        setIsConnected(false)
        setIsConnecting(false)
        
        // Clear heartbeat
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current)
          heartbeatIntervalRef.current = null
        }

        // Attempt reconnection if not intentional
        if (event.code !== 1000 && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current++
          setConnectionError(`Connection lost. Reconnecting... (${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`)
          
          reconnectTimeoutRef.current = setTimeout(() => {
            if (connectRef.current) {
              connectRef.current()
            }
          }, RECONNECT_INTERVAL * reconnectAttemptsRef.current)
        } else if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
          setConnectionError('Connection failed. Please refresh the page.')
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        setConnectionError('Connection error occurred')
      }

    } catch (error) {
      console.error('Error creating WebSocket:', error)
      setIsConnecting(false)
      setConnectionError('Failed to establish connection')
    }
  }, [isAuthenticated, isConnecting, WS_URL])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current)
      heartbeatIntervalRef.current = null
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected')
      wsRef.current = null
    }

    setIsConnected(false)
    setIsConnecting(false)
    setConnectionError(null)
    reconnectAttemptsRef.current = 0
  }, [])

  // Update function refs
  useEffect(() => {
    connectRef.current = connect
    disconnectRef.current = disconnect
  }, [connect, disconnect])

  const sendMessage = useCallback((type, payload) => {
    const message = {
      type,
      timestamp: new Date().toISOString(),
      ...payload
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
      return true
    } else {
      // Queue message for when connection is restored
      messageQueueRef.current.push(message)
      return false
    }
  }, [])

  const sendPrivateMessage = useCallback((to, content) => {
    return sendMessage('private_message', { to, content })
  }, [sendMessage])

  const sendGroupMessage = useCallback((groupId, content) => {
    return sendMessage('group_message', { group_id: groupId, content })
  }, [sendMessage])

  const sendTypingIndicator = useCallback((to, groupId, isTyping) => {
    const payload = groupId 
      ? { group_id: groupId, data: { is_typing: isTyping } }
      : { to, data: { is_typing: isTyping } }
    
    return sendMessage('typing', payload)
  }, [sendMessage])

  const markAsRead = useCallback((userId) => {
    return sendMessage('read_status', { to: userId })
  }, [sendMessage])

  const getConversationMessages = useCallback((conversationId) => {
    return messages.get(conversationId) || []
  }, [messages])

  const getUnreadCount = useCallback((conversationId) => {
    return unreadCounts.get(conversationId) || 0
  }, [unreadCounts])

  const markConversationAsRead = useCallback((conversationId) => {
    setUnreadCounts(prev => {
      const updated = new Map(prev)
      updated.delete(conversationId)
      return updated
    })
  }, [])

  const getTypingUsers = useCallback((conversationId) => {
    const typing = []
    typingUsers.forEach((timeout, key) => {
      if (key.startsWith(conversationId + '_')) {
        const userId = parseInt(key.split('_').pop())
        typing.push(userId)
      }
    })
    return typing
  }, [typingUsers])

  const isUserOnline = useCallback((userId) => {
    return onlineUsers.has(userId)
  }, [onlineUsers])

  // Connection management effects
  useEffect(() => {
    if (isAuthenticated && user) {
      if (connectRef.current) {
        connectRef.current()
      }
    } else {
      if (disconnectRef.current) {
        disconnectRef.current()
      }
    }

    return () => {
      if (disconnectRef.current) {
        disconnectRef.current()
      }
    }
  }, [isAuthenticated, user?.id])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear all timeouts
      typingUsers.forEach((timeout) => {
        if (timeout) clearTimeout(timeout)
      })
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current)
      }
    }
  }, [])

  const value = {
    // Connection state
    isConnected,
    isConnecting,
    connectionError,
    
    // Real-time data
    onlineUsers: Array.from(onlineUsers),
    
    // Message functions
    sendPrivateMessage,
    sendGroupMessage,
    sendTypingIndicator,
    markAsRead,
    
    // Data accessors
    getConversationMessages,
    getUnreadCount,
    markConversationAsRead,
    getTypingUsers,
    isUserOnline,
    getConversationId,
    
    // Connection management
    connect,
    disconnect
  }

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  )
}