// backend/pkg/models/notification.go
package models

import (
	"database/sql"
	"fmt"
	"time"
)

type NotificationRepository struct {
	db *sql.DB
}

func NewNotificationRepository(db *sql.DB) *NotificationRepository {
	return &NotificationRepository{db: db}
}

type NotificationType string

const (
	NotificationFollowRequest = "follow_request"
	NotificationGroupInvite   = "group_invitation"
	NotificationGroupRequest  = "group_request"
	NotificationEventCreated  = "event_created"
)

type CreateNotificationRequest struct {
	UserID      int              `json:"user_id"`
	Type        NotificationType `json:"type"`
	Title       string           `json:"title"`
	Message     string           `json:"message"`
	RelatedID   *int             `json:"related_id"`
	RelatedType *string          `json:"related_type"`
}

// CreateNotification creates a new notification
func (nr *NotificationRepository) CreateNotification(req *CreateNotificationRequest) (*Notification, error) {
	query := `
		INSERT INTO notifications (user_id, type, title, message, related_id, related_type, is_read, created_at)
		VALUES (?, ?, ?, ?, ?, ?, 0, ?)
		RETURNING id, created_at
	`

	now := time.Now()
	notification := &Notification{
		BaseModel: BaseModel{
			CreatedAt: now,
			UpdatedAt: now,
		},
		UserID:      req.UserID,
		Type:        string(req.Type),
		Title:       req.Title,
		Message:     req.Message,
		RelatedID:   req.RelatedID,
		RelatedType: req.RelatedType,
		IsRead:      false,
	}

	err := nr.db.QueryRow(query,
		notification.UserID,
		notification.Type,
		notification.Title,
		notification.Message,
		notification.RelatedID,
		notification.RelatedType,
		notification.BaseModel.CreatedAt,
	).Scan(&notification.ID, &notification.CreatedAt)

	if err != nil {
		return nil, fmt.Errorf("failed to create notification: %w", err)
	}

	return notification, nil
}

// GetUserNotifications gets notifications for a user
func (nr *NotificationRepository) GetUserNotifications(userID int, limit, offset int) ([]*Notification, error) {
	query := `
		SELECT id, user_id, type, title, message, related_id, related_type, is_read, created_at
		FROM notifications
		WHERE user_id = ?
		ORDER BY created_at DESC
		LIMIT ? OFFSET ?
	`

	rows, err := nr.db.Query(query, userID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to get notifications: %w", err)
	}
	defer rows.Close()

	var notifications []*Notification
	for rows.Next() {
		notification := &Notification{}
		err := rows.Scan(
			&notification.ID,
			&notification.UserID,
			&notification.Type,
			&notification.Title,
			&notification.Message,
			&notification.RelatedID,
			&notification.RelatedType,
			&notification.IsRead,
			&notification.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan notification: %w", err)
		}
		notifications = append(notifications, notification)
	}

	return notifications, nil
}

// GetUnreadNotificationsCount gets count of unread notifications
func (nr *NotificationRepository) GetUnreadNotificationsCount(userID int) (int, error) {
	var count int
	err := nr.db.QueryRow(`
		SELECT COUNT(*) FROM notifications 
		WHERE user_id = ? AND is_read = 0
	`, userID).Scan(&count)

	if err != nil {
		return 0, fmt.Errorf("failed to get unread count: %w", err)
	}

	return count, nil
}

// MarkNotificationAsRead marks a notification as read
func (nr *NotificationRepository) MarkNotificationAsRead(notificationID, userID int) error {
	query := `
		UPDATE notifications 
		SET is_read = 1 
		WHERE id = ? AND user_id = ?
	`

	result, err := nr.db.Exec(query, notificationID, userID)
	if err != nil {
		return fmt.Errorf("failed to mark notification as read: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("notification not found")
	}

	return nil
}

// MarkAllNotificationsAsRead marks all notifications as read for a user
func (nr *NotificationRepository) MarkAllNotificationsAsRead(userID int) error {
	query := `UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0`

	_, err := nr.db.Exec(query, userID)
	if err != nil {
		return fmt.Errorf("failed to mark all notifications as read: %w", err)
	}

	return nil
}

// DeleteNotification deletes a notification
func (nr *NotificationRepository) DeleteNotification(notificationID, userID int) error {
	query := `DELETE FROM notifications WHERE id = ? AND user_id = ?`

	result, err := nr.db.Exec(query, notificationID, userID)
	if err != nil {
		return fmt.Errorf("failed to delete notification: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("notification not found")
	}

	return nil
}

// CreateFollowRequestNotification creates notification for follow request
func (nr *NotificationRepository) CreateFollowRequestNotification(followerID, followingID int, followerName string) error {
	req := &CreateNotificationRequest{
		UserID:      followingID,
		Type:        NotificationFollowRequest,
		Title:       "New Follow Request",
		Message:     fmt.Sprintf("%s wants to follow you", followerName),
		RelatedID:   &followerID,
		RelatedType: stringPtr("user"),
	}

	_, err := nr.CreateNotification(req)
	return err
}

// Helper function to create string pointer
func stringPtr(s string) *string {
	return &s
}
