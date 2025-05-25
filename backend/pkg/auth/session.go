// backend/pkg/auth/session.go
package auth

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"fmt"
	"time"
	"ripple/pkg/models"
)

const sessionDuration = 24 * time.Hour * 30 // 30 days

type SessionManager struct {
	db *sql.DB
}

func NewSessionManager(db *sql.DB) *SessionManager {
	return &SessionManager{db: db}
}

func (sm *SessionManager) CreateSession(userID int) (*models.Session, error) {
	// Generate random session ID
	sessionID, err := generateSessionID()
	if err != nil {
		return nil, fmt.Errorf("failed to generate session ID: %w", err)
	}

	session := &models.Session{
		ID:        sessionID,
		UserID:    userID,
		ExpiresAt: time.Now().Add(sessionDuration),
		CreatedAt: time.Now(),
	}

	// Insert session into database
	query := `
		INSERT INTO sessions (id, user_id, expires_at, created_at)
		VALUES (?, ?, ?, ?)
	`
	
	_, err = sm.db.Exec(query, session.ID, session.UserID, session.ExpiresAt, session.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to create session: %w", err)
	}

	return session, nil
}

func (sm *SessionManager) GetSession(sessionID string) (*models.Session, error) {
	session := &models.Session{}
	
	query := `
		SELECT id, user_id, expires_at, created_at
		FROM sessions
		WHERE id = ? AND expires_at > ?
	`
	
	err := sm.db.QueryRow(query, sessionID, time.Now()).Scan(
		&session.ID,
		&session.UserID,
		&session.ExpiresAt,
		&session.CreatedAt,
	)
	
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("session not found or expired")
		}
		return nil, fmt.Errorf("failed to get session: %w", err)
	}

	return session, nil
}

func (sm *SessionManager) DeleteSession(sessionID string) error {
	query := `DELETE FROM sessions WHERE id = ?`
	_, err := sm.db.Exec(query, sessionID)
	if err != nil {
		return fmt.Errorf("failed to delete session: %w", err)
	}
	return nil
}

func (sm *SessionManager) CleanupExpiredSessions() error {
	query := `DELETE FROM sessions WHERE expires_at <= ?`
	_, err := sm.db.Exec(query, time.Now())
	if err != nil {
		return fmt.Errorf("failed to cleanup expired sessions: %w", err)
	}
	return nil
}

func generateSessionID() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}