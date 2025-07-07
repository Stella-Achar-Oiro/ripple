// backend/pkg/handlers/chat.go
package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"ripple/pkg/auth"
	"ripple/pkg/models"
	"ripple/pkg/utils"
	"ripple/pkg/websocket"
)

type ChatHandler struct {
	messageRepo *models.MessageRepository
	followRepo  *models.FollowRepository
	groupRepo   *models.GroupRepository
	userRepo    *models.UserRepository
	hub         *websocket.Hub
}

func NewChatHandler(messageRepo *models.MessageRepository, followRepo *models.FollowRepository, groupRepo *models.GroupRepository, userRepo *models.UserRepository, hub *websocket.Hub) *ChatHandler {
	return &ChatHandler{
		messageRepo: messageRepo,
		followRepo:  followRepo,
		groupRepo:   groupRepo,
		userRepo:    userRepo,
		hub:         hub,
	}
}

// GetPrivateMessages gets message history between two users
func (ch *ChatHandler) GetPrivateMessages(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.WriteErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	userID, err := auth.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.WriteErrorResponse(w, http.StatusUnauthorized, "User not authenticated")
		return
	}

	// Get other user ID from URL path
	pathParts := strings.Split(r.URL.Path, "/")
	if len(pathParts) < 5 {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "Other user ID required")
		return
	}

	otherUserID, err := strconv.Atoi(pathParts[4])
	if err != nil {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "Invalid user ID")
		return
	}

	// Check if users can message each other
	canMessage, err := ch.followRepo.CanSendMessage(userID, otherUserID)
	if err != nil {
		utils.WriteInternalErrorResponse(w, err)
		return
	}
	if !canMessage {
		utils.WriteErrorResponse(w, http.StatusForbidden, "Cannot view messages with this user")
		return
	}

	// Parse query parameters for pagination
	query := r.URL.Query()
	limit := 50
	offset := 0

	if limitStr := query.Get("limit"); limitStr != "" {
		if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 && parsedLimit <= 100 {
			limit = parsedLimit
		}
	}

	if offsetStr := query.Get("offset"); offsetStr != "" {
		if parsedOffset, err := strconv.Atoi(offsetStr); err == nil && parsedOffset >= 0 {
			offset = parsedOffset
		}
	}

	// Get message history
	messages, err := ch.messageRepo.GetPrivateMessages(userID, otherUserID, limit, offset)
	if err != nil {
		utils.WriteInternalErrorResponse(w, err)
		return
	}

	// Mark messages as read
	err = ch.messageRepo.MarkMessagesAsRead(userID, otherUserID)
	if err != nil {
		// Log error but don't fail the request
		// log.Printf("Failed to mark messages as read: %v", err)
	}

	utils.WriteSuccessResponse(w, http.StatusOK, map[string]interface{}{
		"messages": messages,
		"limit":    limit,
		"offset":   offset,
		"count":    len(messages),
	})
}

// GetGroupMessages gets message history for a group
func (ch *ChatHandler) GetGroupMessages(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.WriteErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	userID, err := auth.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.WriteErrorResponse(w, http.StatusUnauthorized, "User not authenticated")
		return
	}

	// Get group ID from URL path
	pathParts := strings.Split(r.URL.Path, "/")
	if len(pathParts) < 6 {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "Group ID required")
		return
	}

	groupID, err := strconv.Atoi(pathParts[5])
	if err != nil {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "Invalid group ID")
		return
	}

	// Check if user is a member of the group
	isMember, err := ch.groupRepo.IsMember(groupID, userID)
	if err != nil {
		utils.WriteInternalErrorResponse(w, err)
		return
	}
	if !isMember {
		utils.WriteErrorResponse(w, http.StatusForbidden, "Only group members can view messages")
		return
	}

	// Parse query parameters for pagination
	query := r.URL.Query()
	limit := 50
	offset := 0

	if limitStr := query.Get("limit"); limitStr != "" {
		if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 && parsedLimit <= 100 {
			limit = parsedLimit
		}
	}

	if offsetStr := query.Get("offset"); offsetStr != "" {
		if parsedOffset, err := strconv.Atoi(offsetStr); err == nil && parsedOffset >= 0 {
			offset = parsedOffset
		}
	}

	// Get message history
	messages, err := ch.messageRepo.GetGroupMessages(groupID, limit, offset)
	if err != nil {
		utils.WriteInternalErrorResponse(w, err)
		return
	}

	utils.WriteSuccessResponse(w, http.StatusOK, map[string]interface{}{
		"messages": messages,
		"limit":    limit,
		"offset":   offset,
		"count":    len(messages),
	})
}

// GetConversations gets list of conversations for current user
func (ch *ChatHandler) GetConversations(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.WriteErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	userID, err := auth.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.WriteErrorResponse(w, http.StatusUnauthorized, "User not authenticated")
		return
	}

	// Parse query parameters for pagination
	query := r.URL.Query()
	limit := 20
	offset := 0

	if limitStr := query.Get("limit"); limitStr != "" {
		if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 && parsedLimit <= 100 {
			limit = parsedLimit
		}
	}

	if offsetStr := query.Get("offset"); offsetStr != "" {
		if parsedOffset, err := strconv.Atoi(offsetStr); err == nil && parsedOffset >= 0 {
			offset = parsedOffset
		}
	}

	// Get conversations
	conversations, err := ch.messageRepo.GetConversations(userID, limit, offset)
	if err != nil {
		utils.WriteInternalErrorResponse(w, err)
		return
	}

	utils.WriteSuccessResponse(w, http.StatusOK, map[string]interface{}{
		"conversations": conversations,
		"limit":         limit,
		"offset":        offset,
		"count":         len(conversations),
	})
}

// GetOnlineUsers gets list of currently online friends (followers or following)
func (ch *ChatHandler) GetOnlineUsers(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.WriteErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	userID, err := auth.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.WriteErrorResponse(w, http.StatusUnauthorized, "User not authenticated")
		return
	}

	// Get online users from the hub
	onlineUserIDs := ch.hub.GetOnlineUsers()
	onlineUserSet := make(map[int]struct{}, len(onlineUserIDs))
	for _, id := range onlineUserIDs {
		onlineUserSet[id] = struct{}{}
	}

	// Get followers and following (friends)
	followers, err := ch.followRepo.GetFollowers(userID)
	if err != nil {
		utils.WriteInternalErrorResponse(w, err)
		return
	}
	following, err := ch.followRepo.GetFollowing(userID)
	if err != nil {
		utils.WriteInternalErrorResponse(w, err)
		return
	}

	// Merge followers and following, remove duplicates, skip self, and filter to only online
	friendMap := make(map[int]*models.UserResponse)
	for _, u := range followers {
		if u.ID != userID {
			friendMap[u.ID] = u
		}
	}
	for _, u := range following {
		if u.ID != userID {
			friendMap[u.ID] = u
		}
	}

	onlineFriends := make([]*models.UserResponse, 0)
	for id, user := range friendMap {
		if _, isOnline := onlineUserSet[id]; isOnline {
			onlineFriends = append(onlineFriends, user)
		}
	}

	utils.WriteSuccessResponse(w, http.StatusOK, map[string]interface{}{
		"success":      true,
		"online_users": onlineFriends,
		"count":        len(onlineFriends),
	})
}

// TypingIndicator handles typing indicator events
func (ch *ChatHandler) TypingIndicator(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.WriteErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	userID, err := auth.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.WriteErrorResponse(w, http.StatusUnauthorized, "User not authenticated")
		return
	}

	var req struct {
		Type     string `json:"type"`      // "private" or "group"
		TargetID int    `json:"target_id"` // user ID or group ID
		IsTyping bool   `json:"is_typing"` // true when typing, false when stopped
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "Invalid JSON format")
		return
	}

	// Validate type
	if req.Type != "private" && req.Type != "group" {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "Type must be 'private' or 'group'")
		return
	}

	// Check permissions
	if req.Type == "private" {
		canMessage, err := ch.followRepo.CanSendMessage(userID, req.TargetID)
		if err != nil {
			utils.WriteInternalErrorResponse(w, err)
			return
		}
		if !canMessage {
			utils.WriteErrorResponse(w, http.StatusForbidden, "Cannot send messages to this user")
			return
		}
	} else if req.Type == "group" {
		isMember, err := ch.groupRepo.IsMember(req.TargetID, userID)
		if err != nil {
			utils.WriteInternalErrorResponse(w, err)
			return
		}
		if !isMember {
			utils.WriteErrorResponse(w, http.StatusForbidden, "Only group members can participate in chat")
			return
		}
	}

	// Send typing indicator through WebSocket hub
	ch.hub.BroadcastTypingIndicator(userID, req.Type, req.TargetID, req.IsTyping)

	utils.WriteSuccessResponse(w, http.StatusOK, map[string]string{
		"message": "Typing indicator sent",
	})
}

// GetUnreadCounts gets unread message counts for user
func (ch *ChatHandler) GetUnreadCounts(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.WriteErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	userID, err := auth.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.WriteErrorResponse(w, http.StatusUnauthorized, "User not authenticated")
		return
	}

	// Get unread counts
	counts, err := ch.messageRepo.GetUnreadCounts(userID)
	if err != nil {
		utils.WriteInternalErrorResponse(w, err)
		return
	}

	utils.WriteSuccessResponse(w, http.StatusOK, counts)
}

// CreatePrivateMessage creates a new private message
func (ch *ChatHandler) CreatePrivateMessage(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.WriteErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	userID, err := auth.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.WriteErrorResponse(w, http.StatusUnauthorized, "User not authenticated")
		return
	}

	var req models.CreatePrivateMessageRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Check if users can message each other
	canMessage, err := ch.followRepo.CanSendMessage(userID, req.ReceiverID)
	if err != nil {
		utils.WriteInternalErrorResponse(w, err)
		return
	}
	if !canMessage {
		utils.WriteErrorResponse(w, http.StatusForbidden, "Cannot send message to this user")
		return
	}

	// Create message
	message, err := ch.messageRepo.CreatePrivateMessage(userID, req.ReceiverID, req.Content)
	if err != nil {
		utils.WriteInternalErrorResponse(w, err)
		return
	}

	// Get sender and receiver info for the response
	sender, err := ch.userRepo.GetUserByID(userID)
	if err != nil {
		utils.WriteInternalErrorResponse(w, err)
		return
	}
	receiver, err := ch.userRepo.GetUserByID(req.ReceiverID)
	if err != nil {
		utils.WriteInternalErrorResponse(w, err)
		return
	}

	message.Sender = sender.ToResponse()
	message.Receiver = receiver.ToResponse()

	// Send real-time message via WebSocket
	wsMessage := websocket.WSMessage{
		Type:      websocket.MessageTypePrivate,
		Content:   message.Content,
		From:      userID,
		To:        req.ReceiverID,
		MessageID: message.ID,
		Timestamp: message.CreatedAt,
		Data: map[string]interface{}{
			"message": message,
		},
	}

	ch.hub.SendToUser(req.ReceiverID, wsMessage)

	utils.WriteSuccessResponse(w, http.StatusCreated, map[string]interface{}{
		"message": message,
	})
}

// CreateGroupMessage creates a new group message
func (ch *ChatHandler) CreateGroupMessage(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.WriteErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	userID, err := auth.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.WriteErrorResponse(w, http.StatusUnauthorized, "User not authenticated")
		return
	}

	var req models.CreateGroupMessageRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Check if user is a member of the group
	isMember, err := ch.groupRepo.IsMember(req.GroupID, userID)
	if err != nil {
		utils.WriteInternalErrorResponse(w, err)
		return
	}
	if !isMember {
		utils.WriteErrorResponse(w, http.StatusForbidden, "Only group members can send messages")
		return
	}

	// Create message
	message, err := ch.messageRepo.CreateGroupMessage(req.GroupID, userID, req.Content)
	if err != nil {
		utils.WriteInternalErrorResponse(w, err)
		return
	}

	// Get sender info for the response
	sender, err := ch.userRepo.GetUserByID(userID)
	if err != nil {
		utils.WriteInternalErrorResponse(w, err)
		return
	}

	message.Sender = sender.ToResponse()

	// Send real-time message via WebSocket to all group members
	wsMessage := websocket.WSMessage{
		Type:      websocket.MessageTypeGroup,
		Content:   message.Content,
		From:      userID,
		GroupID:   req.GroupID,
		MessageID: message.ID,
		Timestamp: message.CreatedAt,
		Data: map[string]interface{}{
			"message": message,
		},
	}

	ch.hub.BroadcastToGroup(req.GroupID, wsMessage, userID)

	utils.WriteSuccessResponse(w, http.StatusCreated, map[string]interface{}{
		"message": message,
	})
}

// GetMessageableUsers gets all users that the current user can send messages to
func (ch *ChatHandler) GetMessageableUsers(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.WriteErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	userID, err := auth.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.WriteErrorResponse(w, http.StatusUnauthorized, "User not authenticated")
		return
	}

	users, err := ch.followRepo.GetMessageableUsers(userID)
	if err != nil {
		utils.WriteInternalErrorResponse(w, err)
		return
	}

	utils.WriteSuccessResponse(w, http.StatusOK, map[string]interface{}{
		"users": users,
	})
}

// GetSocialConnections gets users with social connections for messaging
func (ch *ChatHandler) GetSocialConnections(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.WriteErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	userID, err := auth.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.WriteErrorResponse(w, http.StatusUnauthorized, "User not authenticated")
		return
	}

	connections, err := ch.followRepo.GetSocialConnections(userID)
	if err != nil {
		utils.WriteInternalErrorResponse(w, err)
		return
	}

	utils.WriteSuccessResponse(w, http.StatusOK, map[string]interface{}{
		"connections": connections,
	})
}

// CheckCanMessage checks if current user can send message to another user
func (ch *ChatHandler) CheckCanMessage(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.WriteErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	userID, err := auth.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.WriteErrorResponse(w, http.StatusUnauthorized, "User not authenticated")
		return
	}

	// Get target user ID from URL path
	pathParts := strings.Split(r.URL.Path, "/")
	if len(pathParts) < 5 {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "Target user ID required")
		return
	}

	targetUserID, err := strconv.Atoi(pathParts[4])
	if err != nil {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "Invalid user ID")
		return
	}

	canMessage, err := ch.followRepo.CanSendMessage(userID, targetUserID)
	if err != nil {
		utils.WriteInternalErrorResponse(w, err)
		return
	}

	utils.WriteSuccessResponse(w, http.StatusOK, map[string]interface{}{
		"can_message": canMessage,
	})
}
