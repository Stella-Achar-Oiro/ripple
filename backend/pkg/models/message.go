// backend/pkg/models/message.go
package models

import (
	"database/sql"
	"fmt"
	"strings"
	"time"
)

type MessageRepository struct {
	db *sql.DB
}

func NewMessageRepository(db *sql.DB) *MessageRepository {
	return &MessageRepository{db: db}
}

// Private Message Models
type PrivateMessage struct {
	ID         int       `json:"id" db:"id"`
	SenderID   int       `json:"sender_id" db:"sender_id"`
	ReceiverID int       `json:"receiver_id" db:"receiver_id"`
	Content    string    `json:"content" db:"content"`
	CreatedAt  time.Time `json:"created_at" db:"created_at"`
	ReadAt     *time.Time `json:"read_at" db:"read_at"`
	
	// Joined fields
	Sender   *UserResponse `json:"sender,omitempty"`
	Receiver *UserResponse `json:"receiver,omitempty"`
}

// Group Message Models
type GroupMessage struct {
	ID        int       `json:"id" db:"id"`
	GroupID   int       `json:"group_id" db:"group_id"`
	SenderID  int       `json:"sender_id" db:"sender_id"`
	Content   string    `json:"content" db:"content"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	
	// Joined fields
	Sender *UserResponse `json:"sender,omitempty"`
}

// Conversation represents a chat conversation
type Conversation struct {
	Type           string         `json:"type"`            // "private" or "group"
	ID             int            `json:"id"`              // user_id for private, group_id for group
	Title          string         `json:"title"`           // user name for private, group name for group
	LastMessage    *string        `json:"last_message"`    // content of last message
	LastMessageAt  *time.Time     `json:"last_message_at"` // timestamp of last message
	UnreadCount    int            `json:"unread_count"`    // number of unread messages
	Participant    *UserResponse  `json:"participant,omitempty"` // for private chats
	GroupInfo      *ConversationGroup `json:"group_info,omitempty"`   // for group chats
}

type ConversationGroup struct {
	ID          int    `json:"id"`
	Title       string `json:"title"`
	Description string `json:"description"`
	MemberCount int    `json:"member_count"`
}

// WebSocket Message Types
type WebSocketMessage struct {
	Type      string                 `json:"type"`
	Data      map[string]interface{} `json:"data"`
	Timestamp time.Time              `json:"timestamp"`
}

type CreatePrivateMessageRequest struct {
	ReceiverID int    `json:"receiver_id"`
	Content    string `json:"content"`
}

type CreateGroupMessageRequest struct {
	GroupID int    `json:"group_id"`
	Content string `json:"content"`
}

type UnreadCounts struct {
	PrivateMessages int `json:"private_messages"`
	GroupMessages   int `json:"group_messages"`
	Total           int `json:"total"`
}

// CreatePrivateMessage creates a new private message
func (mr *MessageRepository) CreatePrivateMessage(senderID, receiverID int, content string) (*PrivateMessage, error) {
	// Validate content
	if strings.TrimSpace(content) == "" {
		return nil, fmt.Errorf("message content cannot be empty")
	}

	if len(content) > 2000 {
		return nil, fmt.Errorf("message content too long (max 2000 characters)")
	}

	query := `
		INSERT INTO messages (sender_id, receiver_id, content, created_at)
		VALUES (?, ?, ?, ?)
		RETURNING id, created_at
	`

	now := time.Now()
	message := &PrivateMessage{
		SenderID:   senderID,
		ReceiverID: receiverID,
		Content:    strings.TrimSpace(content),
		CreatedAt:  now,
	}

	err := mr.db.QueryRow(query,
		message.SenderID,
		message.ReceiverID,
		message.Content,
		message.CreatedAt,
	).Scan(&message.ID, &message.CreatedAt)

	if err != nil {
		return nil, fmt.Errorf("failed to create private message: %w", err)
	}

	return message, nil
}

// CreateGroupMessage creates a new group message
func (mr *MessageRepository) CreateGroupMessage(groupID, senderID int, content string) (*GroupMessage, error) {
	// Validate content
	if strings.TrimSpace(content) == "" {
		return nil, fmt.Errorf("message content cannot be empty")
	}

	if len(content) > 2000 {
		return nil, fmt.Errorf("message content too long (max 2000 characters)")
	}

	query := `
		INSERT INTO group_messages (group_id, sender_id, content, created_at)
		VALUES (?, ?, ?, ?)
		RETURNING id, created_at
	`

	now := time.Now()
	message := &GroupMessage{
		GroupID:   groupID,
		SenderID:  senderID,
		Content:   strings.TrimSpace(content),
		CreatedAt: now,
	}

	err := mr.db.QueryRow(query,
		message.GroupID,
		message.SenderID,
		message.Content,
		message.CreatedAt,
	).Scan(&message.ID, &message.CreatedAt)

	if err != nil {
		return nil, fmt.Errorf("failed to create group message: %w", err)
	}

	return message, nil
}

// GetPrivateMessages gets message history between two users
func (mr *MessageRepository) GetPrivateMessages(userID, otherUserID int, limit, offset int) ([]*PrivateMessage, error) {
	query := `
		SELECT m.id, m.sender_id, m.receiver_id, m.content, m.created_at, m.read_at,
		       s.id, s.email, s.first_name, s.last_name, s.date_of_birth, s.nickname, s.about_me, s.avatar_path, s.is_public, s.created_at,
		       r.id, r.email, r.first_name, r.last_name, r.date_of_birth, r.nickname, r.about_me, r.avatar_path, r.is_public, r.created_at
		FROM messages m
		JOIN users s ON m.sender_id = s.id
		JOIN users r ON m.receiver_id = r.id
		WHERE (m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?)
		ORDER BY m.created_at DESC
		LIMIT ? OFFSET ?
	`

	rows, err := mr.db.Query(query, userID, otherUserID, otherUserID, userID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to get private messages: %w", err)
	}
	defer rows.Close()

	var messages []*PrivateMessage
	for rows.Next() {
		message := &PrivateMessage{}
		sender := &User{}
		receiver := &User{}

		err := rows.Scan(
			&message.ID, &message.SenderID, &message.ReceiverID, &message.Content, &message.CreatedAt, &message.ReadAt,
			&sender.ID, &sender.Email, &sender.FirstName, &sender.LastName, &sender.DateOfBirth, &sender.Nickname, &sender.AboutMe, &sender.AvatarPath, &sender.IsPublic, &sender.CreatedAt,
			&receiver.ID, &receiver.Email, &receiver.FirstName, &receiver.LastName, &receiver.DateOfBirth, &receiver.Nickname, &receiver.AboutMe, &receiver.AvatarPath, &receiver.IsPublic, &receiver.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan private message: %w", err)
		}

		message.Sender = sender.ToResponse()
		message.Receiver = receiver.ToResponse()
		messages = append(messages, message)
	}

	return messages, nil
}

// GetGroupMessages gets message history for a group
func (mr *MessageRepository) GetGroupMessages(groupID int, limit, offset int) ([]*GroupMessage, error) {
	query := `
		SELECT gm.id, gm.group_id, gm.sender_id, gm.content, gm.created_at,
		       u.id, u.email, u.first_name, u.last_name, u.date_of_birth, u.nickname, u.about_me, u.avatar_path, u.is_public, u.created_at
		FROM group_messages gm
		JOIN users u ON gm.sender_id = u.id
		WHERE gm.group_id = ?
		ORDER BY gm.created_at DESC
		LIMIT ? OFFSET ?
	`

	rows, err := mr.db.Query(query, groupID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to get group messages: %w", err)
	}
	defer rows.Close()

	var messages []*GroupMessage
	for rows.Next() {
		message := &GroupMessage{}
		sender := &User{}

		err := rows.Scan(
			&message.ID, &message.GroupID, &message.SenderID, &message.Content, &message.CreatedAt,
			&sender.ID, &sender.Email, &sender.FirstName, &sender.LastName, &sender.DateOfBirth, &sender.Nickname, &sender.AboutMe, &sender.AvatarPath, &sender.IsPublic, &sender.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan group message: %w", err)
		}

		message.Sender = sender.ToResponse()
		messages = append(messages, message)
	}

	return messages, nil
}

// GetConversations gets list of conversations for a user
func (mr *MessageRepository) GetConversations(userID int, limit, offset int) ([]*Conversation, error) {
	var conversations []*Conversation

	// Get private conversations
	privateQuery := `
		WITH latest_messages AS (
			SELECT 
				CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END as other_user_id,
				content as last_message,
				created_at as last_message_at,
				ROW_NUMBER() OVER (
					PARTITION BY CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END 
					ORDER BY created_at DESC
				) as rn
			FROM messages 
			WHERE sender_id = ? OR receiver_id = ?
		),
		unread_counts AS (
			SELECT sender_id as other_user_id, COUNT(*) as unread_count
			FROM messages 
			WHERE receiver_id = ? AND read_at IS NULL
			GROUP BY sender_id
		)
		SELECT 
			lm.other_user_id,
			u.first_name || ' ' || u.last_name as title,
			lm.last_message,
			lm.last_message_at,
			COALESCE(uc.unread_count, 0) as unread_count,
			u.id, u.email, u.first_name, u.last_name, u.date_of_birth, u.nickname, u.about_me, u.avatar_path, u.is_public, u.created_at
		FROM latest_messages lm
		JOIN users u ON lm.other_user_id = u.id
		LEFT JOIN unread_counts uc ON lm.other_user_id = uc.other_user_id
		WHERE lm.rn = 1
		ORDER BY lm.last_message_at DESC
		LIMIT ? OFFSET ?
	`

	rows, err := mr.db.Query(privateQuery, userID, userID, userID, userID, userID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to get private conversations: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var otherUserID int
		var title, lastMessage string
		var lastMessageAt time.Time
		var unreadCount int
		user := &User{}

		err := rows.Scan(
			&otherUserID, &title, &lastMessage, &lastMessageAt, &unreadCount,
			&user.ID, &user.Email, &user.FirstName, &user.LastName, &user.DateOfBirth, &user.Nickname, &user.AboutMe, &user.AvatarPath, &user.IsPublic, &user.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan private conversation: %w", err)
		}

		conversation := &Conversation{
			Type:          "private",
			ID:            otherUserID,
			Title:         title,
			LastMessage:   &lastMessage,
			LastMessageAt: &lastMessageAt,
			UnreadCount:   unreadCount,
			Participant:   user.ToResponse(),
		}

		conversations = append(conversations, conversation)
	}

	// Get group conversations
	groupQuery := `
		WITH latest_group_messages AS (
			SELECT 
				gm.group_id,
				gm.content as last_message,
				gm.created_at as last_message_at,
				ROW_NUMBER() OVER (PARTITION BY gm.group_id ORDER BY gm.created_at DESC) as rn
			FROM group_messages gm
			JOIN group_members gme ON gm.group_id = gme.group_id
			WHERE gme.user_id = ? AND gme.status = 'accepted'
		)
		SELECT 
			g.id,
			g.title,
			g.description,
			COALESCE(lgm.last_message, '') as last_message,
			lgm.last_message_at,
			(SELECT COUNT(*) FROM group_members WHERE group_id = g.id AND status = 'accepted') as member_count
		FROM groups g
		JOIN group_members gm ON g.id = gm.group_id
		LEFT JOIN latest_group_messages lgm ON g.id = lgm.group_id AND lgm.rn = 1
		WHERE gm.user_id = ? AND gm.status = 'accepted'
		ORDER BY COALESCE(lgm.last_message_at, g.created_at) DESC
		LIMIT ? OFFSET ?
	`

	groupRows, err := mr.db.Query(groupQuery, userID, userID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to get group conversations: %w", err)
	}
	defer groupRows.Close()

	for groupRows.Next() {
		var groupID, memberCount int
		var title, description, lastMessage string
		var lastMessageAt *time.Time

		err := groupRows.Scan(&groupID, &title, &description, &lastMessage, &lastMessageAt, &memberCount)
		if err != nil {
			return nil, fmt.Errorf("failed to scan group conversation: %w", err)
		}

		var lastMsgPtr *string
		if lastMessage != "" {
			lastMsgPtr = &lastMessage
		}

		conversation := &Conversation{
			Type:          "group",
			ID:            groupID,
			Title:         title,
			LastMessage:   lastMsgPtr,
			LastMessageAt: lastMessageAt,
			UnreadCount:   0, // Group messages don't have read status currently
			GroupInfo: &ConversationGroup{
				ID:          groupID,
				Title:       title,
				Description: description,
				MemberCount: memberCount,
			},
		}

		conversations = append(conversations, conversation)
	}

	return conversations, nil
}

// MarkMessagesAsRead marks all messages from a user as read
func (mr *MessageRepository) MarkMessagesAsRead(receiverID, senderID int) error {
	query := `
		UPDATE messages 
		SET read_at = ? 
		WHERE receiver_id = ? AND sender_id = ? AND read_at IS NULL
	`

	_, err := mr.db.Exec(query, time.Now(), receiverID, senderID)
	if err != nil {
		return fmt.Errorf("failed to mark messages as read: %w", err)
	}

	return nil
}

// GetUnreadCounts gets unread message counts for a user
func (mr *MessageRepository) GetUnreadCounts(userID int) (*UnreadCounts, error) {
	var privateCount int
	err := mr.db.QueryRow(`
		SELECT COUNT(*) FROM messages 
		WHERE receiver_id = ? AND read_at IS NULL
	`, userID).Scan(&privateCount)
	
	if err != nil {
		return nil, fmt.Errorf("failed to get private message count: %w", err)
	}

	// For now, group messages don't have read status, so group count is 0
	groupCount := 0

	return &UnreadCounts{
		PrivateMessages: privateCount,
		GroupMessages:   groupCount,
		Total:           privateCount + groupCount,
	}, nil
}

// DeleteMessage deletes a message (sender only)
func (mr *MessageRepository) DeleteMessage(messageID, userID int, messageType string) error {
	var query string
	
	if messageType == "private" {
		query = `DELETE FROM messages WHERE id = ? AND sender_id = ?`
	} else if messageType == "group" {
		query = `DELETE FROM group_messages WHERE id = ? AND sender_id = ?`
	} else {
		return fmt.Errorf("invalid message type")
	}

	result, err := mr.db.Exec(query, messageID, userID)
	if err != nil {
		return fmt.Errorf("failed to delete message: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("message not found or insufficient permissions")
	}

	return nil
}

// GetLatestMessage gets the most recent message in a conversation
func (mr *MessageRepository) GetLatestMessage(userID, otherUserID int) (*PrivateMessage, error) {
	query := `
		SELECT m.id, m.sender_id, m.receiver_id, m.content, m.created_at, m.read_at
		FROM messages m
		WHERE (m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?)
		ORDER BY m.created_at DESC
		LIMIT 1
	`

	message := &PrivateMessage{}
	err := mr.db.QueryRow(query, userID, otherUserID, otherUserID, userID).Scan(
		&message.ID, &message.SenderID, &message.ReceiverID, &message.Content, &message.CreatedAt, &message.ReadAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil // No messages found
		}
		return nil, fmt.Errorf("failed to get latest message: %w", err)
	}

	return message, nil
}