package handlers

import (
	"encoding/json"
	"net/http"
	"time"
	
	"github.com/Stella-Achar-Oiro/ripple/pkg/api/middleware"
	"github.com/Stella-Achar-Oiro/ripple/pkg/models"
	"github.com/Stella-Achar-Oiro/ripple/pkg/utils"
)

type AuthHandler struct {
	UserRepo *models.UserRepository
}

func NewAuthHandler(userRepo *models.UserRepository) *AuthHandler {
	return &AuthHandler{UserRepo: userRepo}
}

type RegisterRequest struct {
	Email       string `json:"email"`
	Password    string `json:"password"`
	FirstName   string `json:"firstName"`
	LastName    string `json:"lastName"`
	DateOfBirth string `json:"dateOfBirth"`
	Nickname    string `json:"nickname"`
	AboutMe     string `json:"aboutMe"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	// Set content type header early to ensure it's included in error responses
	w.Header().Set("Content-Type", "application/json")
	
	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"message": "Invalid request"})
		return
	}
	
	// Check if user already exists
	existingUser, err := h.UserRepo.GetByEmail(req.Email)
	if err == nil && existingUser != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"message": "Email already registered"})
		return
	}
	
	// Parse date of birth
	dob, err := time.Parse("2006-01-02", req.DateOfBirth)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"message": "Invalid date format"})
		return
	}
	
	// Create new user
	user := &models.User{
		Email:       req.Email,
		Password:    req.Password,
		FirstName:   req.FirstName,
		LastName:    req.LastName,
		DateOfBirth: dob,
		Nickname:    req.Nickname,
		AboutMe:     req.AboutMe,
		IsPublic:    false, // Default to private profile
	}
	
	if err := h.UserRepo.Create(user); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"message": "Failed to create user"})
		return
	}
	
	// Generate JWT token
	token, err := utils.GenerateToken(user)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"message": "Failed to generate token"})
		return
	}
	
	// Set cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "auth_token",
		Value:    token,
		Path:     "/",
		Expires:  time.Now().Add(24 * 7 * time.Hour),
		HttpOnly: true,
		SameSite: http.SameSiteNoneMode,
		Secure:   false, // Set to true in production with HTTPS
	})
	
	// Clear password before sending response
	user.Password = ""
	
	// Also send token in response body
	responseData := map[string]interface{}{
		"user":  user,
		"token": token,
	}
	
	json.NewEncoder(w).Encode(responseData)
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	// Set content type header early to ensure it's included in error responses
	w.Header().Set("Content-Type", "application/json")
	
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"message": "Invalid request"})
		return
	}
	
	// Check credentials
	user, err := h.UserRepo.CheckPassword(req.Email, req.Password)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"message": "Invalid credentials"})
		return
	}
	
	// Generate JWT token
	token, err := utils.GenerateToken(user)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"message": "Failed to generate token"})
		return
	}
	
	// Set cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "auth_token",
		Value:    token,
		Path:     "/",
		Expires:  time.Now().Add(24 * 7 * time.Hour),
		HttpOnly: true,
		SameSite: http.SameSiteNoneMode,
		Secure:   false, // Set to true in production with HTTPS
	})
	
	// Also send token in response body for clients that can't access cookies
	responseData := map[string]interface{}{
		"user":  user,
		"token": token,
	}
	
	json.NewEncoder(w).Encode(responseData)
}

func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	// Clear the auth cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "auth_token",
		Value:    "",
		Path:     "/",
		Expires:  time.Now().Add(-time.Hour),
		HttpOnly: true,
	})
	
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"message": "Logged out successfully"}`))
}

func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	// Set content type header early to ensure it's included in error responses
	w.Header().Set("Content-Type", "application/json")
	
	// Get user ID from context (set by auth middleware)
	userID, ok := r.Context().Value(middleware.UserIDKey).(string)
	if !ok {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"message": "Unauthorized"})
		return
	}
	
	// Get user from database
	user, err := h.UserRepo.GetByID(userID)
	if err != nil {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"message": "User not found"})
		return
	}
	
	json.NewEncoder(w).Encode(user)
}