-- backend/pkg/db/migrations/sqlite/000017_enhance_messages.up.sql
-- Enhanced message tables for real-time chat system

-- Add indexes to existing messages table for better performance
CREATE INDEX IF NOT EXISTS idx_messages_sender_receiver ON messages(sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_unread ON messages(receiver_id, read_at);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- Add indexes to existing group_messages table for better performance  
CREATE INDEX IF NOT EXISTS idx_group_messages_group_id ON group_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_sender ON group_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_created_at ON group_messages(created_at DESC);

-- Create message_attachments table for future file sharing in chat
CREATE TABLE IF NOT EXISTS message_attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
);

CREATE INDEX idx_message_attachments_message_id ON message_attachments(message_id);

-- Create group_message_attachments table for group chat file sharing
CREATE TABLE IF NOT EXISTS group_message_attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_message_id INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_message_id) REFERENCES group_messages(id) ON DELETE CASCADE
);

CREATE INDEX idx_group_message_attachments_message_id ON group_message_attachments(group_message_id);

-- Create user_typing_indicators table for managing typing state
CREATE TABLE IF NOT EXISTS user_typing_indicators (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    target_user_id INTEGER NULL,
    target_group_id INTEGER NULL,
    is_typing BOOLEAN NOT NULL DEFAULT false,
    last_typing_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (target_group_id) REFERENCES groups(id) ON DELETE CASCADE,
    UNIQUE(user_id, target_user_id, target_group_id)
);

-- Create indexes for typing indicators
CREATE INDEX idx_typing_indicators_user_target ON user_typing_indicators(user_id, target_user_id);
CREATE INDEX idx_typing_indicators_group ON user_typing_indicators(target_group_id);
CREATE INDEX idx_typing_indicators_last_typing ON user_typing_indicators(last_typing_at);

-- Create message_read_status table for tracking read status in group chats
CREATE TABLE IF NOT EXISTS group_message_reads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_message_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    read_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_message_id) REFERENCES group_messages(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(group_message_id, user_id)
);

CREATE INDEX idx_group_message_reads_message_id ON group_message_reads(group_message_id);
CREATE INDEX idx_group_message_reads_user_id ON group_message_reads(user_id);

-- Create user_presence table for tracking online status
CREATE TABLE IF NOT EXISTS user_presence (
    user_id INTEGER PRIMARY KEY,
    last_seen DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_online BOOLEAN NOT NULL DEFAULT false,
    status_message TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create message_reactions table for emoji reactions
CREATE TABLE IF NOT EXISTS message_reactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    reaction TEXT NOT NULL, -- emoji or reaction type
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(message_id, user_id, reaction)
);

CREATE INDEX idx_message_reactions_message_id ON message_reactions(message_id);

-- Create group_message_reactions table for group chat emoji reactions
CREATE TABLE IF NOT EXISTS group_message_reactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_message_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    reaction TEXT NOT NULL, -- emoji or reaction type
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_message_id) REFERENCES group_messages(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(group_message_id, user_id, reaction)
);

CREATE INDEX idx_group_message_reactions_message_id ON group_message_reactions(group_message_id);

-- Add a column to track message edit history
ALTER TABLE messages ADD COLUMN edited_at DATETIME;
ALTER TABLE group_messages ADD COLUMN edited_at DATETIME;

-- Create conversation_settings table for chat preferences
CREATE TABLE IF NOT EXISTS conversation_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    other_user_id INTEGER NULL,
    group_id INTEGER NULL,
    is_muted BOOLEAN NOT NULL DEFAULT false,
    is_archived BOOLEAN NOT NULL DEFAULT false,
    custom_name TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (other_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
    UNIQUE(user_id, other_user_id, group_id)
);

CREATE INDEX idx_conversation_settings_user_id ON conversation_settings(user_id);
CREATE INDEX idx_conversation_settings_user_other ON conversation_settings(user_id, other_user_id);
CREATE INDEX idx_conversation_settings_user_group ON conversation_settings(user_id, group_id);