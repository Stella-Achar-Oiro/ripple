-- backend/pkg/db/migrations/sqlite/000010_create_group_post_comments_table.up.sql
CREATE TABLE group_post_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_post_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    image_path VARCHAR(500),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_post_id) REFERENCES group_posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);