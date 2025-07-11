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

	t.Run("Decline and resend follow request", func(t *testing.T) {
		// Create a new user for this test
		user3, session3 := createTestUser(t, userRepo, sessionManager, "charlie@test.com", false) // private

		// Alice sends follow request to Charlie (private user)
		payload := map[string]int{"user_id": user3.ID}
		jsonPayload, _ := json.Marshal(payload)

		req, _ := http.NewRequest("POST", "/api/follow/request", bytes.NewBuffer(jsonPayload))
		req.Header.Set("Content-Type", "application/json")
		req.AddCookie(&http.Cookie{Name: "session_id", Value: session1.ID})

		rr := httptest.NewRecorder()
		sessionManager.AuthMiddleware(http.HandlerFunc(followHandler.FollowUser)).ServeHTTP(rr, req)

		if rr.Code != http.StatusCreated {
			t.Errorf("Expected status 201, got %d. Body: %s", rr.Code, rr.Body.String())
			return
		}

		// Get the follow request ID
		requests, err := followRepo.GetPendingFollowRequests(user3.ID)
		if err != nil {
			t.Fatalf("Failed to get pending follow requests: %v", err)
		}

		if len(requests) == 0 {
			t.Fatal("No pending follow requests found")
		}

		followRequestID := requests[0].ID

		// Charlie declines the follow request
		declinePayload := map[string]interface{}{
			"follow_id": followRequestID,
			"action":    "decline",
		}
		declineJsonPayload, _ := json.Marshal(declinePayload)

		declineReq, _ := http.NewRequest("POST", "/api/follow/handle", bytes.NewBuffer(declineJsonPayload))
		declineReq.Header.Set("Content-Type", "application/json")
		declineReq.AddCookie(&http.Cookie{Name: "session_id", Value: session3.ID})

		declineRr := httptest.NewRecorder()
		sessionManager.AuthMiddleware(http.HandlerFunc(followHandler.HandleFollowRequest)).ServeHTTP(declineRr, declineReq)

		if declineRr.Code != http.StatusOK {
			t.Errorf("Expected status 200 for decline, got %d. Body: %s", declineRr.Code, declineRr.Body.String())
			return
		}

		t.Logf("Decline follow request response: %s", declineRr.Body.String())

		// Verify the request is declined
		status, err := followRepo.GetFollowRelationshipStatus(user1.ID, user3.ID)
		if err != nil {
			t.Fatalf("Failed to get relationship status: %v", err)
		}
		if status != "declined" {
			t.Errorf("Expected status 'declined', got %s", status)
		}

		// Alice tries to send follow request again (should succeed)
		resendReq, _ := http.NewRequest("POST", "/api/follow/request", bytes.NewBuffer(jsonPayload))
		resendReq.Header.Set("Content-Type", "application/json")
		resendReq.AddCookie(&http.Cookie{Name: "session_id", Value: session1.ID})

		resendRr := httptest.NewRecorder()
		sessionManager.AuthMiddleware(http.HandlerFunc(followHandler.FollowUser)).ServeHTTP(resendRr, resendReq)

		t.Logf("Resend follow request response: %s", resendRr.Body.String())

		if resendRr.Code != http.StatusCreated {
			t.Errorf("Expected status 201 for resend, got %d. Body: %s", resendRr.Code, resendRr.Body.String())
			return
		}

		var resendResponse map[string]interface{}
		if err := json.Unmarshal(resendRr.Body.Bytes(), &resendResponse); err != nil {
			t.Fatalf("Failed to unmarshal resend response: %v", err)
		}

		if !resendResponse["success"].(bool) {
			t.Errorf("Expected success for resend, got failure: %v", resendResponse["error"])
			return
		}

		// Verify the request is now pending again
		newStatus, err := followRepo.GetFollowRelationshipStatus(user1.ID, user3.ID)
		if err != nil {
			t.Fatalf("Failed to get relationship status after resend: %v", err)
		}
		if newStatus != "pending" {
			t.Errorf("Expected status 'pending' after resend, got %s", newStatus)
		}

		// Verify Charlie has a new pending request
		newRequests, err := followRepo.GetPendingFollowRequests(user3.ID)
		if err != nil {
			t.Fatalf("Failed to get pending follow requests after resend: %v", err)
		}

		if len(newRequests) != 1 {
			t.Errorf("Expected 1 pending request after resend, got %d", len(newRequests))
		}
	})

	t.Run("Cannot send duplicate pending request", func(t *testing.T) {
		// Create a new user for this test
		user4, _ := createTestUser(t, userRepo, sessionManager, "david@test.com", false) // private

		// Alice sends follow request to David (private user)
		payload := map[string]int{"user_id": user4.ID}
		jsonPayload, _ := json.Marshal(payload)

		req, _ := http.NewRequest("POST", "/api/follow/request", bytes.NewBuffer(jsonPayload))
		req.Header.Set("Content-Type", "application/json")
		req.AddCookie(&http.Cookie{Name: "session_id", Value: session1.ID})

		rr := httptest.NewRecorder()
		sessionManager.AuthMiddleware(http.HandlerFunc(followHandler.FollowUser)).ServeHTTP(rr, req)

		if rr.Code != http.StatusCreated {
			t.Errorf("Expected status 201, got %d. Body: %s", rr.Code, rr.Body.String())
			return
		}

		// Try to send the same request again (should fail)
		duplicateReq, _ := http.NewRequest("POST", "/api/follow/request", bytes.NewBuffer(jsonPayload))
		duplicateReq.Header.Set("Content-Type", "application/json")
		duplicateReq.AddCookie(&http.Cookie{Name: "session_id", Value: session1.ID})

		duplicateRr := httptest.NewRecorder()
		sessionManager.AuthMiddleware(http.HandlerFunc(followHandler.FollowUser)).ServeHTTP(duplicateRr, duplicateReq)

		t.Logf("Duplicate follow request response: %s", duplicateRr.Body.String())

		if duplicateRr.Code != http.StatusBadRequest {
			t.Errorf("Expected status 400 for duplicate request, got %d. Body: %s", duplicateRr.Code, duplicateRr.Body.String())
			return
		}

		var duplicateResponse map[string]interface{}
		if err := json.Unmarshal(duplicateRr.Body.Bytes(), &duplicateResponse); err != nil {
			t.Fatalf("Failed to unmarshal duplicate response: %v", err)
		}

		if duplicateResponse["success"].(bool) {
			t.Error("Expected failure for duplicate request, got success")
		}
	})
}
