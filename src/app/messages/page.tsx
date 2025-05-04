'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { Search, Send } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { mockUsers } from '@/store/mockData';

// Mock conversation data
const mockConversations = [
  {
    id: '1',
    user: mockUsers[1], // Jane Doe
    lastMessage: {
      content: 'That sounds great! Looking forward to it.',
      timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(), // 10 minutes ago
      read: false,
      sender: 'them',
    },
    unreadCount: 1,
  },
  {
    id: '2',
    user: mockUsers[2], // Alex Smith
    lastMessage: {
      content: 'I'll send you the document later today.',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), // 3 hours ago
      read: true,
      sender: 'me',
    },
    unreadCount: 0,
  },
  {
    id: '3',
    user: mockUsers[3], // Sarah Jones
    lastMessage: {
      content: 'Thanks for your help with the project!',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
      read: true,
      sender: 'them',
    },
    unreadCount: 0,
  },
];

// Mock messages for the selected conversation
const mockMessages = [
  {
    id: '1',
    content: 'Hey, how are you doing?',
    timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
    sender: 'me',
  },
  {
    id: '2',
    content: 'I'm good, thanks! Just working on that new project we discussed.',
    timestamp: new Date(Date.now() - 1000 * 60 * 55).toISOString(), // 55 minutes ago
    sender: 'them',
  },
  {
    id: '3',
    content: 'How's it coming along?',
    timestamp: new Date(Date.now() - 1000 * 60 * 50).toISOString(), // 50 minutes ago
    sender: 'me',
  },
  {
    id: '4',
    content: 'Making good progress! I should have something to show you by tomorrow.',
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 minutes ago
    sender: 'them',
  },
  {
    id: '5',
    content: 'That sounds great! Looking forward to it.',
    timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(), // 10 minutes ago
    sender: 'me',
  },
  {
    id: '6',
    content: 'Perfect! I'll send you an update as soon as it's ready.',
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 minutes ago
    sender: 'them',
  },
];

export default function MessagesPage() {
  const [conversations, setConversations] = useState(mockConversations);
  const [selectedConversation, setSelectedConversation] = useState(conversations[0]);
  const [messages, setMessages] = useState(mockMessages);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;
    
    const message = {
      id: `new-${Date.now()}`,
      content: newMessage,
      timestamp: new Date().toISOString(),
      sender: 'me' as const,
    };
    
    setMessages([...messages, message]);
    setNewMessage('');
    
    // Update the conversation's last message
    setConversations(
      conversations.map(conv => 
        conv.id === selectedConversation.id 
          ? {
              ...conv,
              lastMessage: {
                content: newMessage,
                timestamp: new Date().toISOString(),
                read: true,
                sender: 'me',
              },
            }
          : conv
      )
    );
  };
  
  const filteredConversations = conversations.filter(conv => 
    conv.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  return (
    <div className="max-w-6xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden h-[calc(100vh-2rem)] flex">
      {/* Conversations sidebar */}
      <div className="w-full max-w-xs border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-xl font-bold">Messages</h1>
          
          <div className="mt-3 relative">
            <input
              type="text"
              placeholder="Search conversations"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-full focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <Search className="absolute left-3 top-2.5 text-gray-500 dark:text-gray-400" size={18} />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length > 0 ? (
            filteredConversations.map((conversation) => (
              <button
                key={conversation.id}
                className={`w-full text-left p-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors ${
                  selectedConversation?.id === conversation.id ? 'bg-primary/5' : ''
                }`}
                onClick={() => setSelectedConversation(conversation)}
              >
                <div className="flex items-center">
                  <Avatar 
                    src={conversation.user.avatar} 
                    alt={conversation.user.name} 
                    size="md"
                    status={conversation.id === '1' ? 'online' : 'offline'}
                    className="mr-3"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <h3 className="font-medium truncate">{conversation.user.name}</h3>
                      <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap ml-2">
                        {formatDistanceToNow(new Date(conversation.lastMessage.timestamp), { addSuffix: false })}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between mt-1">
                      <p className={`text-sm truncate ${
                        !conversation.lastMessage.read && conversation.lastMessage.sender === 'them'
                          ? 'font-medium text-gray-900 dark:text-white'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        {conversation.lastMessage.sender === 'me' && 'You: '}
                        {conversation.lastMessage.content}
                      </p>
                      
                      {conversation.unreadCount > 0 && (
                        <span className="ml-2 bg-primary text-white text-xs font-medium rounded-full w-5 h-5 flex items-center justify-center">
                          {conversation.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              No conversations found
            </div>
          )}
        </div>
      </div>
      
      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center">
              <Avatar 
                src={selectedConversation.user.avatar} 
                alt={selectedConversation.user.name} 
                size="md"
                status={selectedConversation.id === '1' ? 'online' : 'offline'}
                className="mr-3"
              />
              
              <div>
                <h2 className="font-medium">{selectedConversation.user.name}</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {selectedConversation.id === '1' ? 'Online' : 'Offline'}
                </p>
              </div>
            </div>
            
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'me' ? 'justify-end' : 'justify-start'}`}
                >
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`max-w-[70%] rounded-lg px-4 py-2 ${
                      message.sender === 'me'
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 dark:bg-gray-700'
                    }`}
                  >
                    <p>{message.content}</p>
                    <p className={`text-xs mt-1 ${
                      message.sender === 'me' ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
                    </p>
                  </motion.div>
                </div>
              ))}
            </div>
            
            {/* Message input */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 p-3 bg-gray-100 dark:bg-gray-700 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="bg-primary text-white p-3 rounded-r-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={20} />
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-gray-500 dark:text-gray-400">
              Select a conversation to start messaging
            </p>
          </div>
        )}
      </div>
    </div>
  );
}