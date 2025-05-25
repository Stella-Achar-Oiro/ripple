-- backend/pkg/db/migrations/sqlite/000017_enhance_messages.down.sql
-- Rollback enhanced message tables for real-time chat system

-- Drop conversation settings table
DROP TABLE IF EXISTS conversation_settings;

-- Drop message reactions tables
DROP TABLE IF EXISTS group_message_reactions;
DROP TABLE IF EXISTS message_reactions;

-- Drop user presence table
DROP TABLE IF EXISTS user_presence;

-- Drop group message reads table
DROP TABLE IF EXISTS group_message_reads;

-- Drop typing indicators table
DROP TABLE IF EXISTS user_typing_indicators;

-- Drop attachment tables
DROP TABLE IF EXISTS group_message_attachments;
DROP TABLE IF EXISTS message_attachments;

-- Remove edited_at columns (Note: SQLite doesn't support DROP COLUMN directly)
-- In a production environment, you'd need to:
-- 1. Create new tables without the edited_at column
-- 2. Copy data from old tables to new tables
-- 3. Drop old tables and rename new tables
-- For this migration, we'll leave the columns as they won't break functionality

-- Drop indexes on existing tables
DROP INDEX IF EXISTS idx_group_message_reactions_message_id;
DROP INDEX IF EXISTS idx_message_reactions_message_id;
DROP INDEX IF EXISTS idx_group_message_reads_user_id;
DROP INDEX IF EXISTS idx_group_message_reads_message_id;
DROP INDEX IF EXISTS idx_typing_indicators_last_typing;
DROP INDEX IF EXISTS idx_typing_indicators_group;
DROP INDEX IF EXISTS idx_typing_indicators_user_target;
DROP INDEX IF EXISTS idx_group_message_attachments_message_id;
DROP INDEX IF EXISTS idx_message_attachments_message_id;
DROP INDEX IF EXISTS idx_group_messages_created_at;
DROP INDEX IF EXISTS idx_group_messages_sender;
DROP INDEX IF EXISTS idx_group_messages_group_id;
DROP INDEX IF EXISTS idx_messages_created_at;
DROP INDEX IF EXISTS idx_messages_receiver_unread;
DROP INDEX IF EXISTS idx_messages_sender_receiver;
DROP INDEX IF EXISTS idx_conversation_settings_user_group;
DROP INDEX IF EXISTS idx_conversation_settings_user_other;
DROP INDEX IF EXISTS idx_conversation_settings_user_id;