// backend/pkg/handlers/event.go
package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"ripple/pkg/auth"
	"ripple/pkg/models"
	"ripple/pkg/utils"
)

type EventHandler struct {
	eventRepo        *models.EventRepository
	groupRepo        *models.GroupRepository
	notificationRepo *models.NotificationRepository
}

func NewEventHandler(eventRepo *models.EventRepository, groupRepo *models.GroupRepository, notificationRepo *models.NotificationRepository) *EventHandler {
	return &EventHandler{
		eventRepo:        eventRepo,
		groupRepo:        groupRepo,
		notificationRepo: notificationRepo,
	}
}

// CreateEvent creates a new event in a group
func (eh *EventHandler) CreateEvent(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
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
	if len(pathParts) < 4 {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "Group ID required")
		return
	}

	groupID, err := strconv.Atoi(pathParts[3])
	if err != nil {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "Invalid group ID")
		return
	}

	// Check if user is a member of the group
	isMember, err := eh.groupRepo.IsMember(groupID, userID)
	if err != nil {
		utils.WriteInternalErrorResponse(w, err)
		return
	}
	if !isMember {
		utils.WriteErrorResponse(w, http.StatusForbidden, "Only group members can create events")
		return
	}

	var req models.CreateEventRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "Invalid JSON format")
		return
	}

	// Validate request
	errors := eh.validateCreateEventRequest(&req)
	if errors.HasErrors() {
		utils.WriteValidationErrorResponse(w, errors)
		return
	}

	event, err := eh.eventRepo.CreateEvent(groupID, userID, &req)
	if err != nil {
		if strings.Contains(err.Error(), "title is required") ||
			strings.Contains(err.Error(), "invalid event date") ||
			strings.Contains(err.Error(), "must be in the future") {
			utils.WriteErrorResponse(w, http.StatusBadRequest, err.Error())
			return
		}
		utils.WriteInternalErrorResponse(w, err)
		return
	}

	// TODO: Create notifications for all group members
	utils.WriteSuccessResponse(w, http.StatusCreated, map[string]interface{}{
		"event":   event,
		"message": "Event created successfully",
	})
}

// GetEvent gets a single event by ID
func (eh *EventHandler) GetEvent(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.WriteErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	userID, err := auth.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.WriteErrorResponse(w, http.StatusUnauthorized, "User not authenticated")
		return
	}

	// Get event ID from URL path
	pathParts := strings.Split(r.URL.Path, "/")
	if len(pathParts) < 4 {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "Event ID required")
		return
	}

	eventID, err := strconv.Atoi(pathParts[3])
	if err != nil {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "Invalid event ID")
		return
	}

	event, err := eh.eventRepo.GetEvent(eventID, userID)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			utils.WriteErrorResponse(w, http.StatusNotFound, "Event not found")
			return
		}
		utils.WriteInternalErrorResponse(w, err)
		return
	}

	// Check if user is a member of the group
	isMember, err := eh.groupRepo.IsMember(event.GroupID, userID)
	if err != nil {
		utils.WriteInternalErrorResponse(w, err)
		return
	}
	if !isMember {
		utils.WriteErrorResponse(w, http.StatusForbidden, "Only group members can view events")
		return
	}

	utils.WriteSuccessResponse(w, http.StatusOK, event)
}

// GetGroupEvents gets events for a group
func (eh *EventHandler) GetGroupEvents(w http.ResponseWriter, r *http.Request) {
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
	if len(pathParts) < 4 {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "Group ID required")
		return
	}

	groupID, err := strconv.Atoi(pathParts[3])
	if err != nil {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "Invalid group ID")
		return
	}

	// Check if user is a member of the group
	isMember, err := eh.groupRepo.IsMember(groupID, userID)
	if err != nil {
		utils.WriteInternalErrorResponse(w, err)
		return
	}
	if !isMember {
		utils.WriteErrorResponse(w, http.StatusForbidden, "Only group members can view events")
		return
	}

	// Parse query parameters
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

	events, err := eh.eventRepo.GetGroupEvents(groupID, limit, offset)
	if err != nil {
		utils.WriteInternalErrorResponse(w, err)
		return
	}

	utils.WriteSuccessResponse(w, http.StatusOK, map[string]interface{}{
		"events": events,
		"limit":  limit,
		"offset": offset,
		"count":  len(events),
	})
}

// RespondToEvent responds to an event (going/not going)
func (eh *EventHandler) RespondToEvent(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.WriteErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	userID, err := auth.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.WriteErrorResponse(w, http.StatusUnauthorized, "User not authenticated")
		return
	}

	// Get event ID from URL path
	pathParts := strings.Split(r.URL.Path, "/")
	if len(pathParts) < 4 {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "Event ID required")
		return
	}

	eventID, err := strconv.Atoi(pathParts[3])
	if err != nil {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "Invalid event ID")
		return
	}

	// Get event to check group membership
	event, err := eh.eventRepo.GetEvent(eventID, userID)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			utils.WriteErrorResponse(w, http.StatusNotFound, "Event not found")
			return
		}
		utils.WriteInternalErrorResponse(w, err)
		return
	}

	// Check if user is a member of the group
	isMember, err := eh.groupRepo.IsMember(event.GroupID, userID)
	if err != nil {
		utils.WriteInternalErrorResponse(w, err)
		return
	}
	if !isMember {
		utils.WriteErrorResponse(w, http.StatusForbidden, "Only group members can respond to events")
		return
	}

	var req models.EventResponseRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "Invalid JSON format")
		return
	}

	if req.Response != "going" && req.Response != "not_going" {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "Response must be 'going' or 'not_going'")
		return
	}

	err = eh.eventRepo.RespondToEvent(eventID, userID, req.Response)
	if err != nil {
		if strings.Contains(err.Error(), "invalid response") {
			utils.WriteErrorResponse(w, http.StatusBadRequest, err.Error())
			return
		}
		utils.WriteInternalErrorResponse(w, err)
		return
	}

	utils.WriteSuccessResponse(w, http.StatusOK, map[string]string{
		"message": "Event response recorded successfully",
	})
}

// GetEventResponses gets responses for an event
func (eh *EventHandler) GetEventResponses(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.WriteErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	userID, err := auth.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.WriteErrorResponse(w, http.StatusUnauthorized, "User not authenticated")
		return
	}

	// Get event ID from URL path
	pathParts := strings.Split(r.URL.Path, "/")
	if len(pathParts) < 4 {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "Event ID required")
		return
	}

	eventID, err := strconv.Atoi(pathParts[3])
	if err != nil {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "Invalid event ID")
		return
	}

	// Get event to check group membership
	event, err := eh.eventRepo.GetEvent(eventID, userID)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			utils.WriteErrorResponse(w, http.StatusNotFound, "Event not found")
			return
		}
		utils.WriteInternalErrorResponse(w, err)
		return
	}

	// Check if user is a member of the group
	isMember, err := eh.groupRepo.IsMember(event.GroupID, userID)
	if err != nil {
		utils.WriteInternalErrorResponse(w, err)
		return
	}
	if !isMember {
		utils.WriteErrorResponse(w, http.StatusForbidden, "Only group members can view event responses")
		return
	}

	// Get both going and not going responses
	goingResponses, err := eh.eventRepo.GetEventResponses(eventID, "going")
	if err != nil {
		utils.WriteInternalErrorResponse(w, err)
		return
	}

	notGoingResponses, err := eh.eventRepo.GetEventResponses(eventID, "not_going")
	if err != nil {
		utils.WriteInternalErrorResponse(w, err)
		return
	}

	utils.WriteSuccessResponse(w, http.StatusOK, map[string]interface{}{
		"going":     goingResponses,
		"not_going": notGoingResponses,
	})
}

// Validation helper methods
func (eh *EventHandler) validateCreateEventRequest(req *models.CreateEventRequest) utils.ValidationErrors {
	var errors utils.ValidationErrors

	if err := utils.ValidateRequired(req.Title, "title"); err != nil {
		errors = append(errors, *err)
	}

	if len(strings.TrimSpace(req.Title)) > 200 {
		errors = append(errors, utils.ValidationError{
			Field:   "title",
			Message: "Title must be less than 200 characters",
		})
	}

	if len(strings.TrimSpace(req.Description)) > 1000 {
		errors = append(errors, utils.ValidationError{
			Field:   "description",
			Message: "Description must be less than 1000 characters",
		})
	}

	if strings.TrimSpace(req.EventDate) == "" {
		errors = append(errors, utils.ValidationError{
			Field:   "event_date",
			Message: "Event date is required",
		})
	}

	return errors
}