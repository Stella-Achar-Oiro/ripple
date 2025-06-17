// backend/pkg/websocket/client.go - Enhanced client with privacy integration
package websocket

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

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
	maxMessageSize = 2048
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

// ServeWS handles websocket requests from clients
func ServeWS(hub *Hub, w http.ResponseWriter, r *http.Request, userID int) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		return
	}
	client := &Client{hub: hub, conn: conn, send: make(chan []byte, 256), userID: userID}
	client.hub.register <- client

	go client.writePump()
	go client.readPump()
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
	case MessageTypeReadStatus:
		c.handleReadStatusUpdate(msg)
	case MessageTypePing:
		c.handlePing(msg)
	case MessageTypePong:
		c.handlePong(msg)
	default:
		log.Printf("WebSocket: Unknown message type from user %d: %s", c.userID, msg.Type)
		c.sendError("Unknown message type")
	}
}

// handlePrivateMessage processes private messages with privacy checks
func (c *Client) handlePrivateMessage(msg *WSMessage) {
	if msg.To <= 0 {
		c.sendError("Invalid recipient")
		return
	}

	if msg.Content == "" {
		c.sendError("Message content cannot be empty")
		return
	}

	// Check if user can send message to recipient using existing follow system
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
	savedMessage, err := c.savePrivateMessage(msg.To, msg.Content)
	if err != nil {
		log.Printf("WebSocket: Error saving private message: %v", err)
		c.sendError("Failed to save message")
		return
	}

	// Send message to recipient if online
	c.hub.SendPrivateMessage(c.userID, msg.To, msg.Content, savedMessage.ID)

	// Send confirmation back to sender with full message details
	confirmation := WSMessage{
		Type:      MessageTypePrivate,
		Content:   savedMessage.Content,
		From:      savedMessage.SenderID,
		To:        savedMessage.ReceiverID,
		MessageID: savedMessage.ID,
		Timestamp: savedMessage.CreatedAt,
		Data: map[string]interface{}{
			"message": savedMessage,
		},
	}
	c.hub.sendToClient(c, confirmation)
}

// handleGroupMessage processes group messages with membership checks
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
	savedMessage, err := c.saveGroupMessage(msg.GroupID, msg.Content)
	if err != nil {
		log.Printf("WebSocket: Error saving group message: %v", err)
		c.sendError("Failed to save message")
		return
	}

	// Send message to all group members
	c.hub.SendGroupMessage(msg.GroupID, c.userID, msg.Content, savedMessage.ID)

	// Send confirmation back to sender
	confirmation := WSMessage{
		Type:      MessageTypeGroup,
		Content:   savedMessage.Content,
		From:      savedMessage.SenderID,
		GroupID:   savedMessage.GroupID,
		MessageID: savedMessage.ID,
		Timestamp: savedMessage.CreatedAt,
		Data: map[string]interface{}{
			"message": savedMessage,
		},
	}
	c.hub.sendToClient(c, confirmation)
}

// handleTypingIndicator processes typing indicators
func (c *Client) handleTypingIndicator(msg *WSMessage) {
	isTyping, ok := msg.Data.(map[string]interface{})["is_typing"].(bool)
	if !ok {
		isTyping = true
	}

	if msg.To > 0 {
		// Private message typing indicator
		canSend, err := c.canSendPrivateMessage(msg.To)
		if err != nil || !canSend {
			return // Silently ignore if user can't message the recipient
		}

		c.hub.mu.RLock()
		if client, exists := c.hub.userClients[msg.To]; exists {
			typingMsg := WSMessage{
				Type:      MessageTypeTyping,
				From:      c.userID,
				To:        msg.To,
				Timestamp: time.Now(),
				Data: map[string]interface{}{
					"is_typing": isTyping,
				},
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
				Data: map[string]interface{}{
					"is_typing": isTyping,
				},
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

// handleReadStatusUpdate processes read status updates
func (c *Client) handleReadStatusUpdate(msg *WSMessage) {
	if msg.To > 0 {
		// Mark private messages as read
		err := c.markPrivateMessagesAsRead(msg.To)
		if err != nil {
			log.Printf("WebSocket: Error marking messages as read: %v", err)
			return
		}

		// Notify sender that messages were read
		c.hub.mu.RLock()
		if client, exists := c.hub.userClients[msg.To]; exists {
			readMsg := WSMessage{
				Type:      MessageTypeReadStatus,
				From:      c.userID,
				To:        msg.To,
				Timestamp: time.Now(),
				Data: map[string]interface{}{
					"read_by": c.userID,
				},
			}
			c.hub.sendToClient(client, readMsg)
		}
		c.hub.mu.RUnlock()
	}
}

// handlePing responds to ping messages from the client
func (c *Client) handlePing(msg *WSMessage) {
	// Respond with pong
	pongMessage := WSMessage{
		Type:      MessageTypePong,
		Timestamp: time.Now(),
	}
	c.hub.sendToClient(c, pongMessage)
}

// handlePong handles pong messages from the client (acknowledges our ping)
func (c *Client) handlePong(msg *WSMessage) {
	// Update last seen time (already done in readPump)
	c.lastSeen = time.Now()
	// No further action needed for pong messages
}

// canSendPrivateMessage checks if user can send private message using follow system
func (c *Client) canSendPrivateMessage(recipientID int) (bool, error) {
	// Use the existing CanSendMessage logic from follow repository
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

// savePrivateMessage saves a private message and returns the full message object
func (c *Client) savePrivateMessage(recipientID int, content string) (*PrivateMessage, error) {
	query := `
		INSERT INTO messages (sender_id, receiver_id, content, created_at)
		VALUES (?, ?, ?, ?)
		RETURNING id, created_at
	`

	now := time.Now()
	message := &PrivateMessage{
		SenderID:   c.userID,
		ReceiverID: recipientID,
		Content:    content,
		CreatedAt:  now,
	}

	err := c.hub.db.QueryRow(query, message.SenderID, message.ReceiverID, message.Content, message.CreatedAt).Scan(&message.ID, &message.CreatedAt)
	if err != nil {
		return nil, err
	}

	return message, nil
}

// saveGroupMessage saves a group message and returns the full message object
func (c *Client) saveGroupMessage(groupID int, content string) (*GroupMessage, error) {
	query := `
		INSERT INTO group_messages (group_id, sender_id, content, created_at)
		VALUES (?, ?, ?, ?)
		RETURNING id, created_at
	`

	now := time.Now()
	message := &GroupMessage{
		GroupID:   groupID,
		SenderID:  c.userID,
		Content:   content,
		CreatedAt: now,
	}

	err := c.hub.db.QueryRow(query, message.GroupID, message.SenderID, message.Content, message.CreatedAt).Scan(&message.ID, &message.CreatedAt)
	if err != nil {
		return nil, err
	}

	return message, nil
}

// markPrivateMessagesAsRead marks all messages from a user as read
func (c *Client) markPrivateMessagesAsRead(senderID int) error {
	query := `
		UPDATE messages 
		SET read_at = ? 
		WHERE receiver_id = ? AND sender_id = ? AND read_at IS NULL
	`

	_, err := c.hub.db.Exec(query, time.Now(), c.userID, senderID)
	return err
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

// SendPrivateMessage sends a private message to a specific user
func (h *Hub) SendPrivateMessage(senderID, recipientID int, content string, messageID int) {
	h.mu.RLock()
	if client, exists := h.userClients[recipientID]; exists {
		msg := WSMessage{
			Type:      MessageTypePrivate,
			Content:   content,
			From:      senderID,
			To:        recipientID,
			MessageID: messageID,
			Timestamp: time.Now(),
		}
		messageBytes, _ := json.Marshal(msg)
		client.send <- messageBytes
	}
	h.mu.RUnlock()
}

// SendGroupMessage sends a message to all members of a group
func (h *Hub) SendGroupMessage(groupID, senderID int, content string, messageID int) {
	h.mu.RLock()
	if clients, exists := h.groupClients[groupID]; exists {
		msg := WSMessage{
			Type:      MessageTypeGroup,
			Content:   content,
			From:      senderID,
			GroupID:   groupID,
			MessageID: messageID,
			Timestamp: time.Now(),
		}
		messageBytes, _ := json.Marshal(msg)
		for client := range clients {
			if client.userID != senderID {
				client.send <- messageBytes
			}
		}
	}
	h.mu.RUnlock()
}

// Message structures for database integration
type PrivateMessage struct {
	ID         int        `json:"id"`
	SenderID   int        `json:"sender_id"`
	ReceiverID int        `json:"receiver_id"`
	Content    string     `json:"content"`
	CreatedAt  time.Time  `json:"created_at"`
	ReadAt     *time.Time `json:"read_at"`
}

type GroupMessage struct {
	ID        int       `json:"id"`
	GroupID   int       `json:"group_id"`
	SenderID  int       `json:"sender_id"`
	Content   string    `json:"content"`
	CreatedAt time.Time `json:"created_at"`
}
