// backend/pkg/handlers/post.go
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

type PostHandler struct {
	postRepo *models.PostRepository
}

func NewPostHandler(postRepo *models.PostRepository) *PostHandler {
	return &PostHandler{
		postRepo: postRepo,
	}
}

// CreatePost creates a new post
func (ph *PostHandler) CreatePost(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.WriteErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	userID, err := auth.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.WriteErrorResponse(w, http.StatusUnauthorized, "User not authenticated")
		return
	}

	var req models.CreatePostRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "Invalid JSON format")
		return
	}

	// Validate request
	errors := ph.validateCreatePostRequest(&req)
	if errors.HasErrors() {
		utils.WriteValidationErrorResponse(w, errors)
		return
	}

	post, err := ph.postRepo.CreatePost(userID, &req)
	if err != nil {
		if strings.Contains(err.Error(), "invalid privacy level") ||
			strings.Contains(err.Error(), "must have content") {
			utils.WriteErrorResponse(w, http.StatusBadRequest, err.Error())
			return
		}
		utils.WriteInternalErrorResponse(w, err)
		return
	}

	utils.WriteSuccessResponse(w, http.StatusCreated, map[string]interface{}{
		"post":    post,
		"message": "Post created successfully",
	})
}

// GetPost gets a single post by ID
func (ph *PostHandler) GetPost(w http.ResponseWriter, r *http.Request) {
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

	post, err := ph.postRepo.GetPost(postID, userID)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			utils.WriteErrorResponse(w, http.StatusNotFound, "Post not found")
			return
		}
		if strings.Contains(err.Error(), "insufficient permissions") {
			utils.WriteErrorResponse(w, http.StatusForbidden, "Insufficient permissions to view post")
			return
		}
		utils.WriteInternalErrorResponse(w, err)
		return
	}

	utils.WriteSuccessResponse(w, http.StatusOK, post)
}

// GetFeed gets posts for user's feed
func (ph *PostHandler) GetFeed(w http.ResponseWriter, r *http.Request) {
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
	limit := 20 // default
	offset := 0 // default

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

	options := &models.FeedOptions{
		UserID: userID,
		Limit:  limit,
		Offset: offset,
	}

	posts, err := ph.postRepo.GetFeed(options)
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

// GetUserPosts gets posts by a specific user
func (ph *PostHandler) GetUserPosts(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.WriteErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	viewerID, err := auth.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.WriteErrorResponse(w, http.StatusUnauthorized, "User not authenticated")
		return
	}

	// Get user ID from URL path
	pathParts := strings.Split(r.URL.Path, "/")
	if len(pathParts) < 5 {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "User ID required")
		return
	}

	userID, err := strconv.Atoi(pathParts[4])
	if err != nil {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "Invalid user ID")
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

	posts, err := ph.postRepo.GetUserPosts(userID, viewerID, limit, offset)
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

// DeletePost deletes a post
func (ph *PostHandler) DeletePost(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
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
	if len(pathParts) < 5 {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "Post ID required")
		return
	}

	postID, err := strconv.Atoi(pathParts[4])
	if err != nil {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "Invalid post ID")
		return
	}

	err = ph.postRepo.DeletePost(postID, userID)
	if err != nil {
		if strings.Contains(err.Error(), "not found") || strings.Contains(err.Error(), "insufficient permissions") {
			utils.WriteErrorResponse(w, http.StatusForbidden, "Cannot delete this post")
			return
		}
		utils.WriteInternalErrorResponse(w, err)
		return
	}

	utils.WriteSuccessResponse(w, http.StatusOK, map[string]string{
		"message": "Post deleted successfully",
	})
}

// CreateComment creates a new comment on a post
func (ph *PostHandler) CreateComment(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.WriteErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	userID, err := auth.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.WriteErrorResponse(w, http.StatusUnauthorized, "User not authenticated")
		return
	}

	var req models.CreateCommentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "Invalid JSON format")
		return
	}

	// Validate request
	errors := ph.validateCreateCommentRequest(&req)
	if errors.HasErrors() {
		utils.WriteValidationErrorResponse(w, errors)
		return
	}

	comment, err := ph.postRepo.CreateComment(userID, &req)
	if err != nil {
		if strings.Contains(err.Error(), "post not found") {
			utils.WriteErrorResponse(w, http.StatusBadRequest, "Post not found")
			return
		}
		if strings.Contains(err.Error(), "cannot comment") ||
			strings.Contains(err.Error(), "insufficient permissions") {
			utils.WriteErrorResponse(w, http.StatusForbidden, err.Error())
			return
		}
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

// GetComments gets comments for a post
func (ph *PostHandler) GetComments(w http.ResponseWriter, r *http.Request) {
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
	if len(pathParts) < 5 {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "Post ID required")
		return
	}

	postID, err := strconv.Atoi(pathParts[4])
	if err != nil {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "Invalid post ID")
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

	comments, err := ph.postRepo.GetComments(postID, userID, limit, offset)
	if err != nil {
		if strings.Contains(err.Error(), "cannot view") {
			utils.WriteErrorResponse(w, http.StatusForbidden, "Cannot view comments for this post")
			return
		}
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

// Helper methods for validation
func (ph *PostHandler) validateCreatePostRequest(req *models.CreatePostRequest) utils.ValidationErrors {
	var errors utils.ValidationErrors

	// Validate content
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

	// Validate privacy level
	validPrivacyLevels := map[string]bool{
		"public":         true,
		"almost_private": true,
		"private":        true,
	}

	if !validPrivacyLevels[req.PrivacyLevel] {
		errors = append(errors, utils.ValidationError{
			Field:   "privacy_level",
			Message: "Privacy level must be 'public', 'almost_private', or 'private'",
		})
	}

	return errors
}

func (ph *PostHandler) validateCreateCommentRequest(req *models.CreateCommentRequest) utils.ValidationErrors {
	var errors utils.ValidationErrors

	// Validate content
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
