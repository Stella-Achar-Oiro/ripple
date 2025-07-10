// backend/tests/chat_test.go - Comprehensive WebSocket chat system tests
package tests

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"ripple/pkg/auth"
	"ripple/pkg/handlers"
	"ripple/pkg/models"
	"ripple/pkg/websocket"

	gorilla "github.com/gorilla/websocket"
)

func TestChatMessageRepository(t *testing.T) {
	database, cleanup := setupTestDB()
	defer cleanup()

	messageRepo := models.NewMessageRepository(database.DB)
	userRepo := models.NewUserRepository(database.DB)
	sessionManager := auth.NewSessionManager(database.DB)

	// Create test users
	user1, _ := createTestUser(t, userRepo, sessionManager, "user1@test.com", true)
	user2, _ := createTestUser(t, userRepo, sessionManager, "user2@test.com", true)

	t.Run("CreatePrivateMessage", func(t *testing.T) {
		message, err := messageRepo.CreatePrivateMessage(user1.ID, user2.ID, "Hello from user1!")
		if err != nil {
			t.Fatalf("Failed to create private message: %v", err)
		}

		if message.SenderID != user1.ID {
			t.Errorf("Expected sender ID %d, got %d", user1.ID, message.SenderID)
		}

		if message.ReceiverID != user2.ID {
			t.Errorf("Expected receiver ID %d, got %d", user2.ID, message.ReceiverID)
		}

		if message.Content != "Hello from user1!" {
			t.Errorf("Expected content 'Hello from user1!', got %s", message.Content)
		}
	})

	t.Run("GetPrivateMessages", func(t *testing.T) {
		// Create multiple messages
		_, err := messageRepo.CreatePrivateMessage(user1.ID, user2.ID, "Message 1")
		if err != nil {
			t.Fatalf("Failed to create message 1: %v", err)
		}

		_, err = messageRepo.CreatePrivateMessage(user2.ID, user1.ID, "Message 2")
		if err != nil {
			t.Fatalf("Failed to create message 2: %v", err)
		}

		messages, err := messageRepo.GetPrivateMessages(user1.ID, user2.ID, 10, 0)
		if err != nil {
			t.Fatalf("Failed to get private messages: %v", err)
		}

		if len(messages) < 2 {
			t.Errorf("Expected at least 2 messages, got %d", len(messages))
		}
	})

	t.Run("MarkMessagesAsRead", func(t *testing.T) {
		// Create a message from user2 to user1
		message, err := messageRepo.CreatePrivateMessage(user2.ID, user1.ID, "Read test message")
		if err != nil {
			t.Fatalf("Failed to create message: %v", err)
		}

		// Mark messages as read
		err = messageRepo.MarkMessagesAsRead(user1.ID, user2.ID)
		if err != nil {
			t.Fatalf("Failed to mark messages as read: %v", err)
		}

		// Verify read status
		messages, err := messageRepo.GetPrivateMessages(user1.ID, user2.ID, 10, 0)
		if err != nil {
			t.Fatalf("Failed to get messages: %v", err)
		}

		found := false
		for _, msg := range messages {
			if msg.ID == message.ID && msg.ReadAt != nil {
				found = true
				break
			}
		}

		if !found {
			t.Error("Message was not marked as read")
		}
	})

	t.Run("GetConversations", func(t *testing.T) {
		conversations, err := messageRepo.GetConversations(user1.ID, 10, 0)
		if err != nil {
			t.Fatalf("Failed to get conversations: %v", err)
		}

		if len(conversations) == 0 {
			t.Error("Expected at least one conversation")
		}

		// Check conversation structure
		conv := conversations[0]
		if conv.Type != "private" {
			t.Errorf("Expected conversation type 'private', got %s", conv.Type)
		}

		if conv.Participant == nil {
			t.Error("Expected participant information")
		}
	})

	t.Run("GetUnreadCounts", func(t *testing.T) {
		// Create an unread message
		_, err := messageRepo.CreatePrivateMessage(user2.ID, user1.ID, "Unread message")
		if err != nil {
			t.Fatalf("Failed to create unread message: %v", err)
		}

		counts, err := messageRepo.GetUnreadCounts(user1.ID)
		if err != nil {
			t.Fatalf("Failed to get unread counts: %v", err)
		}

		if counts.Total == 0 {
			t.Error("Expected unread messages count > 0")
		}
	})
}

func TestChatAPI(t *testing.T) {
	database, cleanup := setupTestDB()
	defer cleanup()

	// Setup repositories and session manager
	userRepo := models.NewUserRepository(database.DB)
	messageRepo := models.NewMessageRepository(database.DB)
	followRepo := models.NewFollowRepository(database.DB)
	groupRepo := models.NewGroupRepository(database.DB)
	sessionManager := auth.NewSessionManager(database.DB)

	// Create WebSocket hub
	hub := websocket.NewHub(database.DB)
	go hub.Run()
	defer hub.Stop()

	// Create test users with sessions
	user1, session1 := createTestUser(t, userRepo, sessionManager, "chat1@test.com", true)
	user2, _ := createTestUser(t, userRepo, sessionManager, "chat2@test.com", true)

	// Create follow relationship so they can message each other
	if _, err := followRepo.CreateFollowRequest(user1.ID, user2.ID); err != nil {
		t.Fatalf("Failed to create follow request: %v", err)
	}

	// Create chat handler
	chatHandler := handlers.NewChatHandler(messageRepo, followRepo, groupRepo, userRepo, hub)

	t.Run("GetConversations", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/api/chat/conversations", nil)
		req.AddCookie(&http.Cookie{Name: "session_id", Value: session1.ID})

		w := httptest.NewRecorder()
		authMiddleware := sessionManager.AuthMiddleware(http.HandlerFunc(chatHandler.GetConversations))
		authMiddleware.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Errorf("Expected status 200, got %d", w.Code)
		}

		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		if err != nil {
			t.Fatalf("Failed to unmarshal response: %v", err)
		}

		if !response["success"].(bool) {
			t.Error("Expected success response")
		}
	})

	t.Run("GetUnreadCounts", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/api/chat/unread", nil)
		req.AddCookie(&http.Cookie{Name: "session_id", Value: session1.ID})

		w := httptest.NewRecorder()
		authMiddleware := sessionManager.AuthMiddleware(http.HandlerFunc(chatHandler.GetUnreadCounts))
		authMiddleware.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Errorf("Expected status 200, got %d", w.Code)
		}

		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		if err != nil {
			t.Fatalf("Failed to unmarshal response: %v", err)
		}

		if !response["success"].(bool) {
			t.Error("Expected success response")
		}

		data := response["data"].(map[string]interface{})
		if _, exists := data["total"]; !exists {
			t.Error("Expected 'total' field in unread counts")
		}
	})

	t.Run("GetOnlineUsers", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/api/chat/online", nil)
		req.AddCookie(&http.Cookie{Name: "session_id", Value: session1.ID})

		w := httptest.NewRecorder()
		authMiddleware := sessionManager.AuthMiddleware(http.HandlerFunc(chatHandler.GetOnlineUsers))
		authMiddleware.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Errorf("Expected status 200, got %d", w.Code)
		}

		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		if err != nil {
			t.Fatalf("Failed to unmarshal response: %v", err)
		}

		if !response["success"].(bool) {
			t.Error("Expected success response")
		}
	})

	t.Run("TypingIndicator", func(t *testing.T) {
		payload := map[string]interface{}{
			"type":      "private",
			"target_id": user2.ID,
			"is_typing": true,
		}

		payloadBytes, _ := json.Marshal(payload)
		req := httptest.NewRequest("POST", "/api/chat/typing", strings.NewReader(string(payloadBytes)))
		req.Header.Set("Content-Type", "application/json")
		req.AddCookie(&http.Cookie{Name: "session_id", Value: session1.ID})

		w := httptest.NewRecorder()
		authMiddleware := sessionManager.AuthMiddleware(http.HandlerFunc(chatHandler.TypingIndicator))
		authMiddleware.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Errorf("Expected status 200, got %d", w.Code)
		}

		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		if err != nil {
			t.Fatalf("Failed to unmarshal response: %v", err)
		}

		if !response["success"].(bool) {
			t.Error("Expected success response")
		}
	})
}

func TestWebSocketIntegration(t *testing.T) {
	database, cleanup := setupTestDB()
	defer cleanup()

	// Setup repositories and session manager
	userRepo := models.NewUserRepository(database.DB)
	sessionManager := auth.NewSessionManager(database.DB)

	// Create test users with sessions (both public)
	user1, session1 := createTestUser(t, userRepo, sessionManager, "ws1@test.com", true)
	user2, session2 := createTestUser(t, userRepo, sessionManager, "ws2@test.com", true)

	// Create WebSocket hub
	hub := websocket.NewHub(database.DB)
	go hub.Run()
	defer hub.Stop()

	// Create WebSocket server
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		websocket.HandleWebSocket(hub, sessionManager, w, r)
	}))
	defer server.Close()

	// Convert HTTP URL to WebSocket URL
	wsURL := "ws" + strings.TrimPrefix(server.URL, "http")

	t.Run("WebSocketConnection", func(t *testing.T) {
		// Create WebSocket connection with session cookie
		header := http.Header{}
		header.Set("Cookie", "session_id="+session1.ID)

		conn, _, err := gorilla.DefaultDialer.Dial(wsURL, header)
		if err != nil {
			t.Fatalf("Failed to connect to WebSocket: %v", err)
		}
		defer conn.Close()

		// Send a test message
		testMessage := map[string]interface{}{

			"type":    "private_message",
			"to":      user2.ID,
			"content": "Hello WebSocket!",
		}

		err = conn.WriteJSON(testMessage)
		if err != nil {
			t.Fatalf("Failed to send WebSocket message: %v", err)
		}

		// Read response with timeout
		conn.SetReadDeadline(time.Now().Add(5 * time.Second))

		var response map[string]interface{}
		err = conn.ReadJSON(&response)
		if err != nil {
			t.Fatalf("Failed to read WebSocket response: %v", err)
		}

		// Verify response
		if response["type"] != "private_message" {
			t.Errorf("Expected message type 'private_message', got %v", response["type"])
		}

		if response["content"] != "Hello WebSocket!" {
			t.Errorf("Expected content 'Hello WebSocket!', got %v", response["content"])
		}
	})

	t.Run("WebSocketAuthentication", func(t *testing.T) {
		// Try to connect without session cookie
		_, _, err := gorilla.DefaultDialer.Dial(wsURL, nil)
		if err == nil {
			t.Error("Expected WebSocket connection to fail without authentication")
		}

		// Try to connect with invalid session
		header := http.Header{}
		header.Set("Cookie", "session_id=invalid_session")

		_, _, err = gorilla.DefaultDialer.Dial(wsURL, header)
		if err == nil {
			t.Error("Expected WebSocket connection to fail with invalid session")
		}
	})

	t.Run("MultipleClientConnections", func(t *testing.T) {
		// Connect user1
		header1 := http.Header{}
		header1.Set("Cookie", "session_id="+session1.ID)

		conn1, _, err := gorilla.DefaultDialer.Dial(wsURL, header1)
		if err != nil {
			t.Fatalf("Failed to connect user1: %v", err)
		}
		defer conn1.Close()

		// Connect user2
		header2 := http.Header{}
		header2.Set("Cookie", "session_id="+session2.ID)

		conn2, _, err := gorilla.DefaultDialer.Dial(wsURL, header2)
		if err != nil {
			t.Fatalf("Failed to connect user2: %v", err)
		}
		defer conn2.Close()

		// Send message from user1 to user2
		message := map[string]interface{}{
			"type":    "private_message",
			"to":      user2.ID,
			"content": "Hello from user1!",
		}

		err = conn1.WriteJSON(message)
		if err != nil {
			t.Fatalf("Failed to send message: %v", err)
		}

		// User2 should receive the message
		conn2.SetReadDeadline(time.Now().Add(5 * time.Second))

		var receivedMessage map[string]interface{}
		err = conn2.ReadJSON(&receivedMessage)
		if err != nil {
			t.Fatalf("Failed to receive message: %v", err)
		}

		if receivedMessage["content"] != "Hello from user1!" {
			t.Errorf("Expected content 'Hello from user1!', got %v", receivedMessage["content"])
		}

		// Verify sender information
		if int(receivedMessage["from"].(float64)) != user1.ID {
			t.Errorf("Expected sender ID %d, got %v", user1.ID, receivedMessage["from"])
		}
	})

	t.Run("TypingIndicators", func(t *testing.T) {
		// Connect both users
		header1 := http.Header{}
		header1.Set("Cookie", "session_id="+session1.ID)

		conn1, _, err := gorilla.DefaultDialer.Dial(wsURL, header1)
		if err != nil {
			t.Fatalf("Failed to connect user1: %v", err)
		}
		defer conn1.Close()

		header2 := http.Header{}
		header2.Set("Cookie", "session_id="+session2.ID)

		conn2, _, err := gorilla.DefaultDialer.Dial(wsURL, header2)
		if err != nil {
			t.Fatalf("Failed to connect user2: %v", err)
		}
		defer conn2.Close()

		// Send typing indicator from user1
		typingMessage := map[string]interface{}{
			"type": "typing",
			"to":   user2.ID,
			"data": map[string]interface{}{
				"is_typing": true,
			},
		}

		err = conn1.WriteJSON(typingMessage)
		if err != nil {
			t.Fatalf("Failed to send typing indicator: %v", err)
		}

		// User2 should receive typing indicator
		conn2.SetReadDeadline(time.Now().Add(5 * time.Second))

		var typingReceived map[string]interface{}
		err = conn2.ReadJSON(&typingReceived)
		if err != nil {
			t.Fatalf("Failed to receive typing indicator: %v", err)
		}

		if typingReceived["type"] != "typing" {
			t.Errorf("Expected message type 'typing', got %v", typingReceived["type"])
		}
	})
}

func TestWebSocketPrivacyControls(t *testing.T) {
	database, cleanup := setupTestDB()
	defer cleanup()

	// Setup repositories and session manager
	userRepo := models.NewUserRepository(database.DB)
	followRepo := models.NewFollowRepository(database.DB)
	sessionManager := auth.NewSessionManager(database.DB)

	// Create test users (user1 public, user2 private)
	user1, session1 := createTestUser(t, userRepo, sessionManager, "privacy1@test.com", true)
	user2, _ := createTestUser(t, userRepo, sessionManager, "privacy2@test.com", false)

	// Create WebSocket hub
	hub := websocket.NewHub(database.DB)
	go hub.Run()
	defer hub.Stop()

	// Create WebSocket server
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		websocket.HandleWebSocket(hub, sessionManager, w, r)
	}))
	defer server.Close()

	wsURL := "ws" + strings.TrimPrefix(server.URL, "http")

	t.Run("CannotMessagePrivateUser", func(t *testing.T) {
		header := http.Header{}
		header.Set("Cookie", "session_id="+session1.ID)

		conn, _, err := gorilla.DefaultDialer.Dial(wsURL, header)
		if err != nil {
			t.Fatalf("Failed to connect to WebSocket: %v", err)
		}
		defer conn.Close()

		// Try to send message to private user (should fail)
		message := map[string]interface{}{
			"type":    "private_message",
			"to":      user2.ID,
			"content": "This should fail",
		}

		err = conn.WriteJSON(message)
		if err != nil {
			t.Fatalf("Failed to send message: %v", err)
		}

		// Should receive error response
		conn.SetReadDeadline(time.Now().Add(5 * time.Second))

		var response map[string]interface{}
		err = conn.ReadJSON(&response)
		if err != nil {
			t.Fatalf("Failed to read response: %v", err)
		}

		if response["type"] != "error" {
			t.Errorf("Expected error response, got %v", response["type"])
		}
	})

	t.Run("CanMessageAfterFollow", func(t *testing.T) {
		// Create follow relationship
		followRequest, err := followRepo.CreateFollowRequest(user1.ID, user2.ID)
		if err != nil {
			t.Fatalf("Failed to create follow request: %v", err)
		}

		// Accept the follow request
		err = followRepo.AcceptFollowRequest(followRequest.ID, user2.ID)
		if err != nil {
			t.Fatalf("Failed to accept follow request: %v", err)
		}

		header := http.Header{}
		header.Set("Cookie", "session_id="+session1.ID)

		conn, _, err := gorilla.DefaultDialer.Dial(wsURL, header)

		if err != nil {
			t.Fatalf("Failed to connect to WebSocket: %v", err)
		}
		defer conn.Close()

		// Now should be able to send message
		message := map[string]interface{}{
			"type":    "private_message",
			"to":      user2.ID,
			"content": "This should work now",
		}

		err = conn.WriteJSON(message)
		if err != nil {
			t.Fatalf("Failed to send message: %v", err)
		}

		// Should receive confirmation
		conn.SetReadDeadline(time.Now().Add(5 * time.Second))

		var response map[string]interface{}
		err = conn.ReadJSON(&response)
		if err != nil {
			t.Fatalf("Failed to read response: %v", err)
		}

		if response["type"] != "private_message" {
			t.Errorf("Expected private_message response, got %v", response["type"])
		}

		if response["content"] != "This should work now" {
			t.Errorf("Expected content 'This should work now', got %v", response["content"])
		}
	})
}
