-- Migration: Create group_post_likes table
CREATE TABLE group_post_likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_post_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_post_id, user_id),
    FOREIGN KEY(group_post_id) REFERENCES group_posts(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Optional: Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_group_post_likes_post_id ON group_post_likes(group_post_id);
CREATE INDEX IF NOT EXISTS idx_group_post_likes_user_id ON group_post_likes(user_id);