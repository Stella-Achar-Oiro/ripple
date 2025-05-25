// backend/server.go - Updated main server with WebSocket integration
package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"time"

	"ripple/pkg/auth"
	"ripple/pkg/config"
	"ripple/pkg/db"
	"ripple/pkg/handlers"
	"ripple/pkg/models"
	"ripple/pkg/websocket"

	_ "github.com/mattn/go-sqlite3"
)

func main() {
	// Load configuration
	cfg := config.LoadConfig()

	// Initialize database
	database, err := db.NewDatabase(cfg.DatabasePath)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer database.Close()

	// Run migrations
	if err := database.RunMigrations(cfg.MigrationsPath); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	// Initialize repositories
	userRepo := models.NewUserRepository(database.DB)
	followRepo := models.NewFollowRepository(database.DB)
	postRepo := models.NewPostRepository(database.DB)
	groupRepo := models.NewGroupRepository(database.DB)
	groupPostRepo := models.NewGroupPostRepository(database.DB)
	eventRepo := models.NewEventRepository(database.DB)
	notificationRepo := models.NewNotificationRepository(database.DB)
	messageRepo := models.NewMessageRepository(database.DB)

	// Initialize session manager
	sessionManager := auth.NewSessionManager(database.DB)

	// Initialize WebSocket hub
	wsHub := websocket.NewHub(database.DB)
	go wsHub.Run()

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(userRepo, sessionManager)
	followHandler := handlers.NewFollowHandler(followRepo, userRepo, notificationRepo)
	postHandler := handlers.NewPostHandler(postRepo)
	groupHandler := handlers.NewGroupHandler(groupRepo, groupPostRepo, notificationRepo)
	eventHandler := handlers.NewEventHandler(eventRepo, groupRepo, notificationRepo)
	notificationHandler := handlers.NewNotificationHandler(notificationRepo)
	uploadHandler := handlers.NewUploadHandler(cfg)
	chatHandler := handlers.NewChatHandler(messageRepo, followRepo, groupRepo, wsHub)

	// Setup routes
	mux := http.NewServeMux()

	// Serve static files
	fs := http.FileServer(http.Dir(cfg.UploadsPath))
	mux.Handle("/uploads/", http.StripPrefix("/uploads/", fs))

	// Apply middleware stack
	stack := applyMiddleware(mux,
		handlers.PanicRecoveryMiddleware,
		handlers.SecurityHeadersMiddleware,
		corsMiddleware(cfg.AllowedOrigins),
		handlers.JSONMiddleware,
	)

	// Auth routes (no auth required)
	mux.HandleFunc("/api/auth/register", authHandler.Register)
	mux.HandleFunc("/api/auth/login", authHandler.Login)
	mux.HandleFunc("/api/auth/logout", authHandler.Logout)

	// Protected routes (auth required)
	authMiddleware := sessionManager.AuthMiddleware

	// User routes
	mux.Handle("/api/auth/profile", authMiddleware(http.HandlerFunc(authHandler.GetProfile)))
	mux.Handle("/api/auth/profile/update", authMiddleware(http.HandlerFunc(authHandler.UpdateProfile)))

	// Follow routes
	mux.Handle("/api/follow", authMiddleware(http.HandlerFunc(followHandler.FollowUser)))
	mux.Handle("/api/unfollow", authMiddleware(http.HandlerFunc(followHandler.UnfollowUser)))
	mux.Handle("/api/follow/handle", authMiddleware(http.HandlerFunc(followHandler.HandleFollowRequest)))
	mux.Handle("/api/follow/requests", authMiddleware(http.HandlerFunc(followHandler.GetFollowRequests)))
	mux.Handle("/api/follow/followers/", authMiddleware(http.HandlerFunc(followHandler.GetFollowers)))
	mux.Handle("/api/follow/following/", authMiddleware(http.HandlerFunc(followHandler.GetFollowing)))
	mux.Handle("/api/follow/stats/", authMiddleware(http.HandlerFunc(followHandler.GetFollowStats)))
	mux.Handle("/api/follow/status/", authMiddleware(http.HandlerFunc(followHandler.GetFollowStatus)))

	// Post routes
	mux.Handle("/api/posts", authMiddleware(http.HandlerFunc(postHandler.CreatePost)))
	mux.Handle("/api/posts/", authMiddleware(http.HandlerFunc(postHandler.GetPost)))
	mux.Handle("/api/posts/feed", authMiddleware(http.HandlerFunc(postHandler.GetFeed)))
	mux.Handle("/api/posts/user/", authMiddleware(http.HandlerFunc(postHandler.GetUserPosts)))
	mux.Handle("/api/posts/delete/", authMiddleware(http.HandlerFunc(postHandler.DeletePost)))
	mux.Handle("/api/posts/comment/", authMiddleware(http.HandlerFunc(postHandler.CreateComment)))
	mux.Handle("/api/posts/comments/", authMiddleware(http.HandlerFunc(postHandler.GetComments)))

	// Group routes
	mux.Handle("/api/groups", authMiddleware(http.HandlerFunc(groupHandler.CreateGroup)))
	mux.Handle("/api/groups/", authMiddleware(http.HandlerFunc(groupHandler.GetGroup)))
	mux.Handle("/api/groups/all", authMiddleware(http.HandlerFunc(groupHandler.GetAllGroups)))
	mux.Handle("/api/groups/user", authMiddleware(http.HandlerFunc(groupHandler.GetUserGroups)))
	mux.Handle("/api/groups/invite", authMiddleware(http.HandlerFunc(groupHandler.InviteToGroup)))
	mux.Handle("/api/groups/join", authMiddleware(http.HandlerFunc(groupHandler.JoinGroup)))
	mux.Handle("/api/groups/handle", authMiddleware(http.HandlerFunc(groupHandler.HandleMembershipRequest)))
	mux.Handle("/api/groups/members/", authMiddleware(http.HandlerFunc(groupHandler.GetGroupMembers)))
	mux.Handle("/api/groups/invitations", authMiddleware(http.HandlerFunc(groupHandler.GetPendingInvitations)))
	mux.Handle("/api/groups/requests/", authMiddleware(http.HandlerFunc(groupHandler.GetPendingJoinRequests)))
	mux.Handle("/api/groups/posts/", authMiddleware(http.HandlerFunc(groupHandler.CreateGroupPost)))
	mux.Handle("/api/groups/posts/get/", authMiddleware(http.HandlerFunc(groupHandler.GetGroupPosts)))
	mux.Handle("/api/groups/comments/", authMiddleware(http.HandlerFunc(groupHandler.CreateGroupComment)))
	mux.Handle("/api/groups/comments/get/", authMiddleware(http.HandlerFunc(groupHandler.GetGroupComments)))

	// Event routes
	mux.Handle("/api/events/", authMiddleware(http.HandlerFunc(eventHandler.CreateEvent)))
	mux.Handle("/api/events/get/", authMiddleware(http.HandlerFunc(eventHandler.GetEvent)))
	mux.Handle("/api/events/group/", authMiddleware(http.HandlerFunc(eventHandler.GetGroupEvents)))
	mux.Handle("/api/events/respond/", authMiddleware(http.HandlerFunc(eventHandler.RespondToEvent)))
	mux.Handle("/api/events/responses/", authMiddleware(http.HandlerFunc(eventHandler.GetEventResponses)))

	// Upload routes
	mux.Handle("/api/upload/avatar", authMiddleware(http.HandlerFunc(uploadHandler.UploadAvatar)))
	mux.Handle("/api/upload/post", authMiddleware(http.HandlerFunc(uploadHandler.UploadPostImage)))
	mux.Handle("/api/upload/comment", authMiddleware(http.HandlerFunc(uploadHandler.UploadCommentImage)))

	// Notification routes
	mux.Handle("/api/notifications", authMiddleware(http.HandlerFunc(notificationHandler.GetNotifications)))
	mux.Handle("/api/notifications/read/", authMiddleware(http.HandlerFunc(notificationHandler.MarkAsRead)))
	mux.Handle("/api/notifications/read-all", authMiddleware(http.HandlerFunc(notificationHandler.MarkAllAsRead)))
	mux.Handle("/api/notifications/delete/", authMiddleware(http.HandlerFunc(notificationHandler.DeleteNotification)))

	// Chat API routes (REST endpoints)
	mux.Handle("/api/chat/conversations", authMiddleware(http.HandlerFunc(chatHandler.GetConversations)))
	mux.Handle("/api/chat/messages/private/", authMiddleware(http.HandlerFunc(chatHandler.GetPrivateMessages)))
	mux.Handle("/api/chat/messages/group/", authMiddleware(http.HandlerFunc(chatHandler.GetGroupMessages)))
	mux.Handle("/api/chat/online", authMiddleware(http.HandlerFunc(chatHandler.GetOnlineUsers)))
	mux.Handle("/api/chat/typing", authMiddleware(http.HandlerFunc(chatHandler.TypingIndicator)))
	mux.Handle("/api/chat/unread", authMiddleware(http.HandlerFunc(chatHandler.GetUnreadCounts)))

	// WebSocket route
	mux.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		websocket.HandleWebSocket(wsHub, sessionManager, w, r)
	})

	// Create server
	server := &http.Server{
		Addr:         ":" + cfg.ServerPort,
		Handler:      stack,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server
	log.Printf("Server starting on port %s", cfg.ServerPort)

	// Handle graceful shutdown
	go func() {
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server failed to start: %v", err)
		}
	}()

	// Wait for interrupt signal
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt)
	<-c

	// Graceful shutdown
	log.Println("Shutting down server...")

	// Stop WebSocket hub
	wsHub.Stop()

	// Shutdown HTTP server
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Printf("Server shutdown error: %v", err)
	}

	log.Println("Server stopped")
}

func applyMiddleware(h http.Handler, middlewares ...func(http.Handler) http.Handler) http.Handler {
	for i := len(middlewares) - 1; i >= 0; i-- {
		h = middlewares[i](h)
	}
	return h
}

func corsMiddleware(allowedOrigins []string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			for _, allowed := range allowedOrigins {
				if origin == allowed {
					w.Header().Set("Access-Control-Allow-Origin", origin)
					break
				}
			}

			w.Header().Set("Access-Control-Allow-Credentials", "true")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")

			if r.Method == "OPTIONS" {
				w.WriteHeader(http.StatusOK)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
