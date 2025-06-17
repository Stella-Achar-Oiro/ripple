// backend/tests/auth_test.go
package tests

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"ripple/pkg/auth"
	"ripple/pkg/db"
	"ripple/pkg/handlers"
	"ripple/pkg/models"
)

func setupTestDB() (*db.Database, func()) {
	// Create temporary database
	dbPath := "./test_ripple.db"
	database, err := db.NewDatabase(dbPath)
	if err != nil {
		panic(err)
	}

	// Run migrations
	if err := database.RunMigrations("../pkg/db/migrations/sqlite"); err != nil {
		panic(err)
	}

	cleanup := func() {
		database.Close()
		os.Remove(dbPath)
	}

	return database, cleanup
}

func createAuthTestUser(userRepo *models.UserRepository) (*models.User, error) {
	hashedPassword, err := auth.HashPassword("password123")
	if err != nil {
		return nil, err
	}

	createUserReq := &models.CreateUserRequest{
		Email:       "test@example.com",
		FirstName:   "John",
		LastName:    "Doe",
		DateOfBirth: "1990-01-01",
	}

	return userRepo.CreateUser(createUserReq, hashedPassword)
}

func TestUserRegistration(t *testing.T) {
	database, cleanup := setupTestDB()
	defer cleanup()

	userRepo := models.NewUserRepository(database.DB)
	followRepo := models.NewFollowRepository(database.DB)
	postRepo := models.NewPostRepository(database.DB)
	sessionManager := auth.NewSessionManager(database.DB)
	authHandler := handlers.NewAuthHandler(userRepo, followRepo, postRepo, sessionManager)

	tests := []struct {
		name           string
		payload        map[string]interface{}
		expectedStatus int
		shouldSucceed  bool
	}{
		{
			name: "Valid registration",
			payload: map[string]interface{}{
				"email":         "test@example.com",
				"password":      "password123",
				"first_name":    "John",
				"last_name":     "Doe",
				"date_of_birth": "1990-01-01",
			},
			expectedStatus: http.StatusCreated,
			shouldSucceed:  true,
		},
		{
			name: "Invalid email",
			payload: map[string]interface{}{
				"email":         "invalid-email",
				"password":      "password123",
				"first_name":    "John",
				"last_name":     "Doe",
				"date_of_birth": "1990-01-01",
			},
			expectedStatus: http.StatusBadRequest,
			shouldSucceed:  false,
		},
		{
			name: "Password too short",
			payload: map[string]interface{}{
				"email":         "test2@example.com",
				"password":      "123",
				"first_name":    "John",
				"last_name":     "Doe",
				"date_of_birth": "1990-01-01",
			},
			expectedStatus: http.StatusBadRequest,
			shouldSucceed:  false,
		},
		{
			name: "Missing required fields",
			payload: map[string]interface{}{
				"email":    "test3@example.com",
				"password": "password123",
			},
			expectedStatus: http.StatusBadRequest,
			shouldSucceed:  false,
		},
		{
			name: "Invalid date of birth",
			payload: map[string]interface{}{
				"email":         "test4@example.com",
				"password":      "password123",
				"first_name":    "John",
				"last_name":     "Doe",
				"date_of_birth": "invalid-date",
			},
			expectedStatus: http.StatusBadRequest,
			shouldSucceed:  false,
		},
		{
			name: "Too young (under 13)",
			payload: map[string]interface{}{
				"email":         "test5@example.com",
				"password":      "password123",
				"first_name":    "John",
				"last_name":     "Doe",
				"date_of_birth": time.Now().AddDate(-10, 0, 0).Format("2006-01-02"),
			},
			expectedStatus: http.StatusBadRequest,
			shouldSucceed:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			jsonPayload, _ := json.Marshal(tt.payload)
			req, _ := http.NewRequest("POST", "/api/auth/register", bytes.NewBuffer(jsonPayload))
			req.Header.Set("Content-Type", "application/json")

			rr := httptest.NewRecorder()
			authHandler.Register(rr, req)

			if rr.Code != tt.expectedStatus {
				t.Errorf("Expected status %d, got %d", tt.expectedStatus, rr.Code)
			}

			var response map[string]interface{}
			json.Unmarshal(rr.Body.Bytes(), &response)

			if tt.shouldSucceed && !response["success"].(bool) {
				t.Errorf("Expected success, but got failure: %v", response["error"])
			}

			if !tt.shouldSucceed && response["success"].(bool) {
				t.Errorf("Expected failure, but got success")
			}
		})
	}
}

func TestUserLogin(t *testing.T) {
	database, cleanup := setupTestDB()
	defer cleanup()

	userRepo := models.NewUserRepository(database.DB)
	followRepo := models.NewFollowRepository(database.DB)
	postRepo := models.NewPostRepository(database.DB)
	sessionManager := auth.NewSessionManager(database.DB)
	authHandler := handlers.NewAuthHandler(userRepo, followRepo, postRepo, sessionManager)

	// First register a user
	_, err := createAuthTestUser(userRepo)
	if err != nil {
		t.Fatalf("Failed to create test user: %v", err)
	}

	tests := []struct {
		name           string
		email          string
		password       string
		expectedStatus int
		shouldSucceed  bool
	}{
		{
			name:           "Valid login",
			email:          "test@example.com",
			password:       "password123",
			expectedStatus: http.StatusOK,
			shouldSucceed:  true,
		},
		{
			name:           "Invalid email",
			email:          "nonexistent@example.com",
			password:       "password123",
			expectedStatus: http.StatusUnauthorized,
			shouldSucceed:  false,
		},
		{
			name:           "Invalid password",
			email:          "test@example.com",
			password:       "wrongpassword",
			expectedStatus: http.StatusUnauthorized,
			shouldSucceed:  false,
		},
		{
			name:           "Empty credentials",
			email:          "",
			password:       "",
			expectedStatus: http.StatusBadRequest,
			shouldSucceed:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			payload := map[string]string{
				"email":    tt.email,
				"password": tt.password,
			}
			jsonPayload, _ := json.Marshal(payload)
			req, _ := http.NewRequest("POST", "/api/auth/login", bytes.NewBuffer(jsonPayload))
			req.Header.Set("Content-Type", "application/json")

			rr := httptest.NewRecorder()
			authHandler.Login(rr, req)

			if rr.Code != tt.expectedStatus {
				t.Errorf("Expected status %d, got %d", tt.expectedStatus, rr.Code)
			}

			var response map[string]interface{}
			json.Unmarshal(rr.Body.Bytes(), &response)

			if tt.shouldSucceed {
				if !response["success"].(bool) {
					t.Errorf("Expected success, but got failure: %v", response["error"])
				}
				// Check if session cookie is set
				cookies := rr.Header().Get("Set-Cookie")
				if cookies == "" {
					t.Errorf("Expected session cookie to be set")
				}
			}
		})
	}
}

func TestCompleteAuthFlow(t *testing.T) {
	database, cleanup := setupTestDB()
	defer cleanup()

	userRepo := models.NewUserRepository(database.DB)
	followRepo := models.NewFollowRepository(database.DB)
	postRepo := models.NewPostRepository(database.DB)
	sessionManager := auth.NewSessionManager(database.DB)
	authHandler := handlers.NewAuthHandler(userRepo, followRepo, postRepo, sessionManager)

	// Test registration
	regPayload := map[string]interface{}{
		"email":         "flowtest@example.com",
		"password":      "password123",
		"first_name":    "Flow",
		"last_name":     "Test",
		"date_of_birth": "1990-01-01",
	}

	jsonPayload, _ := json.Marshal(regPayload)
	regReq, _ := http.NewRequest("POST", "/api/auth/register", bytes.NewBuffer(jsonPayload))
	regReq.Header.Set("Content-Type", "application/json")

	regRR := httptest.NewRecorder()
	authHandler.Register(regRR, regReq)

	if regRR.Code != http.StatusCreated {
		t.Fatalf("Registration failed with status %d", regRR.Code)
	}

	// Extract session cookie from registration
	regCookies := regRR.Header().Get("Set-Cookie")
	if regCookies == "" {
		t.Fatal("No session cookie set during registration")
	}

	// Test accessing profile with session from registration
	profileReq, _ := http.NewRequest("GET", "/api/user/profile", nil)
	profileReq.Header.Set("Cookie", regCookies)

	profileRR := httptest.NewRecorder()

	// Use auth middleware to protect the route
	protectedHandler := sessionManager.AuthMiddleware(http.HandlerFunc(authHandler.GetProfile))
	protectedHandler.ServeHTTP(profileRR, profileReq)

	if profileRR.Code != http.StatusOK {
		t.Fatalf("Profile access failed with status %d: %s", profileRR.Code, profileRR.Body.String())
	}

	var profileResponse map[string]interface{}
	json.Unmarshal(profileRR.Body.Bytes(), &profileResponse)

	if !profileResponse["success"].(bool) {
		t.Errorf("Profile access should succeed")
	}
}

func TestPasswordHashing(t *testing.T) {
	password := "testpassword123"

	// Test hashing
	hash, err := auth.HashPassword(password)
	if err != nil {
		t.Fatalf("Failed to hash password: %v", err)
	}

	if hash == "" {
		t.Errorf("Hash should not be empty")
	}

	if hash == password {
		t.Errorf("Hash should not equal original password")
	}

	// Test password verification
	if err := auth.CheckPassword(password, hash); err != nil {
		t.Errorf("Password verification failed: %v", err)
	}

	// Test wrong password
	if err := auth.CheckPassword("wrongpassword", hash); err == nil {
		t.Errorf("Wrong password should not verify")
	}

	// Test short password
	_, err = auth.HashPassword("short")
	if err == nil {
		t.Errorf("Short password should be rejected")
	}
}

func TestSessionManagement(t *testing.T) {
	database, cleanup := setupTestDB()
	defer cleanup()

	userRepo := models.NewUserRepository(database.DB)
	sessionManager := auth.NewSessionManager(database.DB)

	// Create a test user first (FIXED: This was missing!)
	user, err := createAuthTestUser(userRepo)
	if err != nil {
		t.Fatalf("Failed to create test user: %v", err)
	}

	// Test session creation
	session, err := sessionManager.CreateSession(user.ID)
	if err != nil {
		t.Fatalf("Failed to create session: %v", err)
	}

	if session.ID == "" {
		t.Errorf("Session ID should not be empty")
	}

	if session.UserID != user.ID {
		t.Errorf("Expected user ID %d, got %d", user.ID, session.UserID)
	}

	if session.ExpiresAt.Before(time.Now()) {
		t.Errorf("Session should not be expired immediately")
	}

	// Test session retrieval
	retrievedSession, err := sessionManager.GetSession(session.ID)
	if err != nil {
		t.Fatalf("Failed to retrieve session: %v", err)
	}

	if retrievedSession.ID != session.ID {
		t.Errorf("Retrieved session ID doesn't match")
	}

	if retrievedSession.UserID != session.UserID {
		t.Errorf("Retrieved session user ID doesn't match")
	}

	// Test session deletion
	err = sessionManager.DeleteSession(session.ID)
	if err != nil {
		t.Fatalf("Failed to delete session: %v", err)
	}

	// Try to retrieve deleted session
	_, err = sessionManager.GetSession(session.ID)
	if err == nil {
		t.Errorf("Should not be able to retrieve deleted session")
	}
}

// Benchmark tests
func BenchmarkPasswordHashing(b *testing.B) {
	password := "testpassword123"

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		auth.HashPassword(password)
	}
}

func BenchmarkPasswordVerification(b *testing.B) {
	password := "testpassword123"
	hash, _ := auth.HashPassword(password)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		auth.CheckPassword(password, hash)
	}
}
