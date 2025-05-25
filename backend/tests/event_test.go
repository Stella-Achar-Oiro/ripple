// backend/tests/event_test.go
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

func TestEventSystem(t *testing.T) {
	database, cleanup := setupTestDB()
	defer cleanup()

	userRepo := models.NewUserRepository(database.DB)
	groupRepo := models.NewGroupRepository(database.DB)
	eventRepo := models.NewEventRepository(database.DB)
	notificationRepo := models.NewNotificationRepository(database.DB)
	sessionManager := auth.NewSessionManager(database.DB)
	eventHandler := handlers.NewEventHandler(eventRepo, groupRepo, notificationRepo)

	// Create test users and group
	user1, session1 := createTestUser(t, userRepo, sessionManager, "alice@test.com", true)
	user2, session2 := createTestUser(t, userRepo, sessionManager, "bob@test.com", true)

	// Create a group
	groupReq := &models.CreateGroupRequest{
		Title:       "Event Planners",
		Description: "Planning awesome events together",
	}
	group, err := groupRepo.CreateGroup(user1.ID, groupReq)
	if err != nil {
		t.Fatalf("Failed to create test group: %v", err)
	}

	// Add user2 to the group
	err = groupRepo.RequestToJoinGroup(group.ID, user2.ID)
	if err != nil {
		t.Fatalf("Failed to request group membership: %v", err)
	}

	// Accept the join request
	requests, _ := groupRepo.GetPendingJoinRequests(group.ID)
	err = groupRepo.HandleMembershipRequest(requests[0].ID, user1.ID, "accept")
	if err != nil {
		t.Fatalf("Failed to accept join request: %v", err)
	}

	var createdEventID int

	t.Run("Create event", func(t *testing.T) {
		// Create event for next week
		eventDate := time.Now().Add(7 * 24 * time.Hour)
		
		payload := map[string]interface{}{
			"title":       "Tech Conference 2025",
			"description": "Annual technology conference with latest trends and networking",
			"event_date":  eventDate.Format(time.RFC3339),
		}
		jsonPayload, _ := json.Marshal(payload)
		
		req, _ := http.NewRequest("POST", fmt.Sprintf("/api/groups/%d/events", group.ID), bytes.NewBuffer(jsonPayload))
		req.Header.Set("Content-Type", "application/json")
		req.AddCookie(&http.Cookie{Name: "session_id", Value: session1.ID})

		rr := httptest.NewRecorder()
		sessionManager.AuthMiddleware(http.HandlerFunc(eventHandler.CreateEvent)).ServeHTTP(rr, req)

		if rr.Code != http.StatusCreated {
			t.Errorf("Expected status 201, got %d", rr.Code)
		}

		var response map[string]interface{}
		json.Unmarshal(rr.Body.Bytes(), &response)
		
		if !response["success"].(bool) {
			t.Errorf("Expected success, got failure: %v", response["error"])
		}

		event := response["data"].(map[string]interface{})["event"].(map[string]interface{})
		createdEventID = int(event["id"].(float64))
		
		if event["title"] != "Tech Conference 2025" {
			t.Errorf("Expected event title 'Tech Conference 2025', got %s", event["title"])
		}
	})

	t.Run("Get event", func(t *testing.T) {
		req, _ := http.NewRequest("GET", fmt.Sprintf("/api/events/%d", createdEventID), nil)
		req.AddCookie(&http.Cookie{Name: "session_id", Value: session1.ID})

		rr := httptest.NewRecorder()
		sessionManager.AuthMiddleware(http.HandlerFunc(eventHandler.GetEvent)).ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("Expected status 200, got %d", rr.Code)
		}

		var response map[string]interface{}
		json.Unmarshal(rr.Body.Bytes(), &response)
		
		event := response["data"].(map[string]interface{})
		if event["title"] != "Tech Conference 2025" {
			t.Errorf("Expected event title 'Tech Conference 2025', got %v", event["title"])
		}
		
		if !event["is_creator"].(bool) {
			t.Error("User1 should be the creator of the event")
		}
	})

	t.Run("Get group events", func(t *testing.T) {
		req, _ := http.NewRequest("GET", fmt.Sprintf("/api/groups/%d/events", group.ID), nil)
		req.AddCookie(&http.Cookie{Name: "session_id", Value: session2.ID})

		rr := httptest.NewRecorder()
		sessionManager.AuthMiddleware(http.HandlerFunc(eventHandler.GetGroupEvents)).ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("Expected status 200, got %d", rr.Code)
		}

		var response map[string]interface{}
		json.Unmarshal(rr.Body.Bytes(), &response)
		
		events := response["data"].(map[string]interface{})["events"].([]interface{})
		if len(events) != 1 {
			t.Errorf("Expected 1 event, got %d", len(events))
		}
	})

	t.Run("Respond to event - going", func(t *testing.T) {
		payload := map[string]string{"response": "going"}
		jsonPayload, _ := json.Marshal(payload)
		
		req, _ := http.NewRequest("POST", fmt.Sprintf("/api/events/%d/respond", createdEventID), bytes.NewBuffer(jsonPayload))
		req.Header.Set("Content-Type", "application/json")
		req.AddCookie(&http.Cookie{Name: "session_id", Value: session2.ID})

		rr := httptest.NewRecorder()
		sessionManager.AuthMiddleware(http.HandlerFunc(eventHandler.RespondToEvent)).ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("Expected status 200, got %d", rr.Code)
		}
	})

	t.Run("Respond to event - not going", func(t *testing.T) {
		payload := map[string]string{"response": "not_going"}
		jsonPayload, _ := json.Marshal(payload)
		
		req, _ := http.NewRequest("POST", fmt.Sprintf("/api/events/%d/respond", createdEventID), bytes.NewBuffer(jsonPayload))
		req.Header.Set("Content-Type", "application/json")
		req.AddCookie(&http.Cookie{Name: "session_id", Value: session1.ID})

		rr := httptest.NewRecorder()
		sessionManager.AuthMiddleware(http.HandlerFunc(eventHandler.RespondToEvent)).ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("Expected status 200, got %d", rr.Code)
		}
	})

	t.Run("Change response to going", func(t *testing.T) {
		payload := map[string]string{"response": "going"}
		jsonPayload, _ := json.Marshal(payload)
		
		req, _ := http.NewRequest("POST", fmt.Sprintf("/api/events/%d/respond", createdEventID), bytes.NewBuffer(jsonPayload))
		req.Header.Set("Content-Type", "application/json")
		req.AddCookie(&http.Cookie{Name: "session_id", Value: session1.ID})

		rr := httptest.NewRecorder()
		sessionManager.AuthMiddleware(http.HandlerFunc(eventHandler.RespondToEvent)).ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("Expected status 200, got %d", rr.Code)
		}
	})

	t.Run("Get event responses", func(t *testing.T) {
		req, _ := http.NewRequest("GET", fmt.Sprintf("/api/events/%d/responses", createdEventID), nil)
		req.AddCookie(&http.Cookie{Name: "session_id", Value: session1.ID})

		rr := httptest.NewRecorder()
		sessionManager.AuthMiddleware(http.HandlerFunc(eventHandler.GetEventResponses)).ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("Expected status 200, got %d", rr.Code)
		}

		var response map[string]interface{}
		json.Unmarshal(rr.Body.Bytes(), &response)
		
		data := response["data"].(map[string]interface{})
		goingResponses := data["going"].([]interface{})
		notGoingResponses := data["not_going"].([]interface{})
		
		if len(goingResponses) != 2 {
			t.Errorf("Expected 2 going responses, got %d", len(goingResponses))
		}
		
		if len(notGoingResponses) != 0 {
			t.Errorf("Expected 0 not going responses, got %d", len(notGoingResponses))
		}
	})

	t.Run("Non-member cannot view event", func(t *testing.T) {
		// Create another user who is not a member
		user3, session3 := createTestUser(t, userRepo, sessionManager, "charlie@test.com", true)
		_ = user3 // Avoid unused variable warning

		req, _ := http.NewRequest("GET", fmt.Sprintf("/api/events/%d", createdEventID), nil)
		req.AddCookie(&http.Cookie{Name: "session_id", Value: session3.ID})

		rr := httptest.NewRecorder()
		sessionManager.AuthMiddleware(http.HandlerFunc(eventHandler.GetEvent)).ServeHTTP(rr, req)

		if rr.Code != http.StatusForbidden {
			t.Errorf("Expected status 403, got %d", rr.Code)
		}
	})

	t.Run("Create event with past date should fail", func(t *testing.T) {
		// Try to create event with past date
		pastDate := time.Now().Add(-24 * time.Hour)
		
		payload := map[string]interface{}{
			"title":       "Past Event",
			"description": "This should fail",
			"event_date":  pastDate.Format(time.RFC3339),
		}
		jsonPayload, _ := json.Marshal(payload)
		
		req, _ := http.NewRequest("POST", fmt.Sprintf("/api/groups/%d/events", group.ID), bytes.NewBuffer(jsonPayload))
		req.Header.Set("Content-Type", "application/json")
		req.AddCookie(&http.Cookie{Name: "session_id", Value: session1.ID})

		rr := httptest.NewRecorder()
		sessionManager.AuthMiddleware(http.HandlerFunc(eventHandler.CreateEvent)).ServeHTTP(rr, req)

		if rr.Code != http.StatusBadRequest {
			t.Errorf("Expected status 400 for past date, got %d", rr.Code)
		}
	})
}

