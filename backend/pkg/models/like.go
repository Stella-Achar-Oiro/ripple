// backend/pkg/models/like.go
package models

import (
	"database/sql"
	"fmt"
	"time"
)

type LikeRepository struct {
	db *sql.DB
}

func NewLikeRepository(db *sql.DB) *LikeRepository {
	return &LikeRepository{db: db}
}

type Like struct {
	BaseModel
	UserID    int       `json:"user_id" db:"user_id"`
	PostID    int       `json:"post_id" db:"post_id"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

// LikePost adds a like to a post
func (lr *LikeRepository) LikePost(userID, postID int) error {
	query := `
		INSERT INTO likes (user_id, post_id, created_at)
		VALUES (?, ?, ?)
	`

	now := time.Now()
	_, err := lr.db.Exec(query, userID, postID, now)
	if err != nil {
		// Check if it's a duplicate key error (user already liked this post)
		if err.Error() == "UNIQUE constraint failed: likes.user_id, likes.post_id" {
			return fmt.Errorf("user has already liked this post")
		}
		return fmt.Errorf("failed to like post: %w", err)
	}

	return nil
}

// UnlikePost removes a like from a post
func (lr *LikeRepository) UnlikePost(userID, postID int) error {
	query := `
		DELETE FROM likes
		WHERE user_id = ? AND post_id = ?
	`

	result, err := lr.db.Exec(query, userID, postID)
	if err != nil {
		return fmt.Errorf("failed to unlike post: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("like not found")
	}

	return nil
}

// IsPostLikedByUser checks if a user has liked a specific post
func (lr *LikeRepository) IsPostLikedByUser(userID, postID int) (bool, error) {
	var count int
	query := `
		SELECT COUNT(*) FROM likes
		WHERE user_id = ? AND post_id = ?
	`

	err := lr.db.QueryRow(query, userID, postID).Scan(&count)
	if err != nil {
		return false, fmt.Errorf("failed to check if post is liked: %w", err)
	}

	return count > 0, nil
}

// ToggleLike adds or removes a like from a post and returns the new liked status
func (lr *LikeRepository) ToggleLike(userID, postID int) (bool, error) {
	liked, err := lr.IsPostLikedByUser(userID, postID)
	if err != nil {
		return false, fmt.Errorf("failed to check if post is liked: %w", err)
	}

	if liked {
		// Already liked, so unlike it
		err = lr.UnlikePost(userID, postID)
		if err != nil {
			return true, fmt.Errorf("failed to unlike post: %w", err)
		}
		return false, nil // New status is unliked
	}

	// Not liked, so like it
	err = lr.LikePost(userID, postID)
	if err != nil {
		return false, fmt.Errorf("failed to like post: %w", err)
	}
	return true, nil // New status is liked
}

// GetLikeCount gets the total number of likes for a post
func (lr *LikeRepository) GetLikeCount(postID int) (int, error) {
	var count int
	query := `
		SELECT COUNT(*) FROM likes
		WHERE post_id = ?
	`

	err := lr.db.QueryRow(query, postID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to get likes count: %w", err)
	}

	return count, nil
}

// GetPostLikes gets users who liked a specific post
func (lr *LikeRepository) GetPostLikes(postID int, limit, offset int) ([]*UserResponse, error) {
	query := `
		SELECT u.id, u.email, u.first_name, u.last_name, u.date_of_birth, u.nickname, u.about_me, u.avatar_path, u.cover_path, u.is_public, u.created_at
		FROM likes l
		JOIN users u ON l.user_id = u.id
		WHERE l.post_id = ?
		ORDER BY l.created_at DESC
		LIMIT ? OFFSET ?
	`

	rows, err := lr.db.Query(query, postID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to get post likes: %w", err)
	}
	defer rows.Close()

	var users []*UserResponse
	for rows.Next() {
		user := &User{}

		err := rows.Scan(
			&user.ID, &user.Email, &user.FirstName, &user.LastName, &user.DateOfBirth,
			&user.Nickname, &user.AboutMe, &user.AvatarPath, &user.CoverPath, &user.IsPublic, &user.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan user: %w", err)
		}

		users = append(users, user.ToResponse())
	}

	return users, nil
}
