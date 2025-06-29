'use client'

import { useState, useEffect } from 'react'
import { useWebSocket } from '../../contexts/WebSocketContext'
import RouteGuard from '../../components/Auth/RouteGuard'
import MainLayout from '../../components/Layout/MainLayout'
import ChatSidebar from '../../components/Chat/ChatSidebar'
import ChatMain from '../../components/Chat/ChatMain'
import styles from './page.module.css'
import { useSearchParams } from 'next/navigation'

export default function ChatPage() {
  const [selectedConversation, setSelectedConversation] = useState(null)
  const { isConnected, connectionError } = useWebSocket()
  const searchParams = useSearchParams()

  // Helper to select a conversation by user ID
  const handleSelectByUserId = (userId) => {
    // Try to find the conversation in the sidebar (by id)
    // We'll use a custom event to communicate with ChatSidebar
    window.dispatchEvent(new CustomEvent('select-chat-by-user', { detail: { userId: Number(userId) } }))
  }

  useEffect(() => {
    const userId = searchParams.get('user')
    if (userId) {
      handleSelectByUserId(userId)
    }
  }, [searchParams])

  const handleSelectChat = (conversation) => {
    setSelectedConversation(conversation)
  }

  return (
    <RouteGuard requireAuth={true}>
      <MainLayout currentPage="chat">
        <div className={styles.chatLayout}>
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

          <ChatSidebar
            selectedChat={selectedConversation}
            onSelectChat={handleSelectChat}
          />
          
          <ChatMain
            conversation={selectedConversation}
          />
        </div>
      </MainLayout>
    </RouteGuard>
  )
}