// backend/pkg/models/notification.go
package models

import (
	"database/sql"
	"fmt"
	"time"
)

type NotificationRepository struct {
	db    *sql.DB
	wsHub WebSocketHub // Interface for WebSocket hub
}

// WebSocketHub interface for real-time notification delivery
type WebSocketHub interface {
	SendNotification(userID int, data interface{})
}

func NewNotificationRepository(db *sql.DB) *NotificationRepository {
	return &NotificationRepository{db: db}
}

// SetWebSocketHub sets the WebSocket hub for real-time notifications
func (nr *NotificationRepository) SetWebSocketHub(hub WebSocketHub) {
	nr.wsHub = hub
}

type NotificationType string

const (
	NotificationFollowRequest    = "follow_request"
	NotificationGroupInvite      = "group_invitation"
	NotificationGroupRequest     = "group_request"
	NotificationEventCreated     = "event_created"
	NotificationGroupPostCreated = "group_post_created"
	NotificationEventReminder    = "event_reminder"
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
		notification.CreatedAt,
	).Scan(&notification.ID, &notification.CreatedAt)

	if err != nil {
		return nil, fmt.Errorf("failed to create notification: %w", err)
	}

	// Send real-time notification if WebSocket hub is available
	if nr.wsHub != nil {
		nr.sendRealtimeNotification(notification)
	}

	return notification, nil
}

// sendRealtimeNotification sends a notification via WebSocket with proper categorization
func (nr *NotificationRepository) sendRealtimeNotification(notification *Notification) {
	// Create notification data with category for frontend handling
	notificationData := map[string]interface{}{
		"id":           notification.ID,
		"type":         notification.Type,
		"title":        notification.Title,
		"message":      notification.Message,
		"related_id":   notification.RelatedID,
		"related_type": notification.RelatedType,
		"is_read":      notification.IsRead,
		"created_at":   notification.CreatedAt,
		"category":     nr.getNotificationCategory(notification.Type),
	}

	nr.wsHub.SendNotification(notification.UserID, notificationData)
}

// getNotificationCategory categorizes notifications for frontend handling
func (nr *NotificationRepository) getNotificationCategory(notificationType string) string {
	switch notificationType {
	case string(NotificationGroupInvite), string(NotificationGroupRequest),
		string(NotificationEventCreated), string(NotificationGroupPostCreated),
		string(NotificationEventReminder):
		return "group"
	case string(NotificationFollowRequest):
		return "private"
	default:
		return "general"
	}
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
func (nr *NotificationRepository) CreateFollowRequestNotification(followID, followingID int, followerName string) error {
	req := &CreateNotificationRequest{
		UserID:      followingID,
		Type:        NotificationFollowRequest,
		Title:       "New Follow Request",
		Message:     fmt.Sprintf("%s wants to follow you", followerName),
		RelatedID:   &followID,
		RelatedType: stringPtr("follow"),
	}

	_, err := nr.CreateNotification(req)
	return err
}

// CreateFollowRequestNotificationWithID creates notification for follow request with follow ID
func (nr *NotificationRepository) CreateFollowRequestNotificationWithID(followID, followerID, followingID int, followerName string) error {
	req := &CreateNotificationRequest{
		UserID:      followingID,
		Type:        NotificationFollowRequest,
		Title:       "New Follow Request",
		Message:     fmt.Sprintf("%s wants to follow you", followerName),
		RelatedID:   &followID,
		RelatedType: stringPtr("follow"),
	}

	_, err := nr.CreateNotification(req)
	return err
}

// CreateGroupInvitationNotification creates notification for group invitation
func (nr *NotificationRepository) CreateGroupInvitationNotification(userID, groupID, membershipID int, groupTitle, inviterName string) error {
	req := &CreateNotificationRequest{
		UserID:      userID,
		Type:        NotificationGroupInvite,
		Title:       "Group Invitation",
		Message:     fmt.Sprintf("%s invited you to join '%s'", inviterName, groupTitle),
		RelatedID:   &membershipID, // Use membership ID for handling
		RelatedType: stringPtr("membership"),
	}

	_, err := nr.CreateNotification(req)
	return err
}

// CreateGroupJoinRequestNotification creates notification for group join request
func (nr *NotificationRepository) CreateGroupJoinRequestNotification(creatorID, userID, groupID, membershipID int, userName, groupTitle string) error {
	req := &CreateNotificationRequest{
		UserID:      creatorID,
		Type:        NotificationGroupRequest,
		Title:       "Group Join Request",
		Message:     fmt.Sprintf("%s wants to join '%s'", userName, groupTitle),
		RelatedID:   &membershipID, // Use membership ID instead of group ID for handling
		RelatedType: stringPtr("membership"),
	}

	_, err := nr.CreateNotification(req)
	return err
}

// CreateEventNotification creates notification for new event
func (nr *NotificationRepository) CreateEventNotification(userID, eventID, groupID int, eventTitle, groupTitle string) error {
	req := &CreateNotificationRequest{
		UserID:      userID,
		Type:        NotificationEventCreated,
		Title:       "New Event",
		Message:     fmt.Sprintf("New event '%s' created in '%s'", eventTitle, groupTitle),
		RelatedID:   &eventID,
		RelatedType: stringPtr("event"),
	}

	_, err := nr.CreateNotification(req)
	return err
}

// CreateGroupPostNotification creates notification for new group post
func (nr *NotificationRepository) CreateGroupPostNotification(userID, postID, groupID int, authorName, groupTitle string) error {
	req := &CreateNotificationRequest{
		UserID:      userID,
		Type:        NotificationGroupPostCreated,
		Title:       "New Group Post",
		Message:     fmt.Sprintf("%s posted in '%s'", authorName, groupTitle),
		RelatedID:   &postID,
		RelatedType: stringPtr("group_post"),
	}

	_, err := nr.CreateNotification(req)
	return err
}

// CreateEventReminderNotification creates notification for event reminder
func (nr *NotificationRepository) CreateEventReminderNotification(userID, eventID int, eventTitle string, hoursUntil int) error {
	var message string
	if hoursUntil <= 1 {
		message = fmt.Sprintf("Event '%s' is starting soon!", eventTitle)
	} else if hoursUntil <= 24 {
		message = fmt.Sprintf("Event '%s' is starting in %d hours", eventTitle, hoursUntil)
	} else {
		days := hoursUntil / 24
		message = fmt.Sprintf("Event '%s' is starting in %d days", eventTitle, days)
	}

	req := &CreateNotificationRequest{
		UserID:      userID,
		Type:        NotificationEventReminder,
		Title:       "Event Reminder",
		Message:     message,
		RelatedID:   &eventID,
		RelatedType: stringPtr("event"),
	}

	_, err := nr.CreateNotification(req)
	return err
}

// BulkCreateNotifications creates notifications for multiple users
func (nr *NotificationRepository) BulkCreateNotifications(userIDs []int, notificationType NotificationType, title, message string, relatedID *int, relatedType *string) error {
	if len(userIDs) == 0 {
		return nil
	}

	tx, err := nr.db.Begin()
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	query := `
		INSERT INTO notifications (user_id, type, title, message, related_id, related_type, is_read, created_at)
		VALUES (?, ?, ?, ?, ?, ?, 0, ?)
	`

	now := time.Now()
	var createdNotifications []*Notification

	for _, userID := range userIDs {
		_, err = tx.Exec(query, userID, string(notificationType), title, message, relatedID, relatedType, now)
		if err != nil {
			return fmt.Errorf("failed to create bulk notification: %w", err)
		}

		// Store notification data for real-time delivery
		notification := &Notification{
			UserID:      userID,
			Type:        string(notificationType),
			Title:       title,
			Message:     message,
			RelatedID:   relatedID,
			RelatedType: relatedType,
			IsRead:      false,
			BaseModel: BaseModel{
				CreatedAt: now,
				UpdatedAt: now,
			},
		}
		createdNotifications = append(createdNotifications, notification)
	}

	if err = tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit bulk notifications: %w", err)
	}

	// Send real-time notifications after successful commit
	if nr.wsHub != nil {
		for _, notification := range createdNotifications {
			nr.sendRealtimeNotification(notification)
		}
	}

	return nil
}

// NotifyAllGroupMembers notifies all members of a group (except the actor)
func (nr *NotificationRepository) NotifyAllGroupMembers(groupID, actorID int, notificationType NotificationType, title, message string, relatedID *int, relatedType *string) error {
	// Get all group members except the actor
	query := `
		SELECT user_id FROM group_members 
		WHERE group_id = ? AND user_id != ? AND status = 'accepted'
	`

	rows, err := nr.db.Query(query, groupID, actorID)
	if err != nil {
		return fmt.Errorf("failed to get group members: %w", err)
	}
	defer rows.Close()

	var userIDs []int
	for rows.Next() {
		var userID int
		if err := rows.Scan(&userID); err != nil {
			return fmt.Errorf("failed to scan user ID: %w", err)
		}
		userIDs = append(userIDs, userID)
	}

	if len(userIDs) == 0 {
		return nil // No members to notify
	}

	return nr.BulkCreateNotifications(userIDs, notificationType, title, message, relatedID, relatedType)
}

// GetNotificationStats gets notification statistics for a user
func (nr *NotificationRepository) GetNotificationStats(userID int) (map[string]int, error) {
	query := `
		SELECT type, COUNT(*) as count
		FROM notifications 
		WHERE user_id = ? AND is_read = 0
		GROUP BY type
	`

	rows, err := nr.db.Query(query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get notification stats: %w", err)
	}
	defer rows.Close()

	stats := make(map[string]int)
	for rows.Next() {
		var notType string
		var count int
		if err := rows.Scan(&notType, &count); err != nil {
			return nil, fmt.Errorf("failed to scan notification stats: %w", err)
		}
		stats[notType] = count
	}

	return stats, nil
}

// CleanupOldNotifications removes notifications older than specified days
func (nr *NotificationRepository) CleanupOldNotifications(daysOld int) error {
	query := `DELETE FROM notifications WHERE created_at < ?`
	cutoffDate := time.Now().AddDate(0, 0, -daysOld)

	result, err := nr.db.Exec(query, cutoffDate)
	if err != nil {
		return fmt.Errorf("failed to cleanup old notifications: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected > 0 {
		// Log cleanup activity (in production, use proper logging)
		fmt.Printf("Cleaned up %d old notifications (older than %d days)\n", rowsAffected, daysOld)
	}

	return nil
}

// Helper function to create string pointer
func stringPtr(s string) *string {
	return &s
}

// Helper function to create int pointer
func intPtr(i int) *int {
	return &i
}
