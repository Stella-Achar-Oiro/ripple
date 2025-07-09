// backend/pkg/handlers/follow.go
package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"strings"

	"ripple/pkg/auth"
	"ripple/pkg/models"
	"ripple/pkg/utils"
)

type FollowHandler struct {
	followRepo       *models.FollowRepository
	userRepo         *models.UserRepository
	notificationRepo *models.NotificationRepository
}

func NewFollowHandler(followRepo *models.FollowRepository, userRepo *models.UserRepository, notificationRepo *models.NotificationRepository) *FollowHandler {
	return &FollowHandler{
		followRepo:       followRepo,
		userRepo:         userRepo,
		notificationRepo: notificationRepo,
	}
}

type FollowUserRequest struct {
	UserID int `json:"user_id"`
}

type FollowActionRequest struct {
	FollowID int    `json:"follow_id"`
	Action   string `json:"action"` // "accept" or "decline"
}

// FollowUser sends a follow request or immediately follows if public user
func (fh *FollowHandler) FollowUser(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.WriteErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	userID, err := auth.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.WriteErrorResponse(w, http.StatusUnauthorized, "User not authenticated")
		return
	}

	var req FollowUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "Invalid JSON format")
		return
	}

	if req.UserID <= 0 {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "Valid user ID required")
		return
	}

	// Get current user info for notification
	currentUser, err := fh.userRepo.GetUserByID(userID)
	if err != nil {
		utils.WriteInternalErrorResponse(w, err)
		return
	}

	// Check if target user exists
	targetUser, err := fh.userRepo.GetUserByID(req.UserID)
	if err != nil {
		if strings.Contains(err.Error(), "user not found") {
			utils.WriteErrorResponse(w, http.StatusNotFound, "User not found")
			return
		}
		utils.WriteInternalErrorResponse(w, err)
		return
	}

	// Create follow request
	followRequest, err := fh.followRepo.CreateFollowRequest(userID, req.UserID)
	if err != nil {
		if strings.Contains(err.Error(), "cannot follow yourself") ||
			strings.Contains(err.Error(), "already following") {
			utils.WriteErrorResponse(w, http.StatusBadRequest, err.Error())
			return
		}
		utils.WriteInternalErrorResponse(w, err)
		return
	}

	var message string
	if followRequest.Status == "accepted" {
		message = "Successfully following user"
	} else {
		message = "Follow request sent"

		// Create notification for follow request (only for private users)
		if !targetUser.IsPublic {
			followerName := currentUser.FirstName + " " + currentUser.LastName
			err = fh.notificationRepo.CreateFollowRequestNotification(followRequest.ID, req.UserID, followerName)
			if err != nil {
				// Log error but don't fail the request
				// In production, you might want to use a proper logger
				log.Printf("Failed to create notification: %v", err)
			}
		}
	}

	utils.WriteSuccessResponse(w, http.StatusCreated, map[string]interface{}{
		"follow_request": followRequest,
		"message":        message,
	})
}

// UnfollowUser unfollows a user
func (fh *FollowHandler) UnfollowUser(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.WriteErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	userID, err := auth.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.WriteErrorResponse(w, http.StatusUnauthorized, "User not authenticated")
		return
	}

	var req FollowUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "Invalid JSON format")
		return
	}

	if req.UserID <= 0 {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "Valid user ID required")
		return
	}

	err = fh.followRepo.Unfollow(userID, req.UserID)
	if err != nil {
		if strings.Contains(err.Error(), "not following") {
			utils.WriteErrorResponse(w, http.StatusBadRequest, err.Error())
			return
		}
		utils.WriteInternalErrorResponse(w, err)
		return
	}

	utils.WriteSuccessResponse(w, http.StatusOK, map[string]string{
		"message": "Successfully unfollowed user",
	})
}

// HandleFollowRequest accepts or declines a follow request
func (fh *FollowHandler) HandleFollowRequest(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.WriteErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	userID, err := auth.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.WriteErrorResponse(w, http.StatusUnauthorized, "User not authenticated")
		return
	}

	var req FollowActionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "Invalid JSON format")
		return
	}

	if req.FollowID <= 0 {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "Valid follow ID required")
		return
	}

	if req.Action != "accept" && req.Action != "decline" {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "Action must be 'accept' or 'decline'")
		return
	}

	var message string
	if req.Action == "accept" {
		err = fh.followRepo.AcceptFollowRequest(req.FollowID, userID)
		message = "Follow request accepted"
	} else {
		err = fh.followRepo.DeclineFollowRequest(req.FollowID, userID)
		message = "Follow request declined"
	}

	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			utils.WriteErrorResponse(w, http.StatusNotFound, "Follow request not found")
			return
		}
		utils.WriteInternalErrorResponse(w, err)
		return
	}

	utils.WriteSuccessResponse(w, http.StatusOK, map[string]string{
		"message": message,
	})
}

// GetFollowRequests gets pending follow requests for the current user
func (fh *FollowHandler) GetFollowRequests(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.WriteErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	userID, err := auth.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.WriteErrorResponse(w, http.StatusUnauthorized, "User not authenticated")
		return
	}

	requests, err := fh.followRepo.GetPendingFollowRequests(userID)
	if err != nil {
		utils.WriteInternalErrorResponse(w, err)
		return
	}

	// SAFETY CHECK: Ensure never nil
	if requests == nil {
		requests = make([]*models.FollowRequest, 0)
	}

	utils.WriteSuccessResponse(w, http.StatusOK, map[string]interface{}{
		"follow_requests": requests,
	})
}

// GetFollowers gets followers for a user
func (fh *FollowHandler) GetFollowers(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.WriteErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	// Get user ID from URL path
	pathParts := strings.Split(r.URL.Path, "/")
	if len(pathParts) < 5 {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "User ID required")
		return
	}

	targetUserID, err := strconv.Atoi(pathParts[4])
	if err != nil {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "Invalid user ID")
		return
	}

	followers, err := fh.followRepo.GetFollowers(targetUserID)
	if err != nil {
		utils.WriteInternalErrorResponse(w, err)
		return
	}

	// SAFETY CHECK: Ensure never nil
	if followers == nil {
		followers = make([]*models.UserResponse, 0)
	}

	utils.WriteSuccessResponse(w, http.StatusOK, map[string]interface{}{
		"followers": followers,
	})
}

// GetFollowing gets users that a user is following
func (fh *FollowHandler) GetFollowing(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.WriteErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	// Get user ID from URL path
	pathParts := strings.Split(r.URL.Path, "/")
	if len(pathParts) < 5 {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "User ID required")
		return
	}

	targetUserID, err := strconv.Atoi(pathParts[4])
	if err != nil {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "Invalid user ID")
		return
	}

	following, err := fh.followRepo.GetFollowing(targetUserID)
	if err != nil {
		utils.WriteInternalErrorResponse(w, err)
		return
	}

	// SAFETY CHECK: Ensure never nil
	if following == nil {
		following = make([]*models.UserResponse, 0)
	}

	utils.WriteSuccessResponse(w, http.StatusOK, map[string]interface{}{
		"following": following,
	})
}

// GetFollowStats gets follow statistics for a user
func (fh *FollowHandler) GetFollowStats(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.WriteErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	// Get user ID from URL path
	pathParts := strings.Split(r.URL.Path, "/")
	if len(pathParts) < 5 {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "User ID required")
		return
	}

	targetUserID, err := strconv.Atoi(pathParts[4])
	if err != nil {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "Invalid user ID")
		return
	}

	stats, err := fh.followRepo.GetFollowStats(targetUserID)
	if err != nil {
		utils.WriteInternalErrorResponse(w, err)
		return
	}

	utils.WriteSuccessResponse(w, http.StatusOK, stats)
}

// GetFollowStatus gets the follow relationship status between two users
func (fh *FollowHandler) GetFollowStatus(w http.ResponseWriter, r *http.Request) {
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
		utils.WriteErrorResponse(w, http.StatusBadRequest, "User ID required")
		return
	}

	targetUserID, err := strconv.Atoi(pathParts[4])
	if err != nil {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "Invalid user ID")
		return
	}

	// Get follow status
	status, err := fh.followRepo.GetFollowRelationshipStatus(userID, targetUserID)
	if err != nil {
		utils.WriteInternalErrorResponse(w, err)
		return
	}

	// Get reverse status too
	reverseStatus, err := fh.followRepo.GetFollowRelationshipStatus(targetUserID, userID)
	if err != nil {
		utils.WriteInternalErrorResponse(w, err)
		return
	}

	utils.WriteSuccessResponse(w, http.StatusOK, map[string]interface{}{
		"following_status": status,        // Current user -> Target user
		"follower_status":  reverseStatus, // Target user -> Current user
		"is_following":     status == "accepted",
		"is_follower":      reverseStatus == "accepted",
	})
}
