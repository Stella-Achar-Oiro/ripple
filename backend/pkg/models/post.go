// backend/pkg/models/post.go
package models

import (
	"database/sql"
	"fmt"
	"ripple/pkg/constants"
	"strings"
	"time"
)

type PostRepository struct {
	db *sql.DB
}

func NewPostRepository(db *sql.DB) *PostRepository {
	return &PostRepository{db: db}
}

type Post struct {
	BaseModel
	UserID       int       `json:"user_id" db:"user_id"`
	Content      string    `json:"content" db:"content"`
	ImagePath    *string   `json:"image_path" db:"image_path"`
	PrivacyLevel string    `json:"privacy_level" db:"privacy_level"`
	CreatedAt    time.Time `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time `json:"updated_at" db:"updated_at"`

	// Joined fields
	Author       *UserResponse `json:"author,omitempty"`
	CommentCount int           `json:"comment_count"`
	LikesCount   int           `json:"likes_count"`
	CanView      bool          `json:"can_view"`
	CanComment   bool          `json:"can_comment"`
}

type Comment struct {
	BaseModel
	PostID    int       `json:"post_id" db:"post_id"`
	UserID    int       `json:"user_id" db:"user_id"`
	Content   string    `json:"content" db:"content"`
	ImagePath *string   `json:"image_path" db:"image_path"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`

	// Joined fields
	Author *UserResponse `json:"author,omitempty"`
}

type CreatePostRequest struct {
	Content      string  `json:"content"`
	ImagePath    *string `json:"image_path"`
	PrivacyLevel string  `json:"privacy_level"`
	AllowedUsers []int   `json:"allowed_users,omitempty"` // For private posts
}

type CreateCommentRequest struct {
	PostID    int     `json:"postId"`
	Content   string  `json:"content"`
	ImagePath *string `json:"image_path"`
}

type FeedOptions struct {
	UserID int
	Limit  int
	Offset int
}

// CreatePost creates a new post
func (pr *PostRepository) CreatePost(userID int, req *CreatePostRequest) (*Post, error) {
	// Validate privacy level
	validPrivacyLevels := map[string]bool{
		constants.PrivacyPublic:        true,
		constants.PrivacyAlmostPrivate: true,
		constants.PrivacyPrivate:       true,
	}

	if !validPrivacyLevels[req.PrivacyLevel] {
		return nil, fmt.Errorf("invalid privacy level")
	}

	// Validate content
	if strings.TrimSpace(req.Content) == "" && req.ImagePath == nil {
		return nil, fmt.Errorf("post must have content or image")
	}

	tx, err := pr.db.Begin()
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	// Create post
	query := `
		INSERT INTO posts (user_id, content, image_path, privacy_level, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?)
		RETURNING id, created_at, updated_at
	`

	now := time.Now()
	post := &Post{
		UserID:       userID,
		Content:      strings.TrimSpace(req.Content),
		ImagePath:    req.ImagePath,
		PrivacyLevel: req.PrivacyLevel,
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	err = tx.QueryRow(query,
		post.UserID,
		post.Content,
		post.ImagePath,
		post.PrivacyLevel,
		post.CreatedAt,
		post.UpdatedAt,
	).Scan(&post.ID, &post.CreatedAt, &post.UpdatedAt)

	if err != nil {
		return nil, fmt.Errorf("failed to create post: %w", err)
	}

	// If private post, add allowed users to post_privacy table
	if req.PrivacyLevel == constants.PrivacyPrivate && len(req.AllowedUsers) > 0 {
		for _, allowedUserID := range req.AllowedUsers {
			privacyQuery := `
				INSERT INTO post_privacy (post_id, user_id, created_at)
				VALUES (?, ?, ?)
			`
			_, err = tx.Exec(privacyQuery, post.ID, allowedUserID, now)
			if err != nil {
				return nil, fmt.Errorf("failed to set post privacy: %w", err)
			}
		}
	}

	if err = tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return post, nil
}

// GetPost gets a single post by ID with privacy checks
func (pr *PostRepository) GetPost(postID, viewerID int) (*Post, error) {
	query := `
		SELECT p.id, p.user_id, p.content, p.image_path, p.privacy_level, p.created_at, p.updated_at,
		       u.id, u.email, u.first_name, u.last_name, u.date_of_birth, u.nickname, u.about_me, u.avatar_path, u.cover_path, u.is_public, u.created_at,
		       (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
		       (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes_count
		FROM posts p
		JOIN users u ON p.user_id = u.id
		WHERE p.id = ?
	`

	post := &Post{}
	author := &User{}

	err := pr.db.QueryRow(query, postID).Scan(
		&post.ID, &post.UserID, &post.Content, &post.ImagePath, &post.PrivacyLevel, &post.CreatedAt, &post.UpdatedAt,
		&author.ID, &author.Email, &author.FirstName, &author.LastName, &author.DateOfBirth, &author.Nickname, &author.AboutMe, &author.AvatarPath, &author.CoverPath, &author.IsPublic, &author.CreatedAt,
		&post.CommentCount, &post.LikesCount,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("post not found")
		}
		return nil, fmt.Errorf("failed to get post: %w", err)
	}

	post.Author = author.ToResponse()

	// Check privacy permissions
	canView, err := pr.CanViewPost(post, viewerID)
	if err != nil {
		return nil, fmt.Errorf("failed to check view permissions: %w", err)
	}

	post.CanView = canView
	post.CanComment = canView // For now, same as view permission

	if !canView {
		return nil, fmt.Errorf("insufficient permissions to view post")
	}

	return post, nil
}

// GetFeed gets posts for user's feed based on following relationships
func (pr *PostRepository) GetFeed(options *FeedOptions) ([]*Post, error) {
	query := `
		SELECT p.id, p.user_id, p.content, p.image_path, p.privacy_level, p.created_at, p.updated_at,
		       u.id, u.email, u.first_name, u.last_name, u.date_of_birth, u.nickname, u.about_me, u.avatar_path, u.cover_path, u.is_public, u.created_at,
		       (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
		       (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes_count
		FROM posts p
		JOIN users u ON p.user_id = u.id
		WHERE (
			-- Public posts
			p.privacy_level = ? OR
			-- User's own posts
			p.user_id = ? OR
			-- Almost private posts from followed users
			(p.privacy_level = ? AND p.user_id IN (
				SELECT following_id FROM follows
				WHERE follower_id = ? AND status = ?
			)) OR
			-- Private posts where user is explicitly allowed
			(p.privacy_level = ? AND p.id IN (
				SELECT post_id FROM post_privacy WHERE user_id = ?
			))
		)
		ORDER BY p.created_at DESC
		LIMIT ? OFFSET ?
	`

	rows, err := pr.db.Query(query,
		constants.PrivacyPublic,
		options.UserID,
		constants.PrivacyAlmostPrivate,
		options.UserID,
		constants.FollowStatusAccepted,
		constants.PrivacyPrivate,
		options.UserID,
		options.Limit,
		options.Offset,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to get feed: %w", err)
	}
	defer rows.Close()

	var posts []*Post
	for rows.Next() {
		post := &Post{}
		author := &User{}

		err := rows.Scan(
			&post.ID, &post.UserID, &post.Content, &post.ImagePath, &post.PrivacyLevel, &post.CreatedAt, &post.UpdatedAt,
			&author.ID, &author.Email, &author.FirstName, &author.LastName, &author.DateOfBirth, &author.Nickname, &author.AboutMe, &author.AvatarPath, &author.CoverPath, &author.IsPublic, &author.CreatedAt,
			&post.CommentCount, &post.LikesCount,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan post: %w", err)
		}

		post.Author = author.ToResponse()
		post.CanView = true // These posts are already filtered for visibility
		post.CanComment = true

		posts = append(posts, post)
	}

	return posts, nil
}

// GetUserPosts gets posts by a specific user with privacy checks
func (pr *PostRepository) GetUserPosts(userID, viewerID int, limit, offset int) ([]*Post, error) {
	query := `
		SELECT p.id, p.user_id, p.content, p.image_path, p.privacy_level, p.created_at, p.updated_at,
		       u.id, u.email, u.first_name, u.last_name, u.date_of_birth, u.nickname, u.about_me, u.avatar_path, u.is_public, u.created_at,
		       (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
		       (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes_count
		FROM posts p
		JOIN users u ON p.user_id = u.id
		WHERE p.user_id = ?
		ORDER BY p.created_at DESC
		LIMIT ? OFFSET ?
	`

	rows, err := pr.db.Query(query, userID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to get user posts: %w", err)
	}
	defer rows.Close()

	var posts []*Post
	for rows.Next() {
		post := &Post{}
		author := &User{}

		err := rows.Scan(
			&post.ID, &post.UserID, &post.Content, &post.ImagePath, &post.PrivacyLevel, &post.CreatedAt, &post.UpdatedAt,
			&author.ID, &author.Email, &author.FirstName, &author.LastName, &author.DateOfBirth, &author.Nickname, &author.AboutMe, &author.AvatarPath, &author.IsPublic, &author.CreatedAt,
			&post.CommentCount, &post.LikesCount,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan post: %w", err)
		}

		post.Author = author.ToResponse()

		// Check if viewer can see this post
		canView, err := pr.CanViewPost(post, viewerID)
		if err != nil {
			return nil, fmt.Errorf("failed to check view permissions: %w", err)
		}

		post.CanView = canView
		post.CanComment = canView

		// Only include posts the viewer can see
		if canView {
			posts = append(posts, post)
		}
	}

	return posts, nil
}

// CanViewPost checks if a user can view a specific post
func (pr *PostRepository) CanViewPost(post *Post, viewerID int) (bool, error) {
	// Author can always view their own posts
	if post.UserID == viewerID {
		return true, nil
	}

	switch post.PrivacyLevel {
	case constants.PrivacyPublic:
		return true, nil

	case constants.PrivacyAlmostPrivate:
		// Check if viewer follows the author
		var count int
		err := pr.db.QueryRow(`
			SELECT COUNT(*) FROM follows 
			WHERE follower_id = ? AND following_id = ? AND status = ?
		`, viewerID, post.UserID, constants.FollowStatusAccepted).Scan(&count)

		if err != nil {
			return false, fmt.Errorf("failed to check follow status: %w", err)
		}

		return count > 0, nil

	case constants.PrivacyPrivate:
		// Check if viewer is in the allowed users list
		var count int
		err := pr.db.QueryRow(`
			SELECT COUNT(*) FROM post_privacy 
			WHERE post_id = ? AND user_id = ?
		`, post.ID, viewerID).Scan(&count)

		if err != nil {
			return false, fmt.Errorf("failed to check post privacy: %w", err)
		}

		return count > 0, nil

	default:
		return false, nil
	}
}

// DeletePost deletes a post (only by author)
func (pr *PostRepository) DeletePost(postID, userID int) error {
	query := `DELETE FROM posts WHERE id = ? AND user_id = ?`

	result, err := pr.db.Exec(query, postID, userID)
	if err != nil {
		return fmt.Errorf("failed to delete post: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("post not found or insufficient permissions")
	}

	return nil
}

// CreateComment creates a new comment on a post
func (pr *PostRepository) CreateComment(userID int, req *CreateCommentRequest) (*Comment, error) {
	// First, check if the user is allowed to comment on this post
	post, err := pr.GetPost(req.PostID, userID)
	if err != nil {
		return nil, fmt.Errorf("post not found or inaccessible: %w", err)
	}

	if !post.CanComment {
		return nil, fmt.Errorf("user not authorized to comment on this post")
	}

	query := `
		INSERT INTO comments (post_id, user_id, content, image_path, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?)
		RETURNING id, created_at, updated_at
	`

	now := time.Now()
	comment := &Comment{
		PostID:    req.PostID,
		UserID:    userID,
		Content:   req.Content,
		ImagePath: req.ImagePath,
		CreatedAt: now,
		UpdatedAt: now,
	}

	err = pr.db.QueryRow(query,
		comment.PostID,
		comment.UserID,
		comment.Content,
		comment.ImagePath,
		comment.CreatedAt,
		comment.UpdatedAt,
	).Scan(&comment.ID, &comment.CreatedAt, &comment.UpdatedAt)

	if err != nil {
		return nil, fmt.Errorf("failed to create comment: %w", err)
	}

	// Fetch author details for the response
	author, err := NewUserRepository(pr.db).GetUserByID(userID)
	if err == nil {
		comment.Author = author.ToResponse()
	}

	return comment, nil
}

// GetComments gets all comments for a post
func (pr *PostRepository) GetComments(postID, viewerID int, limit, offset int) ([]*Comment, error) {
	// First check if user can view the post
	_, err := pr.GetPost(postID, viewerID)
	if err != nil {
		return nil, fmt.Errorf("cannot view comments: %w", err)
	}

	query := `
		SELECT c.id, c.post_id, c.user_id, c.content, c.image_path, c.created_at, c.updated_at,
		       u.id, u.email, u.first_name, u.last_name, u.date_of_birth, u.nickname, u.about_me, u.avatar_path, u.cover_path, u.is_public, u.created_at
		FROM comments c
		JOIN users u ON c.user_id = u.id
		WHERE c.post_id = ?
		ORDER BY c.created_at ASC
		LIMIT ? OFFSET ?
	`

	rows, err := pr.db.Query(query, postID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to get comments: %w", err)
	}
	defer rows.Close()

	var comments []*Comment
	for rows.Next() {
		comment := &Comment{}
		author := &User{}

		err := rows.Scan(
			&comment.ID, &comment.PostID, &comment.UserID, &comment.Content, &comment.ImagePath, &comment.CreatedAt, &comment.UpdatedAt,
			&author.ID, &author.Email, &author.FirstName, &author.LastName, &author.DateOfBirth, &author.Nickname, &author.AboutMe, &author.AvatarPath, &author.CoverPath, &author.IsPublic, &author.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan comment: %w", err)
		}

		comment.Author = author.ToResponse()
		comments = append(comments, comment)
	}

	return comments, nil
}

// GetPostCount gets the number of posts by a user
func (pr *PostRepository) GetPostCount(userID int) (int, error) {
	var count int
	err := pr.db.QueryRow(`
		SELECT COUNT(*) FROM posts WHERE user_id = ?
	`, userID).Scan(&count)

	if err != nil {
		return 0, fmt.Errorf("failed to get post count: %w", err)
	}

	return count, nil
}

// DeleteComment deletes a comment (only by author or post author)
func (pr *PostRepository) DeleteComment(commentID, userID int) error {
	query := `
		DELETE FROM comments 
		WHERE id = ? AND (
			user_id = ? OR 
			post_id IN (SELECT id FROM posts WHERE user_id = ?)
		)
	`

	result, err := pr.db.Exec(query, commentID, userID, userID)
	if err != nil {
		return fmt.Errorf("failed to delete comment: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("comment not found or insufficient permissions")
	}

	return nil
}

// UpdatePost updates the content of an existing post after verifying ownership
func (pr *PostRepository) UpdatePost(userID, postID int, content string) (*Post, error) {
	// First, get the post to verify ownership
	post := &Post{}
	err := pr.db.QueryRow("SELECT user_id FROM posts WHERE id = ?", postID).Scan(&post.UserID)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("post not found")
		}
		return nil, fmt.Errorf("failed to query post for update: %w", err)
	}

	// Check if the user is the owner of the post
	if post.UserID != userID {
		return nil, fmt.Errorf("user not authorized to edit this post")
	}

	// Update the post content
	query := `
		UPDATE posts
		SET content = ?, updated_at = ?
		WHERE id = ?
	`
	now := time.Now()
	_, err = pr.db.Exec(query, content, now, postID)
	if err != nil {
		return nil, fmt.Errorf("failed to update post: %w", err)
	}

	// Return the updated post
	return pr.GetPost(postID, userID)
}
