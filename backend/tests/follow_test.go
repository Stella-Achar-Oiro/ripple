// backend/tests/follow_test.go
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

func TestFollowSystem(t *testing.T) {
	database, cleanup := setupTestDB()
	defer cleanup()

	userRepo := models.NewUserRepository(database.DB)
	followRepo := models.NewFollowRepository(database.DB)
	notificationRepo := models.NewNotificationRepository(database.DB)
	sessionManager := auth.NewSessionManager(database.DB)
	followHandler := handlers.NewFollowHandler(followRepo, userRepo, notificationRepo)

	// Create test users
	user1, session1 := createTestUser(t, userRepo, sessionManager, "alice@test.com", true) // public
	user2, session2 := createTestUser(t, userRepo, sessionManager, "bob@test.com", false)  // private

	t.Logf("Created users: Alice (ID=%d, Public=%t), Bob (ID=%d, Public=%t)",
		user1.ID, user1.IsPublic, user2.ID, user2.IsPublic)

	t.Run("Follow public user", func(t *testing.T) {
		// Bob follows Alice (public user)
		payload := map[string]int{"user_id": user1.ID}
		jsonPayload, _ := json.Marshal(payload)

		req, _ := http.NewRequest("POST", "/api/follow/request", bytes.NewBuffer(jsonPayload))
		req.Header.Set("Content-Type", "application/json")
		req.AddCookie(&http.Cookie{Name: "session_id", Value: session2.ID})

		rr := httptest.NewRecorder()

		// Apply auth middleware
		sessionManager.AuthMiddleware(http.HandlerFunc(followHandler.FollowUser)).ServeHTTP(rr, req)

		t.Logf("Follow public user response: %s", rr.Body.String())

		if rr.Code != http.StatusCreated {
			t.Errorf("Expected status 201, got %d. Body: %s", rr.Code, rr.Body.String())
			return
		}

		var response map[string]interface{}
		if err := json.Unmarshal(rr.Body.Bytes(), &response); err != nil {
			t.Fatalf("Failed to unmarshal response: %v", err)
		}

		if !response["success"].(bool) {
			t.Errorf("Expected success, got failure: %v", response["error"])
			return
		}

		// Check if data exists
		data, ok := response["data"].(map[string]interface{})
		if !ok {
			t.Fatalf("Response data is not a map: %T", response["data"])
		}

		// Should immediately follow public user
		followRequest, ok := data["follow_request"].(map[string]interface{})
		if !ok {
			t.Fatalf("Follow request is not a map: %T", data["follow_request"])
		}

		if followRequest["status"] != "accepted" {
			t.Errorf("Expected status 'accepted', got %s", followRequest["status"])
		}
	})

	t.Run("Follow private user", func(t *testing.T) {
		// Alice follows Bob (private user)
		payload := map[string]int{"user_id": user2.ID}
		jsonPayload, _ := json.Marshal(payload)

		req, _ := http.NewRequest("POST", "/api/follow/request", bytes.NewBuffer(jsonPayload))
		req.Header.Set("Content-Type", "application/json")
		req.AddCookie(&http.Cookie{Name: "session_id", Value: session1.ID})

		rr := httptest.NewRecorder()
		sessionManager.AuthMiddleware(http.HandlerFunc(followHandler.FollowUser)).ServeHTTP(rr, req)

		t.Logf("Follow private user response: %s", rr.Body.String())

		if rr.Code != http.StatusCreated {
			t.Errorf("Expected status 201, got %d. Body: %s", rr.Code, rr.Body.String())
			return
		}

		var response map[string]interface{}
		if err := json.Unmarshal(rr.Body.Bytes(), &response); err != nil {
			t.Fatalf("Failed to unmarshal response: %v", err)
		}

		if !response["success"].(bool) {
			t.Errorf("Expected success, got failure: %v", response["error"])
			return
		}

		// Check if data exists
		data, ok := response["data"].(map[string]interface{})
		if !ok {
			t.Fatalf("Response data is not a map: %T", response["data"])
		}

		// Should be pending for private user
		followRequest, ok := data["follow_request"].(map[string]interface{})
		if !ok {
			t.Fatalf("Follow request is not a map: %T", data["follow_request"])
		}

		if followRequest["status"] != "pending" {
			t.Errorf("Expected status 'pending', got %s", followRequest["status"])
		}
	})

	t.Run("Get follow requests", func(t *testing.T) {
		// Bob should have a pending follow request from Alice
		req, _ := http.NewRequest("GET", "/api/follow/requests", nil)
		req.AddCookie(&http.Cookie{Name: "session_id", Value: session2.ID})

		rr := httptest.NewRecorder()
		sessionManager.AuthMiddleware(http.HandlerFunc(followHandler.GetFollowRequests)).ServeHTTP(rr, req)

		t.Logf("Get follow requests response: %s", rr.Body.String())

		if rr.Code != http.StatusOK {
			t.Errorf("Expected status 200, got %d. Body: %s", rr.Code, rr.Body.String())
			return
		}

		var response map[string]interface{}
		if err := json.Unmarshal(rr.Body.Bytes(), &response); err != nil {
			t.Fatalf("Failed to unmarshal response: %v", err)
		}

		if !response["success"].(bool) {
			t.Errorf("Expected success, got failure: %v", response["error"])
			return
		}

		// Check if data exists
		data, ok := response["data"].(map[string]interface{})
		if !ok {
			t.Fatalf("Response data is not a map: %T", response["data"])
		}

		// Check if follow_requests exists and is not nil
		followRequestsRaw, exists := data["follow_requests"]
		if !exists {
			t.Fatalf("follow_requests key not found in response data")
		}

		if followRequestsRaw == nil {
			t.Fatalf("follow_requests is nil")
		}

		followRequests, ok := followRequestsRaw.([]interface{})
		if !ok {
			t.Fatalf("follow_requests is not an array: %T", followRequestsRaw)
		}

		if len(followRequests) != 1 {
			t.Errorf("Expected 1 follow request, got %d", len(followRequests))
		}
	})

	t.Run("Accept follow request", func(t *testing.T) {
		// First get the follow request ID
		requests, err := followRepo.GetPendingFollowRequests(user2.ID)
		if err != nil {
			t.Fatalf("Failed to get pending follow requests: %v", err)
		}

		if len(requests) == 0 {
			t.Fatal("No pending follow requests found")
		}

		t.Logf("Found %d pending follow requests", len(requests))

		payload := map[string]interface{}{
			"follow_id": requests[0].ID,
			"action":    "accept",
		}
		jsonPayload, _ := json.Marshal(payload)

		req, _ := http.NewRequest("POST", "/api/follow/handle", bytes.NewBuffer(jsonPayload))
		req.Header.Set("Content-Type", "application/json")
		req.AddCookie(&http.Cookie{Name: "session_id", Value: session2.ID})

		rr := httptest.NewRecorder()
		sessionManager.AuthMiddleware(http.HandlerFunc(followHandler.HandleFollowRequest)).ServeHTTP(rr, req)

		t.Logf("Accept follow request response: %s", rr.Body.String())

		if rr.Code != http.StatusOK {
			t.Errorf("Expected status 200, got %d. Body: %s", rr.Code, rr.Body.String())
			return
		}

		// Verify follow relationship
		isFollowing, err := followRepo.IsFollowing(user1.ID, user2.ID)
		if err != nil {
			t.Fatalf("Failed to check follow status: %v", err)
		}

		if !isFollowing {
			t.Error("User1 should be following User2 after acceptance")
		}
	})

	t.Run("Get followers and following", func(t *testing.T) {
		// Test get followers
		followers, err := followRepo.GetFollowers(user2.ID)
		if err != nil {
			t.Fatalf("Failed to get followers: %v", err)
		}
		if len(followers) != 1 {
			t.Errorf("Expected 1 follower, got %d", len(followers))
		}

		// Test get following
		following, err := followRepo.GetFollowing(user1.ID)
		if err != nil {
			t.Fatalf("Failed to get following: %v", err)
		}
		if len(following) != 1 {
			t.Errorf("Expected 1 following, got %d", len(following))
		}
	})

	t.Run("Unfollow user", func(t *testing.T) {
		payload := map[string]int{"user_id": user2.ID}
		jsonPayload, _ := json.Marshal(payload)

		req, _ := http.NewRequest("POST", "/api/follow/unfollow", bytes.NewBuffer(jsonPayload))
		req.Header.Set("Content-Type", "application/json")
		req.AddCookie(&http.Cookie{Name: "session_id", Value: session1.ID})

		rr := httptest.NewRecorder()
		sessionManager.AuthMiddleware(http.HandlerFunc(followHandler.UnfollowUser)).ServeHTTP(rr, req)

		t.Logf("Unfollow user response: %s", rr.Body.String())

		if rr.Code != http.StatusOK {
			t.Errorf("Expected status 200, got %d. Body: %s", rr.Code, rr.Body.String())
			return
		}

		// Verify unfollow
		isFollowing, err := followRepo.IsFollowing(user1.ID, user2.ID)
		if err != nil {
			t.Fatalf("Failed to check follow status after unfollow: %v", err)
		}

		if isFollowing {
			t.Error("User1 should not be following User2 after unfollow")
		}
	})
}

