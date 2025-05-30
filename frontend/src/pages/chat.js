// src/pages/chat.js - Chat page with custom hooks
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/router';
import { useChat } from '../hooks/useChat';
import Layout from '../components/layout/Layout';
import { Send, MessageCircle } from 'lucide-react';

export default function Chat() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [currentView, setCurrentView] = useState('chat');
  const [messageInput, setMessageInput] = useState('');

  // Custom hooks
  const { 
    chats, 
    activeChat, 
    selectChat, 
    sendMessage, 
    getChatMessages,
    getTotalUnreadCount 
  } = useChat();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading...</div>;
  }

  if (!user) return null;

  const handleSendMessage = () => {
    if (messageInput.trim() && activeChat) {
      sendMessage(activeChat, messageInput);
      setMessageInput('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const messages = activeChat ? getChatMessages(activeChat) : [];
  const selectedChatInfo = chats.find(chat => chat.id === activeChat);

  return (
    <Layout currentView={currentView} setCurrentView={setCurrentView}>
      <div style={{ maxWidth: '64rem', margin: '0 auto', height: 'calc(100vh - 140px)' }}>
        <div style={{ display: 'flex', height: '100%', backgroundColor: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', border: '1px solid #e5e7eb' }}>
          
          {/* Chat List */}
          <div style={{ 
            width: '20rem', 
            borderRight: '1px solid #e5e7eb',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937' }}>Messages</h2>
              {getTotalUnreadCount() > 0 && (
                <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  {getTotalUnreadCount()} unread messages
                </p>
              )}
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {chats.map(chat => (
                <button
                  key={chat.id}
                  onClick={() => selectChat(chat.id)}
                  style={{
                    width: '100%',
                    padding: '1rem 1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    textAlign: 'left',
                    backgroundColor: activeChat === chat.id ? '#eff6ff' : 'transparent',
                    borderBottom: '1px solid #f3f4f6',
                    transition: 'background-color 0.15s ease-in-out'
                  }}
                >
                  <div style={{
                    width: '2.5rem',
                    height: '2.5rem',
                    backgroundColor: '#e5e7eb',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.25rem'
                  }}>
                    {chat.avatar}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <h3 style={{ fontWeight: '500', color: '#1f2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {chat.name}
                      </h3>
                      <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{chat.time}</span>
                    </div>
                    <p style={{ fontSize: '0.875rem', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {chat.lastMessage}
                    </p>
                  </div>
                  {chat.unread > 0 && (
                    <div style={{
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      fontSize: '0.75rem',
                      width: '1.25rem',
                      height: '1.25rem',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {chat.unread}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Chat Window */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {activeChat ? (
              <>
                {/* Chat Header */}
                <div style={{ 
                  padding: '1.5rem', 
                  borderBottom: '1px solid #e5e7eb',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}>
                  <div style={{
                    width: '2.5rem',
                    height: '2.5rem',
                    backgroundColor: '#e5e7eb',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.25rem'
                  }}>
                    {selectedChatInfo?.avatar}
                  </div>
                  <div>
                    <h3 style={{ fontWeight: '600', color: '#1f2937' }}>{selectedChatInfo?.name}</h3>
                    <p style={{ fontSize: '0.875rem', color: '#16a34a' }}>Online</p>
                  </div>
                </div>

                {/* Messages */}
                <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto' }}>
                  <div className="space-y-4">
                    {messages.map(message => (
                      <div
                        key={message.id}
                        style={{
                          display: 'flex',
                          justifyContent: message.isOwn ? 'flex-end' : 'flex-start'
                        }}
                      >
                        <div
                          style={{
                            maxWidth: '70%',
                            padding: '0.75rem 1rem',
                            borderRadius: message.isOwn ? '1rem 1rem 0.25rem 1rem' : '1rem 1rem 1rem 0.25rem',
                            backgroundColor: message.isOwn ? '#3b82f6' : '#f3f4f6',
                            color: message.isOwn ? 'white' : '#1f2937'
                          }}
                        >
                          <p>{message.message}</p>
                          <p style={{ 
                            fontSize: '0.75rem', 
                            marginTop: '0.25rem',
                            opacity: 0.7
                          }}>
                            {message.time}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Message Input */}
                <div style={{ 
                  padding: '1.5rem', 
                  borderTop: '1px solid #e5e7eb',
                  display: 'flex',
                  gap: '0.75rem'
                }}>
                  <textarea
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.5rem',
                      resize: 'none',
                      fontSize: '0.875rem',
                      minHeight: '2.5rem',
                      maxHeight: '6rem'
                    }}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!messageInput.trim()}
                    style={{
                      padding: '0.75rem',
                      backgroundColor: messageInput.trim() ? '#3b82f6' : '#e5e7eb',
                      color: messageInput.trim() ? 'white' : '#9ca3af',
                      borderRadius: '0.5rem',
                      transition: 'all 0.15s ease-in-out'
                    }}
                  >
                    <Send size={20} />
                  </button>
                </div>
              </>
            ) : (
              <div style={{ 
                flex: 1, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                flexDirection: 'column',
                gap: '1rem',
                color: '#6b7280'
              }}>
                <MessageCircle size={48} />
                <p>Select a conversation to start messaging</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}