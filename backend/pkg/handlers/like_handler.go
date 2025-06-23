package handlers

import (
	"encoding/json"
	"net/http"
	"ripple/pkg/auth"
	"ripple/pkg/models"
)

// LikeHandler handles HTTP requests related to likes
type LikeHandler struct {
	likeRepo *models.LikeRepository
	postRepo *models.PostRepository
}

// NewLikeHandler creates a new LikeHandler
func NewLikeHandler(likeRepo *models.LikeRepository, postRepo *models.PostRepository) *LikeHandler {
	return &LikeHandler{likeRepo: likeRepo, postRepo: postRepo}
}

// ToggleLikeRequest represents the request body for toggling a like
type ToggleLikeRequest struct {
	PostID int `json:"post_id"`
}

// ToggleLikeResponse represents the response body for toggling a like
type ToggleLikeResponse struct {
	Liked     bool `json:"liked"`
	LikeCount int  `json:"like_count"`
}

// ToggleLike handles the liking and unliking of a post
func (h *LikeHandler) ToggleLike(w http.ResponseWriter, r *http.Request) {
	// 1. Get User ID from context
	userID, ok := r.Context().Value(auth.UserIDKey).(int)
	if !ok {
		http.Error(w, "User ID not found in context", http.StatusUnauthorized)
		return
	}

	// 2. Decode request body
	var req ToggleLikeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// 3. Check if the post exists
	_, err := h.postRepo.GetPost(req.PostID, userID)
	if err != nil {
		http.Error(w, "Post not found or you don't have permission to view it", http.StatusNotFound)
		return
	}

	// 4. Toggle the like
	liked, err := h.likeRepo.ToggleLike(userID, req.PostID)
	if err != nil {
		http.Error(w, "Failed to toggle like", http.StatusInternalServerError)
		return
	}

	// 5. Get the new like count
	likeCount, err := h.likeRepo.GetLikeCount(req.PostID)
	if err != nil {
		http.Error(w, "Failed to get like count", http.StatusInternalServerError)
		return
	}

	// 6. Send the response
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"data": ToggleLikeResponse{
			Liked:     liked,
			LikeCount: likeCount,
		},
	})
}
