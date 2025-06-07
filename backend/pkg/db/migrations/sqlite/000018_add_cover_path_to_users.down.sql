-- backend/pkg/db/migrations/sqlite/000018_add_cover_path_to_users.down.sql
-- SQLite doesn't support DROP COLUMN, so we need to recreate the table
CREATE TABLE users_backup AS SELECT 
    id, email, password_hash, first_name, last_name, date_of_birth, 
    nickname, about_me, avatar_path, is_public, created_at, updated_at 
FROM users;

DROP TABLE users;

CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE NOT NULL,
    nickname VARCHAR(50),
    about_me TEXT,
    avatar_path VARCHAR(500),
    is_public BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO users SELECT * FROM users_backup;
DROP TABLE users_backup;
