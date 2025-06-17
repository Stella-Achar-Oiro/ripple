// backend/tests/group_test.go
package tests

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"ripple/pkg/auth"
	"ripple/pkg/handlers"
	"ripple/pkg/models"
)

func TestGroupSystem(t *testing.T) {
	database, cleanup := setupTestDB()
	defer cleanup()

	userRepo := models.NewUserRepository(database.DB)
	groupRepo := models.NewGroupRepository(database.DB)
	groupPostRepo := models.NewGroupPostRepository(database.DB)
	notificationRepo := models.NewNotificationRepository(database.DB)
	sessionManager := auth.NewSessionManager(database.DB)
	groupHandler := handlers.NewGroupHandler(groupRepo, groupPostRepo, notificationRepo, userRepo)

	// Create test users
	user1, session1 := createTestUser(t, userRepo, sessionManager, "alice@test.com", true)  // group creator
	_ = user1 // Ensure user1 is used even if temporarily not referenced
	user2, session2 := createTestUser(t, userRepo, sessionManager, "bob@test.com", true)    // group member
	user3, session3 := createTestUser(t, userRepo, sessionManager, "charlie@test.com", true) // outsider

	var createdGroupID int

	t.Run("Create group", func(t *testing.T) {
		payload := map[string]interface{}{
			"title":       "Tech Enthusiasts",
			"description": "A group for technology lovers and professionals",
		}
		jsonPayload, _ := json.Marshal(payload)
		
		req, _ := http.NewRequest("POST", "/api/groups", bytes.NewBuffer(jsonPayload))
		req.Header.Set("Content-Type", "application/json")
		req.AddCookie(&http.Cookie{Name: "session_id", Value: session1.ID})

		rr := httptest.NewRecorder()
		sessionManager.AuthMiddleware(http.HandlerFunc(groupHandler.CreateGroup)).ServeHTTP(rr, req)

		if rr.Code != http.StatusCreated {
			t.Errorf("Expected status 201, got %d", rr.Code)
		}

		var response map[string]interface{}
		json.Unmarshal(rr.Body.Bytes(), &response)
		
		if !response["success"].(bool) {
			t.Errorf("Expected success, got failure: %v", response["error"])
		}

		group := response["data"].(map[string]interface{})["group"].(map[string]interface{})
		createdGroupID = int(group["id"].(float64))
		
		if group["title"] != "Tech Enthusiasts" {
			t.Errorf("Expected group title 'Tech Enthusiasts', got %s", group["title"])
		}
	})

	t.Run("Get group", func(t *testing.T) {
		req, _ := http.NewRequest("GET", fmt.Sprintf("/api/groups/%d", createdGroupID), nil)
		req.AddCookie(&http.Cookie{Name: "session_id", Value: session1.ID})

		rr := httptest.NewRecorder()
		sessionManager.AuthMiddleware(http.HandlerFunc(groupHandler.GetGroup)).ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("Expected status 200, got %d", rr.Code)
		}

		var response map[string]interface{}
		json.Unmarshal(rr.Body.Bytes(), &response)
		
		group := response["data"].(map[string]interface{})
		if group["title"] != "Tech Enthusiasts" {
			t.Errorf("Expected group title 'Tech Enthusiasts', got %v", group["title"])
		}
		
		if !group["is_creator"].(bool) {
			t.Error("User1 should be the creator of the group")
		}
		
		if !group["is_member"].(bool) {
			t.Error("Creator should be a member of the group")
		}
	})

	t.Run("Browse all groups", func(t *testing.T) {
		req, _ := http.NewRequest("GET", "/api/groups?limit=10", nil)
		req.AddCookie(&http.Cookie{Name: "session_id", Value: session2.ID})

		rr := httptest.NewRecorder()
		sessionManager.AuthMiddleware(http.HandlerFunc(groupHandler.GetAllGroups)).ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("Expected status 200, got %d", rr.Code)
		}

		var response map[string]interface{}
		json.Unmarshal(rr.Body.Bytes(), &response)
		
		groups := response["data"].(map[string]interface{})["groups"].([]interface{})
		if len(groups) != 1 {
			t.Errorf("Expected 1 group, got %d", len(groups))
		}
	})

	t.Run("Request to join group", func(t *testing.T) {
		payload := map[string]int{"group_id": createdGroupID}
		jsonPayload, _ := json.Marshal(payload)
		
		req, _ := http.NewRequest("POST", "/api/groups/join", bytes.NewBuffer(jsonPayload))
		req.Header.Set("Content-Type", "application/json")
		req.AddCookie(&http.Cookie{Name: "session_id", Value: session2.ID})

		rr := httptest.NewRecorder()
		sessionManager.AuthMiddleware(http.HandlerFunc(groupHandler.JoinGroup)).ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("Expected status 200, got %d", rr.Code)
		}
	})

	t.Run("Get pending join requests (creator)", func(t *testing.T) {
		req, _ := http.NewRequest("GET", fmt.Sprintf("/api/groups/%d/join-requests", createdGroupID), nil)
		req.AddCookie(&http.Cookie{Name: "session_id", Value: session1.ID})

		rr := httptest.NewRecorder()
		sessionManager.AuthMiddleware(http.HandlerFunc(groupHandler.GetPendingJoinRequests)).ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("Expected status 200, got %d", rr.Code)
		}

		var response map[string]interface{}
		json.Unmarshal(rr.Body.Bytes(), &response)
		
		requests := response["data"].(map[string]interface{})["join_requests"].([]interface{})
		if len(requests) != 1 {
			t.Errorf("Expected 1 join request, got %d", len(requests))
		}
	})

	t.Run("Accept join request", func(t *testing.T) {
		// First get the membership ID
		requests, _ := groupRepo.GetPendingJoinRequests(createdGroupID)
		if len(requests) == 0 {
			t.Fatal("No pending join requests found")
		}

		payload := map[string]interface{}{
			"membership_id": requests[0].ID,
			"action":        "accept",
		}
		jsonPayload, _ := json.Marshal(payload)
		
		req, _ := http.NewRequest("POST", "/api/groups/handle", bytes.NewBuffer(jsonPayload))
		req.Header.Set("Content-Type", "application/json")
		req.AddCookie(&http.Cookie{Name: "session_id", Value: session1.ID})

		rr := httptest.NewRecorder()
		sessionManager.AuthMiddleware(http.HandlerFunc(groupHandler.HandleMembershipRequest)).ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("Expected status 200, got %d", rr.Code)
		}

		// Verify membership
		isMember, _ := groupRepo.IsMember(createdGroupID, user2.ID)
		if !isMember {
			t.Error("User2 should be a member after acceptance")
		}
	})

	t.Run("Invite user to group", func(t *testing.T) {
		payload := map[string]interface{}{
			"group_id": createdGroupID,
			"user_ids": []int{user3.ID},
		}
		jsonPayload, _ := json.Marshal(payload)
		
		req, _ := http.NewRequest("POST", "/api/groups/invite", bytes.NewBuffer(jsonPayload))
		req.Header.Set("Content-Type", "application/json")
		req.AddCookie(&http.Cookie{Name: "session_id", Value: session2.ID}) // User2 invites User3

		rr := httptest.NewRecorder()
		sessionManager.AuthMiddleware(http.HandlerFunc(groupHandler.InviteToGroup)).ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("Expected status 200, got %d", rr.Code)
		}
	})

	t.Run("Get pending invitations", func(t *testing.T) {
		req, _ := http.NewRequest("GET", "/api/groups/invitations", nil)
		req.AddCookie(&http.Cookie{Name: "session_id", Value: session3.ID})

		rr := httptest.NewRecorder()
		sessionManager.AuthMiddleware(http.HandlerFunc(groupHandler.GetPendingInvitations)).ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("Expected status 200, got %d", rr.Code)
		}

		var response map[string]interface{}
		json.Unmarshal(rr.Body.Bytes(), &response)
		
		invitations := response["data"].(map[string]interface{})["invitations"].([]interface{})
		if len(invitations) != 1 {
			t.Errorf("Expected 1 invitation, got %d", len(invitations))
		}
	})

	t.Run("Accept group invitation", func(t *testing.T) {
		// Get the invitation ID
		invitations, _ := groupRepo.GetPendingInvitations(user3.ID)
		if len(invitations) == 0 {
			t.Fatal("No pending invitations found")
		}

		payload := map[string]interface{}{
			"membership_id": invitations[0].ID,
			"action":        "accept",
		}
		jsonPayload, _ := json.Marshal(payload)
		
		req, _ := http.NewRequest("POST", "/api/groups/handle", bytes.NewBuffer(jsonPayload))
		req.Header.Set("Content-Type", "application/json")
		req.AddCookie(&http.Cookie{Name: "session_id", Value: session3.ID})

		rr := httptest.NewRecorder()
		sessionManager.AuthMiddleware(http.HandlerFunc(groupHandler.HandleMembershipRequest)).ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("Expected status 200, got %d", rr.Code)
		}

		// Verify membership
		isMember, _ := groupRepo.IsMember(createdGroupID, user3.ID)
		if !isMember {
			t.Error("User3 should be a member after accepting invitation")
		}
	})

	t.Run("Get group members", func(t *testing.T) {
		req, _ := http.NewRequest("GET", fmt.Sprintf("/api/groups/%d/members", createdGroupID), nil)
		req.AddCookie(&http.Cookie{Name: "session_id", Value: session1.ID})

		rr := httptest.NewRecorder()
		sessionManager.AuthMiddleware(http.HandlerFunc(groupHandler.GetGroupMembers)).ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("Expected status 200, got %d", rr.Code)
		}

		var response map[string]interface{}
		json.Unmarshal(rr.Body.Bytes(), &response)
		
		members := response["data"].(map[string]interface{})["members"].([]interface{})
		if len(members) != 3 { // Creator + 2 accepted members
			t.Errorf("Expected 3 members, got %d", len(members))
		}
	})

	t.Run("Create group post", func(t *testing.T) {
		payload := map[string]interface{}{
			"content": "Welcome to our tech group! Let's share knowledge and grow together 🚀",
		}
		jsonPayload, _ := json.Marshal(payload)
		
		req, _ := http.NewRequest("POST", fmt.Sprintf("/api/groups/%d/posts", createdGroupID), bytes.NewBuffer(jsonPayload))
		req.Header.Set("Content-Type", "application/json")
		req.AddCookie(&http.Cookie{Name: "session_id", Value: session1.ID})

		rr := httptest.NewRecorder()
		sessionManager.AuthMiddleware(http.HandlerFunc(groupHandler.CreateGroupPost)).ServeHTTP(rr, req)

		if rr.Code != http.StatusCreated {
			t.Errorf("Expected status 201, got %d", rr.Code)
		}
	})

	t.Run("Get group posts", func(t *testing.T) {
		req, _ := http.NewRequest("GET", fmt.Sprintf("/api/groups/%d/posts", createdGroupID), nil)
		req.AddCookie(&http.Cookie{Name: "session_id", Value: session2.ID})

		rr := httptest.NewRecorder()
		sessionManager.AuthMiddleware(http.HandlerFunc(groupHandler.GetGroupPosts)).ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("Expected status 200, got %d", rr.Code)
		}

		var response map[string]interface{}
		json.Unmarshal(rr.Body.Bytes(), &response)
		
		posts := response["data"].(map[string]interface{})["posts"].([]interface{})
		if len(posts) != 1 {
			t.Errorf("Expected 1 post, got %d", len(posts))
		}
	})

	t.Run("Non-member cannot view group posts", func(t *testing.T) {
		// Create another user who is not a member
		user4, session4 := createTestUser(t, userRepo, sessionManager, "dave@test.com", true)
		_ = user4 // Avoid unused variable warning

		req, _ := http.NewRequest("GET", fmt.Sprintf("/api/groups/%d/posts", createdGroupID), nil)
		req.AddCookie(&http.Cookie{Name: "session_id", Value: session4.ID})

		rr := httptest.NewRecorder()
		sessionManager.AuthMiddleware(http.HandlerFunc(groupHandler.GetGroupPosts)).ServeHTTP(rr, req)

		if rr.Code != http.StatusForbidden {
			t.Errorf("Expected status 403, got %d", rr.Code)
		}
	})
}

