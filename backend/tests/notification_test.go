// backend/tests/notification_test.go
package tests

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"ripple/pkg/auth"
	"ripple/pkg/handlers"
	"ripple/pkg/models"
)

func TestNotificationSystem(t *testing.T) {
	database, cleanup := setupTestDB()
	defer cleanup()

	userRepo := models.NewUserRepository(database.DB)
	notificationRepo := models.NewNotificationRepository(database.DB)
	sessionManager := auth.NewSessionManager(database.DB)
	notificationHandler := handlers.NewNotificationHandler(notificationRepo)

	// Create test user
	user1, session1 := createTestUser(t, userRepo, sessionManager, "alice@test.com", false) // private

	t.Run("Create notification", func(t *testing.T) {
		req := &models.CreateNotificationRequest{
			UserID:  user1.ID,
			Type:    models.NotificationFollowRequest,
			Title:   "Test Notification",
			Message: "This is a test notification",
		}

		notification, err := notificationRepo.CreateNotification(req)
		if err != nil {
			t.Fatalf("Failed to create notification: %v", err)
		}

		if notification.ID == 0 {
			t.Error("Notification should have an ID")
		}
	})

	t.Run("Get notifications", func(t *testing.T) {
		req, _ := http.NewRequest("GET", "/api/notifications", nil)
		req.AddCookie(&http.Cookie{Name: "session_id", Value: session1.ID})

		rr := httptest.NewRecorder()
		sessionManager.AuthMiddleware(http.HandlerFunc(notificationHandler.GetNotifications)).ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("Expected status 200, got %d", rr.Code)
		}

		// Parse response to verify notification exists
		var response map[string]interface{}
		json.Unmarshal(rr.Body.Bytes(), &response)

		notifications := response["data"].(map[string]interface{})["notifications"].([]interface{})
		if len(notifications) == 0 {
			t.Error("Expected at least one notification")
		}

		unreadCount := response["data"].(map[string]interface{})["unread_count"].(float64)
		if unreadCount == 0 {
			t.Error("Expected unread count > 0")
		}
	})
}

// Helper function to create test user with session
func createTestUser(t *testing.T, userRepo *models.UserRepository, sessionManager *auth.SessionManager, email string, isPublic bool) (*models.User, *models.Session) {
	hashedPassword, _ := auth.HashPassword("password123")

	createUserReq := &models.CreateUserRequest{
		Email:       email,
		FirstName:   "Test",
		LastName:    "User",
		DateOfBirth: "1990-01-01",
	}

	user, err := userRepo.CreateUser(createUserReq, hashedPassword)
	if err != nil {
		t.Fatalf("Failed to create test user: %v", err)
	}

	// Update user's privacy setting
	updates := map[string]interface{}{"is_public": isPublic}
	userRepo.UpdateProfile(user.ID, updates)
	user.IsPublic = isPublic

	session, err := sessionManager.CreateSession(user.ID)
	if err != nil {
		t.Fatalf("Failed to create test session: %v", err)
	}

	return user, session
}
