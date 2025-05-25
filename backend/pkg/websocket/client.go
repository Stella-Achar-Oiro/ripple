// backend/pkg/websocket/client.go
package websocket

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"ripple/pkg/auth"

	"github.com/gorilla/websocket"
)

const (
	// Time allowed to write a message to the peer
	writeWait = 10 * time.Second

	// Time allowed to read the next pong message from the peer
	pongWait = 60 * time.Second

	// Send pings to peer with this period. Must be less than pongWait
	pingPeriod = (pongWait * 9) / 10

	// Maximum message size allowed from peer
	maxMessageSize = 1024
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		// Allow connections from any origin for now
		// In production, you should validate the origin
		return true
	},
}

// UpgradeConnection upgrades HTTP connection to WebSocket
func (h *Hub) UpgradeConnection(w http.ResponseWriter, r *http.Request, userID int) error {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return err
	}

	client := &Client{
		conn:     conn,
		send:     make(chan []byte, 256),
		userID:   userID,
		hub:      h,
		lastSeen: time.Now(),
	}

	// Register the client
	client.hub.register <- client

	// Start goroutines for reading and writing
	go client.writePump()
	go client.readPump()

	return nil
}

// readPump pumps messages from the websocket connection to the hub
func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadLimit(maxMessageSize)
	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(pongWait))
		c.lastSeen = time.Now()
		return nil
	})

	for {
		_, messageBytes, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}

		c.lastSeen = time.Now()

		// Parse the incoming message
		var incomingMsg WSMessage
		if err := json.Unmarshal(messageBytes, &incomingMsg); err != nil {
			log.Printf("WebSocket: Error parsing message from user %d: %v", c.userID, err)
			c.sendError("Invalid message format")
			continue
		}

		// Handle the incoming message
		c.handleIncomingMessage(&incomingMsg)
	}
}

// writePump pumps messages from the hub to the websocket connection
func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				// The hub closed the channel
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			// Add queued chat messages to the current websocket message
			n := len(c.send)
			for i := 0; i < n; i++ {
				w.Write([]byte{'\n'})
				w.Write(<-c.send)
			}

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// handleIncomingMessage processes messages received from the client
func (c *Client) handleIncomingMessage(msg *WSMessage) {
	switch msg.Type {
	case MessageTypePrivate:
		c.handlePrivateMessage(msg)
	case MessageTypeGroup:
		c.handleGroupMessage(msg)
	case MessageTypeTyping:
		c.handleTypingIndicator(msg)
	default:
		log.Printf("WebSocket: Unknown message type from user %d: %s", c.userID, msg.Type)
		c.sendError("Unknown message type")
	}
}

// handlePrivateMessage processes private messages
func (c *Client) handlePrivateMessage(msg *WSMessage) {
	if msg.To <= 0 {
		c.sendError("Invalid recipient")
		return
	}

	if msg.Content == "" {
		c.sendError("Message content cannot be empty")
		return
	}

	// Check if user can send message to recipient
	canSend, err := c.canSendPrivateMessage(msg.To)
	if err != nil {
		log.Printf("WebSocket: Error checking message permissions: %v", err)
		c.sendError("Failed to check message permissions")
		return
	}

	if !canSend {
		c.sendError("You cannot send messages to this user")
		return
	}

	// Save message to database
	messageID, err := c.savePrivateMessage(msg.To, msg.Content)
	if err != nil {
		log.Printf("WebSocket: Error saving private message: %v", err)
		c.sendError("Failed to save message")
		return
	}

	// Send message to recipient if online
	c.hub.SendPrivateMessage(c.userID, msg.To, msg.Content, messageID)

	// Send confirmation back to sender
	confirmation := WSMessage{
		Type:      MessageTypePrivate,
		Content:   msg.Content,
		From:      c.userID,
		To:        msg.To,
		MessageID: messageID,
		Timestamp: time.Now(),
	}
	c.hub.sendToClient(c, confirmation)
}

// handleGroupMessage processes group messages
func (c *Client) handleGroupMessage(msg *WSMessage) {
	if msg.GroupID <= 0 {
		c.sendError("Invalid group ID")
		return
	}

	if msg.Content == "" {
		c.sendError("Message content cannot be empty")
		return
	}

	// Check if user is a member of the group
	if !c.userGroups[msg.GroupID] {
		c.sendError("You are not a member of this group")
		return
	}

	// Save message to database
	messageID, err := c.saveGroupMessage(msg.GroupID, msg.Content)
	if err != nil {
		log.Printf("WebSocket: Error saving group message: %v", err)
		c.sendError("Failed to save message")
		return
	}

	// Send message to all group members
	c.hub.SendGroupMessage(msg.GroupID, c.userID, msg.Content, messageID)

	// Send confirmation back to sender
	confirmation := WSMessage{
		Type:      MessageTypeGroup,
		Content:   msg.Content,
		From:      c.userID,
		GroupID:   msg.GroupID,
		MessageID: messageID,
		Timestamp: time.Now(),
	}
	c.hub.sendToClient(c, confirmation)
}

// handleTypingIndicator processes typing indicators
func (c *Client) handleTypingIndicator(msg *WSMessage) {
	if msg.To > 0 {
		// Private message typing indicator
		c.hub.mu.RLock()
		if client, exists := c.hub.userClients[msg.To]; exists {
			typingMsg := WSMessage{
				Type:      MessageTypeTyping,
				From:      c.userID,
				To:        msg.To,
				Timestamp: time.Now(),
			}
			c.hub.sendToClient(client, typingMsg)
		}
		c.hub.mu.RUnlock()
	} else if msg.GroupID > 0 {
		// Group message typing indicator
		if c.userGroups[msg.GroupID] {
			typingMsg := WSMessage{
				Type:      MessageTypeTyping,
				From:      c.userID,
				GroupID:   msg.GroupID,
				Timestamp: time.Now(),
			}

			c.hub.mu.RLock()
			if clients, exists := c.hub.groupClients[msg.GroupID]; exists {
				for client := range clients {
					if client.userID != c.userID {
						c.hub.sendToClient(client, typingMsg)
					}
				}
			}
			c.hub.mu.RUnlock()
		}
	}
}

// canSendPrivateMessage checks if user can send private message to another user
func (c *Client) canSendPrivateMessage(recipientID int) (bool, error) {
	// Users can message each other if:
	// 1. At least one follows the other, OR
	// 2. The receiver has a public profile

	// Check if receiver has public profile
	var isPublic bool
	err := c.hub.db.QueryRow("SELECT is_public FROM users WHERE id = ?", recipientID).Scan(&isPublic)
	if err != nil {
		return false, err
	}

	if isPublic {
		return true, nil
	}

	// Check if either user follows the other
	var count int
	err = c.hub.db.QueryRow(`
		SELECT COUNT(*) FROM follows 
		WHERE ((follower_id = ? AND following_id = ?) OR (follower_id = ? AND following_id = ?)) 
		AND status = 'accepted'
	`, c.userID, recipientID, recipientID, c.userID).Scan(&count)

	if err != nil {
		return false, err
	}

	return count > 0, nil
}

// savePrivateMessage saves a private message to the database
func (c *Client) savePrivateMessage(recipientID int, content string) (int, error) {
	query := `
		INSERT INTO messages (sender_id, receiver_id, content, created_at)
		VALUES (?, ?, ?, ?)
		RETURNING id
	`

	var messageID int
	err := c.hub.db.QueryRow(query, c.userID, recipientID, content, time.Now()).Scan(&messageID)
	return messageID, err
}

// saveGroupMessage saves a group message to the database
func (c *Client) saveGroupMessage(groupID int, content string) (int, error) {
	query := `
		INSERT INTO group_messages (group_id, sender_id, content, created_at)
		VALUES (?, ?, ?, ?)
		RETURNING id
	`

	var messageID int
	err := c.hub.db.QueryRow(query, groupID, c.userID, content, time.Now()).Scan(&messageID)
	return messageID, err
}

// sendError sends an error message to the client
func (c *Client) sendError(errorMsg string) {
	errorMessage := WSMessage{
		Type:      MessageTypeError,
		Content:   errorMsg,
		Timestamp: time.Now(),
	}

	messageBytes, _ := json.Marshal(errorMessage)
	select {
	case c.send <- messageBytes:
	default:
		// Client's send channel is full, close the connection
		c.hub.unregisterClient(c)
	}
}

// SendGroupMessage sends a message to all members of a group
func (h *Hub) SendGroupMessage(groupID int, senderID int, content string, messageID int) {
	message := WSMessage{
		Type:      MessageTypeGroup,
		Content:   content,
		From:      senderID,
		GroupID:   groupID,
		MessageID: messageID,
		Timestamp: time.Now(),
	}

	h.mu.RLock()
	if clients, exists := h.groupClients[groupID]; exists {
		for client := range clients {
			if client.userID != senderID {
				h.sendToClient(client, message)
			}
		}
	}
	h.mu.RUnlock()
}

// SendPrivateMessage sends a message to a specific user
func (h *Hub) SendPrivateMessage(senderID int, recipientID int, content string, messageID int) {
	message := WSMessage{
		Type:      MessageTypePrivate,
		Content:   content,
		From:      senderID,
		To:        recipientID,
		MessageID: messageID,
		Timestamp: time.Now(),
	}

	h.mu.RLock()
	if client, exists := h.userClients[recipientID]; exists {
		h.sendToClient(client, message)
	}
	h.mu.RUnlock()
}

// WebSocketAuthMiddleware authenticates WebSocket connections
func WebSocketAuthMiddleware(sessionManager *auth.SessionManager) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Get session cookie
		cookie, err := r.Cookie("session_id")
		if err != nil {
			log.Printf("WebSocket: No session cookie found: %v", err)
			http.Error(w, "Authentication required", http.StatusUnauthorized)
			return
		}

		// Validate session
		session, err := sessionManager.GetSession(cookie.Value)
		if err != nil {
			log.Printf("WebSocket: Session validation failed: %v", err)
			http.Error(w, "Invalid session", http.StatusUnauthorized)
			return
		}

		log.Printf("WebSocket: Authenticated user %d for WebSocket connection", session.UserID)

		// Store userID in request context for the WebSocket handler
		ctx := r.Context()
		ctx = SetUserIDInContext(ctx, session.UserID)
		r = r.WithContext(ctx)

		// Pass to next handler (will be the WebSocket upgrade handler)
		// This would typically be handled by the main server routing
		w.Header().Set("X-User-ID", fmt.Sprintf("%d", session.UserID))
	}
}

// Helper function to set user ID in context (add to auth package)
func SetUserIDInContext(ctx context.Context, userID int) context.Context {
	return context.WithValue(ctx, auth.UserIDKey, userID)
}
