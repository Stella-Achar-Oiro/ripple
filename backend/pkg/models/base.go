// backend/pkg/models/base.go
package models

import (
	"time"
)

type BaseModel struct {
	ID        int       `json:"id" db:"id"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

type User struct {
	BaseModel
	Email        string    `json:"email" db:"email"`
	PasswordHash string    `json:"-" db:"password_hash"`
	FirstName    string    `json:"first_name" db:"first_name"`
	LastName     string    `json:"last_name" db:"last_name"`
	DateOfBirth  time.Time `json:"date_of_birth" db:"date_of_birth"`
	Nickname     *string   `json:"nickname" db:"nickname"`
	AboutMe      *string   `json:"about_me" db:"about_me"`
	AvatarPath   *string   `json:"avatar_path" db:"avatar_path"`
	CoverPath    *string   `json:"cover_path" db:"cover_path"`
	IsPublic     bool      `json:"is_public" db:"is_public"`
	CreatedAt    time.Time `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time `json:"updated_at" db:"updated_at"`
}

type Session struct {
	ID        string    `json:"id" db:"id"`
	UserID    int       `json:"user_id" db:"user_id"`
	ExpiresAt time.Time `json:"expires_at" db:"expires_at"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

type Follow struct {
	BaseModel
	FollowerID  int    `json:"follower_id" db:"follower_id"`
	FollowingID int    `json:"following_id" db:"following_id"`
	Status      string `json:"status" db:"status"`
}

type Notification struct {
	BaseModel
	UserID      int     `json:"user_id" db:"user_id"`
	Type        string  `json:"type" db:"type"`
	Title       string  `json:"title" db:"title"`
	Message     string  `json:"message" db:"message"`
	RelatedID   *int    `json:"related_id" db:"related_id"`
	RelatedType *string `json:"related_type" db:"related_type"`
	IsRead      bool    `json:"is_read" db:"is_read"`
}
