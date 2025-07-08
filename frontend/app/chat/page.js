'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useWebSocket } from '../../contexts/WebSocketContext'
import RouteGuard from '../../components/Auth/RouteGuard'
import MainLayout from '../../components/Layout/MainLayout'
import ChatSidebar from '../../components/Chat/ChatSidebar'
import ChatMain from '../../components/Chat/ChatMain'
import styles from './page.module.css'
import { useSearchParams } from 'next/navigation'

export default function ChatPage() {
  const { user } = useAuth()
  const [selectedConversation, setSelectedConversation] = useState(null)
  const { isConnected, connectionError, isUserOnline, getUnreadCount, getConversationId } = useWebSocket()
  const searchParams = useSearchParams()

  // State lifted from ChatSidebar
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [followedUsers, setFollowedUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [usersError, setUsersError] = useState(null)

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

  // Fetch conversations from the backend
  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`${API_URL}/api/chat/conversations`, {
        credentials: 'include',
      })
      if (!response.ok) throw new Error('Failed to fetch conversations')
      const data = await response.json()
      if (data.success && data.data?.conversations) {
        setConversations(data.data.conversations)
      } else {
        setConversations([])
      }
    } catch (err) {
      console.error('Error fetching conversations:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [API_URL])

  // Fetch followed users for starting new chats
  const fetchFollowedUsers = useCallback(async () => {
    try {
      setUsersLoading(true)
      setUsersError(null)
      const response = await fetch(`${API_URL}/api/chat/followed-users`, {
        credentials: 'include',
      })
      if (!response.ok) throw new Error('Failed to fetch followed users')
      const data = await response.json()
      if (data.success && data.data?.users) {
        setFollowedUsers(data.data.users)
      } else {
        setFollowedUsers([])
      }
    } catch (err) {
      console.error('Error fetching followed users:', err)
      setUsersError(err.message)
    } finally {
      setUsersLoading(false)
    }
  }, [API_URL])

  // Helper to select a conversation by user ID
  const handleSelectByUserId = (userId) => {
    // Try to find the conversation in the sidebar (by id)
    // We'll use a custom event to communicate with ChatSidebar
    window.dispatchEvent(new CustomEvent('select-chat-by-user', { detail: { userId: Number(userId) } }))
  }

  useEffect(() => {
    if (user) {
      fetchConversations()
      fetchFollowedUsers()
    }
  }, [user, fetchConversations, fetchFollowedUsers])

  useEffect(() => {
    const userId = searchParams.get('user')
    if (userId && conversations.length > 0) {
      handleSelectByUserId(userId)
    }
  }, [searchParams, conversations])

  const handleSelectChat = (conversation) => {
    setSelectedConversation(conversation)
  }

  const handleConversationStarted = () => {
    fetchConversations()
  }

  return (
    <RouteGuard requireAuth={true}>
      <MainLayout currentPage="chat">
        <div className={styles.chatContainer}>
          <div className={styles.connectionBanners}>
            {/* Connection status indicator */}
            {connectionError && (
              <div className={styles.connectionError}>
                <i className="fas fa-exclamation-triangle"></i>
                <span>{connectionError}</span>
              </div>
            )}
            
            {!isConnected && !connectionError && (
              <div className={styles.connectionStatus}>
                <i className="fas fa-wifi"></i>
                <span>Connecting to chat...</span>
              </div>
            )}
          </div>

          <div className={styles.chatLayout}>
            <ChatSidebar
              selectedChat={selectedConversation}
              onSelectChat={handleSelectChat}
              conversations={conversations}
              followedUsers={followedUsers}
              loading={loading || usersLoading}
              error={error || usersError}
              onRetry={() => {
                fetchConversations()
                fetchFollowedUsers()
              }}
            />
            
            <ChatMain
              conversation={selectedConversation}
              onConversationStarted={handleConversationStarted}
            />
          </div>
        </div>
      </MainLayout>
    </RouteGuard>
  )
}
