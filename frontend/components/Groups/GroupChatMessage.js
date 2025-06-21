import React from 'react';
import styles from './GroupChat.module.css';

export default function GroupChatMessage({ message, isOwnMessage }) {
  return (
    <div className={isOwnMessage ? styles.ownMessage : styles.message}>
      <div className={styles.messageHeader}>
        <span className={styles.senderName}>{message.sender_name || 'User'}</span>
        <span className={styles.timestamp}>{new Date(message.timestamp || message.created_at).toLocaleTimeString()}</span>
      </div>
      <div className={styles.messageContent}>{message.content || message.text}</div>
    </div>
  );
}
