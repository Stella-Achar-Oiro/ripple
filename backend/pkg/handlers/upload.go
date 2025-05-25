// backend/pkg/handlers/upload.go
package handlers

import (
	"fmt"
	"net/http"
	"path/filepath"

	"ripple/pkg/auth"
	"ripple/pkg/config"
	"ripple/pkg/utils"
)

type UploadHandler struct {
	config *config.Config
}

func NewUploadHandler(config *config.Config) *UploadHandler {
	return &UploadHandler{
		config: config,
	}
}

// UploadAvatar uploads user avatar
func (uh *UploadHandler) UploadAvatar(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.WriteErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	userID, err := auth.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.WriteErrorResponse(w, http.StatusUnauthorized, "User not authenticated")
		return
	}

	// Parse multipart form
	err = r.ParseMultipartForm(uh.config.MaxFileSize)
	if err != nil {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "File too large or invalid form")
		return
	}

	file, header, err := r.FormFile("avatar")
	if err != nil {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "No file uploaded or invalid file field")
		return
	}
	defer file.Close()

	// Validate and save file
	uploadDir := filepath.Join(uh.config.UploadsPath, "avatars")
	filename, err := utils.SaveUploadedFile(file, header, uploadDir, uh.config.MaxFileSize)
	if err != nil {
		utils.WriteErrorResponse(w, http.StatusBadRequest, err.Error())
		return
	}

	// Return file path
	filePath := fmt.Sprintf("/uploads/avatars/%s", filename)
	
	utils.WriteSuccessResponse(w, http.StatusOK, map[string]interface{}{
		"file_path": filePath,
		"message":   "Avatar uploaded successfully",
		"user_id":   userID,
	})
}

// UploadPostImage uploads image for posts
func (uh *UploadHandler) UploadPostImage(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.WriteErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	userID, err := auth.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.WriteErrorResponse(w, http.StatusUnauthorized, "User not authenticated")
		return
	}

	// Parse multipart form
	err = r.ParseMultipartForm(uh.config.MaxFileSize)
	if err != nil {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "File too large or invalid form")
		return
	}

	file, header, err := r.FormFile("image")
	if err != nil {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "No file uploaded or invalid file field")
		return
	}
	defer file.Close()

	// Validate and save file
	uploadDir := filepath.Join(uh.config.UploadsPath, "posts")
	filename, err := utils.SaveUploadedFile(file, header, uploadDir, uh.config.MaxFileSize)
	if err != nil {
		utils.WriteErrorResponse(w, http.StatusBadRequest, err.Error())
		return
	}

	// Return file path
	filePath := fmt.Sprintf("/uploads/posts/%s", filename)
	
	utils.WriteSuccessResponse(w, http.StatusOK, map[string]interface{}{
		"file_path": filePath,
		"message":   "Image uploaded successfully",
		"user_id":   userID,
	})
}

// UploadCommentImage uploads image for comments
func (uh *UploadHandler) UploadCommentImage(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.WriteErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	userID, err := auth.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.WriteErrorResponse(w, http.StatusUnauthorized, "User not authenticated")
		return
	}

	// Parse multipart form
	err = r.ParseMultipartForm(uh.config.MaxFileSize)
	if err != nil {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "File too large or invalid form")
		return
	}

	file, header, err := r.FormFile("image")
	if err != nil {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "No file uploaded or invalid file field")
		return
	}
	defer file.Close()

	// Validate and save file
	uploadDir := filepath.Join(uh.config.UploadsPath, "comments")
	filename, err := utils.SaveUploadedFile(file, header, uploadDir, uh.config.MaxFileSize)
	if err != nil {
		utils.WriteErrorResponse(w, http.StatusBadRequest, err.Error())
		return
	}

	// Return file path
	filePath := fmt.Sprintf("/uploads/comments/%s", filename)
	
	utils.WriteSuccessResponse(w, http.StatusOK, map[string]interface{}{
		"file_path": filePath,
		"message":   "Image uploaded successfully",
		"user_id":   userID,
	})
}

