// backend/tests/post_test.go
package tests

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"ripple/pkg/auth"
	"ripple/pkg/handlers"
	"ripple/pkg/models"
)

func TestPostSystem(t *testing.T) {
	database, cleanup := setupTestDB()
	defer cleanup()

	userRepo := models.NewUserRepository(database.DB)
	followRepo := models.NewFollowRepository(database.DB)
	postRepo := models.NewPostRepository(database.DB)
	sessionManager := auth.NewSessionManager(database.DB)
	postHandler := handlers.NewPostHandler(postRepo)

	// Create test users
	user1, session1 := createTestUser(t, userRepo, sessionManager, "alice@test.com", true)
	user2, session2 := createTestUser(t, userRepo, sessionManager, "bob@test.com", true)

	// Make user2 follow user1
	followRepo.CreateFollowRequest(user2.ID, user1.ID)

	var createdPostID int

	t.Run("Create public post", func(t *testing.T) {
		payload := map[string]interface{}{
			"content":       "This is a public post",
			"privacy_level": "public",
		}
		jsonPayload, _ := json.Marshal(payload)

		req, _ := http.NewRequest("POST", "/api/posts", bytes.NewBuffer(jsonPayload))
		req.Header.Set("Content-Type", "application/json")
		req.AddCookie(&http.Cookie{Name: "session_id", Value: session1.ID})

		rr := httptest.NewRecorder()
		sessionManager.AuthMiddleware(http.HandlerFunc(postHandler.CreatePost)).ServeHTTP(rr, req)

		if rr.Code != http.StatusCreated {
			t.Errorf("Expected status 201, got %d", rr.Code)
		}

		var response map[string]interface{}
		json.Unmarshal(rr.Body.Bytes(), &response)

		if !response["success"].(bool) {
			t.Errorf("Expected success, got failure: %v", response["error"])
		}

		post := response["data"].(map[string]interface{})["post"].(map[string]interface{})
		createdPostID = int(post["id"].(float64))
	})

	t.Run("Create almost private post", func(t *testing.T) {
		payload := map[string]interface{}{
			"content":       "This is an almost private post",
			"privacy_level": "almost_private",
		}
		jsonPayload, _ := json.Marshal(payload)

		req, _ := http.NewRequest("POST", "/api/posts", bytes.NewBuffer(jsonPayload))
		req.Header.Set("Content-Type", "application/json")
		req.AddCookie(&http.Cookie{Name: "session_id", Value: session1.ID})

		rr := httptest.NewRecorder()
		sessionManager.AuthMiddleware(http.HandlerFunc(postHandler.CreatePost)).ServeHTTP(rr, req)

		if rr.Code != http.StatusCreated {
			t.Errorf("Expected status 201, got %d", rr.Code)
		}
	})

	t.Run("Create private post", func(t *testing.T) {
		payload := map[string]interface{}{
			"content":       "This is a private post",
			"privacy_level": "private",
			"allowed_users": []int{user2.ID},
		}
		jsonPayload, _ := json.Marshal(payload)

		req, _ := http.NewRequest("POST", "/api/posts", bytes.NewBuffer(jsonPayload))
		req.Header.Set("Content-Type", "application/json")
		req.AddCookie(&http.Cookie{Name: "session_id", Value: session1.ID})

		rr := httptest.NewRecorder()
		sessionManager.AuthMiddleware(http.HandlerFunc(postHandler.CreatePost)).ServeHTTP(rr, req)

		if rr.Code != http.StatusCreated {
			t.Errorf("Expected status 201, got %d", rr.Code)
		}
	})

	t.Run("Get feed", func(t *testing.T) {
		req, _ := http.NewRequest("GET", "/api/posts?limit=10", nil)
		req.AddCookie(&http.Cookie{Name: "session_id", Value: session2.ID})

		rr := httptest.NewRecorder()
		sessionManager.AuthMiddleware(http.HandlerFunc(postHandler.GetFeed)).ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("Expected status 200, got %d", rr.Code)
		}

		var response map[string]interface{}
		json.Unmarshal(rr.Body.Bytes(), &response)

		posts := response["data"].(map[string]interface{})["posts"].([]interface{})

		// User2 should see all 3 posts (public, almost_private from followed user, private where allowed)
		if len(posts) != 3 {
			t.Errorf("Expected 3 posts in feed, got %d", len(posts))
		}
	})

	t.Run("Get single post", func(t *testing.T) {
		req, _ := http.NewRequest("GET", fmt.Sprintf("/api/posts/%d", createdPostID), nil)
		req.AddCookie(&http.Cookie{Name: "session_id", Value: session2.ID})

		rr := httptest.NewRecorder()
		sessionManager.AuthMiddleware(http.HandlerFunc(postHandler.GetPost)).ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("Expected status 200, got %d", rr.Code)
		}

		var response map[string]interface{}
		json.Unmarshal(rr.Body.Bytes(), &response)

		post := response["data"].(map[string]interface{})
		if post["content"] != "This is a public post" {
			t.Errorf("Expected correct post content")
		}
	})

	t.Run("Create comment", func(t *testing.T) {
		payload := map[string]interface{}{
			"content": "This is a comment",
		}
		jsonPayload, _ := json.Marshal(payload)

		req, _ := http.NewRequest("POST", fmt.Sprintf("/api/posts/%d/comments", createdPostID), bytes.NewBuffer(jsonPayload))
		req.Header.Set("Content-Type", "application/json")
		req.AddCookie(&http.Cookie{Name: "session_id", Value: session2.ID})

		rr := httptest.NewRecorder()
		sessionManager.AuthMiddleware(http.HandlerFunc(postHandler.CreateComment)).ServeHTTP(rr, req)

		if rr.Code != http.StatusCreated {
			t.Errorf("Expected status 201, got %d", rr.Code)
		}
	})

	t.Run("Get comments", func(t *testing.T) {
		req, _ := http.NewRequest("GET", fmt.Sprintf("/api/posts/%d/comments", createdPostID), nil)
		req.AddCookie(&http.Cookie{Name: "session_id", Value: session1.ID})

		rr := httptest.NewRecorder()
		sessionManager.AuthMiddleware(http.HandlerFunc(postHandler.GetComments)).ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("Expected status 200, got %d", rr.Code)
		}

		var response map[string]interface{}
		json.Unmarshal(rr.Body.Bytes(), &response)

		comments := response["data"].(map[string]interface{})["comments"].([]interface{})
		if len(comments) != 1 {
			t.Errorf("Expected 1 comment, got %d", len(comments))
		}
	})

	t.Run("Delete post", func(t *testing.T) {
		req, _ := http.NewRequest("DELETE", fmt.Sprintf("/api/posts/%d", createdPostID), nil)
		req.AddCookie(&http.Cookie{Name: "session_id", Value: session1.ID})

		rr := httptest.NewRecorder()
		sessionManager.AuthMiddleware(http.HandlerFunc(postHandler.DeletePost)).ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("Expected status 200, got %d", rr.Code)
		}
	})
}
