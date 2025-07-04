// backend/pkg/models/event.go
package models

import (
	"database/sql"
	"fmt"
	"ripple/pkg/constants"
	"strings"
	"time"
)

type EventRepository struct {
	db *sql.DB
}

func NewEventRepository(db *sql.DB) *EventRepository {
	return &EventRepository{db: db}
}

type Event struct {
	ID          int       `json:"id" db:"id"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time `json:"updated_at" db:"updated_at"`
	GroupID     int       `json:"group_id" db:"group_id"`
	CreatorID   int       `json:"creator_id" db:"creator_id"`
	Title       string    `json:"title" db:"title"`
	Description string    `json:"description" db:"description"`
	EventDate   time.Time `json:"event_date" db:"event_date"`

	// Joined fields
	Creator       *UserResponse `json:"creator,omitempty"`
	GroupTitle    string        `json:"group_title,omitempty"`
	IsCreator     bool          `json:"is_creator"`
	UserResponse  *string       `json:"user_response,omitempty"` // "going", "not_going", null
	GoingCount    int           `json:"going_count"`
	NotGoingCount int           `json:"not_going_count"`
}

type EventResponse struct {
	BaseModel
	EventID  int    `json:"event_id" db:"event_id"`
	UserID   int    `json:"user_id" db:"user_id"`
	Response string `json:"response" db:"response"`

	// Joined fields
	User *UserResponse `json:"user,omitempty"`
}

type CreateEventRequest struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	EventDate   string `json:"event_date"` // ISO format: "2025-06-15T19:00:00Z"
}

type EventResponseRequest struct {
	Response string `json:"response"` // "going" or "not_going"
}

// CreateEvent creates a new event in a group
func (er *EventRepository) CreateEvent(groupID, creatorID int, req *CreateEventRequest) (*Event, error) {
	// Validate input
	if strings.TrimSpace(req.Title) == "" {
		return nil, fmt.Errorf("event title is required")
	}

	// Parse event date
	eventDate, err := time.Parse(time.RFC3339, req.EventDate)
	if err != nil {
		return nil, fmt.Errorf("invalid event date format (use ISO 8601): %w", err)
	}

	// Check if event date is in the future
	if eventDate.Before(time.Now()) {
		return nil, fmt.Errorf("event date must be in the future")
	}

	query := `
		INSERT INTO events (group_id, creator_id, title, description, event_date, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
		RETURNING id, created_at, updated_at
	`

	now := time.Now()
	event := &Event{
		GroupID:     groupID,
		CreatorID:   creatorID,
		Title:       strings.TrimSpace(req.Title),
		Description: strings.TrimSpace(req.Description),
		EventDate:   eventDate,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	err = er.db.QueryRow(query,
		event.GroupID,
		event.CreatorID,
		event.Title,
		event.Description,
		event.EventDate,
		event.CreatedAt,
		event.UpdatedAt,
	).Scan(&event.ID, &event.CreatedAt, &event.UpdatedAt)

	if err != nil {
		return nil, fmt.Errorf("failed to create event: %w", err)
	}

	return event, nil
}

// GetEvent gets an event by ID
func (er *EventRepository) GetEvent(eventID, viewerID int) (*Event, error) {
	query := `
		SELECT e.id, e.group_id, e.creator_id, e.title, e.description, e.event_date, e.created_at, e.updated_at,
		       u.id, u.email, u.first_name, u.last_name, u.date_of_birth, u.nickname, u.about_me, u.avatar_path, u.is_public, u.created_at,
		       g.title,
		       (SELECT COUNT(*) FROM event_responses WHERE event_id = e.id AND response = ?) as going_count,
		       (SELECT COUNT(*) FROM event_responses WHERE event_id = e.id AND response = ?) as not_going_count
		FROM events e
		JOIN users u ON e.creator_id = u.id
		JOIN groups g ON e.group_id = g.id
		WHERE e.id = ?
	`

	event := &Event{}
	creator := &User{}

	err := er.db.QueryRow(query, constants.EventResponseGoing, constants.EventResponseNotGoing, eventID).Scan(
		&event.ID, &event.GroupID, &event.CreatorID, &event.Title, &event.Description, &event.EventDate, &event.CreatedAt, &event.UpdatedAt,
		&creator.ID, &creator.Email, &creator.FirstName, &creator.LastName, &creator.DateOfBirth, &creator.Nickname, &creator.AboutMe, &creator.AvatarPath, &creator.IsPublic, &creator.CreatedAt,
		&event.GroupTitle,
		&event.GoingCount,
		&event.NotGoingCount,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("event not found")
		}
		return nil, fmt.Errorf("failed to get event: %w", err)
	}

	event.Creator = creator.ToResponse()
	event.IsCreator = event.CreatorID == viewerID

	// Get viewer's response
	userResponse, err := er.GetUserEventResponse(eventID, viewerID)
	if err == nil {
		event.UserResponse = &userResponse
	}

	return event, nil
}

// GetGroupEvents gets events for a group
func (er *EventRepository) GetGroupEvents(groupID int, limit, offset int) ([]*Event, error) {
	query := `
		SELECT e.id, e.group_id, e.creator_id, e.title, e.description, e.event_date, e.created_at, e.updated_at,
		       u.id, u.email, u.first_name, u.last_name, u.date_of_birth, u.nickname, u.about_me, u.avatar_path, u.is_public, u.created_at,
		       (SELECT COUNT(*) FROM event_responses WHERE event_id = e.id AND response = ?) as going_count,
		       (SELECT COUNT(*) FROM event_responses WHERE event_id = e.id AND response = ?) as not_going_count
		FROM events e
		JOIN users u ON e.creator_id = u.id
		WHERE e.group_id = ?
		ORDER BY e.event_date ASC
		LIMIT ? OFFSET ?
	`

	rows, err := er.db.Query(query, constants.EventResponseGoing, constants.EventResponseNotGoing, groupID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to get group events: %w", err)
	}
	defer rows.Close()

	var events []*Event
	for rows.Next() {
		event := &Event{}
		creator := &User{}

		err := rows.Scan(
			&event.ID, &event.GroupID, &event.CreatorID, &event.Title, &event.Description, &event.EventDate, &event.CreatedAt, &event.UpdatedAt,
			&creator.ID, &creator.Email, &creator.FirstName, &creator.LastName, &creator.DateOfBirth, &creator.Nickname, &creator.AboutMe, &creator.AvatarPath, &creator.IsPublic, &creator.CreatedAt,
			&event.GoingCount,
			&event.NotGoingCount,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan event: %w", err)
		}

		event.Creator = creator.ToResponse()
		events = append(events, event)
	}

	return events, nil
}

// RespondToEvent creates or updates a user's response to an event
func (er *EventRepository) RespondToEvent(eventID, userID int, response string) error {
	// Validate response
	if response != constants.EventResponseGoing && response != constants.EventResponseNotGoing {
		return fmt.Errorf("invalid response: must be 'going' or 'not_going'")
	}

	// Check if user already responded
	var existingID int
	err := er.db.QueryRow(`
		SELECT id FROM event_responses 
		WHERE event_id = ? AND user_id = ?
	`, eventID, userID).Scan(&existingID)

	if err == sql.ErrNoRows {
		// Create new response
		query := `
			INSERT INTO event_responses (event_id, user_id, response, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?)
		`

		now := time.Now()
		_, err = er.db.Exec(query, eventID, userID, response, now, now)
		if err != nil {
			return fmt.Errorf("failed to create event response: %w", err)
		}
	} else if err != nil {
		return fmt.Errorf("failed to check existing response: %w", err)
	} else {
		// Update existing response
		query := `
			UPDATE event_responses 
			SET response = ?, updated_at = ?
			WHERE id = ?
		`

		_, err = er.db.Exec(query, response, time.Now(), existingID)
		if err != nil {
			return fmt.Errorf("failed to update event response: %w", err)
		}
	}

	return nil
}

// GetEventResponses gets all responses for an event
func (er *EventRepository) GetEventResponses(eventID int, responseType string) ([]*EventResponse, error) {
	query := `
		SELECT er.id, er.event_id, er.user_id, er.response, er.created_at, er.updated_at,
		       u.id, u.email, u.first_name, u.last_name, u.date_of_birth, u.nickname, u.about_me, u.avatar_path, u.is_public, u.created_at
		FROM event_responses er
		JOIN users u ON er.user_id = u.id
		WHERE er.event_id = ? AND er.response = ?
		ORDER BY er.created_at DESC
	`

	rows, err := er.db.Query(query, eventID, responseType)
	if err != nil {
		return nil, fmt.Errorf("failed to get event responses: %w", err)
	}
	defer rows.Close()

	var responses []*EventResponse
	for rows.Next() {
		response := &EventResponse{}
		user := &User{}

		err := rows.Scan(
			&response.ID, &response.EventID, &response.UserID, &response.Response, &response.CreatedAt, &response.UpdatedAt,
			&user.ID, &user.Email, &user.FirstName, &user.LastName, &user.DateOfBirth, &user.Nickname, &user.AboutMe, &user.AvatarPath, &user.IsPublic, &user.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan event response: %w", err)
		}

		response.User = user.ToResponse()
		responses = append(responses, response)
	}

	return responses, nil
}

// GetUserEventResponse gets a specific user's response to an event
func (er *EventRepository) GetUserEventResponse(eventID, userID int) (string, error) {
	var response string
	err := er.db.QueryRow(`
		SELECT response FROM event_responses 
		WHERE event_id = ? AND user_id = ?
	`, eventID, userID).Scan(&response)

	if err != nil {
		if err == sql.ErrNoRows {
			return "", fmt.Errorf("no response found")
		}
		return "", fmt.Errorf("failed to get user response: %w", err)
	}

	return response, nil
}

// DeleteEvent deletes an event (creator only)
func (er *EventRepository) DeleteEvent(eventID, userID int) error {
	query := `DELETE FROM events WHERE id = ? AND creator_id = ?`

	result, err := er.db.Exec(query, eventID, userID)
	if err != nil {
		return fmt.Errorf("failed to delete event: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("event not found or insufficient permissions")
	}

	return nil
}

// GetUserEvents gets all events from groups the user is a member of
func (er *EventRepository) GetUserEvents(userID int, limit, offset int) ([]*Event, error) {
	query := `
		SELECT DISTINCT 
			e.id, e.group_id, e.creator_id, e.title, e.description, e.event_date, 
			e.created_at, e.updated_at,
			g.title as group_title,
			CASE WHEN e.creator_id = ? THEN 1 ELSE 0 END as is_creator,
			(SELECT response FROM event_responses WHERE event_id = e.id AND user_id = ?) as user_response,
			(SELECT COUNT(*) FROM event_responses WHERE event_id = e.id AND response = 'going') as going_count,
			(SELECT COUNT(*) FROM event_responses WHERE event_id = e.id AND response = 'not_going') as not_going_count,
			cu.first_name as creator_first_name,
			cu.last_name as creator_last_name,
			cu.avatar_path as creator_avatar_path
		FROM events e
		INNER JOIN groups g ON e.group_id = g.id
		INNER JOIN group_members gm ON g.id = gm.group_id 
		INNER JOIN users cu ON e.creator_id = cu.id
		WHERE gm.user_id = ? AND gm.status = 'accepted'
		ORDER BY e.event_date ASC
		LIMIT ? OFFSET ?
	`

	rows, err := er.db.Query(query, userID, userID, userID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to get user events: %w", err)
	}
	defer rows.Close()

	var events []*Event
	for rows.Next() {
		event := &Event{}
		var userResponse sql.NullString
		var creatorFirstName, creatorLastName, creatorAvatarPath sql.NullString

		err := rows.Scan(
			&event.ID,
			&event.GroupID,
			&event.CreatorID,
			&event.Title,
			&event.Description,
			&event.EventDate,
			&event.CreatedAt,
			&event.UpdatedAt,
			&event.GroupTitle,
			&event.IsCreator,
			&userResponse,
			&event.GoingCount,
			&event.NotGoingCount,
			&creatorFirstName,
			&creatorLastName,
			&creatorAvatarPath,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan event row: %w", err)
		}

		// Set user response
		if userResponse.Valid {
			event.UserResponse = &userResponse.String
		}

		// Set creator info
		if creatorFirstName.Valid && creatorLastName.Valid {
			creator := &UserResponse{
				ID:        event.CreatorID,
				FirstName: creatorFirstName.String,
				LastName:  creatorLastName.String,
			}
			if creatorAvatarPath.Valid {
				creator.AvatarPath = &creatorAvatarPath.String
			}
			event.Creator = creator
		}

		events = append(events, event)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating event rows: %w", err)
	}

	return events, nil
}
