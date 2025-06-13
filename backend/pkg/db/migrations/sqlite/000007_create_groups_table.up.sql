-- backend/pkg/db/migrations/sqlite/000007_create_groups_table.up.sql
CREATE TABLE groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    creator_id INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    avatar_path VARCHAR(255),
    cover_path VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
);