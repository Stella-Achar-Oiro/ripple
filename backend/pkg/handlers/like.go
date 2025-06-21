// backend/pkg/handlers/like.go
package handlers

import (
	"net/http"
	"strconv"
	"strings"

	"ripple/pkg/auth"
	"ripple/pkg/models"
	"ripple/pkg/utils"
)

type LikeHandler struct {
	likeRepo *models.LikeRepository
	postRepo *models.PostRepository
}

func NewLikeHandler(likeRepo *models.LikeRepository, postRepo *models.PostRepository) *LikeHandler {
	return &LikeHandler{
		likeRepo: likeRepo,
		postRepo: postRepo,
	}
}

// LikePost likes a post
func (lh *LikeHandler) LikePost(w http.ResponseWriter, r *http.Request) {
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
	if len(pathParts) < 5 {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "Post ID required")
		return
	}

	postID, err := strconv.Atoi(pathParts[4])
	if err != nil {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "Invalid post ID")
		return
	}

	// Check if post exists and user can view it
	_, err = lh.postRepo.GetPost(postID, userID)
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

	// Like the post
	err = lh.likeRepo.LikePost(userID, postID)
	if err != nil {
		if strings.Contains(err.Error(), "already liked") {
			utils.WriteErrorResponse(w, http.StatusConflict, "Post already liked")
			return
		}
		utils.WriteInternalErrorResponse(w, err)
		return
	}

	// Get updated likes count
	likesCount, err := lh.likeRepo.GetPostLikesCount(postID)
	if err != nil {
		utils.WriteInternalErrorResponse(w, err)
		return
	}

	utils.WriteSuccessResponse(w, http.StatusCreated, map[string]interface{}{
		"message":     "Post liked successfully",
		"likes_count": likesCount,
	})
}

// UnlikePost unlikes a post
func (lh *LikeHandler) UnlikePost(w http.ResponseWriter, r *http.Request) {
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
	if len(pathParts) < 5 {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "Post ID required")
		return
	}

	postID, err := strconv.Atoi(pathParts[4])
	if err != nil {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "Invalid post ID")
		return
	}

	// Check if post exists and user can view it
	_, err = lh.postRepo.GetPost(postID, userID)
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

	// Unlike the post
	err = lh.likeRepo.UnlikePost(userID, postID)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			utils.WriteErrorResponse(w, http.StatusNotFound, "Like not found")
			return
		}
		utils.WriteInternalErrorResponse(w, err)
		return
	}

	// Get updated likes count
	likesCount, err := lh.likeRepo.GetPostLikesCount(postID)
	if err != nil {
		utils.WriteInternalErrorResponse(w, err)
		return
	}

	utils.WriteSuccessResponse(w, http.StatusOK, map[string]interface{}{
		"message":     "Post unliked successfully",
		"likes_count": likesCount,
	})
}

// GetPostLikes gets users who liked a post
func (lh *LikeHandler) GetPostLikes(w http.ResponseWriter, r *http.Request) {
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

	// Check if post exists and user can view it
	_, err = lh.postRepo.GetPost(postID, userID)
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

	// Get users who liked the post
	users, err := lh.likeRepo.GetPostLikes(postID, limit, offset)
	if err != nil {
		utils.WriteInternalErrorResponse(w, err)
		return
	}

	utils.WriteSuccessResponse(w, http.StatusOK, map[string]interface{}{
		"users":  users,
		"limit":  limit,
		"offset": offset,
		"count":  len(users),
	})
}

// CheckLikeStatus checks if current user has liked a post
func (lh *LikeHandler) CheckLikeStatus(w http.ResponseWriter, r *http.Request) {
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

	// Check if user has liked the post
	isLiked, err := lh.likeRepo.IsPostLikedByUser(userID, postID)
	if err != nil {
		utils.WriteInternalErrorResponse(w, err)
		return
	}

	// Get total likes count
	likesCount, err := lh.likeRepo.GetPostLikesCount(postID)
	if err != nil {
		utils.WriteInternalErrorResponse(w, err)
		return
	}

	utils.WriteSuccessResponse(w, http.StatusOK, map[string]interface{}{
		"is_liked":    isLiked,
		"likes_count": likesCount,
	})
}
