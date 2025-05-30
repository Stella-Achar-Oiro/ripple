// src/hooks/useChat.js
import { useState, useCallback } from 'react';

const initialChats = [
  { id: 1, name: 'Alice Johnson', avatar: '👩‍💼', lastMessage: 'Hey, how are you doing?', time: '10m ago', unread: 2 },
  { id: 2, name: 'Bob Smith', avatar: '👨‍💻', lastMessage: 'Thanks for sharing that article!', time: '1h ago', unread: 0 },
  { id: 3, name: 'Carol Davis', avatar: '👩‍🎨', lastMessage: 'Let\'s catch up soon!', time: '3h ago', unread: 1 }
];

const initialMessages = {
  1: [
    { id: 1, senderId: 1, message: 'Hey, how are you doing?', time: '10m ago', isOwn: false },
    { id: 2, senderId: 'me', message: 'I\'m doing great! How about you?', time: '8m ago', isOwn: true }
  ],
  2: [
    { id: 3, senderId: 2, message: 'Thanks for sharing that article!', time: '1h ago', isOwn: false }
  ],
  3: [
    { id: 4, senderId: 3, message: 'Let\'s catch up soon!', time: '3h ago', isOwn: false }
  ]
};

export const useChat = () => {
  const [chats, setChats] = useState(initialChats);
  const [messages, setMessages] = useState(initialMessages);
  const [activeChat, setActiveChat] = useState(null);
  const [loading, setLoading] = useState(false);

  const selectChat = useCallback((chatId) => {
    setActiveChat(chatId);
    // Mark messages as read
    setChats(prevChats =>
      prevChats.map(chat =>
        chat.id === chatId ? { ...chat, unread: 0 } : chat
      )
    );
  }, []);

  const sendMessage = useCallback((chatId, messageText) => {
    const newMessage = {
      id: Date.now(),
      senderId: 'me',
      message: messageText,
      time: 'now',
      isOwn: true
    };

    setMessages(prevMessages => ({
      ...prevMessages,
      [chatId]: [...(prevMessages[chatId] || []), newMessage]
    }));

    // Update last message in chat list
    setChats(prevChats =>
      prevChats.map(chat =>
        chat.id === chatId
          ? { ...chat, lastMessage: messageText, time: 'now' }
          : chat
      )
    );
  }, []);

  const getChatMessages = useCallback((chatId) => {
    return messages[chatId] || [];
  }, [messages]);

  const getTotalUnreadCount = useCallback(() => {
    return chats.reduce((total, chat) => total + chat.unread, 0);
  }, [chats]);

  return {
    chats,
    messages,
    activeChat,
    loading,
    selectChat,
    sendMessage,
    getChatMessages,
    getTotalUnreadCount
  };
};