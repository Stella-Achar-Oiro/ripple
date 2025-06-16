'use client'

import { useState, useEffect } from 'react'
import styles from './PrivateChat.module.css'

export default function PrivateChat({ userId, recipientId }) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [newMessage, setNewMessage] = useState('')

  useEffect(() => {
    if (recipientId) {
      fetchMessages()
    }
  }, [recipientId])

  const fetchMessages = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/chat/messages/private/${recipientId}`)
      const data = await response.json()
      setMessages(data)
    } catch (error) {
      console.error('Error fetching messages:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    try {
      const response = await fetch('/api/chat/messages/private', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId, content: newMessage })
      })
      
      if (response.ok) {
        setNewMessage('')
        fetchMessages() // Refresh messages
      }
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  return (
    <div className={styles.privateChat}>
      {loading ? (
        <div className={styles.loading}>Loading messages...</div>
      ) : (
        <>
          <div className={styles.messageList}>
            {messages.length === 0 ? (
              <div className={styles.emptyState}>
                No messages yet. Start the conversation!
              </div>
            ) : (
              messages.map(message => (
                <div 
                  key={message.id}
                  className={`${styles.message} ${message.sender_id === userId ? styles.outgoing : styles.incoming}`}
                >
                  <div className={styles.messageContent}>{message.content}</div>
                  <div className={styles.messageTime}>{new Date(message.created_at).toLocaleTimeString()}</div>
                </div>
              ))
            )}
          </div>
          
          <form className={styles.messageForm} onSubmit={handleSendMessage}>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className={styles.messageInput}
            />
            <button type="submit" className={styles.sendButton}>
              <i className="fas fa-paper-plane"></i>
            </button>
          </form>
        </>
      )}
    </div>
  )
}