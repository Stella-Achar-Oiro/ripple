'use client'

import { useState } from 'react'
import { useWebSocket } from '../../contexts/WebSocketContext'
import RouteGuard from '../../components/Auth/RouteGuard'
import MainLayout from '../../components/Layout/MainLayout'
import ChatSidebar from '../../components/Chat/ChatSidebar'
import ChatMain from '../../components/Chat/ChatMain'
import styles from './page.module.css'

export default function ChatPage() {
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [selectedChatId, setSelectedChatId] = useState(null)
  const { isConnected, connectionError } = useWebSocket()

  const handleSelectChat = (conversation) => {
    setSelectedConversation(conversation)
    setSelectedChatId(conversation.id)
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
            selectedChat={selectedChatId}
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