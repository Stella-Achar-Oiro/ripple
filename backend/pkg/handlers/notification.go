// backend/pkg/handlers/notification.go
package handlers

import (
	"net/http"
	"strconv"
	"strings"

	"ripple/pkg/auth"
	"ripple/pkg/models"
	"ripple/pkg/utils"
)

type NotificationHandler struct {
	notificationRepo *models.NotificationRepository
}

func NewNotificationHandler(notificationRepo *models.NotificationRepository) *NotificationHandler {
	return &NotificationHandler{
		notificationRepo: notificationRepo,
	}
}

// GetNotifications gets notifications for the current user
func (nh *NotificationHandler) GetNotifications(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.WriteErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	userID, err := auth.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.WriteErrorResponse(w, http.StatusUnauthorized, "User not authenticated")
		return
	}

	// Parse query parameters
	query := r.URL.Query()
	limit := 20
	offset := 0

	if limitStr := query.Get("limit"); limitStr != "" {
		if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 && parsedLimit <= 100 {
			limit = parsedLimit
		}
	}

	if offsetStr := query.Get("offset"); offsetStr != "" {
		if parsedOffset, err := strconv.Atoi(offsetStr); err == nil && parsedOffset >= 0 {
			offset = parsedOffset
		}
	}

	notifications, err := nh.notificationRepo.GetUserNotifications(userID, limit, offset)
	if err != nil {
		utils.WriteInternalErrorResponse(w, err)
		return
	}

	// Get unread count
	unreadCount, err := nh.notificationRepo.GetUnreadNotificationsCount(userID)
	if err != nil {
		utils.WriteInternalErrorResponse(w, err)
		return
	}

	utils.WriteSuccessResponse(w, http.StatusOK, map[string]interface{}{
		"notifications": notifications,
		"unread_count":  unreadCount,
		"limit":         limit,
		"offset":        offset,
		"count":         len(notifications),
	})
}

// MarkAsRead marks a notification as read
func (nh *NotificationHandler) MarkAsRead(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		utils.WriteErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	userID, err := auth.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.WriteErrorResponse(w, http.StatusUnauthorized, "User not authenticated")
		return
	}

	// Get notification ID from URL path
	pathParts := strings.Split(r.URL.Path, "/")
	if len(pathParts) < 5 {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "Notification ID required")
		return
	}

	notificationID, err := strconv.Atoi(pathParts[4])
	if err != nil {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "Invalid notification ID")
		return
	}

	err = nh.notificationRepo.MarkNotificationAsRead(notificationID, userID)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			utils.WriteErrorResponse(w, http.StatusNotFound, "Notification not found")
			return
		}
		utils.WriteInternalErrorResponse(w, err)
		return
	}

	utils.WriteSuccessResponse(w, http.StatusOK, map[string]string{
		"message": "Notification marked as read",
	})
}

// MarkAllAsRead marks all notifications as read
func (nh *NotificationHandler) MarkAllAsRead(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		utils.WriteErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	userID, err := auth.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.WriteErrorResponse(w, http.StatusUnauthorized, "User not authenticated")
		return
	}

	err = nh.notificationRepo.MarkAllNotificationsAsRead(userID)
	if err != nil {
		utils.WriteInternalErrorResponse(w, err)
		return
	}

	utils.WriteSuccessResponse(w, http.StatusOK, map[string]string{
		"message": "All notifications marked as read",
	})
}

// DeleteNotification deletes a notification
func (nh *NotificationHandler) DeleteNotification(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		utils.WriteErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	userID, err := auth.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.WriteErrorResponse(w, http.StatusUnauthorized, "User not authenticated")
		return
	}

	// Get notification ID from URL path
	pathParts := strings.Split(r.URL.Path, "/")
	if len(pathParts) < 4 {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "Notification ID required")
		return
	}

	notificationID, err := strconv.Atoi(pathParts[3])
	if err != nil {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "Invalid notification ID")
		return
	}

	err = nh.notificationRepo.DeleteNotification(notificationID, userID)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			utils.WriteErrorResponse(w, http.StatusNotFound, "Notification not found")
			return
		}
		utils.WriteInternalErrorResponse(w, err)
		return
	}

	utils.WriteSuccessResponse(w, http.StatusOK, map[string]string{
		"message": "Notification deleted successfully",
	})
}
