// backend/pkg/models/group_posts.go
package models

import (
	"database/sql"
	"fmt"
	"strings"
	"time"
)

type GroupPostRepository struct {
	db *sql.DB
}

type GroupPost struct {
	ID           int
	GroupID      int
	UserID       int
	Content      string
	ImagePath    *string
	CreatedAt    time.Time
	UpdatedAt    time.Time
	Author       *UserResponse
	CommentCount int
	CanComment   bool
}

func NewGroupPostRepository(db *sql.DB) *GroupPostRepository {
	return &GroupPostRepository{db: db}
}

// CreateGroupPost creates a new post in a group
func (gpr *GroupPostRepository) CreateGroupPost(groupID, userID int, req *CreateGroupPostRequest) (*GroupPost, error) {
	// Validate content
	if strings.TrimSpace(req.Content) == "" && req.ImagePath == nil {
		return nil, fmt.Errorf("post must have content or image")
	}

	query := `
		INSERT INTO group_posts (group_id, user_id, content, image_path, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?)
		RETURNING id, created_at, updated_at
	`

	now := time.Now()
	post := &GroupPost{
		GroupID:   groupID,
		UserID:    userID,
		Content:   strings.TrimSpace(req.Content),
		ImagePath: req.ImagePath,
		CreatedAt: now,
		UpdatedAt: now,
	}

	err := gpr.db.QueryRow(query,
		post.GroupID,
		post.UserID,
		post.Content,
		post.ImagePath,
		post.CreatedAt,
		post.UpdatedAt,
	).Scan(&post.ID, &post.CreatedAt, &post.UpdatedAt)

	if err != nil {
		return nil, fmt.Errorf("failed to create group post: %w", err)
	}

	return post, nil
}

// GetGroupPosts gets posts for a group
func (gpr *GroupPostRepository) GetGroupPosts(groupID int, limit, offset int) ([]*GroupPost, error) {
	query := `
		SELECT gp.id, gp.group_id, gp.user_id, gp.content, gp.image_path, gp.created_at, gp.updated_at,
		       u.id, u.email, u.first_name, u.last_name, u.date_of_birth, u.nickname, u.about_me, u.avatar_path, u.is_public, u.created_at,
		       (SELECT COUNT(*) FROM group_post_comments WHERE group_post_id = gp.id) as comment_count
		FROM group_posts gp
		JOIN users u ON gp.user_id = u.id
		WHERE gp.group_id = ?
		ORDER BY gp.created_at DESC
		LIMIT ? OFFSET ?
	`

	rows, err := gpr.db.Query(query, groupID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to get group posts: %w", err)
	}
	defer rows.Close()

	var posts []*GroupPost
	for rows.Next() {
		post := &GroupPost{}
		author := &User{}

		err := rows.Scan(
			&post.ID, &post.GroupID, &post.UserID, &post.Content, &post.ImagePath, &post.CreatedAt, &post.UpdatedAt,
			&author.ID, &author.Email, &author.FirstName, &author.LastName, &author.DateOfBirth, &author.Nickname, &author.AboutMe, &author.AvatarPath, &author.IsPublic, &author.CreatedAt,
			&post.CommentCount,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan group post: %w", err)
		}

		post.Author = author.ToResponse()
		post.CanComment = true // Group members can always comment

		posts = append(posts, post)
	}

	return posts, nil
}

// GetGroupPost gets a single group post
func (gpr *GroupPostRepository) GetGroupPost(postID int) (*GroupPost, error) {
	query := `
		SELECT gp.id, gp.group_id, gp.user_id, gp.content, gp.image_path, gp.created_at, gp.updated_at,
		       u.id, u.email, u.first_name, u.last_name, u.date_of_birth, u.nickname, u.about_me, u.avatar_path, u.is_public, u.created_at,
		       (SELECT COUNT(*) FROM group_post_comments WHERE group_post_id = gp.id) as comment_count
		FROM group_posts gp
		JOIN users u ON gp.user_id = u.id
		WHERE gp.id = ?
	`

	post := &GroupPost{}
	author := &User{}

	err := gpr.db.QueryRow(query, postID).Scan(
		&post.ID, &post.GroupID, &post.UserID, &post.Content, &post.ImagePath, &post.CreatedAt, &post.UpdatedAt,
		&author.ID, &author.Email, &author.FirstName, &author.LastName, &author.DateOfBirth, &author.Nickname, &author.AboutMe, &author.AvatarPath, &author.IsPublic, &author.CreatedAt,
		&post.CommentCount,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("group post not found")
		}
		return nil, fmt.Errorf("failed to get group post: %w", err)
	}

	post.Author = author.ToResponse()
	post.CanComment = true

	return post, nil
}

// DeleteGroupPost deletes a group post
func (gpr *GroupPostRepository) DeleteGroupPost(postID, userID int) error {
	query := `DELETE FROM group_posts WHERE id = ? AND user_id = ?`

	result, err := gpr.db.Exec(query, postID, userID)
	if err != nil {
		return fmt.Errorf("failed to delete group post: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("group post not found or insufficient permissions")
	}

	return nil
}

// UpdateGroupPost updates a group post
func (gpr *GroupPostRepository) UpdateGroupPost(postID, userID int, content string) (*GroupPost, error) {
	// First check if the post exists and belongs to the user
	query := `
	SELECT id, group_id, user_id, content, image_path, created_at, updated_at 
	FROM group_posts 
	WHERE id = ? AND user_id = ?`

	var existingPost GroupPost
	err := gpr.db.QueryRow(query, postID, userID).Scan(
		&existingPost.ID, &existingPost.GroupID, &existingPost.UserID, &existingPost.Content, &existingPost.ImagePath, &existingPost.CreatedAt, &existingPost.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("group post not found or not authorized")
		}
		return nil, fmt.Errorf("failed to get group post: %w", err)
	}

	// Update the post
	updateQuery := `UPDATE group_posts SET content = ?, updated_at = ? WHERE id = ? AND user_id = ?`

	now := time.Now()
	result, err := gpr.db.Exec(updateQuery, content, now, postID, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to update group post: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return nil, fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return nil, fmt.Errorf("group post not found or not authorized")
	}

	// Get the updated post with author information
	return gpr.GetGroupPost(postID)
}

// CreateGroupComment creates a comment on a group post
func (gpr *GroupPostRepository) CreateGroupComment(postID, userID int, req *CreateGroupCommentRequest) (*GroupPostComment, error) {
	// Validate content
	if strings.TrimSpace(req.Content) == "" && req.ImagePath == nil {
		return nil, fmt.Errorf("comment must have content or image")
	}

	query := `
		INSERT INTO group_post_comments (group_post_id, user_id, content, image_path, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?)
		RETURNING id, created_at, updated_at
	`

	now := time.Now()
	comment := &GroupPostComment{
		BaseModel: BaseModel{
			CreatedAt: now,
			UpdatedAt: now,
		},
		GroupPostID: postID,
		UserID:      userID,
		Content:     strings.TrimSpace(req.Content),
		ImagePath:   req.ImagePath,
	}

	err := gpr.db.QueryRow(query,
		comment.GroupPostID,
		comment.UserID,
		comment.Content,
		comment.ImagePath,
		comment.CreatedAt,
		comment.UpdatedAt,
	).Scan(&comment.ID, &comment.CreatedAt, &comment.UpdatedAt)

	if err != nil {
		return nil, fmt.Errorf("failed to create group comment: %w", err)
	}

	return comment, nil
}

// GetGroupComments gets comments for a group post
func (gpr *GroupPostRepository) GetGroupComments(postID int, limit, offset int) ([]*GroupPostComment, error) {
	query := `
		SELECT gpc.id, gpc.group_post_id, gpc.user_id, gpc.content, gpc.image_path, gpc.created_at, gpc.updated_at,
		       u.id, u.email, u.first_name, u.last_name, u.date_of_birth, u.nickname, u.about_me, u.avatar_path, u.is_public, u.created_at
		FROM group_post_comments gpc
		JOIN users u ON gpc.user_id = u.id
		WHERE gpc.group_post_id = ?
		ORDER BY gpc.created_at ASC
		LIMIT ? OFFSET ?
	`

	rows, err := gpr.db.Query(query, postID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to get group comments: %w", err)
	}
	defer rows.Close()

	var comments []*GroupPostComment
	for rows.Next() {
		comment := &GroupPostComment{}
		author := &User{}

		err := rows.Scan(
			&comment.ID, &comment.GroupPostID, &comment.UserID, &comment.Content, &comment.ImagePath, &comment.CreatedAt, &comment.UpdatedAt,
			&author.ID, &author.Email, &author.FirstName, &author.LastName, &author.DateOfBirth, &author.Nickname, &author.AboutMe, &author.AvatarPath, &author.IsPublic, &author.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan group comment: %w", err)
		}

		comment.Author = author.ToResponse()
		comments = append(comments, comment)
	}

	return comments, nil
}
