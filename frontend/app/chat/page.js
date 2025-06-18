'use client'

import RouteGuard from '../../components/Auth/RouteGuard'
import MainLayout from '../../components/Layout/MainLayout'
import { ChatProvider } from '../../contexts/ChatContext'
import ChatSidebar from '../../components/Chat/ChatSidebar'
import ChatMain from '../../components/Chat/ChatMain'
import styles from './page.module.css'

export default function ChatPage() {

  return (
    <RouteGuard requireAuth={true}>
      <MainLayout currentPage="chat">
        <ChatProvider>
          <div className={styles.chatLayout}>
            <ChatSidebar />
            <ChatMain />
          </div>
        </ChatProvider>
      </MainLayout>
    </RouteGuard>
  )
}
