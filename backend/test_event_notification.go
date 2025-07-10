// Test file to verify event notification functionality
package main

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/http/httptest"
	"time"

	"ripple/pkg/auth"
	"ripple/pkg/db"
	"ripple/pkg/handlers"
	"ripple/pkg/models"
)

func main() {
	// Initialize database
	database, err := db.InitDB()
	if err != nil {
		log.Fatal("Failed to initialize database:", err)
	}
	defer database.Close()

	// Initialize repositories
	userRepo := models.NewUserRepository(database)
	groupRepo := models.NewGroupRepository(database)
	eventRepo := models.NewEventRepository(database)
	notificationRepo := models.NewNotificationRepository(database)

	// Initialize handler
	eventHandler := handlers.NewEventHandler(eventRepo, groupRepo, notificationRepo)

	// Create test users
	testUser1, err := createTestUser(userRepo, "creator@test.com", "Event", "Creator")
	if err != nil {
		log.Fatal("Failed to create test user 1:", err)
	}

	testUser2, err := createTestUser(userRepo, "member@test.com", "Group", "Member")
	if err != nil {
		log.Fatal("Failed to create test user 2:", err)
	}

	// Create test group
	group, err := createTestGroup(groupRepo, testUser1.ID, "Test Group", "A test group for events")
	if err != nil {
		log.Fatal("Failed to create test group:", err)
	}

	// Add second user to group
	err = addUserToGroup(groupRepo, group.ID, testUser2.ID)
	if err != nil {
		log.Fatal("Failed to add user to group:", err)
	}

	// Test event creation with notification
	eventData := map[string]interface{}{
		"title":       "Test Event",
		"description": "This is a test event",
		"event_date":  time.Now().Add(24 * time.Hour).Format(time.RFC3339),
	}

	jsonData, _ := json.Marshal(eventData)
	req := httptest.NewRequest("POST", fmt.Sprintf("/api/groups/%d/events", group.ID), bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")

	// Add user context
	ctx := auth.SetUserIDInContext(req.Context(), testUser1.ID)
	req = req.WithContext(ctx)

	w := httptest.NewRecorder()
	eventHandler.CreateEvent(w, req)

	if w.Code != http.StatusCreated {
		log.Printf("Expected status 201, got %d", w.Code)
		log.Printf("Response: %s", w.Body.String())
		return
	}

	fmt.Println("✅ Event created successfully!")

	// Check if notification was created for the group member
	notifications, err := notificationRepo.GetUserNotifications(testUser2.ID, 10, 0)
	if err != nil {
		log.Fatal("Failed to get notifications:", err)
	}

	if len(notifications) == 0 {
		log.Fatal("❌ No notifications found for group member")
	}

	// Find the event notification
	var eventNotification *models.Notification
	for _, notif := range notifications {
		if notif.Type == string(models.NotificationEventCreated) {
			eventNotification = notif
			break
		}
	}

	if eventNotification == nil {
		log.Fatal("❌ Event notification not found")
	}

	fmt.Printf("✅ Event notification created successfully!\n")
	fmt.Printf("   Title: %s\n", eventNotification.Title)
	fmt.Printf("   Message: %s\n", eventNotification.Message)
	fmt.Printf("   Type: %s\n", eventNotification.Type)
	fmt.Printf("   Related Type: %s\n", *eventNotification.RelatedType)

	// Cleanup
	cleanup(database, testUser1.ID, testUser2.ID, group.ID)
	fmt.Println("✅ Test completed successfully!")
}

func createTestUser(userRepo *models.UserRepository, email, firstName, lastName string) (*models.User, error) {
	req := &models.CreateUserRequest{
		Email:       email,
		Password:    "password123",
		FirstName:   firstName,
		LastName:    lastName,
		DateOfBirth: "1990-01-01",
		Nickname:    firstName,
		AboutMe:     "Test user",
		IsPublic:    true,
	}
	return userRepo.CreateUser(req)
}

func createTestGroup(groupRepo *models.GroupRepository, creatorID int, title, description string) (*models.Group, error) {
	req := &models.CreateGroupRequest{
		Title:       title,
		Description: description,
	}
	return groupRepo.CreateGroup(creatorID, req)
}

func addUserToGroup(groupRepo *models.GroupRepository, groupID, userID int) error {
	// First create a join request
	membershipID, err := groupRepo.RequestToJoinGroup(groupID, userID)
	if err != nil {
		return err
	}

	// Then accept it
	return groupRepo.AcceptJoinRequest(membershipID, groupID)
}

func cleanup(db *sql.DB, userID1, userID2, groupID int) {
	// Clean up test data
	db.Exec("DELETE FROM notifications WHERE user_id IN (?, ?)", userID1, userID2)
	db.Exec("DELETE FROM events WHERE group_id = ?", groupID)
	db.Exec("DELETE FROM group_members WHERE group_id = ?", groupID)
	db.Exec("DELETE FROM groups WHERE id = ?", groupID)
	db.Exec("DELETE FROM users WHERE id IN (?, ?)", userID1, userID2)
}
