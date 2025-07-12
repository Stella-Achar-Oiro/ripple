// backend/tests/websocket_integration_test.go - Full system integration tests
package tests

// import (
// 	"encoding/json"
// 	"fmt"
// 	"net/http"
// 	"net/http/httptest"
// 	"strings"
// 	"testing"
// 	"time"

// 	"ripple/pkg/auth"
// 	"ripple/pkg/handlers"
// 	"ripple/pkg/models"
// 	rippleWS "ripple/pkg/websocket"

// 	"github.com/gorilla/websocket"
// )

// func TestCompleteWebSocketIntegration(t *testing.T) {
// 	database, cleanup := setupTestDB()
// 	defer cleanup()

// 	// Setup all repositories
// 	userRepo := models.NewUserRepository(database.DB)
// 	followRepo := models.NewFollowRepository(database.DB)
// 	groupRepo := models.NewGroupRepository(database.DB)
// 	messageRepo := models.NewMessageRepository(database.DB)
// 	sessionManager := auth.NewSessionManager(database.DB)

// 	// Create WebSocket hub
// 	hub := rippleWS.NewHub(database.DB)
// 	go hub.Run()
// 	defer hub.Stop()

// 	// Create test users
// 	alice, aliceSession := createTestUser(t, userRepo, sessionManager, "alice@test.com", true)
// 	bob, bobSession := createTestUser(t, userRepo, sessionManager, "bob@test.com", true)
// 	charlie, _ := createTestUser(t, userRepo, sessionManager, "charlie@test.com", true)

// 	// Make all users public for easier testing
// 	userRepo.UpdateProfile(alice.ID, map[string]interface{}{"is_public": true})
// 	userRepo.UpdateProfile(bob.ID, map[string]interface{}{"is_public": true})
// 	userRepo.UpdateProfile(charlie.ID, map[string]interface{}{"is_public": true})

// 	// Create follow relationships
// 	followRepo.CreateFollowRequest(alice.ID, bob.ID)
// 	followRepo.CreateFollowRequest(bob.ID, alice.ID)

// 	// Create a test group
// 	groupReq := &models.CreateGroupRequest{
// 		Title:       "Test Group",
// 		Description: "A group for testing",
// 	}
// 	group, err := groupRepo.CreateGroup(alice.ID, groupReq)
// 	if err != nil {
// 		t.Fatalf("Failed to create test group: %v", err)
// 	}

// 	// Add Bob to the group
// 	_, err = groupRepo.InviteUsersToGroup(group.ID, alice.ID, []int{bob.ID})
// 	if err != nil {
// 		t.Fatalf("Failed to invite Bob to group: %v", err)
// 	}

// 	// Bob accepts the invitation
// 	invitations, _ := groupRepo.GetPendingInvitations(bob.ID)
// 	if len(invitations) > 0 {
// 		groupRepo.HandleMembershipRequest(invitations[0].ID, bob.ID, "accept")
// 	}

// 	// Create WebSocket server
// 	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
// 		rippleWS.HandleWebSocket(hub, sessionManager, w, r)
// 	}))
// 	defer server.Close()
// 	wsURL := "ws" + strings.TrimPrefix(server.URL, "http")

// 	t.Run("CompletePrivateMessageFlow", func(t *testing.T) {
// 		// Connect Alice and Bob
// 		aliceConn := connectWebSocket(t, wsURL, aliceSession.ID)
// 		defer aliceConn.Close()

// 		bobConn := connectWebSocket(t, wsURL, bobSession.ID)
// 		defer bobConn.Close()

// 		// Wait for connections to be established
// 		time.Sleep(100 * time.Millisecond)

// 		// Alice sends a message to Bob
// 		message := map[string]interface{}{
// 			"type":    "private_message",
// 			"to":      bob.ID,
// 			"content": "Hello Bob! 👋",
// 		}

// 		err := aliceConn.WriteJSON(message)
// 		if err != nil {
// 			t.Fatalf("Failed to send message from Alice: %v", err)
// 		}

// 		// Alice should receive confirmation
// 		aliceResponse := readWebSocketMessage(t, aliceConn)
// 		if aliceResponse["type"] != "private_message" {
// 			t.Errorf("Alice expected confirmation, got %v", aliceResponse["type"])
// 		}

// 		// Bob should receive the message
// 		bobResponse := readWebSocketMessage(t, bobConn)
// 		if bobResponse["type"] != "private_message" {
// 			t.Errorf("Bob expected message, got %v", bobResponse["type"])
// 		}
// 		if bobResponse["content"] != "Hello Bob! 👋" {
// 			t.Errorf("Bob expected content 'Hello Bob! 👋', got %v", bobResponse["content"])
// 		}

// 		// Bob sends typing indicator
// 		typingMsg := map[string]interface{}{
// 			"type": "typing",
// 			"to":   alice.ID,
// 			"data": map[string]interface{}{
// 				"is_typing": true,
// 			},
// 		}

// 		err = bobConn.WriteJSON(typingMsg)
// 		if err != nil {
// 			t.Fatalf("Failed to send typing indicator: %v", err)
// 		}

// 		// Alice should receive typing indicator
// 		aliceTyping := readWebSocketMessage(t, aliceConn)
// 		if aliceTyping["type"] != "typing" {
// 			t.Errorf("Alice expected typing indicator, got %v", aliceTyping["type"])
// 		}

// 		// Bob replies to Alice
// 		reply := map[string]interface{}{
// 			"type":    "private_message",
// 			"to":      alice.ID,
// 			"content": "Hello Alice! Nice to hear from you! 😊",
// 		}

// 		err = bobConn.WriteJSON(reply)
// 		if err != nil {
// 			t.Fatalf("Failed to send reply from Bob: %v", err)
// 		}

// 		// Alice should receive Bob's reply
// 		aliceReply := readWebSocketMessage(t, aliceConn)
// 		if aliceReply["content"] != "Hello Alice! Nice to hear from you! 😊" {
// 			t.Errorf("Alice expected reply content, got %v", aliceReply["content"])
// 		}

// 		// Mark message as read
// 		readMsg := map[string]interface{}{
// 			"type": "read_status",
// 			"to":   bob.ID,
// 		}

// 		err = aliceConn.WriteJSON(readMsg)
// 		if err != nil {
// 			t.Fatalf("Failed to send read status: %v", err)
// 		}
// 	})

// 	t.Run("GroupMessageFlow", func(t *testing.T) {
// 		// Connect Alice and Bob (group members)
// 		aliceConn := connectWebSocket(t, wsURL, aliceSession.ID)
// 		defer aliceConn.Close()

// 		bobConn := connectWebSocket(t, wsURL, bobSession.ID)
// 		defer bobConn.Close()

// 		// Wait for connections to be established
// 		time.Sleep(100 * time.Millisecond)

// 		// Alice sends a group message
// 		groupMessage := map[string]interface{}{
// 			"type":     "group_message",
// 			"group_id": group.ID,
// 			"content":  "Hello everyone in the group! 🎉",
// 		}

// 		err := aliceConn.WriteJSON(groupMessage)
// 		if err != nil {
// 			t.Fatalf("Failed to send group message: %v", err)
// 		}

// 		// Alice should receive confirmation
// 		aliceResponse := readWebSocketMessage(t, aliceConn)
// 		if aliceResponse["type"] != "group_message" {
// 			t.Errorf("Alice expected group message confirmation, got %v", aliceResponse["type"])
// 		}

// 		// Bob should receive the group message
// 		bobResponse := readWebSocketMessage(t, bobConn)
// 		if bobResponse["type"] != "group_message" {
// 			t.Errorf("Bob expected group message, got %v", bobResponse["type"])
// 		}
// 		if bobResponse["content"] != "Hello everyone in the group! 🎉" {
// 			t.Errorf("Bob expected group message content, got %v", bobResponse["content"])
// 		}

// 		// Verify group ID is correct
// 		if int(bobResponse["group_id"].(float64)) != group.ID {
// 			t.Errorf("Bob expected group ID %d, got %v", group.ID, bobResponse["group_id"])
// 		}
// 	})

// 	t.Run("OnlinePresenceTracking", func(t *testing.T) {
// 		// Connect Alice
// 		aliceConn := connectWebSocket(t, wsURL, aliceSession.ID)
// 		defer aliceConn.Close()

// 		// Wait for connection
// 		time.Sleep(100 * time.Millisecond)

// 		// Connect Bob - Alice should be notified
// 		bobConn := connectWebSocket(t, wsURL, bobSession.ID)
// 		defer bobConn.Close()

// 		// Alice should receive user online notification
// 		aliceNotification := readWebSocketMessage(t, aliceConn)
// 		if aliceNotification["type"] != "user_online" {
// 			// Skip if not user online message (might be initial presence data)
// 			if aliceNotification["type"] == "user_list" {
// 				aliceNotification = readWebSocketMessage(t, aliceConn)
// 			}
// 		}

// 		// Verify online users list through API
// 		chatHandler := handlers.NewChatHandler(messageRepo, followRepo, groupRepo, hub)
// 		req := httptest.NewRequest("GET", "/api/chat/online", nil)
// 		req.AddCookie(&http.Cookie{Name: "session_id", Value: aliceSession.ID})

// 		w := httptest.NewRecorder()
// 		authMiddleware := sessionManager.AuthMiddleware(http.HandlerFunc(chatHandler.GetOnlineUsers))
// 		authMiddleware.ServeHTTP(w, req)

// 		if w.Code != http.StatusOK {
// 			t.Errorf("Expected status 200, got %d", w.Code)
// 		}

// 		var response map[string]interface{}
// 		err = json.Unmarshal(w.Body.Bytes(), &response)
// 		if err != nil {
// 			t.Fatalf("Failed to unmarshal online users response: %v", err)
// 		}

// 		data := response["data"].(map[string]interface{})
// 		onlineUsers := data["online_users"].([]interface{})

// 		// Should have at least Bob online (Alice might not see herself)
// 		if len(onlineUsers) == 0 {
// 			t.Error("Expected at least one online user")
// 		}
// 	})

// 	t.Run("ChatAPIIntegration", func(t *testing.T) {
// 		// Create some messages first via WebSocket
// 		aliceConn := connectWebSocket(t, wsURL, aliceSession.ID)
// 		defer aliceConn.Close()

// 		message := map[string]interface{}{
// 			"type":    "private_message",
// 			"to":      bob.ID,
// 			"content": "API integration test message",
// 		}

// 		err := aliceConn.WriteJSON(message)
// 		if err != nil {
// 			t.Fatalf("Failed to send message: %v", err)
// 		}

// 		// Wait for message to be processed
// 		readWebSocketMessage(t, aliceConn)
// 		time.Sleep(100 * time.Millisecond)

// 		// Test conversations API
// 		chatHandler := handlers.NewChatHandler(messageRepo, followRepo, groupRepo, hub)
// 		req := httptest.NewRequest("GET", "/api/chat/conversations", nil)
// 		req.AddCookie(&http.Cookie{Name: "session_id", Value: aliceSession.ID})

// 		w := httptest.NewRecorder()
// 		authMiddleware := sessionManager.AuthMiddleware(http.HandlerFunc(chatHandler.GetConversations))
// 		authMiddleware.ServeHTTP(w, req)

// 		if w.Code != http.StatusOK {
// 			t.Errorf("Expected status 200, got %d", w.Code)
// 		}

// 		var response map[string]interface{}
// 		err = json.Unmarshal(w.Body.Bytes(), &response)
// 		if err != nil {
// 			t.Fatalf("Failed to unmarshal conversations response: %v", err)
// 		}

// 		if !response["success"].(bool) {
// 			t.Error("Expected successful conversations response")
// 		}

// 		data := response["data"].(map[string]interface{})
// 		conversations := data["conversations"].([]interface{})

// 		if len(conversations) == 0 {
// 			t.Error("Expected at least one conversation")
// 		}

// 		// Verify conversation structure
// 		conv := conversations[0].(map[string]interface{})
// 		if conv["type"] != "private" {
// 			t.Errorf("Expected conversation type 'private', got %v", conv["type"])
// 		}
// 	})

// 	t.Run("ErrorHandlingAndValidation", func(t *testing.T) {
// 		aliceConn := connectWebSocket(t, wsURL, aliceSession.ID)
// 		defer aliceConn.Close()

// 		// Try to send empty message
// 		emptyMessage := map[string]interface{}{
// 			"type":    "private_message",
// 			"to":      bob.ID,
// 			"content": "",
// 		}

// 		err := aliceConn.WriteJSON(emptyMessage)
// 		if err != nil {
// 			t.Fatalf("Failed to send empty message: %v", err)
// 		}

// 		// Should receive error
// 		response := readWebSocketMessage(t, aliceConn)
// 		if response["type"] != "error" {
// 			t.Errorf("Expected error response for empty message, got %v", response["type"])
// 		}

// 		// Try to send message to non-existent user
// 		invalidMessage := map[string]interface{}{
// 			"type":    "private_message",
// 			"to":      99999,
// 			"content": "This should fail",
// 		}

// 		err = aliceConn.WriteJSON(invalidMessage)
// 		if err != nil {
// 			t.Fatalf("Failed to send invalid message: %v", err)
// 		}

// 		// Should receive error
// 		response = readWebSocketMessage(t, aliceConn)
// 		if response["type"] != "error" {
// 			t.Errorf("Expected error response for invalid recipient, got %v", response["type"])
// 		}

// 		// Try to send message to group user is not in
// 		invalidGroupMessage := map[string]interface{}{
// 			"type":     "group_message",
// 			"group_id": 99999,
// 			"content":  "This should fail",
// 		}

// 		err = aliceConn.WriteJSON(invalidGroupMessage)
// 		if err != nil {
// 			t.Fatalf("Failed to send invalid group message: %v", err)
// 		}

// 		// Should receive error
// 		response = readWebSocketMessage(t, aliceConn)
// 		if response["type"] != "error" {
// 			t.Errorf("Expected error response for invalid group, got %v", response["type"])
// 		}
// 	})

// 	t.Run("DatabaseConsistency", func(t *testing.T) {
// 		// Send some messages via WebSocket
// 		aliceConn := connectWebSocket(t, wsURL, aliceSession.ID)
// 		defer aliceConn.Close()

// 		testMessages := []string{
// 			"Database consistency test 1",
// 			"Database consistency test 2",
// 			"Database consistency test 3",
// 		}

// 		for _, content := range testMessages {
// 			message := map[string]interface{}{
// 				"type":    "private_message",
// 				"to":      bob.ID,
// 				"content": content,
// 			}

// 			err := aliceConn.WriteJSON(message)
// 			if err != nil {
// 				t.Fatalf("Failed to send message: %v", err)
// 			}

// 			// Read confirmation
// 			readWebSocketMessage(t, aliceConn)
// 			time.Sleep(50 * time.Millisecond)
// 		}

// 		// Verify messages are in database
// 		messages, err := messageRepo.GetPrivateMessages(alice.ID, bob.ID, 10, 0)
// 		if err != nil {
// 			t.Fatalf("Failed to get messages from database: %v", err)
// 		}

// 		if len(messages) < len(testMessages) {
// 			t.Errorf("Expected at least %d messages in database, got %d", len(testMessages), len(messages))
// 		}

// 		// Verify message content
// 		for i, testContent := range testMessages {
// 			found := false
// 			for _, dbMessage := range messages {
// 				if dbMessage.Content == testContent {
// 					found = true
// 					break
// 				}
// 			}
// 			if !found {
// 				t.Errorf("Message %d not found in database: %s", i, testContent)
// 			}
// 		}

// 		// Test unread counts
// 		counts, err := messageRepo.GetUnreadCounts(bob.ID)
// 		if err != nil {
// 			t.Fatalf("Failed to get unread counts: %v", err)
// 		}

// 		if counts.PrivateMessages == 0 {
// 			t.Error("Expected unread private messages for Bob")
// 		}
// 	})
// }

// // Helper functions

// func connectWebSocket(t *testing.T, wsURL, sessionID string) *websocket.Conn {
// 	header := http.Header{}
// 	header.Set("Cookie", "session_id="+sessionID)

// 	conn, _, err := websocket.DefaultDialer.Dial(wsURL, header)
// 	if err != nil {
// 		t.Fatalf("Failed to connect to WebSocket: %v", err)
// 	}

// 	return conn
// }

// func readWebSocketMessage(t *testing.T, conn *websocket.Conn) map[string]interface{} {
// 	conn.SetReadDeadline(time.Now().Add(5 * time.Second))

// 	var message map[string]interface{}
// 	err := conn.ReadJSON(&message)
// 	if err != nil {
// 		t.Fatalf("Failed to read WebSocket message: %v", err)
// 	}

// 	return message
// }

// func TestWebSocketLoadAndPerformance(t *testing.T) {
// 	if testing.Short() {
// 		t.Skip("Skipping load test in short mode")
// 	}

// 	database, cleanup := setupTestDB()
// 	defer cleanup()

// 	userRepo := models.NewUserRepository(database.DB)
// 	sessionManager := auth.NewSessionManager(database.DB)

// 	// Create test user
// 	user, session := createTestUser(t, userRepo, sessionManager, "load@test.com", true)

// 	// Create WebSocket hub
// 	hub := rippleWS.NewHub(database.DB)
// 	go hub.Run()
// 	defer hub.Stop()

// 	// Create WebSocket server
// 	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
// 		rippleWS.HandleWebSocket(hub, sessionManager, w, r)
// 	}))
// 	defer server.Close()
// 	wsURL := "ws" + strings.TrimPrefix(server.URL, "http")

// 	t.Run("MultipleConnections", func(t *testing.T) {
// 		const numConnections = 10
// 		connections := make([]*websocket.Conn, numConnections)

// 		// Create multiple connections
// 		for i := 0; i < numConnections; i++ {
// 			conn := connectWebSocket(t, wsURL, session.ID)
// 			connections[i] = conn
// 			defer conn.Close()
// 		}

// 		// Send messages from all connections
// 		for i, conn := range connections {
// 			message := map[string]interface{}{
// 				"type":    "private_message",
// 				"to":      user.ID, // Send to self for testing
// 				"content": fmt.Sprintf("Load test message %d", i),
// 			}

// 			err := conn.WriteJSON(message)
// 			if err != nil {
// 				t.Errorf("Failed to send message from connection %d: %v", i, err)
// 			}
// 		}

// 		// Verify all connections can receive messages
// 		for i, conn := range connections {
// 			response := readWebSocketMessage(t, conn)
// 			if response["type"] != "private_message" {
// 				t.Errorf("Connection %d expected message confirmation, got %v", i, response["type"])
// 			}
// 		}
// 	})

// 	t.Run("MessageThroughput", func(t *testing.T) {
// 		conn := connectWebSocket(t, wsURL, session.ID)
// 		defer conn.Close()

// 		const numMessages = 100
// 		start := time.Now()

// 		// Send multiple messages rapidly
// 		for i := 0; i < numMessages; i++ {
// 			message := map[string]interface{}{
// 				"type":    "private_message",
// 				"to":      user.ID,
// 				"content": fmt.Sprintf("Throughput test message %d", i),
// 			}

// 			err := conn.WriteJSON(message)
// 			if err != nil {
// 				t.Fatalf("Failed to send message %d: %v", i, err)
// 			}
// 		}

// 		// Read all confirmations
// 		for i := 0; i < numMessages; i++ {
// 			readWebSocketMessage(t, conn)
// 		}

// 		duration := time.Since(start)
// 		messagesPerSecond := float64(numMessages) / duration.Seconds()

// 		t.Logf("Processed %d messages in %v (%.2f msg/sec)", numMessages, duration, messagesPerSecond)

// 		if messagesPerSecond < 50 {
// 			t.Errorf("Message throughput too low: %.2f msg/sec", messagesPerSecond)
// 		}
// 	})
// }
