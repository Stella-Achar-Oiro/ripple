// backend/pkg/websocket/hub.go
package websocket

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"ripple/pkg/auth"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

// Hub maintains the set of active clients and broadcasts messages
type Hub struct {
	// Registered clients
	clients map[*Client]bool

	// Maps user IDs to clients
	userClients map[int]*Client

	// Maps group IDs to group members' clients
	groupClients map[int]map[*Client]bool

	// Inbound messages for all clients
	broadcast chan []byte

	// Register requests from clients
	register chan *Client

	// Unregister requests from clients
	unregister chan *Client

	// Stop signal
	stop chan struct{}

	// Database connection
	db *sql.DB

	// Mutex for concurrent access
	mu sync.RWMutex
}

// HandleWebSocket upgrades HTTP connection to WebSocket and handles the connection
func HandleWebSocket(hub *Hub, sm *auth.SessionManager, w http.ResponseWriter, r *http.Request) {
	// Get session cookie
	cookie, err := r.Cookie("session_id")
	if err != nil {
		log.Printf("No session cookie found: %v", err)
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Get session and validate
	session, err := sm.GetSession(cookie.Value)
	if err != nil {
		log.Printf("Invalid session: %v", err)
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	upgrader := websocket.Upgrader{
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
		CheckOrigin: func(r *http.Request) bool {
			// In production, you should check the origin against your allowed domains
			return true
		},
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("Error upgrading to WebSocket: %v", err)
		return
	}

	client := &Client{
		hub:        hub,
		conn:       conn,
		send:       make(chan []byte, 256),
		userID:     session.UserID,
		lastSeen:   time.Now(),
		userGroups: make(map[int]bool),
	}

	// Register the client
	client.hub.register <- client

	// Start the read and write pumps in separate goroutines
	go client.writePump()
	go client.readPump()
}

// Client represents a WebSocket client
type Client struct {
	// The WebSocket connection
	conn *websocket.Conn

	// Buffered channel of outbound messages
	send chan []byte

	// User ID of the client
	userID int

	// Hub reference
	hub *Hub

	// Last seen timestamp
	lastSeen time.Time

	// User groups (cached for quick access)
	userGroups map[int]bool
}

// Message types for WebSocket communication
type MessageType string

const (
	MessageTypePrivate      MessageType = "private_message"
	MessageTypeGroup        MessageType = "group_message"
	MessageTypeNotification MessageType = "notification"
	MessageTypeUserOnline   MessageType = "user_online"
	MessageTypeUserOffline  MessageType = "user_offline"
	MessageTypeTyping       MessageType = "typing"
	MessageTypeError        MessageType = "error"
)

// WebSocket message structure
type WSMessage struct {
	Type      MessageType `json:"type"`
	Content   string      `json:"content,omitempty"`
	From      int         `json:"from,omitempty"`
	To        int         `json:"to,omitempty"`
	GroupID   int         `json:"group_id,omitempty"`
	MessageID int         `json:"message_id,omitempty"`
	Timestamp time.Time   `json:"timestamp"`
	Data      interface{} `json:"data,omitempty"`
}

// NewHub creates a new WebSocket hub
func NewHub(db *sql.DB) *Hub {
	return &Hub{
		clients:      make(map[*Client]bool),
		userClients:  make(map[int]*Client),
		groupClients: make(map[int]map[*Client]bool),
		broadcast:    make(chan []byte),
		register:     make(chan *Client),
		unregister:   make(chan *Client),
		stop:         make(chan struct{}),
		db:           db,
	}
}

// Stop gracefully shuts down the hub
func (h *Hub) Stop() {
	close(h.stop)
}

// Run starts the hub and handles client connections
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			if client.userID > 0 {
				h.userClients[client.userID] = client
			}

			// Load user's groups and subscribe to group channels
			h.loadUserGroups(client)

			h.mu.Unlock()

			log.Printf("WebSocket: User %d connected", client.userID)

			// Notify contacts that user is online
			h.notifyUserOnline(client.userID)

			// Send queued messages if any
			go h.sendQueuedMessages(client)

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				delete(h.userClients, client.userID)

				// Remove from group channels
				for groupID := range client.userGroups {
					if clients, exists := h.groupClients[groupID]; exists {
						delete(clients, client)
						if len(clients) == 0 {
							delete(h.groupClients, groupID)
						}
					}
				}

				close(client.send)
			}
			h.mu.Unlock()

			log.Printf("WebSocket: User %d disconnected", client.userID)

			// Notify contacts that user is offline
			h.notifyUserOffline(client.userID)

		case message := <-h.broadcast:
			// Handle broadcast messages (notifications, etc.)
			var wsMsg WSMessage
			if err := json.Unmarshal(message, &wsMsg); err != nil {
				log.Printf("WebSocket: Error unmarshaling broadcast message: %v", err)
				continue
			}

			h.handleBroadcastMessage(&wsMsg)

		case <-h.stop:
			h.mu.Lock()
			for client := range h.clients {
				close(client.send)
				delete(h.clients, client)
			}
			h.mu.Unlock()
			return
		}
	}
}

// sendToClient sends a message to a specific client
func (h *Hub) sendToClient(client *Client, message WSMessage) {
	messageBytes, err := json.Marshal(message)
	if err != nil {
		log.Printf("WebSocket: Error marshaling message: %v", err)
		return
	}

	select {
	case client.send <- messageBytes:
		log.Printf("WebSocket: Message sent to user %d", client.userID)
	default:
		// Client's send channel is full, close the connection
		h.unregisterClient(client)
	}
}

// unregisterClient safely unregisters a client
func (h *Hub) unregisterClient(client *Client) {
	select {
	case h.unregister <- client:
	default:
		// Channel is full, force close
		h.mu.Lock()
		if _, ok := h.clients[client]; ok {
			delete(h.clients, client)
			delete(h.userClients, client.userID)
			close(client.send)
		}
		h.mu.Unlock()
	}
}

// loadUserGroups loads and caches user's group memberships
func (h *Hub) loadUserGroups(client *Client) {
	client.userGroups = make(map[int]bool)

	query := `
		SELECT group_id FROM group_members 
		WHERE user_id = ? AND status = 'accepted'
	`

	rows, err := h.db.Query(query, client.userID)
	if err != nil {
		log.Printf("WebSocket: Error loading user groups: %v", err)
		return
	}
	defer rows.Close()

	for rows.Next() {
		var groupID int
		if err := rows.Scan(&groupID); err != nil {
			log.Printf("WebSocket: Error scanning group ID: %v", err)
			continue
		}

		client.userGroups[groupID] = true

		// Add client to group channel
		if h.groupClients[groupID] == nil {
			h.groupClients[groupID] = make(map[*Client]bool)
		}
		h.groupClients[groupID][client] = true
	}

	log.Printf("WebSocket: Loaded %d groups for user %d", len(client.userGroups), client.userID)
}

// notifyUserOnline notifies contacts that a user came online
func (h *Hub) notifyUserOnline(userID int) {
	// Get user's contacts (followers and following)
	contacts := h.getUserContacts(userID)

	message := WSMessage{
		Type:      MessageTypeUserOnline,
		From:      userID,
		Timestamp: time.Now(),
	}

	messageBytes, _ := json.Marshal(message)

	h.mu.RLock()
	for _, contactID := range contacts {
		if client, exists := h.userClients[contactID]; exists {
			select {
			case client.send <- messageBytes:
			default:
				// Skip if send channel is full
			}
		}
	}
	h.mu.RUnlock()
}

// notifyUserOffline notifies contacts that a user went offline
func (h *Hub) notifyUserOffline(userID int) {
	contacts := h.getUserContacts(userID)

	message := WSMessage{
		Type:      MessageTypeUserOffline,
		From:      userID,
		Timestamp: time.Now(),
	}

	messageBytes, _ := json.Marshal(message)

	h.mu.RLock()
	for _, contactID := range contacts {
		if client, exists := h.userClients[contactID]; exists {
			select {
			case client.send <- messageBytes:
			default:
				// Skip if send channel is full
			}
		}
	}
	h.mu.RUnlock()
}

// getUserContacts gets user's contacts (followers and following)
func (h *Hub) getUserContacts(userID int) []int {
	var contacts []int

	query := `
		SELECT DISTINCT 
			CASE 
				WHEN follower_id = ? THEN following_id 
				ELSE follower_id 
			END as contact_id
		FROM follows 
		WHERE (follower_id = ? OR following_id = ?) AND status = 'accepted'
	`

	rows, err := h.db.Query(query, userID, userID, userID)
	if err != nil {
		log.Printf("WebSocket: Error getting user contacts: %v", err)
		return contacts
	}
	defer rows.Close()

	for rows.Next() {
		var contactID int
		if err := rows.Scan(&contactID); err != nil {
			continue
		}
		contacts = append(contacts, contactID)
	}

	return contacts
}

// handleBroadcastMessage handles broadcast messages
func (h *Hub) handleBroadcastMessage(message *WSMessage) {
	switch message.Type {
	case MessageTypeNotification:
		// Handle notification broadcasts
		if message.To > 0 {
			h.SendNotification(message.To, message.Data)
		}
	}
}

// sendQueuedMessages sends any queued offline messages
func (h *Hub) sendQueuedMessages(client *Client) {
	// Get unread messages for the user
	query := `
		SELECT id, sender_id, content, created_at 
		FROM messages 
		WHERE receiver_id = ? AND read_at IS NULL 
		ORDER BY created_at DESC 
		LIMIT 50
	`

	rows, err := h.db.Query(query, client.userID)
	if err != nil {
		log.Printf("WebSocket: Error getting queued messages: %v", err)
		return
	}
	defer rows.Close()

	var queuedCount int
	for rows.Next() {
		var messageID, senderID int
		var content string
		var createdAt time.Time

		if err := rows.Scan(&messageID, &senderID, &content, &createdAt); err != nil {
			continue
		}

		message := WSMessage{
			Type:      MessageTypePrivate,
			Content:   content,
			From:      senderID,
			To:        client.userID,
			MessageID: messageID,
			Timestamp: createdAt,
		}

		h.sendToClient(client, message)
		queuedCount++
	}

	if queuedCount > 0 {
		log.Printf("WebSocket: Sent %d queued messages to user %d", queuedCount, client.userID)
	}
}

// IsUserOnline checks if a user is currently online
func (h *Hub) IsUserOnline(userID int) bool {
	h.mu.RLock()
	_, exists := h.userClients[userID]
	h.mu.RUnlock()
	return exists
}

// GetOnlineUsers returns a list of all online user IDs
func (h *Hub) GetOnlineUsers() []int {
	h.mu.RLock()
	defer h.mu.RUnlock()

	onlineUsers := make([]int, 0)
	for client := range h.clients {
		if client.userID > 0 {
			onlineUsers = append(onlineUsers, client.userID)
		}
	}
	return onlineUsers
}

// GetOnlineGroupMembers returns online members of a specific group
func (h *Hub) GetOnlineGroupMembers(groupID int) []int {
	h.mu.RLock()
	defer h.mu.RUnlock()

	var members []int
	if clients, exists := h.groupClients[groupID]; exists {
		for client := range clients {
			members = append(members, client.userID)
		}
	}
	return members
}

// BroadcastTypingIndicator sends typing status to relevant clients
func (h *Hub) BroadcastTypingIndicator(userID int, chatType string, targetID int, isTyping bool) {
	msg := WSMessage{
		Type:      MessageTypeTyping,
		From:      userID,
		Timestamp: time.Now(),
		Data: map[string]interface{}{
			"user_id":   userID,
			"chat_type": chatType,
			"target_id": targetID,
			"is_typing": isTyping,
		},
	}

	messageBytes, err := json.Marshal(msg)
	if err != nil {
		log.Printf("Error marshaling typing indicator: %v", err)
		return
	}

	h.mu.RLock()
	defer h.mu.RUnlock()

	for client := range h.clients {
		if chatType == "private" && client.userID == targetID {
			// For private chat, send only to the target user
			client.send <- messageBytes
		} else if chatType == "group" {
			// For group chat, if client is in the group and not the sender
			if client.userGroups[targetID] && client.userID != userID {
				client.send <- messageBytes
			}
		}
	}
}

// SendNotification sends a notification to a specific user
func (h *Hub) SendNotification(userID int, data interface{}) {
	message := WSMessage{
		Type:      MessageTypeNotification,
		To:        userID,
		Data:      data,
		Timestamp: time.Now(),
	}

	messageBytes, err := json.Marshal(message)
	if err != nil {
		log.Printf("WebSocket: Error marshaling notification: %v", err)
		return
	}

	h.mu.RLock()
	if client, exists := h.userClients[userID]; exists {
		select {
		case client.send <- messageBytes:
			log.Printf("WebSocket: Notification sent to user %d", userID)
		default:
			// Skip if send channel is full
			log.Printf("WebSocket: Failed to send notification to user %d - channel full", userID)
		}
	}
	h.mu.RUnlock()
}
