// backend/pkg/handlers/group.go
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

type GroupHandler struct {
	groupRepo        *models.GroupRepository
	groupPostRepo    *models.GroupPostRepository
	notificationRepo *models.NotificationRepository
}

func NewGroupHandler(groupRepo *models.GroupRepository, groupPostRepo *models.GroupPostRepository, notificationRepo *models.NotificationRepository) *GroupHandler {
	return &GroupHandler{
		groupRepo:        groupRepo,
		groupPostRepo:    groupPostRepo,
		notificationRepo: notificationRepo,
	}
}

// CreateGroup creates a new group
func (gh *GroupHandler) CreateGroup(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.WriteErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	userID, err := auth.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.WriteErrorResponse(w, http.StatusUnauthorized, "User not authenticated")
		return
	}

	var req models.CreateGroupRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "Invalid JSON format")
		return
	}

	// Validate request
	errors := gh.validateCreateGroupRequest(&req)
	if errors.HasErrors() {
		utils.WriteValidationErrorResponse(w, errors)
		return
	}

	group, err := gh.groupRepo.CreateGroup(userID, &req)
	if err != nil {
		if strings.Contains(err.Error(), "title is required") {
			utils.WriteErrorResponse(w, http.StatusBadRequest, err.Error())
			return
		}
		utils.WriteInternalErrorResponse(w, err)
		return
	}

	utils.WriteSuccessResponse(w, http.StatusCreated, map[string]interface{}{
		"group":   group,
		"message": "Group created successfully",
	})
}

// GetGroup gets a single group by ID
func (gh *GroupHandler) GetGroup(w http.ResponseWriter, r *http.Request) {
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

	group, err := gh.groupRepo.GetGroup(groupID, userID)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			utils.WriteErrorResponse(w, http.StatusNotFound, "Group not found")
			return
		}
		utils.WriteInternalErrorResponse(w, err)
		return
	}

	utils.WriteSuccessResponse(w, http.StatusOK, group)
}

// GetAllGroups gets all groups for browsing
func (gh *GroupHandler) GetAllGroups(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.WriteErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	userID, err := auth.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.WriteErrorResponse(w, http.StatusUnauthorized, "User not authenticated")
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

	groups, err := gh.groupRepo.GetAllGroups(userID, limit, offset)
	if err != nil {
		utils.WriteInternalErrorResponse(w, err)
		return
	}

	utils.WriteSuccessResponse(w, http.StatusOK, map[string]interface{}{
		"groups": groups,
		"limit":  limit,
		"offset": offset,
		"count":  len(groups),
	})
}

// GetUserGroups gets groups that the user is a member of
func (gh *GroupHandler) GetUserGroups(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.WriteErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	userID, err := auth.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.WriteErrorResponse(w, http.StatusUnauthorized, "User not authenticated")
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

	groups, err := gh.groupRepo.GetUserGroups(userID, limit, offset)
	if err != nil {
		utils.WriteInternalErrorResponse(w, err)
		return
	}

	utils.WriteSuccessResponse(w, http.StatusOK, map[string]interface{}{
		"groups": groups,
		"limit":  limit,
		"offset": offset,
		"count":  len(groups),
	})
}

// InviteToGroup invites users to join a group
func (gh *GroupHandler) InviteToGroup(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.WriteErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	userID, err := auth.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.WriteErrorResponse(w, http.StatusUnauthorized, "User not authenticated")
		return
	}

	var req models.InviteToGroupRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "Invalid JSON format")
		return
	}

	if req.GroupID <= 0 || len(req.UserIDs) == 0 {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "Valid group ID and user IDs required")
		return
	}

	err = gh.groupRepo.InviteUsersToGroup(req.GroupID, userID, req.UserIDs)
	if err != nil {
		if strings.Contains(err.Error(), "only group members") {
			utils.WriteErrorResponse(w, http.StatusForbidden, err.Error())
			return
		}
		utils.WriteInternalErrorResponse(w, err)
		return
	}

	// TODO: Create notifications for invited users
	utils.WriteSuccessResponse(w, http.StatusOK, map[string]string{
		"message": "Invitations sent successfully",
	})
}

// JoinGroup requests to join a group
func (gh *GroupHandler) JoinGroup(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.WriteErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	userID, err := auth.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.WriteErrorResponse(w, http.StatusUnauthorized, "User not authenticated")
		return
	}

	var req models.JoinGroupRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "Invalid JSON format")
		return
	}

	if req.GroupID <= 0 {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "Valid group ID required")
		return
	}

	err = gh.groupRepo.RequestToJoinGroup(req.GroupID, userID)
	if err != nil {
		if strings.Contains(err.Error(), "already has a membership") {
			utils.WriteErrorResponse(w, http.StatusBadRequest, err.Error())
			return
		}
		utils.WriteInternalErrorResponse(w, err)
		return
	}

	// TODO: Create notification for group creator
	utils.WriteSuccessResponse(w, http.StatusOK, map[string]string{
		"message": "Join request sent successfully",
	})
}

// HandleMembershipRequest accepts or declines membership requests/invitations
func (gh *GroupHandler) HandleMembershipRequest(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.WriteErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	userID, err := auth.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.WriteErrorResponse(w, http.StatusUnauthorized, "User not authenticated")
		return
	}

	var req models.GroupActionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "Invalid JSON format")
		return
	}

	if req.MembershipID <= 0 {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "Valid membership ID required")
		return
	}

	if req.Action != "accept" && req.Action != "decline" {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "Action must be 'accept' or 'decline'")
		return
	}

	err = gh.groupRepo.HandleMembershipRequest(req.MembershipID, userID, req.Action)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			utils.WriteErrorResponse(w, http.StatusNotFound, "Membership request not found")
			return
		}
		if strings.Contains(err.Error(), "only") {
			utils.WriteErrorResponse(w, http.StatusForbidden, err.Error())
			return
		}
		utils.WriteInternalErrorResponse(w, err)
		return
	}

	var message string
	if req.Action == "accept" {
		message = "Membership request accepted"
	} else {
		message = "Membership request declined"
	}

	utils.WriteSuccessResponse(w, http.StatusOK, map[string]string{
		"message": message,
	})
}

// GetGroupMembers gets members of a group
func (gh *GroupHandler) GetGroupMembers(w http.ResponseWriter, r *http.Request) {
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
	if len(pathParts) < 5 {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "Group ID required")
		return
	}

	groupID, err := strconv.Atoi(pathParts[3])
	if err != nil {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "Invalid group ID")
		return
	}

	// Check if user is a member of the group
	isMember, err := gh.groupRepo.IsMember(groupID, userID)
	if err != nil {
		utils.WriteInternalErrorResponse(w, err)
		return
	}
	if !isMember {
		utils.WriteErrorResponse(w, http.StatusForbidden, "Only group members can view member list")
		return
	}

	members, err := gh.groupRepo.GetGroupMembers(groupID)
	if err != nil {
		utils.WriteInternalErrorResponse(w, err)
		return
	}

	utils.WriteSuccessResponse(w, http.StatusOK, map[string]interface{}{
		"members": members,
	})
}

// GetPendingInvitations gets pending group invitations for current user
func (gh *GroupHandler) GetPendingInvitations(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.WriteErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	userID, err := auth.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.WriteErrorResponse(w, http.StatusUnauthorized, "User not authenticated")
		return
	}

	invitations, err := gh.groupRepo.GetPendingInvitations(userID)
	if err != nil {
		utils.WriteInternalErrorResponse(w, err)
		return
	}

	utils.WriteSuccessResponse(w, http.StatusOK, map[string]interface{}{
		"invitations": invitations,
	})
}

// GetPendingJoinRequests gets pending join requests for a group (creator only)
func (gh *GroupHandler) GetPendingJoinRequests(w http.ResponseWriter, r *http.Request) {
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
	if len(pathParts) < 5 {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "Group ID required")
		return
	}

	groupID, err := strconv.Atoi(pathParts[3])
	if err != nil {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "Invalid group ID")
		return
	}

	// Check if user is the group creator
	isCreator, err := gh.groupRepo.IsCreator(groupID, userID)
	if err != nil {
		utils.WriteInternalErrorResponse(w, err)
		return
	}
	if !isCreator {
		utils.WriteErrorResponse(w, http.StatusForbidden, "Only group creator can view join requests")
		return
	}

	requests, err := gh.groupRepo.GetPendingJoinRequests(groupID)
	if err != nil {
		utils.WriteInternalErrorResponse(w, err)
		return
	}

	utils.WriteSuccessResponse(w, http.StatusOK, map[string]interface{}{
		"join_requests": requests,
	})
}

// CreateGroupPost creates a new post in a group
func (gh *GroupHandler) CreateGroupPost(w http.ResponseWriter, r *http.Request) {
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
	isMember, err := gh.groupRepo.IsMember(groupID, userID)
	if err != nil {
		utils.WriteInternalErrorResponse(w, err)
		return
	}
	if !isMember {
		utils.WriteErrorResponse(w, http.StatusForbidden, "Only group members can create posts")
		return
	}

	var req models.CreateGroupPostRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "Invalid JSON format")
		return
	}

	// Validate request
	errors := gh.validateCreateGroupPostRequest(&req)
	if errors.HasErrors() {
		utils.WriteValidationErrorResponse(w, errors)
		return
	}

	post, err := gh.groupPostRepo.CreateGroupPost(groupID, userID, &req)
	if err != nil {
		if strings.Contains(err.Error(), "must have content") {
			utils.WriteErrorResponse(w, http.StatusBadRequest, err.Error())
			return
		}
		utils.WriteInternalErrorResponse(w, err)
		return
	}

	utils.WriteSuccessResponse(w, http.StatusCreated, map[string]interface{}{
		"post":    post,
		"message": "Group post created successfully",
	})
}

// GetGroupPosts gets posts for a group
func (gh *GroupHandler) GetGroupPosts(w http.ResponseWriter, r *http.Request) {
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
	isMember, err := gh.groupRepo.IsMember(groupID, userID)
	if err != nil {
		utils.WriteInternalErrorResponse(w, err)
		return
	}
	if !isMember {
		utils.WriteErrorResponse(w, http.StatusForbidden, "Only group members can view posts")
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

	posts, err := gh.groupPostRepo.GetGroupPosts(groupID, limit, offset)
	if err != nil {
		utils.WriteInternalErrorResponse(w, err)
		return
	}

	utils.WriteSuccessResponse(w, http.StatusOK, map[string]interface{}{
		"posts":  posts,
		"limit":  limit,
		"offset": offset,
		"count":  len(posts),
	})
}

// CreateGroupComment creates a comment on a group post
func (gh *GroupHandler) CreateGroupComment(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.WriteErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	userID, err := auth.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.WriteErrorResponse(w, http.StatusUnauthorized, "User not authenticated")
		return
	}

	// Get post ID from URL path
	pathParts := strings.Split(r.URL.Path, "/")
	if len(pathParts) < 4 {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "Post ID required")
		return
	}

	postID, err := strconv.Atoi(pathParts[3])
	if err != nil {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "Invalid post ID")
		return
	}

	// Get the group post to check group membership
	groupPost, err := gh.groupPostRepo.GetGroupPost(postID)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			utils.WriteErrorResponse(w, http.StatusNotFound, "Group post not found")
			return
		}
		utils.WriteInternalErrorResponse(w, err)
		return
	}

	// Check if user is a member of the group
	isMember, err := gh.groupRepo.IsMember(groupPost.GroupID, userID)
	if err != nil {
		utils.WriteInternalErrorResponse(w, err)
		return
	}
	if !isMember {
		utils.WriteErrorResponse(w, http.StatusForbidden, "Only group members can comment")
		return
	}

	var req models.CreateGroupCommentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "Invalid JSON format")
		return
	}

	// Validate request
	errors := gh.validateCreateGroupCommentRequest(&req)
	if errors.HasErrors() {
		utils.WriteValidationErrorResponse(w, errors)
		return
	}

	comment, err := gh.groupPostRepo.CreateGroupComment(postID, userID, &req)
	if err != nil {
		if strings.Contains(err.Error(), "must have content") {
			utils.WriteErrorResponse(w, http.StatusBadRequest, err.Error())
			return
		}
		utils.WriteInternalErrorResponse(w, err)
		return
	}

	utils.WriteSuccessResponse(w, http.StatusCreated, map[string]interface{}{
		"comment": comment,
		"message": "Comment created successfully",
	})
}

// GetGroupComments gets comments for a group post
func (gh *GroupHandler) GetGroupComments(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.WriteErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	userID, err := auth.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.WriteErrorResponse(w, http.StatusUnauthorized, "User not authenticated")
		return
	}

	// Get post ID from URL path
	pathParts := strings.Split(r.URL.Path, "/")
	if len(pathParts) < 4 {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "Post ID required")
		return
	}

	postID, err := strconv.Atoi(pathParts[3])
	if err != nil {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "Invalid post ID")
		return
	}

	// Get the group post to check group membership
	groupPost, err := gh.groupPostRepo.GetGroupPost(postID)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			utils.WriteErrorResponse(w, http.StatusNotFound, "Group post not found")
			return
		}
		utils.WriteInternalErrorResponse(w, err)
		return
	}

	// Check if user is a member of the group
	isMember, err := gh.groupRepo.IsMember(groupPost.GroupID, userID)
	if err != nil {
		utils.WriteInternalErrorResponse(w, err)
		return
	}
	if !isMember {
		utils.WriteErrorResponse(w, http.StatusForbidden, "Only group members can view comments")
		return
	}

	// Parse query parameters
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

	comments, err := gh.groupPostRepo.GetGroupComments(postID, limit, offset)
	if err != nil {
		utils.WriteInternalErrorResponse(w, err)
		return
	}

	utils.WriteSuccessResponse(w, http.StatusOK, map[string]interface{}{
		"comments": comments,
		"limit":    limit,
		"offset":   offset,
		"count":    len(comments),
	})
}

// Validation helper methods
func (gh *GroupHandler) validateCreateGroupRequest(req *models.CreateGroupRequest) utils.ValidationErrors {
	var errors utils.ValidationErrors

	if err := utils.ValidateRequired(req.Title, "title"); err != nil {
		errors = append(errors, *err)
	}

	if len(strings.TrimSpace(req.Title)) > 100 {
		errors = append(errors, utils.ValidationError{
			Field:   "title",
			Message: "Title must be less than 100 characters",
		})
	}

	if len(strings.TrimSpace(req.Description)) > 1000 {
		errors = append(errors, utils.ValidationError{
			Field:   "description",
			Message: "Description must be less than 1000 characters",
		})
	}

	return errors
}

func (gh *GroupHandler) validateCreateGroupPostRequest(req *models.CreateGroupPostRequest) utils.ValidationErrors {
	var errors utils.ValidationErrors

	if strings.TrimSpace(req.Content) == "" && req.ImagePath == nil {
		errors = append(errors, utils.ValidationError{
			Field:   "content",
			Message: "Post must have content or image",
		})
	}

	if len(strings.TrimSpace(req.Content)) > 2000 {
		errors = append(errors, utils.ValidationError{
			Field:   "content",
			Message: "Content must be less than 2000 characters",
		})
	}

	return errors
}

func (gh *GroupHandler) validateCreateGroupCommentRequest(req *models.CreateGroupCommentRequest) utils.ValidationErrors {
	var errors utils.ValidationErrors

	if strings.TrimSpace(req.Content) == "" && req.ImagePath == nil {
		errors = append(errors, utils.ValidationError{
			Field:   "content",
			Message: "Comment must have content or image",
		})
	}

	if len(strings.TrimSpace(req.Content)) > 1000 {
		errors = append(errors, utils.ValidationError{
			Field:   "content",
			Message: "Content must be less than 1000 characters",
		})
	}

	return errors
}

// InviteUsers invites users to join a group (new endpoint for frontend)
func (gh *GroupHandler) InviteUsers(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.WriteErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	userID, err := auth.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.WriteErrorResponse(w, http.StatusUnauthorized, "User not authenticated")
		return
	}

	// Extract group ID from URL
	groupIDStr := strings.TrimPrefix(r.URL.Path, "/api/groups/")
	groupIDStr = strings.TrimSuffix(groupIDStr, "/invite")
	groupID, err := strconv.Atoi(groupIDStr)
	if err != nil {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "Invalid group ID")
		return
	}

	// Parse request body
	var req struct {
		UserIDs []int `json:"user_ids"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if len(req.UserIDs) == 0 {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "No users specified for invitation")
		return
	}

	// Check if user is the group creator
	group, err := gh.groupRepo.GetGroup(groupID, userID)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			utils.WriteErrorResponse(w, http.StatusNotFound, "Group not found")
		} else {
			utils.WriteInternalErrorResponse(w, err)
		}
		return
	}

	if !group.IsCreator {
		utils.WriteErrorResponse(w, http.StatusForbidden, "Only group creators can invite users")
		return
	}

	// Invite users to the group using existing method
	err = gh.groupRepo.InviteUsersToGroup(groupID, userID, req.UserIDs)
	if err != nil {
		utils.WriteInternalErrorResponse(w, err)
		return
	}

	utils.WriteSuccessResponse(w, http.StatusOK, map[string]interface{}{
		"message":       "Invitations sent successfully",
		"invited_count": len(req.UserIDs),
	})
}
