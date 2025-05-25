// backend/pkg/models/user.go
package models

import (
	"database/sql"
	"fmt"
	"time"
	"ripple/pkg/constants"
)

// User struct is defined in base.go

type UserRepository struct {
	db *sql.DB
}

func NewUserRepository(db *sql.DB) *UserRepository {
	return &UserRepository{db: db}
}

type CreateUserRequest struct {
	Email       string  `json:"email"`
	Password    string  `json:"password"`
	FirstName   string  `json:"first_name"`
	LastName    string  `json:"last_name"`
	DateOfBirth string  `json:"date_of_birth"`
	Nickname    *string `json:"nickname"`
	AboutMe     *string `json:"about_me"`
	AvatarPath  *string `json:"avatar_path"`
}

type UserResponse struct {
	ID          int     `json:"id"`
	Email       string  `json:"email"`
	FirstName   string  `json:"first_name"`
	LastName    string  `json:"last_name"`
	DateOfBirth string  `json:"date_of_birth"`
	Nickname    *string `json:"nickname"`
	AboutMe     *string `json:"about_me"`
	AvatarPath  *string `json:"avatar_path"`
	IsPublic    bool    `json:"is_public"`
	CreatedAt   string  `json:"created_at"`
}

func (ur *UserRepository) CreateUser(req *CreateUserRequest, passwordHash string) (*User, error) {
	// Parse date of birth
	dob, err := time.Parse("2006-01-02", req.DateOfBirth)
	if err != nil {
		return nil, fmt.Errorf("invalid date format: %w", err)
	}

	query := `
		INSERT INTO users (email, password_hash, first_name, last_name, date_of_birth, nickname, about_me, avatar_path, is_public, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
		RETURNING id, created_at, updated_at
	`

	now := time.Now()
	user := &User{
		Email:        req.Email,
		PasswordHash: passwordHash,
		FirstName:    req.FirstName,
		LastName:     req.LastName,
		DateOfBirth:  dob,
		Nickname:     req.Nickname,
		AboutMe:      req.AboutMe,
		AvatarPath:   req.AvatarPath,
		IsPublic:     true,
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	err = ur.db.QueryRow(query,
		user.Email,
		user.PasswordHash,
		user.FirstName,
		user.LastName,
		user.DateOfBirth,
		user.Nickname,
		user.AboutMe,
		user.AvatarPath,
		user.CreatedAt,
		user.UpdatedAt,
	).Scan(&user.ID, &user.CreatedAt, &user.UpdatedAt)

	if err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	return user, nil
}

func (ur *UserRepository) GetUserByEmail(email string) (*User, error) {
	user := &User{}
	
	query := `
		SELECT id, email, password_hash, first_name, last_name, date_of_birth, nickname, about_me, avatar_path, is_public, created_at, updated_at
		FROM users
		WHERE email = ?
	`
	
	err := ur.db.QueryRow(query, email).Scan(
		&user.ID,
		&user.Email,
		&user.PasswordHash,
		&user.FirstName,
		&user.LastName,
		&user.DateOfBirth,
		&user.Nickname,
		&user.AboutMe,
		&user.AvatarPath,
		&user.IsPublic,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf(constants.ErrUserNotFound)
		}
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	return user, nil
}

func (ur *UserRepository) GetUserByID(id int) (*User, error) {
	user := &User{}
	
	query := `
		SELECT id, email, password_hash, first_name, last_name, date_of_birth, nickname, about_me, avatar_path, is_public, created_at, updated_at
		FROM users
		WHERE id = ?
	`
	
	err := ur.db.QueryRow(query, id).Scan(
		&user.ID,
		&user.Email,
		&user.PasswordHash,
		&user.FirstName,
		&user.LastName,
		&user.DateOfBirth,
		&user.Nickname,
		&user.AboutMe,
		&user.AvatarPath,
		&user.IsPublic,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf(constants.ErrUserNotFound)
		}
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	return user, nil
}

func (ur *UserRepository) EmailExists(email string) (bool, error) {
	var count int
	query := `SELECT COUNT(*) FROM users WHERE email = ?`
	
	err := ur.db.QueryRow(query, email).Scan(&count)
	if err != nil {
		return false, fmt.Errorf("failed to check email existence: %w", err)
	}
	
	return count > 0, nil
}

func (ur *UserRepository) UpdateProfile(userID int, updates map[string]interface{}) error {
	if len(updates) == 0 {
		return nil
	}

	query := "UPDATE users SET "
	args := []interface{}{}
	setParts := []string{}

	for field, value := range updates {
		setParts = append(setParts, field+" = ?")
		args = append(args, value)
	}

	setParts = append(setParts, "updated_at = ?")
	args = append(args, time.Now())
	args = append(args, userID)

	query += fmt.Sprintf("%s WHERE id = ?", setParts[0])
	for i := 1; i < len(setParts); i++ {
		query += ", " + setParts[i]
	}

	_, err := ur.db.Exec(query, args...)
	if err != nil {
		return fmt.Errorf("failed to update user profile: %w", err)
	}

	return nil
}

func (u *User) ToResponse() *UserResponse {
	return &UserResponse{
		ID:          u.ID,
		Email:       u.Email,
		FirstName:   u.FirstName,
		LastName:    u.LastName,
		DateOfBirth: u.DateOfBirth.Format("2006-01-02"),
		Nickname:    u.Nickname,
		AboutMe:     u.AboutMe,
		AvatarPath:  u.AvatarPath,
		IsPublic:    u.IsPublic,
		CreatedAt:   u.CreatedAt.Format(time.RFC3339),
	}
}