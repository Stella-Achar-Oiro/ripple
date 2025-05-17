package models

import (
	"database/sql"
	"time"

	"github.com/google/uuid"
)

type Comment struct {
	ID        string    `json:"id"`
	PostID    string    `json:"postId"`
	UserID    string    `json:"userId"`
	Content   string    `json:"content"`
	ImagePath string    `json:"imagePath,omitempty"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
	// Fields populated on fetch
	User      *User     `json:"user,omitempty"`
}

type CommentRepository struct {
	DB *sql.DB
}

func NewCommentRepository(db *sql.DB) *CommentRepository {
	return &CommentRepository{DB: db}
}

// CreateComment creates a new comment in the database
func (r *CommentRepository) CreateComment(comment *Comment) error {
	if comment.ID == "" {
		comment.ID = uuid.New().String()
	}
	
	now := time.Now()
	comment.CreatedAt = now
	comment.UpdatedAt = now
	
	_, err := r.DB.Exec(
		"INSERT INTO comments (id, post_id, user_id, content, image_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
		comment.ID, comment.PostID, comment.UserID, comment.Content, comment.ImagePath, comment.CreatedAt, comment.UpdatedAt,
	)
	
	return err
}

// GetCommentsByPostID retrieves all comments for a specific post
func (r *CommentRepository) GetCommentsByPostID(postID string) ([]*Comment, error) {
	rows, err := r.DB.Query(
		`SELECT c.id, c.post_id, c.user_id, c.content, c.image_path, c.created_at, c.updated_at,
		 u.id, u.first_name, u.last_name, u.avatar_path
		 FROM comments c
		 JOIN users u ON c.user_id = u.id
		 WHERE c.post_id = ?
		 ORDER BY c.created_at ASC`,
		postID,
	)
	
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	var comments []*Comment
	
	for rows.Next() {
		comment := &Comment{User: &User{}}
		
		err := rows.Scan(
			&comment.ID, &comment.PostID, &comment.UserID, &comment.Content, &comment.ImagePath, &comment.CreatedAt, &comment.UpdatedAt,
			&comment.User.ID, &comment.User.FirstName, &comment.User.LastName, &comment.User.AvatarPath,
		)
		
		if err != nil {
			return nil, err
		}
		
		comments = append(comments, comment)
	}
	
	if err = rows.Err(); err != nil {
		return nil, err
	}
	
	return comments, nil
}

// GetCommentByID retrieves a comment by its ID
func (r *CommentRepository) GetCommentByID(commentID string) (*Comment, error) {
	comment := &Comment{User: &User{}}
	
	err := r.DB.QueryRow(
		`SELECT c.id, c.post_id, c.user_id, c.content, c.image_path, c.created_at, c.updated_at,
		 u.id, u.first_name, u.last_name, u.avatar_path
		 FROM comments c
		 JOIN users u ON c.user_id = u.id
		 WHERE c.id = ?`,
		commentID,
	).Scan(
		&comment.ID, &comment.PostID, &comment.UserID, &comment.Content, &comment.ImagePath, &comment.CreatedAt, &comment.UpdatedAt,
		&comment.User.ID, &comment.User.FirstName, &comment.User.LastName, &comment.User.AvatarPath,
	)
	
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	
	return comment, nil
}

// UpdateComment updates a comment in the database
func (r *CommentRepository) UpdateComment(comment *Comment) error {
	comment.UpdatedAt = time.Now()
	
	_, err := r.DB.Exec(
		"UPDATE comments SET content = ?, image_path = ?, updated_at = ? WHERE id = ? AND user_id = ?",
		comment.Content, comment.ImagePath, comment.UpdatedAt, comment.ID, comment.UserID,
	)
	
	return err
}

// DeleteComment deletes a comment from the database
func (r *CommentRepository) DeleteComment(commentID, userID string) error {
	_, err := r.DB.Exec("DELETE FROM comments WHERE id = ? AND user_id = ?", commentID, userID)
	return err
}