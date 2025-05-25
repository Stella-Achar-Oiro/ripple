-- backend/pkg/db/migrations/sqlite/000016_create_indexes.down.sql
DROP INDEX IF EXISTS idx_users_email;
DROP INDEX IF EXISTS idx_sessions_user_id;
DROP INDEX IF EXISTS idx_sessions_expires_at;
DROP INDEX IF EXISTS idx_follows_follower;
DROP INDEX IF EXISTS idx_follows_following;
DROP INDEX IF EXISTS idx_follows_status;
DROP INDEX IF EXISTS idx_posts_user_id;
DROP INDEX IF EXISTS idx_posts_privacy;
DROP INDEX IF EXISTS idx_posts_created_at;
DROP INDEX IF EXISTS idx_comments_post_id;
DROP INDEX IF EXISTS idx_notifications_user_id;
DROP INDEX IF EXISTS idx_notifications_read;