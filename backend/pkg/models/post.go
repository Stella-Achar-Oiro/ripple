package models

import (
	"database/sql"
	"time"

	"github.com/google/uuid"
)

type Post struct {
	ID          string    `json:"id"`
	UserID      string    `json:"userId"`
	Content     string    `json:"content"`
	ImagePath   string    `json:"imagePath,omitempty"`
	Privacy     string    `json:"privacy"` // public, almost_private, private
	GroupID     string    `json:"groupId,omitempty"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
	// Fields populated on fetch
	User        *User     `json:"user,omitempty"`
	LikesCount  int       `json:"likesCount,omitempty"`
	CommentsCount int     `json:"commentsCount,omitempty"`
	IsLiked     bool      `json:"isLiked,omitempty"`
}

type PostLike struct {
	ID        string    `json:"id"`
	PostID    string    `json:"postId"`
	UserID    string    `json:"userId"`
	CreatedAt time.Time `json:"createdAt"`
}

type PostRepository struct {
	DB *sql.DB
}

func NewPostRepository(db *sql.DB) *PostRepository {
	return &PostRepository{DB: db}
}

// CreatePost creates a new post in the database
func (r *PostRepository) CreatePost(post *Post) error {
	if post.ID == "" {
		post.ID = uuid.New().String()
	}
	
	now := time.Now()
	post.CreatedAt = now
	post.UpdatedAt = now
	
	_, err := r.DB.Exec(
		"INSERT INTO posts (id, user_id, content, image_path, privacy, group_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
		post.ID, post.UserID, post.Content, post.ImagePath, post.Privacy, post.GroupID, post.CreatedAt, post.UpdatedAt,
	)
	
	return err
}

// GetPostByID retrieves a post by its ID
func (r *PostRepository) GetPostByID(postID string) (*Post, error) {
	post := &Post{}
	
	err := r.DB.QueryRow(
		`SELECT p.id, p.user_id, p.content, p.image_path, p.privacy, p.group_id, p.created_at, p.updated_at,
		 u.id, u.first_name, u.last_name, u.avatar_path
		 FROM posts p
		 JOIN users u ON p.user_id = u.id
		 WHERE p.id = ?`,
		postID,
	).Scan(
		&post.ID, &post.UserID, &post.Content, &post.ImagePath, &post.Privacy, &post.GroupID, &post.CreatedAt, &post.UpdatedAt,
		&post.User.ID, &post.User.FirstName, &post.User.LastName, &post.User.AvatarPath,
	)
	
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	
	// Get likes count
	err = r.DB.QueryRow("SELECT COUNT(*) FROM post_likes WHERE post_id = ?", postID).Scan(&post.LikesCount)
	if err != nil {
		return nil, err
	}
	
	// Get comments count
	err = r.DB.QueryRow("SELECT COUNT(*) FROM comments WHERE post_id = ?", postID).Scan(&post.CommentsCount)
	if err != nil {
		return nil, err
	}
	
	return post, nil
}

// GetUserPosts retrieves posts by a specific user
func (r *PostRepository) GetUserPosts(userID string, limit, offset int) ([]*Post, error) {
	rows, err := r.DB.Query(
		`SELECT p.id, p.user_id, p.content, p.image_path, p.privacy, p.group_id, p.created_at, p.updated_at,
		 u.id, u.first_name, u.last_name, u.avatar_path
		 FROM posts p
		 JOIN users u ON p.user_id = u.id
		 WHERE p.user_id = ?
		 ORDER BY p.created_at DESC
		 LIMIT ? OFFSET ?`,
		userID, limit, offset,
	)
	
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	var posts []*Post
	
	for rows.Next() {
		post := &Post{User: &User{}}
		
		err := rows.Scan(
			&post.ID, &post.UserID, &post.Content, &post.ImagePath, &post.Privacy, &post.GroupID, &post.CreatedAt, &post.UpdatedAt,
			&post.User.ID, &post.User.FirstName, &post.User.LastName, &post.User.AvatarPath,
		)
		
		if err != nil {
			return nil, err
		}
		
		// Get likes count
		err = r.DB.QueryRow("SELECT COUNT(*) FROM post_likes WHERE post_id = ?", post.ID).Scan(&post.LikesCount)
		if err != nil {
			return nil, err
		}
		
		// Get comments count
		err = r.DB.QueryRow("SELECT COUNT(*) FROM comments WHERE post_id = ?", post.ID).Scan(&post.CommentsCount)
		if err != nil {
			return nil, err
		}
		
		posts = append(posts, post)
	}
	
	if err = rows.Err(); err != nil {
		return nil, err
	}
	
	return posts, nil
}

// GetFeedPosts retrieves posts for a user's feed based on followed users and privacy settings
func (r *PostRepository) GetFeedPosts(userID string, limit, offset int) ([]*Post, error) {
	// Complex query to get posts from:
	// 1. Public posts from any user
	// 2. Almost_private posts from users the current user follows
	// 3. Private posts specifically shared with the current user
	// 4. All posts by the current user
	rows, err := r.DB.Query(
		`SELECT p.id, p.user_id, p.content, p.image_path, p.privacy, p.group_id, p.created_at, p.updated_at,
		 u.id, u.first_name, u.last_name, u.avatar_path
		 FROM posts p
		 JOIN users u ON p.user_id = u.id
		 LEFT JOIN followers f ON p.user_id = f.followed_id AND f.follower_id = ? AND f.status = 'accepted'
		 LEFT JOIN post_privacy pp ON p.id = pp.post_id AND pp.user_id = ?
		 WHERE p.user_id = ? 
		   OR (p.privacy = 'public')
		   OR (p.privacy = 'almost_private' AND f.follower_id IS NOT NULL)
		   OR (p.privacy = 'private' AND pp.user_id IS NOT NULL)
		 ORDER BY p.created_at DESC
		 LIMIT ? OFFSET ?`,
		userID, userID, userID, limit, offset,
	)
	
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	var posts []*Post
	
	for rows.Next() {
		post := &Post{User: &User{}}
		
		err := rows.Scan(
			&post.ID, &post.UserID, &post.Content, &post.ImagePath, &post.Privacy, &post.GroupID, &post.CreatedAt, &post.UpdatedAt,
			&post.User.ID, &post.User.FirstName, &post.User.LastName, &post.User.AvatarPath,
		)
		
		if err != nil {
			return nil, err
		}
		
		// Get likes count
		err = r.DB.QueryRow("SELECT COUNT(*) FROM post_likes WHERE post_id = ?", post.ID).Scan(&post.LikesCount)
		if err != nil {
			return nil, err
		}
		
		// Get comments count
		err = r.DB.QueryRow("SELECT COUNT(*) FROM comments WHERE post_id = ?", post.ID).Scan(&post.CommentsCount)
		if err != nil {
			return nil, err
		}
		
		posts = append(posts, post)
	}
	
	if err = rows.Err(); err != nil {
		return nil, err
	}
	
	return posts, nil
}

// UpdatePost updates a post in the database
func (r *PostRepository) UpdatePost(post *Post) error {
	post.UpdatedAt = time.Now()
	
	_, err := r.DB.Exec(
		"UPDATE posts SET content = ?, image_path = ?, privacy = ?, updated_at = ? WHERE id = ? AND user_id = ?",
		post.Content, post.ImagePath, post.Privacy, post.UpdatedAt, post.ID, post.UserID,
	)
	
	return err
}

// DeletePost deletes a post from the database
func (r *PostRepository) DeletePost(postID, userID string) error {
	_, err := r.DB.Exec("DELETE FROM posts WHERE id = ? AND user_id = ?", postID, userID)
	return err
}

// LikePost adds a like to a post
func (r *PostRepository) LikePost(postID, userID string) error {
	// Check if already liked
	var count int
	err := r.DB.QueryRow("SELECT COUNT(*) FROM post_likes WHERE post_id = ? AND user_id = ?", postID, userID).Scan(&count)
	if err != nil {
		return err
	}
	
	if count > 0 {
		// Already liked, do nothing
		return nil
	}
	
	// Add like
	likeID := uuid.New().String()
	now := time.Now()
	
	_, err = r.DB.Exec(
		"INSERT INTO post_likes (id, post_id, user_id, created_at) VALUES (?, ?, ?, ?)",
		likeID, postID, userID, now,
	)
	
	return err
}

// UnlikePost removes a like from a post
func (r *PostRepository) UnlikePost(postID, userID string) error {
	_, err := r.DB.Exec("DELETE FROM post_likes WHERE post_id = ? AND user_id = ?", postID, userID)
	return err
}

// IsPostLiked checks if a post is liked by a user
func (r *PostRepository) IsPostLiked(postID, userID string) (bool, error) {
	var count int
	err := r.DB.QueryRow("SELECT COUNT(*) FROM post_likes WHERE post_id = ? AND user_id = ?", postID, userID).Scan(&count)
	if err != nil {
		return false, err
	}
	
	return count > 0, nil
}