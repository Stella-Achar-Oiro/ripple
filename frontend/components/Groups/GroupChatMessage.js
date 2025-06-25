import React from 'react';
import styles from './GroupChat.module.css';

export default function GroupChatMessage({ message, isOwnMessage }) {
  // Prefer nickname, then first name, then 'User'
  const sender = message.sender;
  let senderName = 'User';
  if (sender) {
    senderName = sender.nickname || sender.first_name || 'User';
  }

  return (
    <div className={isOwnMessage ? styles.ownMessage : styles.message}>
      {!isOwnMessage && (
        <span className={styles.senderName}>{senderName}</span>
      )}

      <div className={styles.messageContainer}>
        <div className={styles.messageContent}>{message.content || message.text}</div>
        <span className={styles.timestamp}>{new Date(message.timestamp || message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
      
    </div>
  );
}
