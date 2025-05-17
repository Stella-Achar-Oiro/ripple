package handlers

import (
	"database/sql"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"path/filepath"

	"github.com/gorilla/mux"
	"github.com/Stella-Achar-Oiro/ripple/pkg/models"
	"github.com/google/uuid"
)

type CommentHandler struct {
	CommentRepo *models.CommentRepository
	PostRepo    *models.PostRepository
}

func NewCommentHandler(commentRepo *models.CommentRepository, postRepo *models.PostRepository) *CommentHandler {
	return &CommentHandler{
		CommentRepo: commentRepo,
		PostRepo:    postRepo,
	}
}

// CreateComment handles creating a new comment
func (h *CommentHandler) CreateComment(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, ok := r.Context().Value("userID").(string)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Get post ID from URL
	vars := mux.Vars(r)
	postID := vars["postId"]

	// Check if post exists
	post, err := h.PostRepo.GetPostByID(postID)
	if err != nil {
		http.Error(w, "Failed to fetch post", http.StatusInternalServerError)
		return
	}

	if post == nil {
		http.Error(w, "Post not found", http.StatusNotFound)
		return
	}

	// Parse multipart form
	err = r.ParseMultipartForm(10 << 20) // 10 MB max
	if err != nil && err != http.ErrNotMultipart {
		http.Error(w, "Failed to parse form", http.StatusBadRequest)
		return
	}

	// Get comment content
	content := r.FormValue("content")
	if content == "" {
		http.Error(w, "Comment content is required", http.StatusBadRequest)
		return
	}

	// Create new comment
	comment := &models.Comment{
		PostID:  postID,
		UserID:  userID,
		Content: content,
	}

	// Check if there's an image file
	file, handler, err := r.FormFile("image")
	if err == nil {
		defer file.Close()

		// Create uploads directory if it doesn't exist
		uploadDir := "./uploads/comments"
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

		// Set image path in comment
		comment.ImagePath = "/uploads/comments/" + filename
	}

	// Save comment to database
	if err := h.CommentRepo.CreateComment(comment); err != nil {
		http.Error(w, "Failed to create comment", http.StatusInternalServerError)
		return
	}

	// Get user details to include in response
	user, err := getUserByID(userID, h.CommentRepo.DB)
	if err != nil {
		http.Error(w, "Failed to get user details", http.StatusInternalServerError)
		return
	}

	// Set user in comment for response
	comment.User = user

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(comment)
}

// Helper function to get user by ID
func getUserByID(userID string, db *sql.DB) (*models.User, error) {
	user := &models.User{}
	err := db.QueryRow(
		"SELECT id, first_name, last_name, avatar_path FROM users WHERE id = ?",
		userID,
	).Scan(&user.ID, &user.FirstName, &user.LastName, &user.AvatarPath)
	
	if err != nil {
		return nil, err
	}
	
	return user, nil
}

// GetComments handles retrieving comments for a post
func (h *CommentHandler) GetComments(w http.ResponseWriter, r *http.Request) {
	// Get post ID from URL
	vars := mux.Vars(r)
	postID := vars["postId"]

	// Get comments
	comments, err := h.CommentRepo.GetCommentsByPostID(postID)
	if err != nil {
		http.Error(w, "Failed to fetch comments", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(comments)
}

// UpdateComment handles updating a comment
func (h *CommentHandler) UpdateComment(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, ok := r.Context().Value("userID").(string)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Get comment ID from URL
	vars := mux.Vars(r)
	commentID := vars["commentId"]

	// Get comment from database to verify ownership
	comment, err := h.CommentRepo.GetCommentByID(commentID)
	if err != nil {
		http.Error(w, "Failed to fetch comment", http.StatusInternalServerError)
		return
	}

	if comment == nil {
		http.Error(w, "Comment not found", http.StatusNotFound)
		return
	}

	// Check if user is the comment owner
	if comment.UserID != userID {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Parse multipart form
	err = r.ParseMultipartForm(10 << 20) // 10 MB max
	if err != nil && err != http.ErrNotMultipart {
		http.Error(w, "Failed to parse form", http.StatusBadRequest)
		return
	}

	// Update comment content
	if content := r.FormValue("content"); content != "" {
		comment.Content = content
	}

	// Check if there's a new image file
	file, handler, err := r.FormFile("image")
	if err == nil {
		defer file.Close()

		// Create uploads directory if it doesn't exist
		uploadDir := "./uploads/comments"
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
		if comment.ImagePath != "" {
			oldFilePath := "." + comment.ImagePath
			os.Remove(oldFilePath)
		}

		// Set image path in comment
		comment.ImagePath = "/uploads/comments/" + filename
	}

	// Save updated comment
	if err := h.CommentRepo.UpdateComment(comment); err != nil {
		http.Error(w, "Failed to update comment", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(comment)
}

// DeleteComment handles deleting a comment
func (h *CommentHandler) DeleteComment(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, ok := r.Context().Value("userID").(string)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Get comment ID from URL
	vars := mux.Vars(r)
	commentID := vars["commentId"]

	// Get comment to check ownership and get image path
	comment, err := h.CommentRepo.GetCommentByID(commentID)
	if err != nil {
		http.Error(w, "Failed to fetch comment", http.StatusInternalServerError)
		return
	}

	if comment == nil {
		http.Error(w, "Comment not found", http.StatusNotFound)
		return
	}

	// Check if user is the comment owner
	if comment.UserID != userID {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Delete comment image if exists
	if comment.ImagePath != "" {
		filePath := "." + comment.ImagePath
		os.Remove(filePath)
	}

	// Delete comment from database
	if err := h.CommentRepo.DeleteComment(commentID, userID); err != nil {
		http.Error(w, "Failed to delete comment", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"message": "Comment deleted successfully"}`))
}