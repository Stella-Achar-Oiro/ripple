package tests

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"ripple/pkg/auth"
	"ripple/pkg/db"
	"ripple/pkg/handlers"
	"ripple/pkg/models"
	"ripple/pkg/websocket"
	"testing"
)

func TestGroupChatFunctionality(t *testing.T) {
	// Setup test database
	database, err := db.NewDatabase(":memory:")
	if err != nil {
		t.Fatalf("Failed to create test database: %v", err)
	}
	defer database.Close()

	// Run migrations
	if err := database.RunMigrations("../../pkg/db/migrations/sqlite"); err != nil {
		t.Fatalf("Failed to run migrations: %v", err)
	}

	// Initialize repositories
	userRepo := models.NewUserRepository(database.DB)
	followRepo := models.NewFollowRepository(database.DB)
	groupRepo := models.NewGroupRepository(database.DB)
	messageRepo := models.NewMessageRepository(database.DB)

	// Initialize session manager
	sessionManager := auth.NewSessionManager(database.DB)

	// Initialize WebSocket hub
	wsHub := websocket.NewHub(database.DB)
	go wsHub.Run()
	defer wsHub.Stop()

	// Initialize handlers
	chatHandler := handlers.NewChatHandler(messageRepo, followRepo, groupRepo, userRepo, wsHub)
	groupHandler := handlers.NewGroupHandler(groupRepo, nil, nil, userRepo)

	// Create test users
	user1 := &models.CreateUserRequest{
		Email:     "user1@test.com",
		Password:  "password123",
		FirstName: "John",
		LastName:  "Doe",
	}

	user2 := &models.CreateUserRequest{
		Email:     "user2@test.com",
		Password:  "password123",
		FirstName: "Jane",
		LastName:  "Smith",
	}

	// Create users
	createdUser1, err := userRepo.CreateUser(user1, "password123")
	if err != nil {
		t.Fatalf("Failed to create user1: %v", err)
	}

	createdUser2, err := userRepo.CreateUser(user2, "password123")
	if err != nil {
		t.Fatalf("Failed to create user2: %v", err)
	}

	// Create sessions for users
	session1, err := sessionManager.CreateSession(createdUser1.ID)
	if err != nil {
		t.Fatalf("Failed to create session for user1: %v", err)
	}

	t.Run("CreateGroup", func(t *testing.T) {
		// Create a group
		groupReq := &models.CreateGroupRequest{
			Title:       "Test Group",
			Description: "A test group for chat functionality",
		}

		groupReqBytes, _ := json.Marshal(groupReq)
		req := httptest.NewRequest("POST", "/api/groups", bytes.NewBuffer(groupReqBytes))
		req.Header.Set("Content-Type", "application/json")
		req.AddCookie(&http.Cookie{Name: "session_id", Value: session1.ID})

		w := httptest.NewRecorder()
		groupHandler.CreateGroup(w, req)

		if w.Code != http.StatusCreated {
			t.Errorf("Expected status 201, got %d", w.Code)
		}

		var response map[string]interface{}
		json.Unmarshal(w.Body.Bytes(), &response)

		if !response["success"].(bool) {
			t.Error("Expected success to be true")
		}
	})

	t.Run("CreateGroupMessage", func(t *testing.T) {
		// First create a group
		group, err := groupRepo.CreateGroup(createdUser1.ID, &models.CreateGroupRequest{
			Title:       "Test Group",
			Description: "A test group for chat functionality",
		})
		if err != nil {
			t.Fatalf("Failed to create group: %v", err)
		}

		// Add user2 to the group
		_, err = groupRepo.RequestToJoinGroup(group.ID, createdUser2.ID)
		if err != nil {
			t.Fatalf("Failed to add user2 to group: %v", err)
		}

		// Accept the membership request
		memberships, err := groupRepo.GetPendingJoinRequests(group.ID)
		if err != nil {
			t.Fatalf("Failed to get pending requests: %v", err)
		}

		if len(memberships) > 0 {
			err = groupRepo.HandleMembershipRequest(memberships[0].ID, createdUser1.ID, "accept")
			if err != nil {
				t.Fatalf("Failed to accept membership: %v", err)
			}
		}

		// Create a group message
		messageReq := &models.CreateGroupMessageRequest{
			GroupID: group.ID,
			Content: "Hello from user1!",
		}

		messageReqBytes, _ := json.Marshal(messageReq)
		req := httptest.NewRequest("POST", "/api/chat/messages/group", bytes.NewBuffer(messageReqBytes))
		req.Header.Set("Content-Type", "application/json")
		req.AddCookie(&http.Cookie{Name: "session_id", Value: session1.ID})

		w := httptest.NewRecorder()
		chatHandler.CreateGroupMessage(w, req)

		if w.Code != http.StatusCreated {
			t.Errorf("Expected status 201, got %d", w.Code)
		}

		var response map[string]interface{}
		json.Unmarshal(w.Body.Bytes(), &response)

		if !response["success"].(bool) {
			t.Error("Expected success to be true")
		}
	})

	t.Run("GetGroupMessages", func(t *testing.T) {
		// Create a group
		group, err := groupRepo.CreateGroup(createdUser1.ID, &models.CreateGroupRequest{
			Title:       "Test Group 2",
			Description: "Another test group",
		})
		if err != nil {
			t.Fatalf("Failed to create group: %v", err)
		}

		// Add user2 to the group
		_, err = groupRepo.RequestToJoinGroup(group.ID, createdUser2.ID)
		if err != nil {
			t.Fatalf("Failed to add user2 to group: %v", err)
		}

		// Accept the membership request
		memberships, err := groupRepo.GetPendingJoinRequests(group.ID)
		if err != nil {
			t.Fatalf("Failed to get pending requests: %v", err)
		}

		if len(memberships) > 0 {
			err = groupRepo.HandleMembershipRequest(memberships[0].ID, createdUser1.ID, "accept")
			if err != nil {
				t.Fatalf("Failed to accept membership: %v", err)
			}
		}

		// Create some messages
		_, err = messageRepo.CreateGroupMessage(group.ID, createdUser1.ID, "Message 1 from user1")
		if err != nil {
			t.Fatalf("Failed to create message 1: %v", err)
		}

		_, err = messageRepo.CreateGroupMessage(group.ID, createdUser2.ID, "Message 2 from user2")
		if err != nil {
			t.Fatalf("Failed to create message 2: %v", err)
		}

		// Get group messages
		req := httptest.NewRequest("GET", "/api/chat/messages/group/"+string(rune(group.ID)), nil)
		req.AddCookie(&http.Cookie{Name: "session_id", Value: session1.ID})

		w := httptest.NewRecorder()
		chatHandler.GetGroupMessages(w, req)

		if w.Code != http.StatusOK {
			t.Errorf("Expected status 200, got %d", w.Code)
		}

		var response map[string]interface{}
		json.Unmarshal(w.Body.Bytes(), &response)

		if !response["success"].(bool) {
			t.Error("Expected success to be true")
		}

		messages := response["data"].(map[string]interface{})["messages"].([]interface{})
		if len(messages) != 2 {
			t.Errorf("Expected 2 messages, got %d", len(messages))
		}
	})

	t.Run("CreatePrivateMessage", func(t *testing.T) {
		// Make users follow each other
		_, err := followRepo.CreateFollowRequest(createdUser1.ID, createdUser2.ID)
		if err != nil {
			t.Fatalf("Failed to follow user: %v", err)
		}

		_, err = followRepo.CreateFollowRequest(createdUser2.ID, createdUser1.ID)
		if err != nil {
			t.Fatalf("Failed to follow user: %v", err)
		}

		// Accept follow requests
		follows, err := followRepo.GetPendingFollowRequests(createdUser1.ID)
		if err != nil {
			t.Fatalf("Failed to get follow requests: %v", err)
		}

		for _, follow := range follows {
			err = followRepo.AcceptFollowRequest(follow.ID, createdUser1.ID)
			if err != nil {
				t.Fatalf("Failed to accept follow request: %v", err)
			}
		}

		follows, err = followRepo.GetPendingFollowRequests(createdUser2.ID)
		if err != nil {
			t.Fatalf("Failed to get follow requests: %v", err)
		}

		for _, follow := range follows {
			err = followRepo.AcceptFollowRequest(follow.ID, createdUser2.ID)
			if err != nil {
				t.Fatalf("Failed to accept follow request: %v", err)
			}
		}

		// Create a private message
		messageReq := &models.CreatePrivateMessageRequest{
			ReceiverID: createdUser2.ID,
			Content:    "Hello from user1!",
		}

		messageReqBytes, _ := json.Marshal(messageReq)
		req := httptest.NewRequest("POST", "/api/chat/messages/private", bytes.NewBuffer(messageReqBytes))
		req.Header.Set("Content-Type", "application/json")
		req.AddCookie(&http.Cookie{Name: "session_id", Value: session1.ID})

		w := httptest.NewRecorder()
		chatHandler.CreatePrivateMessage(w, req)

		if w.Code != http.StatusCreated {
			t.Errorf("Expected status 201, got %d", w.Code)
		}

		var response map[string]interface{}
		json.Unmarshal(w.Body.Bytes(), &response)

		if !response["success"].(bool) {
			t.Error("Expected success to be true")
		}
	})
}
