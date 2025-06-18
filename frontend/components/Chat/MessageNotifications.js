'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useWebSocket } from '../../contexts/WebSocketContext'
import styles from './MessageNotifications.module.css'

export default function MessageNotifications({ onSelectConversation, conversations = [] }) {
  const { user } = useAuth()
  const { 
    getConversationMessages, 
    getUnreadCount
  } = useWebSocket()
  
  const [messageSenders, setMessageSenders] = useState([])
  const [userCache, setUserCache] = useState(new Map())
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

  useEffect(() => {
    if (user?.id && conversations.length > 0) {
      // Get sender info for conversations with unread messages
      const senders = conversations.map(conv => {
        const convId = conv.conversationId
        const unreadCount = getUnreadCount(convId)
        
        if (unreadCount > 0) {
          const messages = getConversationMessages(convId)
          
          if (messages.length > 0) {
            // Find the most recent message not from current user
            const lastUnreadMessage = messages
              .slice()
              .reverse()
              .find(msg => !msg.isOwn)
            
            if (lastUnreadMessage) {
              return {
                conversationId: convId,
                senderId: conv.id,
                senderName: conv.name,
                senderAvatar: conv.avatar_path,
                unreadCount,
                lastMessage: lastUnreadMessage.content,
                timestamp: lastUnreadMessage.timestamp
              }
            }
          }
        }
        return null
      }).filter(Boolean)

      setMessageSenders(senders)
    }
  }, [user?.id, conversations, getConversationMessages, getUnreadCount])

  const fetchUserDetails = async (userId) => {
    try {
      const response = await fetch(`${API_URL}/api/users/${userId}`, {
        credentials: 'include',
      })

      if (response.ok) {
        const userData = await response.json()
        
        if (userData.success && userData.data) {
          const userInfo = userData.data
          setUserCache(prev => new Map(prev).set(userId, userInfo))
          
          // Update sender info with user details
          setMessageSenders(prev => 
            prev.map(sender => 
              sender.senderId === userId 
                ? {
                    ...sender,
                    senderName: `${userInfo.first_name} ${userInfo.last_name}`,
                    senderAvatar: userInfo.avatar_path
                  }
                : sender
            )
          )
        }
      }
    } catch (err) {
      console.error('Error fetching user details:', err)
    }
  }

  const handleSelectSender = async (sender) => {
    try {
      // Fetch user details to create proper conversation object
      const response = await fetch(`${API_URL}/api/users/${sender.senderId}`, {
        credentials: 'include',
      })

      if (response.ok) {
        const userData = await response.json()
        
        if (userData.success && userData.data) {
          const userInfo = userData.data
          const conversation = {
            id: userInfo.id,
            name: `${userInfo.first_name} ${userInfo.last_name}`,
            isGroup: false,
            avatar_path: userInfo.avatar_path,
            initials: `${userInfo.first_name?.charAt(0) || ''}${userInfo.last_name?.charAt(0) || ''}`
          }
          
          onSelectConversation(conversation)
        }
      }
    } catch (err) {
      console.error('Error fetching user details:', err)
      // Fallback: create conversation with available info
      const conversation = {
        id: sender.senderId,
        name: sender.senderName,
        isGroup: false,
        avatar_path: sender.senderAvatar,
        initials: sender.senderName.split(' ').map(n => n[0]).join('')
      }
      
      onSelectConversation(conversation)
    }
  }

  if (messageSenders.length === 0) {
    return null
  }

  return (
    <div className={styles.messageNotifications}>
      <div className={styles.notificationHeader}>
        <i className="fas fa-bell"></i>
        <span>New Messages</span>
      </div>
      
      <div className={styles.senderList}>
        {messageSenders.map(sender => (
          <div 
            key={sender.conversationId}
            className={styles.senderItem}
            onClick={() => handleSelectSender(sender)}
          >
            <div className="friend-avatar">
              {sender.senderAvatar ? (
                <img 
                  src={`${API_URL}${sender.senderAvatar}`} 
                  alt={sender.senderName}
                />
              ) : (
                sender.senderName.split(' ').map(n => n[0]).join('')
              )}
            </div>
            
            <div className={styles.senderInfo}>
              <div className={styles.senderName}>
                {sender.senderName}
                <span className={styles.notificationBadge}>
                  {sender.unreadCount}
                </span>
              </div>
              <div className={styles.lastMessage}>
                {sender.lastMessage}
              </div>
            </div>
            
            <i className="fas fa-envelope"></i>
          </div>
        ))}
      </div>
    </div>
  )
}
