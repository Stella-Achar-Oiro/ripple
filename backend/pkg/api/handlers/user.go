// backend/pkg/api/handlers/user.go
package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/gorilla/mux"
	"github.com/Stella-Achar-Oiro/ripple/pkg/models"
)

type UserHandler struct {
	UserRepo *models.UserRepository
}

func NewUserHandler(userRepo *models.UserRepository) *UserHandler {
	return &UserHandler{UserRepo: userRepo}
}

// GetProfile handles fetching a user profile
func (h *UserHandler) GetProfile(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	profileID := vars["id"]
	
	// Get the current user's ID from context (set by auth middleware)
	currentUserID, ok := r.Context().Value("userID").(string)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	
	// Check if the requested profile is the current user's profile
	isOwnProfile := profileID == currentUserID || profileID == "me"
	
	// If "me" is specified, use the current user's ID
	if profileID == "me" {
		profileID = currentUserID
	}
	
	// Get the requested profile
	profileUser, err := h.UserRepo.GetByID(profileID)
	if err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}
	
	// Get follower counts (in a real app, we'd have separate repositories for this)
	// For now, we'll use dummy counts
	followersCount := 42
	followingCount := 87
	
	// Check if the current user is following the profile user
	isFollowing := false
	followStatus := "none"
	
	// If this is not the user's own profile, check the follow status
	if !isOwnProfile {
		status, err := h.UserRepo.GetFollowStatus(currentUserID, profileID)
		if err == nil {
			isFollowing = status == "accepted"
			followStatus = status
		}
	}
	
	// Check if the current user has access to the profile
	hasAccess := isOwnProfile || profileUser.IsPublic || isFollowing
	
	// Prepare the response
	response := map[string]interface{}{
		"user": map[string]interface{}{
			"id":          profileUser.ID,
			"firstName":   profileUser.FirstName,
			"lastName":    profileUser.LastName,
			"email":       profileUser.Email,
			"nickname":    profileUser.Nickname,
			"aboutMe":     profileUser.AboutMe,
			"avatarPath":  profileUser.AvatarPath,
			"isPublic":    profileUser.IsPublic,
			"followers":   followersCount,
			"following":   followingCount,
			"isCurrentUser": isOwnProfile,
		},
		"isFollowing":  isFollowing,
		"followStatus": followStatus,
		"hasAccess":    hasAccess,
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// UpdateProfile handles updating a user's profile
func (h *UserHandler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	// Get the current user's ID from context
	userID, ok := r.Context().Value("userID").(string)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	
	// Parse the request body
	var updateData struct {
		FirstName    string `json:"firstName"`
		LastName     string `json:"lastName"`
		Nickname     string `json:"nickname"`
		AboutMe      string `json:"aboutMe"`
		IsPublic     bool   `json:"isPublic"`
		AvatarPath   string `json:"avatarPath,omitempty"`
		CoverPhotoPath string `json:"coverPhotoPath,omitempty"`
	}
	
	if err := json.NewDecoder(r.Body).Decode(&updateData); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	
	// Get the current user
	user, err := h.UserRepo.GetByID(userID)
	if err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}
	
	// Update the user fields
	user.FirstName = updateData.FirstName
	user.LastName = updateData.LastName
	user.Nickname = updateData.Nickname
	user.AboutMe = updateData.AboutMe
	user.IsPublic = updateData.IsPublic
	
	// Only update these if they were provided
	if updateData.AvatarPath != "" {
		user.AvatarPath = updateData.AvatarPath
	}
	
	// In a real app, we'd handle file uploads for avatar and cover photo here
	
	// Save the updated user
	if err := h.UserRepo.Update(user); err != nil {
		http.Error(w, "Failed to update profile", http.StatusInternalServerError)
		return
	}
	
	// Return the updated user
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}

// TogglePublicStatus handles toggling a user's public/private status
func (h *UserHandler) TogglePublicStatus(w http.ResponseWriter, r *http.Request) {
	// Get the current user's ID from context
	userID, ok := r.Context().Value("userID").(string)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	
	// Get the current user
	user, err := h.UserRepo.GetByID(userID)
	if err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}
	
	// Toggle the public status
	newStatus := !user.IsPublic
	
	// Update the user's public status
	if err := h.UserRepo.SetPublicStatus(userID, newStatus); err != nil {
		http.Error(w, "Failed to update profile", http.StatusInternalServerError)
		return
	}
	
	// Return the new status
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"isPublic": newStatus})
}