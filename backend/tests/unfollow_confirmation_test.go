// backend/tests/unfollow_confirmation_test.go
package tests

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"ripple/pkg/auth"
	"ripple/pkg/handlers"
	"ripple/pkg/models"
)

func TestUnfollowConfirmation(t *testing.T) {
	database, cleanup := setupTestDB()
	defer cleanup()

	// Initialize repositories
	userRepo := models.NewUserRepository(database.DB)
	followRepo := models.NewFollowRepository(database.DB)
	notificationRepo := models.NewNotificationRepository(database.DB)
	sessionManager := auth.NewSessionManager(database.DB)

	// Initialize handler
	followHandler := handlers.NewFollowHandler(followRepo, userRepo, notificationRepo)

	// Create test users
	alice, aliceSession := createTestUser(t, userRepo, sessionManager, "alice@test.com", false) // private
	bob, bobSession := createTestUser(t, userRepo, sessionManager, "bob@test.com", true)       // public
	charlie, charlieSession := createTestUser(t, userRepo, sessionManager, "charlie@test.com", false) // private

	// Alice follows Bob (public user)
	_, err := followRepo.CreateFollowRequest(alice.ID, bob.ID)
	if err != nil {
		t.Fatalf("Failed to create follow request: %v", err)
	}

	// Alice follows Charlie (private user)
	followRequest, err := followRepo.CreateFollowRequest(alice.ID, charlie.ID)
	if err != nil {
		t.Fatalf("Failed to create follow request: %v", err)
	}

	// Accept Charlie's follow request
	err = followRepo.AcceptFollowRequest(followRequest.ID, charlie.ID)
	if err != nil {
		t.Fatalf("Failed to accept follow request: %v", err)
	}

	t.Run("UnfollowPublicUserNoConfirmationRequired", func(t *testing.T) {
		// Alice unfollows Bob (public user) - should work without confirmation
		unfollowReq := map[string]interface{}{
			"user_id": bob.ID,
		}
		reqBody, _ := json.Marshal(unfollowReq)

		req := httptest.NewRequest("POST", "/api/unfollow", bytes.NewBuffer(reqBody))
		req.AddCookie(&http.Cookie{Name: "session_id", Value: aliceSession.ID})

		rr := httptest.NewRecorder()
		sessionManager.AuthMiddleware(http.HandlerFunc(followHandler.UnfollowUser)).ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("Expected status 200, got %d. Response: %s", rr.Code, rr.Body.String())
		}

		var response map[string]interface{}
		json.Unmarshal(rr.Body.Bytes(), &response)

		if !response["success"].(bool) {
			t.Errorf("Expected success, got failure: %v", response["error"])
		}
	})

	t.Run("UnfollowPrivateUserWithoutConfirmation", func(t *testing.T) {
		// Alice tries to unfollow Charlie (private user) without confirmation - should fail
		unfollowReq := map[string]interface{}{
			"user_id": charlie.ID,
		}
		reqBody, _ := json.Marshal(unfollowReq)

		req := httptest.NewRequest("POST", "/api/unfollow", bytes.NewBuffer(reqBody))
		req.AddCookie(&http.Cookie{Name: "session_id", Value: aliceSession.ID})

		rr := httptest.NewRecorder()
		sessionManager.AuthMiddleware(http.HandlerFunc(followHandler.UnfollowUser)).ServeHTTP(rr, req)

		if rr.Code != http.StatusBadRequest {
			t.Errorf("Expected status 400, got %d. Response: %s", rr.Code, rr.Body.String())
		}

		var response map[string]interface{}
		json.Unmarshal(rr.Body.Bytes(), &response)

		if response["success"].(bool) {
			t.Error("Expected failure, got success")
		}

		// Check error details
		errorData, ok := response["error"].(map[string]interface{})
		if !ok {
			t.Fatal("Expected error object in response")
		}

		if errorData["code"] != "CONFIRMATION_REQUIRED" {
			t.Errorf("Expected error code CONFIRMATION_REQUIRED, got %s", errorData["code"])
		}

		if !errorData["requires_confirmation"].(bool) {
			t.Error("Expected requires_confirmation to be true")
		}

		if errorData["user_id"].(float64) != float64(charlie.ID) {
			t.Errorf("Expected user_id %d, got %v", charlie.ID, errorData["user_id"])
		}

		expectedUserName := charlie.FirstName + " " + charlie.LastName
		if errorData["user_name"] != expectedUserName {
			t.Errorf("Expected user_name %s, got %s", expectedUserName, errorData["user_name"])
		}
	})

	t.Run("UnfollowPrivateUserWithConfirmation", func(t *testing.T) {
		// Alice unfollows Charlie (private user) with confirmation - should work
		unfollowReq := map[string]interface{}{
			"user_id":   charlie.ID,
			"confirmed": true,
		}
		reqBody, _ := json.Marshal(unfollowReq)

		req := httptest.NewRequest("POST", "/api/unfollow", bytes.NewBuffer(reqBody))
		req.AddCookie(&http.Cookie{Name: "session_id", Value: aliceSession.ID})

		rr := httptest.NewRecorder()
		sessionManager.AuthMiddleware(http.HandlerFunc(followHandler.UnfollowUser)).ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("Expected status 200, got %d. Response: %s", rr.Code, rr.Body.String())
		}

		var response map[string]interface{}
		json.Unmarshal(rr.Body.Bytes(), &response)

		if !response["success"].(bool) {
			t.Errorf("Expected success, got failure: %v", response["error"])
		}

		// Verify that Alice is no longer following Charlie
		isFollowing, err := followRepo.IsFollowing(alice.ID, charlie.ID)
		if err != nil {
			t.Fatalf("Failed to check follow status: %v", err)
		}

		if isFollowing {
			t.Error("Alice should no longer be following Charlie")
		}
	})

	t.Run("UnfollowNonExistentUser", func(t *testing.T) {
		// Try to unfollow a non-existent user
		unfollowReq := map[string]interface{}{
			"user_id": 99999,
		}
		reqBody, _ := json.Marshal(unfollowReq)

		req := httptest.NewRequest("POST", "/api/unfollow", bytes.NewBuffer(reqBody))
		req.AddCookie(&http.Cookie{Name: "session_id", Value: aliceSession.ID})

		rr := httptest.NewRecorder()
		sessionManager.AuthMiddleware(http.HandlerFunc(followHandler.UnfollowUser)).ServeHTTP(rr, req)

		if rr.Code != http.StatusNotFound {
			t.Errorf("Expected status 404, got %d. Response: %s", rr.Code, rr.Body.String())
		}
	})

	t.Run("UnfollowUserNotFollowing", func(t *testing.T) {
		// Bob tries to unfollow Charlie (not following)
		unfollowReq := map[string]interface{}{
			"user_id":   charlie.ID,
			"confirmed": true,
		}
		reqBody, _ := json.Marshal(unfollowReq)

		req := httptest.NewRequest("POST", "/api/unfollow", bytes.NewBuffer(reqBody))
		req.AddCookie(&http.Cookie{Name: "session_id", Value: bobSession.ID})

		rr := httptest.NewRecorder()
		sessionManager.AuthMiddleware(http.HandlerFunc(followHandler.UnfollowUser)).ServeHTTP(rr, req)

		if rr.Code != http.StatusBadRequest {
			t.Errorf("Expected status 400, got %d. Response: %s", rr.Code, rr.Body.String())
		}

		var response map[string]interface{}
		json.Unmarshal(rr.Body.Bytes(), &response)

		if response["success"].(bool) {
			t.Error("Expected failure, got success")
		}
	})
}
