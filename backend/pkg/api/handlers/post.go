package handlers

import (
	"encoding/json"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"

	"github.com/gorilla/mux"
	"github.com/Stella-Achar-Oiro/ripple/pkg/models"
	"github.com/google/uuid"
)

type PostHandler struct {
	PostRepo    *models.PostRepository
	CommentRepo *models.CommentRepository
}

func NewPostHandler(postRepo *models.PostRepository, commentRepo *models.CommentRepository) *PostHandler {
	return &PostHandler{
		PostRepo:    postRepo,
		CommentRepo: commentRepo,
	}
}

// CreatePost handles creating a new post
func (h *PostHandler) CreatePost(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, ok := r.Context().Value("userID").(string)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Parse multipart form for possible image upload
	err := r.ParseMultipartForm(10 << 20) // 10 MB max
	if err != nil && err != http.ErrNotMultipart {
		http.Error(w, "Failed to parse form", http.StatusBadRequest)
		return
	}

	// Get text content and privacy setting
	content := r.FormValue("content")
	privacy := r.FormValue("privacy")
	if privacy == "" {
		privacy = "public" // Default privacy setting
	}

	// Create new post
	post := &models.Post{
		UserID:  userID,
		Content: content,
		Privacy: privacy,
	}

	// Check if there's an image file
	file, handler, err := r.FormFile("image")
	if err == nil {
		defer file.Close()

		// Create uploads directory if it doesn't exist
		uploadDir := "./uploads/posts"
		if err := os.MkdirAll(uploadDir, 0755); err != nil {
			http.Error(w, "Failed to create upload directory", http.StatusInternalServerError)
			return
		}

		// Generate unique filename
		filename := uuid.New().String() + filepath.Ext(handler.Filename)
		filePath := filepath.Join(uploadDir, filename)

		// Create file
		dst, err := os.Create(filePath)
		if err != nil {
			http.Error(w, "Failed to create file", http.StatusInternalServerError)
			return
		}
		defer dst.Close()

		// Copy file contents
		if _, err := io.Copy(dst, file); err != nil {
			http.Error(w, "Failed to save file", http.StatusInternalServerError)
			return
		}

		// Set image path in post
		post.ImagePath = "/uploads/posts/" + filename
	}

	// Save post to database
	if err := h.PostRepo.CreatePost(post); err != nil {
		http.Error(w, "Failed to create post", http.StatusInternalServerError)
		return
	}

	// If privacy is set to "private", handle specific users who can see it
	if privacy == "private" && r.FormValue("sharedWith") != "" {
		var sharedWithUsers []string
		if err := json.Unmarshal([]byte(r.FormValue("sharedWith")), &sharedWithUsers); err == nil {
			// In a real implementation, you would insert these users into the post_privacy table
			// For simplicity, we're not implementing this part fully
		}
	}

	// Return the created post
	post.User = &models.User{
		ID:        userID,
		FirstName: r.FormValue("userFirstName"), // These would come from the authenticated user
		LastName:  r.FormValue("userLastName"),
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(post)
}

// GetFeed handles retrieving the user's feed
func (h *PostHandler) GetFeed(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, ok := r.Context().Value("userID").(string)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Parse pagination parameters
	limit := 10 // Default limit
	offset := 0 // Default offset

	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 {
			limit = parsedLimit
		}
	}

	if offsetStr := r.URL.Query().Get("offset"); offsetStr != "" {
		if parsedOffset, err := strconv.Atoi(offsetStr); err == nil && parsedOffset >= 0 {
			offset = parsedOffset
		}
	}

	// Get feed posts
	posts, err := h.PostRepo.GetFeedPosts(userID, limit, offset)
	if err != nil {
		http.Error(w, "Failed to fetch feed", http.StatusInternalServerError)
		return
	}

	// Check if each post is liked by the current user
	for _, post := range posts {
		isLiked, err := h.PostRepo.IsPostLiked(post.ID, userID)
		if err == nil {
			post.IsLiked = isLiked
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"posts": posts,
		"pagination": map[string]int{
			"limit":  limit,
			"offset": offset,
		},
	})
}

// GetUserPosts handles retrieving posts by a specific user
func (h *PostHandler) GetUserPosts(w http.ResponseWriter, r *http.Request) {
	// Get current user ID from context
	currentUserID, ok := r.Context().Value("userID").(string)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Get target user ID from URL
	vars := mux.Vars(r)
	targetUserID := vars["userId"]

	// Parse pagination parameters
	limit := 10 // Default limit
	offset := 0 // Default offset

	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 {
			limit = parsedLimit
		}
	}

	if offsetStr := r.URL.Query().Get("offset"); offsetStr != "" {
		if parsedOffset, err := strconv.Atoi(offsetStr); err == nil && parsedOffset >= 0 {
			offset = parsedOffset
		}
	}

	// Get user posts
	posts, err := h.PostRepo.GetUserPosts(targetUserID, limit, offset)
	if err != nil {
		http.Error(w, "Failed to fetch posts", http.StatusInternalServerError)
		return
	}

	// Check if each post is liked by the current user
	for _, post := range posts {
		isLiked, err := h.PostRepo.IsPostLiked(post.ID, currentUserID)
		if err == nil {
			post.IsLiked = isLiked
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"posts": posts,
		"pagination": map[string]int{
			"limit":  limit,
			"offset": offset,
		},
	})
}

// GetPost handles retrieving a single post
func (h *PostHandler) GetPost(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, ok := r.Context().Value("userID").(string)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Get post ID from URL
	vars := mux.Vars(r)
	postID := vars["postId"]

	// Get post
	post, err := h.PostRepo.GetPostByID(postID)
	if err != nil {
		http.Error(w, "Failed to fetch post", http.StatusInternalServerError)
		return
	}

	if post == nil {
		http.Error(w, "Post not found", http.StatusNotFound)
		return
	}

	// Check if post is liked by the current user
	isLiked, err := h.PostRepo.IsPostLiked(post.ID, userID)
	if err == nil {
		post.IsLiked = isLiked
	}

	// Get comments for this post
	comments, err := h.CommentRepo.GetCommentsByPostID(postID)
	if err != nil {
		http.Error(w, "Failed to fetch comments", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"post":     post,
		"comments": comments,
	})
}

// UpdatePost handles updating a post
func (h *PostHandler) UpdatePost(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, ok := r.Context().Value("userID").(string)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Get post ID from URL
	vars := mux.Vars(r)
	postID := vars["postId"]

	// Get post
	post, err := h.PostRepo.GetPostByID(postID)
	if err != nil {
		http.Error(w, "Failed to fetch post", http.StatusInternalServerError)
		return
	}

	if post == nil {
		http.Error(w, "Post not found", http.StatusNotFound)
		return
	}

	// Check if user is the post owner
	if post.UserID != userID {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Parse multipart form
	err = r.ParseMultipartForm(10 << 20) // 10 MB max
	if err != nil && err != http.ErrNotMultipart {
		http.Error(w, "Failed to parse form", http.StatusBadRequest)
		return
	}

	// Update post fields
	if content := r.FormValue("content"); content != "" {
		post.Content = content
	}

	if privacy := r.FormValue("privacy"); privacy != "" {
		post.Privacy = privacy
	}

	// Check if there's a new image file
	file, handler, err := r.FormFile("image")
	if err == nil {
		defer file.Close()

		// Create uploads directory if it doesn't exist
		uploadDir := "./uploads/posts"
		if err := os.MkdirAll(uploadDir, 0755); err != nil {
			http.Error(w, "Failed to create upload directory", http.StatusInternalServerError)
			return
		}

		// Generate unique filename
		filename := uuid.New().String() + filepath.Ext(handler.Filename)
		filePath := filepath.Join(uploadDir, filename)

		// Create file
		dst, err := os.Create(filePath)
		if err != nil {
			http.Error(w, "Failed to create file", http.StatusInternalServerError)
			return
		}
		defer dst.Close()

		// Copy file contents
		if _, err := io.Copy(dst, file); err != nil {
			http.Error(w, "Failed to save file", http.StatusInternalServerError)
			return
		}

		// Delete old image if exists
		if post.ImagePath != "" {
			oldFilePath := "." + post.ImagePath
			os.Remove(oldFilePath)
		}

		// Set image path in post
		post.ImagePath = "/uploads/posts/" + filename
	}

	// Save updated post
	if err := h.PostRepo.UpdatePost(post); err != nil {
		http.Error(w, "Failed to update post", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(post)
}

// DeletePost handles deleting a post
func (h *PostHandler) DeletePost(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, ok := r.Context().Value("userID").(string)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Get post ID from URL
	vars := mux.Vars(r)
	postID := vars["postId"]

	// Get post first to check ownership and get image path
	post, err := h.PostRepo.GetPostByID(postID)
	if err != nil {
		http.Error(w, "Failed to fetch post", http.StatusInternalServerError)
		return
	}

	if post == nil {
		http.Error(w, "Post not found", http.StatusNotFound)
		return
	}

	// Check if user is the post owner
	if post.UserID != userID {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Delete post image if exists
	if post.ImagePath != "" {
		filePath := "." + post.ImagePath
		os.Remove(filePath)
	}

	// Delete post from database
	if err := h.PostRepo.DeletePost(postID, userID); err != nil {
		http.Error(w, "Failed to delete post", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"message": "Post deleted successfully"}`))
}

// LikePost handles liking a post
func (h *PostHandler) LikePost(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, ok := r.Context().Value("userID").(string)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Get post ID from URL
	vars := mux.Vars(r)
	postID := vars["postId"]

	// Like post
	if err := h.PostRepo.LikePost(postID, userID); err != nil {
		http.Error(w, "Failed to like post", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"message": "Post liked successfully"}`))
}

// UnlikePost handles unliking a post
func (h *PostHandler) UnlikePost(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, ok := r.Context().Value("userID").(string)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Get post ID from URL
	vars := mux.Vars(r)
	postID := vars["postId"]

	// Unlike post
	if err := h.PostRepo.UnlikePost(postID, userID); err != nil {
		http.Error(w, "Failed to unlike post", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"message": "Post unliked successfully"}`))
}