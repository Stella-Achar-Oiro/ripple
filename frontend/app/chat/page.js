'use client'

import { useState } from 'react'
import MainLayout from '../../components/Layout/MainLayout'
import ChatSidebar from '../../components/Chat/ChatSidebar'
import ChatMain from '../../components/Chat/ChatMain'
import styles from './page.module.css'

export default function ChatPage() {
  const [selectedChat, setSelectedChat] = useState(1)
  
  const conversations = [
    {
      id: 1,
      name: 'Sarah Anderson',
      initials: 'SA',
      lastMessage: 'That sounds amazing! When...',
      time: '2:30 PM',
      unread: 2,
      isOnline: true,
      isActive: true
    },
    {
      id: 2,
      name: 'Mike Torres',
      initials: 'MT',
      lastMessage: 'Thanks for the help with...',
      time: '1:15 PM',
      unread: 0,
      isOnline: true,
      isActive: false
    },
    {
      id: 3,
      name: 'Alex Liu',
      initials: 'AL',
      lastMessage: 'Hey! Are you free this...',
      time: 'Yesterday',
      unread: 0,
      isOnline: false,
      isActive: false
    },
    {
      id: 4,
      name: 'Photography Group',
      initials: null,
      lastMessage: 'Mike: Just uploaded some...',
      time: 'Yesterday',
      unread: 5,
      isOnline: false,
      isActive: false,
      isGroup: true
    }
  ]

  const messages = [
    {
      id: 1,
      content: 'Hey! I saw your hiking post. The photos look amazing!',
      time: '2:28 PM',
      isOwn: false
    },
    {
      id: 2,
      content: 'Thank you! It was such a beautiful day. You should come with us next time!',
      time: '2:29 PM',
      isOwn: true
    },
    {
      id: 3,
      content: 'That sounds amazing! When are you planning the next trip?',
      time: '2:30 PM',
      isOwn: false
    },
    {
      id: 4,
      content: 'We\'re thinking next weekend. I\'ll create an event in our group!',
      time: 'Just now',
      isOwn: true
    }
  ]

  const activeConversation = conversations.find(conv => conv.id === selectedChat)

  return (
    <MainLayout currentPage="chat">
      <div className={styles.chatLayout}>
        <ChatSidebar 
          conversations={conversations}
          selectedChat={selectedChat}
          onSelectChat={setSelectedChat}
        />
        <ChatMain 
          conversation={activeConversation}
          messages={messages}
        />
      </div>
    </MainLayout>
  )
}
