'use client'

import { useEffect, useState, useRef, useCallback } from 'react'

export const useWebSocket = (url, options = {}) => {
  const {
    onOpen,
    onMessage,
    onClose,
    onError,
    reconnectAttempts = 5,
    reconnectInterval = 1000,
    protocols = [],
    shouldReconnect = true
  } = options

  const [socket, setSocket] = useState(null)
  const [lastMessage, setLastMessage] = useState(null)
  const [readyState, setReadyState] = useState(WebSocket.CONNECTING)
  const [connectionAttempt, setConnectionAttempt] = useState(0)
  
  const reconnectTimeoutRef = useRef(null)
  const socketRef = useRef(null)
  const attemptRef = useRef(0)

  // WebSocket ready states
  const CONNECTING = WebSocket.CONNECTING
  const OPEN = WebSocket.OPEN
  const CLOSING = WebSocket.CLOSING
  const CLOSED = WebSocket.CLOSED

  const connect = useCallback(() => {
    try {
      console.log(`WebSocket connecting... (attempt ${attemptRef.current + 1})`)
      
      const ws = new WebSocket(url, protocols)
      socketRef.current = ws
      setSocket(ws)
      setReadyState(WebSocket.CONNECTING)

      ws.onopen = (event) => {
        console.log('WebSocket connected')
        setReadyState(WebSocket.OPEN)
        attemptRef.current = 0
        setConnectionAttempt(0)
        onOpen?.(event)
      }

      ws.onmessage = (event) => {
        const message = event.data
        setLastMessage({ data: message, timestamp: Date.now() })
        onMessage?.(event)
      }

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason)
        setReadyState(WebSocket.CLOSED)
        setSocket(null)
        socketRef.current = null
        onClose?.(event)

        // Attempt reconnection if enabled and not intentionally closed
        if (shouldReconnect && event.code !== 1000 && attemptRef.current < reconnectAttempts) {
          const timeout = Math.min(
            reconnectInterval * Math.pow(2, attemptRef.current),
            30000
          )
          
          console.log(`Reconnecting in ${timeout}ms...`)
          setConnectionAttempt(attemptRef.current + 1)
          
          reconnectTimeoutRef.current = setTimeout(() => {
            attemptRef.current++
            connect()
          }, timeout)
        }
      }

      ws.onerror = (event) => {
        console.error('WebSocket error:', event)
        setReadyState(WebSocket.CLOSED)
        onError?.(event)
      }

    } catch (error) {
      console.error('Failed to create WebSocket:', error)
      setReadyState(WebSocket.CLOSED)
      onError?.(error)
    }
  }, [url, protocols, onOpen, onMessage, onClose, onError, shouldReconnect, reconnectAttempts, reconnectInterval])

  const sendMessage = useCallback((message) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      try {
        const data = typeof message === 'string' ? message : JSON.stringify(message)
        socketRef.current.send(data)
        return true
      } catch (error) {
        console.error('Failed to send message:', error)
        return false
      }
    } else {
      console.warn('WebSocket is not connected')
      return false
    }
  }, [])

  const sendJsonMessage = useCallback((object) => {
    return sendMessage(JSON.stringify(object))
  }, [sendMessage])

  const disconnect = useCallback((code = 1000, reason = 'Normal closure') => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    
    if (socketRef.current) {
      socketRef.current.close(code, reason)
    }
  }, [])

  const reconnect = useCallback(() => {
    disconnect()
    attemptRef.current = 0
    setConnectionAttempt(0)
    setTimeout(connect, 100)
  }, [connect, disconnect])

  // Initial connection
  useEffect(() => {
    connect()

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (socketRef.current) {
        socketRef.current.close(1000, 'Component unmounting')
      }
    }
  }, [connect])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [])

  return {
    socket,
    sendMessage,
    sendJsonMessage,
    lastMessage,
    readyState,
    connectionAttempt,
    connect: reconnect,
    disconnect,
    
    // Helper states
    isConnecting: readyState === CONNECTING,
    isOpen: readyState === OPEN,
    isClosing: readyState === CLOSING,
    isClosed: readyState === CLOSED,
    
    // Constants for external use
    CONNECTING,
    OPEN,
    CLOSING,
    CLOSED
  }
}

export default useWebSocket