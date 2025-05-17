package models

import (
	"database/sql"
	"errors"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type User struct {
	ID          string    `json:"id"`
	Email       string    `json:"email"`
	Password    string    `json:"-"` // Never expose password
	FirstName   string    `json:"firstName"`
	LastName    string    `json:"lastName"`
	DateOfBirth time.Time `json:"dateOfBirth"`
	AvatarPath  string    `json:"avatarPath,omitempty"`
	Nickname    string    `json:"nickname,omitempty"`
	AboutMe     string    `json:"aboutMe,omitempty"`
	IsPublic    bool      `json:"isPublic"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

type UserRepository struct {
	DB *sql.DB
}

func NewUserRepository(db *sql.DB) *UserRepository {
	return &UserRepository{DB: db}
}

func (r *UserRepository) Create(user *User) error {
	if user.ID == "" {
		user.ID = uuid.New().String()
	}
	
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	
	now := time.Now()
	user.CreatedAt = now
	user.UpdatedAt = now
	
	_, err = r.DB.Exec(
		"INSERT INTO users (id, email, password, first_name, last_name, date_of_birth, avatar_path, nickname, about_me, is_public, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
		user.ID, user.Email, string(hashedPassword), user.FirstName, user.LastName, user.DateOfBirth, user.AvatarPath, user.Nickname, user.AboutMe, user.IsPublic, user.CreatedAt, user.UpdatedAt,
	)
	
	return err
}

func (r *UserRepository) GetByID(id string) (*User, error) {
	user := &User{}
	err := r.DB.QueryRow(
		"SELECT id, email, first_name, last_name, date_of_birth, avatar_path, nickname, about_me, is_public, created_at, updated_at FROM users WHERE id = ?",
		id,
	).Scan(
		&user.ID, &user.Email, &user.FirstName, &user.LastName, &user.DateOfBirth, 
		&user.AvatarPath, &user.Nickname, &user.AboutMe, &user.IsPublic, 
		&user.CreatedAt, &user.UpdatedAt,
	)
	
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, errors.New("user not found")
		}
		return nil, err
	}
	
	return user, nil
}

func (r *UserRepository) GetByEmail(email string) (*User, error) {
	user := &User{}
	err := r.DB.QueryRow(
		"SELECT id, email, password, first_name, last_name, date_of_birth, avatar_path, nickname, about_me, is_public, created_at, updated_at FROM users WHERE email = ?",
		email,
	).Scan(
		&user.ID, &user.Email, &user.Password, &user.FirstName, &user.LastName, 
		&user.DateOfBirth, &user.AvatarPath, &user.Nickname, &user.AboutMe, 
		&user.IsPublic, &user.CreatedAt, &user.UpdatedAt,
	)
	
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, errors.New("user not found")
		}
		return nil, err
	}
	
	return user, nil
}

func (r *UserRepository) Update(user *User) error {
	user.UpdatedAt = time.Now()
	
	_, err := r.DB.Exec(
		"UPDATE users SET first_name = ?, last_name = ?, avatar_path = ?, nickname = ?, about_me = ?, is_public = ?, updated_at = ? WHERE id = ?",
		user.FirstName, user.LastName, user.AvatarPath, user.Nickname, user.AboutMe, user.IsPublic, user.UpdatedAt, user.ID,
	)
	
	return err
}

func (r *UserRepository) CheckPassword(email, password string) (*User, error) {
	user, err := r.GetByEmail(email)
	if err != nil {
		return nil, err
	}
	
	err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(password))
	if err != nil {
		return nil, errors.New("invalid password")
	}
	
	// Clear password before returning
	user.Password = ""
	return user, nil
}

func (r *UserRepository) SetPublicStatus(userID string, isPublic bool) error {
	_, err := r.DB.Exec(
		"UPDATE users SET is_public = ?, updated_at = ? WHERE id = ?",
		isPublic, time.Now(), userID,
	)
	
	return err
}

// Follow creates a follow request from one user to another
func (r *UserRepository) Follow(followerID, followedID string) error {
    // Check if users exist
    _, err := r.GetByID(followerID)
    if err != nil {
        return errors.New("follower user not found")
    }
    
    followed, err := r.GetByID(followedID)
    if err != nil {
        return errors.New("followed user not found")
    }
    
    // Check if already following
    status, err := r.GetFollowStatus(followerID, followedID)
    if err == nil && (status == "accepted" || status == "pending") {
        return errors.New("already following or requested")
    }
    
    // Create follow record with appropriate status
    followID := uuid.New().String()
    now := time.Now()
    
    // If user has public profile, automatically accept follow request
    status := "pending"
    if followed.IsPublic {
        status = "accepted"
    }
    
    _, err = r.DB.Exec(
        "INSERT INTO followers (id, follower_id, followed_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
        followID, followerID, followedID, status, now, now,
    )
    
    return err
}

// Unfollow removes a follow relationship or request
func (r *UserRepository) Unfollow(followerID, followedID string) error {
    _, err := r.DB.Exec(
        "DELETE FROM followers WHERE follower_id = ? AND followed_id = ?",
        followerID, followedID,
    )
    
    return err
}

// AcceptFollowRequest accepts a pending follow request
func (r *UserRepository) AcceptFollowRequest(followerID, followedID string) error {
    result, err := r.DB.Exec(
        "UPDATE followers SET status = 'accepted', updated_at = ? WHERE follower_id = ? AND followed_id = ? AND status = 'pending'",
        time.Now(), followerID, followedID,
    )
    
    if err != nil {
        return err
    }
    
    rows, err := result.RowsAffected()
    if err != nil {
        return err
    }
    
    if rows == 0 {
        return errors.New("no pending follow request found")
    }
    
    return nil
}

// DeclineFollowRequest declines a pending follow request
func (r *UserRepository) DeclineFollowRequest(followerID, followedID string) error {
    result, err := r.DB.Exec(
        "UPDATE followers SET status = 'declined', updated_at = ? WHERE follower_id = ? AND followed_id = ? AND status = 'pending'",
        time.Now(), followerID, followedID,
    )
    
    if err != nil {
        return err
    }
    
    rows, err := result.RowsAffected()
    if err != nil {
        return err
    }
    
    if rows == 0 {
        return errors.New("no pending follow request found")
    }
    
    return nil
}

// GetFollowStatus returns the status of a follow relationship between two users
// Returns: "accepted", "pending", "declined", or empty string if no relationship exists
func (r *UserRepository) GetFollowStatus(followerID, followedID string) (string, error) {
    var status string
    err := r.DB.QueryRow(
        "SELECT status FROM followers WHERE follower_id = ? AND followed_id = ?",
        followerID, followedID,
    ).Scan(&status)
    
    if err != nil {
        if err == sql.ErrNoRows {
            return "", errors.New("follow relationship not found")
        }
        return "", err
    }
    
    return status, nil
}

// CountFollowers returns the number of accepted followers for a user
func (r *UserRepository) CountFollowers(userID string) (int, error) {
    var count int
    err := r.DB.QueryRow(
        "SELECT COUNT(*) FROM followers WHERE followed_id = ? AND status = 'accepted'",
        userID,
    ).Scan(&count)
    
    if err != nil {
        return 0, err
    }
    
    return count, nil
}

// CountFollowing returns the number of users a user is following (with accepted status)
func (r *UserRepository) CountFollowing(userID string) (int, error) {
    var count int
    err := r.DB.QueryRow(
        "SELECT COUNT(*) FROM followers WHERE follower_id = ? AND status = 'accepted'",
        userID,
    ).Scan(&count)
    
    if err != nil {
        return 0, err
    }
    
    return count, nil
}

// GetFollowers returns the users who follow the specified user (with accepted status)
func (r *UserRepository) GetFollowers(userID string, limit, offset int) ([]*User, error) {
    rows, err := r.DB.Query(`
        SELECT u.id, u.email, u.first_name, u.last_name, u.date_of_birth, 
               u.avatar_path, u.nickname, u.about_me, u.is_public, u.created_at, u.updated_at
        FROM users u
        JOIN followers f ON u.id = f.follower_id
        WHERE f.followed_id = ? AND f.status = 'accepted'
        ORDER BY f.created_at DESC
        LIMIT ? OFFSET ?
    `, userID, limit, offset)
    
    if err != nil {
        return nil, err
    }
    defer rows.Close()
    
    var followers []*User
    for rows.Next() {
        user := &User{}
        err := rows.Scan(
            &user.ID, &user.Email, &user.FirstName, &user.LastName, &user.DateOfBirth,
            &user.AvatarPath, &user.Nickname, &user.AboutMe, &user.IsPublic,
            &user.CreatedAt, &user.UpdatedAt,
        )
        
        if err != nil {
            return nil, err
        }
        
        followers = append(followers, user)
    }
    
    if err = rows.Err(); err != nil {
        return nil, err
    }
    
    return followers, nil
}

// GetFollowing returns the users that the specified user follows (with accepted status)
func (r *UserRepository) GetFollowing(userID string, limit, offset int) ([]*User, error) {
    rows, err := r.DB.Query(`
        SELECT u.id, u.email, u.first_name, u.last_name, u.date_of_birth, 
               u.avatar_path, u.nickname, u.about_me, u.is_public, u.created_at, u.updated_at
        FROM users u
        JOIN followers f ON u.id = f.followed_id
        WHERE f.follower_id = ? AND f.status = 'accepted'
        ORDER BY f.created_at DESC
        LIMIT ? OFFSET ?
    `, userID, limit, offset)
    
    if err != nil {
        return nil, err
    }
    defer rows.Close()
    
    var following []*User
    for rows.Next() {
        user := &User{}
        err := rows.Scan(
            &user.ID, &user.Email, &user.FirstName, &user.LastName, &user.DateOfBirth,
            &user.AvatarPath, &user.Nickname, &user.AboutMe, &user.IsPublic,
            &user.CreatedAt, &user.UpdatedAt,
        )
        
        if err != nil {
            return nil, err
        }
        
        following = append(following, user)
    }
    
    if err = rows.Err(); err != nil {
        return nil, err
    }
    
    return following, nil
}

// GetPendingFollowRequests returns users who have pending follow requests to the specified user
func (r *UserRepository) GetPendingFollowRequests(userID string, limit, offset int) ([]*User, error) {
    rows, err := r.DB.Query(`
        SELECT u.id, u.email, u.first_name, u.last_name, u.date_of_birth, 
               u.avatar_path, u.nickname, u.about_me, u.is_public, u.created_at, u.updated_at
        FROM users u
        JOIN followers f ON u.id = f.follower_id
        WHERE f.followed_id = ? AND f.status = 'pending'
        ORDER BY f.created_at DESC
        LIMIT ? OFFSET ?
    `, userID, limit, offset)
    
    if err != nil {
        return nil, err
    }
    defer rows.Close()
    
    var requests []*User
    for rows.Next() {
        user := &User{}
        err := rows.Scan(
            &user.ID, &user.Email, &user.FirstName, &user.LastName, &user.DateOfBirth,
            &user.AvatarPath, &user.Nickname, &user.AboutMe, &user.IsPublic,
            &user.CreatedAt, &user.UpdatedAt,
        )
        
        if err != nil {
            return nil, err
        }
        
        requests = append(requests, user)
    }
    
    if err = rows.Err(); err != nil {
        return nil, err
    }
    
    return requests, nil
}

// IsFollowing checks if userA is following userB
func (r *UserRepository) IsFollowing(userAID, userBID string) (bool, error) {
    status, err := r.GetFollowStatus(userAID, userBID)
    if err != nil {
        return false, nil // Not following if no relationship exists
    }
    
    return status == "accepted", nil
}

// HasAccess checks if a user has access to view another user's profile
func (r *UserRepository) HasAccess(viewerID, profileID string) (bool, error) {
    // If viewing your own profile, always have access
    if viewerID == profileID {
        return true, nil
    }
    
    // Get the profile user
    profileUser, err := r.GetByID(profileID)
    if err != nil {
        return false, err
    }
    
    // If profile is public, anyone has access
    if profileUser.IsPublic {
        return true, nil
    }
    
    // If profile is private, only followers have access
    isFollowing, err := r.IsFollowing(viewerID, profileID)
    if err != nil {
        return false, err
    }
    
    return isFollowing, nil
}

// SearchUsers searches for users by name or nickname
func (r *UserRepository) SearchUsers(query string, limit, offset int) ([]*User, error) {
    // Add wildcards to the query for partial matching
    searchQuery := "%" + query + "%"
    
    rows, err := r.DB.Query(`
        SELECT id, email, first_name, last_name, date_of_birth, 
               avatar_path, nickname, about_me, is_public, created_at, updated_at
        FROM users
        WHERE first_name LIKE ? OR last_name LIKE ? OR nickname LIKE ?
        ORDER BY first_name, last_name
        LIMIT ? OFFSET ?
    `, searchQuery, searchQuery, searchQuery, limit, offset)
    
    if err != nil {
        return nil, err
    }
    defer rows.Close()
    
    var users []*User
    for rows.Next() {
        user := &User{}
        err := rows.Scan(
            &user.ID, &user.Email, &user.FirstName, &user.LastName, &user.DateOfBirth,
            &user.AvatarPath, &user.Nickname, &user.AboutMe, &user.IsPublic,
            &user.CreatedAt, &user.UpdatedAt,
        )
        
        if err != nil {
            return nil, err
        }
        
        users = append(users, user)
    }
    
    if err = rows.Err(); err != nil {
        return nil, err
    }
    
    return users, nil
}