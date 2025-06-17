// backend/tests/integration_test (Updated for Phase 4)
package tests

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"ripple/pkg/auth"
	"ripple/pkg/handlers"
	"ripple/pkg/models"
)

func TestPhase4Integration(t *testing.T) {
	database, cleanup := setupTestDB()
	defer cleanup()

	// Initialize all repositories
	userRepo := models.NewUserRepository(database.DB)
	groupRepo := models.NewGroupRepository(database.DB)
	groupPostRepo := models.NewGroupPostRepository(database.DB)
	eventRepo := models.NewEventRepository(database.DB)
	notificationRepo := models.NewNotificationRepository(database.DB)
	sessionManager := auth.NewSessionManager(database.DB)

	// Initialize handlers
	groupHandler := handlers.NewGroupHandler(groupRepo, groupPostRepo, notificationRepo, userRepo)
	eventHandler := handlers.NewEventHandler(eventRepo, groupRepo, notificationRepo)

	// Create test users
	_, session1 := createTestUser(t, userRepo, sessionManager, "alice@integration.com", true)
	_, session2 := createTestUser(t, userRepo, sessionManager, "bob@integration.com", true)
	user3, session3 := createTestUser(t, userRepo, sessionManager, "charlie@integration.com", true)

	var groupID, eventID int

	t.Run("Complete workflow: Group creation to event participation", func(t *testing.T) {
		// Step 1: Create group
		payload := map[string]interface{}{
			"title":       "Integration Test Group",
			"description": "Testing the complete workflow",
		}
		jsonPayload, _ := json.Marshal(payload)
		
		req, _ := http.NewRequest("POST", "/api/groups", bytes.NewBuffer(jsonPayload))
		req.Header.Set("Content-Type", "application/json")
		req.AddCookie(&http.Cookie{Name: "session_id", Value: session1.ID})

		rr := httptest.NewRecorder()
		sessionManager.AuthMiddleware(http.HandlerFunc(groupHandler.CreateGroup)).ServeHTTP(rr, req)

		if rr.Code != http.StatusCreated {
			t.Errorf("Group creation failed with status %d", rr.Code)
		}

		var response map[string]interface{}
		json.Unmarshal(rr.Body.Bytes(), &response)
		group := response["data"].(map[string]interface{})["group"].(map[string]interface{})
		groupID = int(group["id"].(float64))

		// Step 2: Users join group
		// User2 requests to join
		joinPayload := map[string]int{"group_id": groupID}
		joinJsonPayload, _ := json.Marshal(joinPayload)
		
		req, _ = http.NewRequest("POST", "/api/groups/join", bytes.NewBuffer(joinJsonPayload))
		req.Header.Set("Content-Type", "application/json")
		req.AddCookie(&http.Cookie{Name: "session_id", Value: session2.ID})

		rr = httptest.NewRecorder()
		sessionManager.AuthMiddleware(http.HandlerFunc(groupHandler.JoinGroup)).ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("Join request failed with status %d", rr.Code)
		}

		// Creator accepts join request
		requests, _ := groupRepo.GetPendingJoinRequests(groupID)
		acceptPayload := map[string]interface{}{
			"membership_id": requests[0].ID,
			"action":        "accept",
		}
		acceptJsonPayload, _ := json.Marshal(acceptPayload)
		
		req, _ = http.NewRequest("POST", "/api/groups/handle", bytes.NewBuffer(acceptJsonPayload))
		req.Header.Set("Content-Type", "application/json")
		req.AddCookie(&http.Cookie{Name: "session_id", Value: session1.ID})

		rr = httptest.NewRecorder()
		sessionManager.AuthMiddleware(http.HandlerFunc(groupHandler.HandleMembershipRequest)).ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("Accept join request failed with status %d", rr.Code)
		}

		// User1 invites User3
		invitePayload := map[string]interface{}{
			"group_id": groupID,
			"user_ids": []int{user3.ID},
		}
		inviteJsonPayload, _ := json.Marshal(invitePayload)
		
		req, _ = http.NewRequest("POST", "/api/groups/invite", bytes.NewBuffer(inviteJsonPayload))
		req.Header.Set("Content-Type", "application/json")
		req.AddCookie(&http.Cookie{Name: "session_id", Value: session1.ID})

		rr = httptest.NewRecorder()
		sessionManager.AuthMiddleware(http.HandlerFunc(groupHandler.InviteToGroup)).ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("Invite user failed with status %d", rr.Code)
		}

		// User3 accepts invitation
		invitations, _ := groupRepo.GetPendingInvitations(user3.ID)
		acceptInvitePayload := map[string]interface{}{
			"membership_id": invitations[0].ID,
			"action":        "accept",
		}
		acceptInviteJsonPayload, _ := json.Marshal(acceptInvitePayload)
		
		req, _ = http.NewRequest("POST", "/api/groups/handle", bytes.NewBuffer(acceptInviteJsonPayload))
		req.Header.Set("Content-Type", "application/json")
		req.AddCookie(&http.Cookie{Name: "session_id", Value: session3.ID})

		rr = httptest.NewRecorder()
		sessionManager.AuthMiddleware(http.HandlerFunc(groupHandler.HandleMembershipRequest)).ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("Accept invitation failed with status %d", rr.Code)
		}

		// Step 3: Create group posts
		postPayload := map[string]interface{}{
			"content": "Welcome everyone to our group! 🎉",
		}
		postJsonPayload, _ := json.Marshal(postPayload)
		
		req, _ = http.NewRequest("POST", fmt.Sprintf("/api/groups/%d/posts", groupID), bytes.NewBuffer(postJsonPayload))
		req.Header.Set("Content-Type", "application/json")
		req.AddCookie(&http.Cookie{Name: "session_id", Value: session1.ID})

		rr = httptest.NewRecorder()
		sessionManager.AuthMiddleware(http.HandlerFunc(groupHandler.CreateGroupPost)).ServeHTTP(rr, req)

		if rr.Code != http.StatusCreated {
			t.Errorf("Create group post failed with status %d", rr.Code)
		}

		// Step 4: Create event
		eventDate := time.Now().Add(30 * 24 * time.Hour) // 30 days from now
		eventPayload := map[string]interface{}{
			"title":       "Group Meetup 2025",
			"description": "Let's meet in person and have fun!",
			"event_date":  eventDate.Format(time.RFC3339),
		}
		eventJsonPayload, _ := json.Marshal(eventPayload)
		
		req, _ = http.NewRequest("POST", fmt.Sprintf("/api/groups/%d/events", groupID), bytes.NewBuffer(eventJsonPayload))
		req.Header.Set("Content-Type", "application/json")
		req.AddCookie(&http.Cookie{Name: "session_id", Value: session2.ID})

		rr = httptest.NewRecorder()
		sessionManager.AuthMiddleware(http.HandlerFunc(eventHandler.CreateEvent)).ServeHTTP(rr, req)

		if rr.Code != http.StatusCreated {
			t.Errorf("Create event failed with status %d", rr.Code)
		}

		json.Unmarshal(rr.Body.Bytes(), &response)
		event := response["data"].(map[string]interface{})["event"].(map[string]interface{})
		eventID = int(event["id"].(float64))

		// Step 5: Users respond to event
		responses := []struct {
			userSession string
			response    string
		}{
			{session1.ID, "going"},
			{session2.ID, "going"},
			{session3.ID, "not_going"},
		}

		for _, resp := range responses {
			responsePayload := map[string]string{"response": resp.response}
			responseJsonPayload, _ := json.Marshal(responsePayload)
			
			req, _ = http.NewRequest("POST", fmt.Sprintf("/api/events/%d/respond", eventID), bytes.NewBuffer(responseJsonPayload))
			req.Header.Set("Content-Type", "application/json")
			req.AddCookie(&http.Cookie{Name: "session_id", Value: resp.userSession})

			rr = httptest.NewRecorder()
			sessionManager.AuthMiddleware(http.HandlerFunc(eventHandler.RespondToEvent)).ServeHTTP(rr, req)

			if rr.Code != http.StatusOK {
				t.Errorf("Event response failed with status %d", rr.Code)
			}
		}

		// Step 6: Verify final state
		// Check group membership count
		members, _ := groupRepo.GetGroupMembers(groupID)
		if len(members) != 3 {
			t.Errorf("Expected 3 group members, got %d", len(members))
		}

		// Check event responses
		goingResponses, _ := eventRepo.GetEventResponses(eventID, "going")
		notGoingResponses, _ := eventRepo.GetEventResponses(eventID, "not_going")
		
		if len(goingResponses) != 2 {
			t.Errorf("Expected 2 going responses, got %d", len(goingResponses))
		}
		
		if len(notGoingResponses) != 1 {
			t.Errorf("Expected 1 not going response, got %d", len(notGoingResponses))
		}

		t.Logf("✅ Integration test completed successfully!")
		t.Logf("📊 Final state: %d members, %d going, %d not going", len(members), len(goingResponses), len(notGoingResponses))
	})
}