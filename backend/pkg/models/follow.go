// backend/pkg/models/follow.go
package models

import (
	"database/sql"
	"fmt"
	"ripple/pkg/constants"
	"time"
)

type FollowRepository struct {
	db *sql.DB
}

func NewFollowRepository(db *sql.DB) *FollowRepository {
	return &FollowRepository{db: db}
}

type FollowRequest struct {
	ID          int       `json:"id" db:"id"`
	FollowerID  int       `json:"follower_id" db:"follower_id"`
	FollowingID int       `json:"following_id" db:"following_id"`
	Status      string    `json:"status" db:"status"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time `json:"updated_at" db:"updated_at"`

	// Joined fields
	FollowerUser  *UserResponse `json:"follower_user,omitempty"`
	FollowingUser *UserResponse `json:"following_user,omitempty"`
}

type FollowStats struct {
	FollowersCount int `json:"followers_count"`
	FollowingCount int `json:"following_count"`
}

// CreateFollowRequest creates a follow request
func (fr *FollowRepository) CreateFollowRequest(followerID, followingID int) (*FollowRequest, error) {
	// Check if users are the same
	if followerID == followingID {
		return nil, fmt.Errorf(constants.ErrCannotFollowSelf)
	}

	// Check if follow relationship already exists
	exists, err := fr.FollowRelationshipExists(followerID, followingID)
	if err != nil {
		return nil, fmt.Errorf("failed to check existing relationship: %w", err)
	}
	if exists {
		return nil, fmt.Errorf(constants.ErrAlreadyFollowing)
	}

	// Check if target user is public or private
	var isPublic bool
	err = fr.db.QueryRow("SELECT is_public FROM users WHERE id = ?", followingID).Scan(&isPublic)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf(constants.ErrUserNotFound)
		}
		return nil, fmt.Errorf("failed to check user privacy: %w", err)
	}

	// Determine initial status
	status := constants.FollowStatusPending
	if isPublic {
		status = constants.FollowStatusAccepted
	}

	query := `
		INSERT INTO follows (follower_id, following_id, status, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?)
		RETURNING id, created_at, updated_at
	`

	now := time.Now()
	followRequest := &FollowRequest{
		FollowerID:  followerID,
		FollowingID: followingID,
		Status:      status,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	err = fr.db.QueryRow(query,
		followRequest.FollowerID,
		followRequest.FollowingID,
		followRequest.Status,
		followRequest.CreatedAt,
		followRequest.UpdatedAt,
	).Scan(&followRequest.ID, &followRequest.CreatedAt, &followRequest.UpdatedAt)

	if err != nil {
		return nil, fmt.Errorf("failed to create follow request: %w", err)
	}

	return followRequest, nil
}

// AcceptFollowRequest accepts a pending follow request
func (fr *FollowRepository) AcceptFollowRequest(followID, userID int) error {
	query := `
		UPDATE follows 
		SET status = ?, updated_at = ?
		WHERE id = ? AND following_id = ? AND status = ?
	`

	result, err := fr.db.Exec(query,
		constants.FollowStatusAccepted,
		time.Now(),
		followID,
		userID,
		constants.FollowStatusPending,
	)

	if err != nil {
		return fmt.Errorf("failed to accept follow request: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("follow request not found or already processed")
	}

	return nil
}

// DeclineFollowRequest declines a pending follow request
func (fr *FollowRepository) DeclineFollowRequest(followID, userID int) error {
	query := `
		UPDATE follows 
		SET status = ?, updated_at = ?
		WHERE id = ? AND following_id = ? AND status = ?
	`

	result, err := fr.db.Exec(query,
		constants.FollowStatusDeclined,
		time.Now(),
		followID,
		userID,
		constants.FollowStatusPending,
	)

	if err != nil {
		return fmt.Errorf("failed to decline follow request: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("follow request not found or already processed")
	}

	return nil
}

// Unfollow removes a follow relationship (accepted or pending)
func (fr *FollowRepository) Unfollow(followerID, followingID int) error {
	query := `
		DELETE FROM follows 
		WHERE follower_id = ? AND following_id = ?
	`

	result, err := fr.db.Exec(query, followerID, followingID)
	if err != nil {
		return fmt.Errorf("failed to unfollow user: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf(constants.ErrNotFollowing)
	}

	return nil
}

// GetPendingFollowRequests gets pending follow requests for a user
func (fr *FollowRepository) GetPendingFollowRequests(userID int) ([]*FollowRequest, error) {
	query := `
		SELECT f.id, f.follower_id, f.following_id, f.status, f.created_at, f.updated_at,
		       u.id, u.email, u.first_name, u.last_name, u.date_of_birth, u.nickname, u.about_me, u.avatar_path, u.is_public, u.created_at
		FROM follows f
		JOIN users u ON f.follower_id = u.id
		WHERE f.following_id = ? AND f.status = ?
		ORDER BY f.created_at DESC
	`

	rows, err := fr.db.Query(query, userID, constants.FollowStatusPending)
	if err != nil {
		return nil, fmt.Errorf("failed to get pending follow requests: %w", err)
	}
	defer rows.Close()

	// Initialize empty slice instead of nil
	requests := make([]*FollowRequest, 0)
	for rows.Next() {
		request := &FollowRequest{}
		user := &User{}

		err := rows.Scan(
			&request.ID, &request.FollowerID, &request.FollowingID, &request.Status, &request.CreatedAt, &request.UpdatedAt,
			&user.ID, &user.Email, &user.FirstName, &user.LastName, &user.DateOfBirth, &user.Nickname, &user.AboutMe, &user.AvatarPath, &user.IsPublic, &user.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan follow request: %w", err)
		}

		request.FollowerUser = user.ToResponse()
		requests = append(requests, request)
	}

	return requests, nil
}

// GetFollowers gets accepted followers for a user
func (fr *FollowRepository) GetFollowers(userID int) ([]*UserResponse, error) {
	query := `
		SELECT u.id, u.email, u.first_name, u.last_name, u.date_of_birth, u.nickname, u.about_me, u.avatar_path, u.cover_path, u.is_public, u.created_at
		FROM follows f
		JOIN users u ON f.follower_id = u.id
		WHERE f.following_id = ? AND f.status = ?
		ORDER BY f.created_at DESC
	`

	rows, err := fr.db.Query(query, userID, constants.FollowStatusAccepted)
	if err != nil {
		return nil, fmt.Errorf("failed to get followers: %w", err)
	}
	defer rows.Close()

	var followers []*UserResponse = make([]*UserResponse, 0)
	for rows.Next() {
		user := &User{}
		err := rows.Scan(
			&user.ID, &user.Email, &user.FirstName, &user.LastName, &user.DateOfBirth, &user.Nickname, &user.AboutMe, &user.AvatarPath, &user.CoverPath, &user.IsPublic, &user.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan follower: %w", err)
		}
		followers = append(followers, user.ToResponse())
	}

	return followers, nil
}

// GetFollowing gets users that the current user is following
func (fr *FollowRepository) GetFollowing(userID int) ([]*UserResponse, error) {
	query := `
		SELECT u.id, u.email, u.first_name, u.last_name, u.date_of_birth, u.nickname, u.about_me, u.avatar_path, u.cover_path, u.is_public, u.created_at
		FROM follows f
		JOIN users u ON f.following_id = u.id
		WHERE f.follower_id = ? AND f.status = ?
		ORDER BY f.created_at DESC
	`

	rows, err := fr.db.Query(query, userID, constants.FollowStatusAccepted)
	if err != nil {
		return nil, fmt.Errorf("failed to get following: %w", err)
	}
	defer rows.Close()

	var following []*UserResponse = make([]*UserResponse, 0)
	for rows.Next() {
		user := &User{}
		err := rows.Scan(
			&user.ID, &user.Email, &user.FirstName, &user.LastName, &user.DateOfBirth, &user.Nickname, &user.AboutMe, &user.AvatarPath, &user.CoverPath, &user.IsPublic, &user.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan following: %w", err)
		}
		following = append(following, user.ToResponse())
	}

	return following, nil
}

// GetFollowStats gets follower and following counts
func (fr *FollowRepository) GetFollowStats(userID int) (*FollowStats, error) {
	stats := &FollowStats{}

	// Get followers count
	err := fr.db.QueryRow(`
		SELECT COUNT(*) FROM follows 
		WHERE following_id = ? AND status = ?
	`, userID, constants.FollowStatusAccepted).Scan(&stats.FollowersCount)
	if err != nil {
		return nil, fmt.Errorf("failed to get followers count: %w", err)
	}

	// Get following count
	err = fr.db.QueryRow(`
		SELECT COUNT(*) FROM follows 
		WHERE follower_id = ? AND status = ?
	`, userID, constants.FollowStatusAccepted).Scan(&stats.FollowingCount)
	if err != nil {
		return nil, fmt.Errorf("failed to get following count: %w", err)
	}

	return stats, nil
}

// IsFollowing checks if user A is following user B
func (fr *FollowRepository) IsFollowing(followerID, followingID int) (bool, error) {
	var count int
	err := fr.db.QueryRow(`
		SELECT COUNT(*) FROM follows 
		WHERE follower_id = ? AND following_id = ? AND status = ?
	`, followerID, followingID, constants.FollowStatusAccepted).Scan(&count)

	if err != nil {
		return false, fmt.Errorf("failed to check follow status: %w", err)
	}

	return count > 0, nil
}

// FollowRelationshipExists checks if any follow relationship exists (any status)
func (fr *FollowRepository) FollowRelationshipExists(followerID, followingID int) (bool, error) {
	var count int
	err := fr.db.QueryRow(`
		SELECT COUNT(*) FROM follows 
		WHERE follower_id = ? AND following_id = ?
	`, followerID, followingID).Scan(&count)

	if err != nil {
		return false, fmt.Errorf("failed to check relationship existence: %w", err)
	}

	return count > 0, nil
}

// GetFollowRelationshipStatus gets the status of follow relationship
func (fr *FollowRepository) GetFollowRelationshipStatus(followerID, followingID int) (string, error) {
	var status string
	err := fr.db.QueryRow(`
		SELECT status FROM follows 
		WHERE follower_id = ? AND following_id = ?
	`, followerID, followingID).Scan(&status)

	if err != nil {
		if err == sql.ErrNoRows {
			return "", nil // No relationship
		}
		return "", fmt.Errorf("failed to get relationship status: %w", err)
	}

	return status, nil
}

// CanSendMessage checks if user can send message to another user
func (fr *FollowRepository) CanSendMessage(senderID, receiverID int) (bool, error) {
	// Users can message each other if:
	// 1. At least one follows the other, OR
	// 2. The receiver has a public profile

	// Check if receiver has public profile
	var isPublic bool
	err := fr.db.QueryRow("SELECT is_public FROM users WHERE id = ?", receiverID).Scan(&isPublic)
	if err != nil {
		return false, fmt.Errorf("failed to check user privacy: %w", err)
	}

	if isPublic {
		return true, nil
	}

	// Check if either user follows the other
	var count int
	err = fr.db.QueryRow(`
		SELECT COUNT(*) FROM follows 
		WHERE ((follower_id = ? AND following_id = ?) OR (follower_id = ? AND following_id = ?)) 
		AND status = ?
	`, senderID, receiverID, receiverID, senderID, constants.FollowStatusAccepted).Scan(&count)

	if err != nil {
		return false, fmt.Errorf("failed to check follow relationship: %w", err)
	}

	return count > 0, nil
}
