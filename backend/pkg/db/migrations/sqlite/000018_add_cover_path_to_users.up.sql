-- backend/pkg/db/migrations/sqlite/000018_add_cover_path_to_users.up.sql
ALTER TABLE users ADD COLUMN cover_path VARCHAR(500);
