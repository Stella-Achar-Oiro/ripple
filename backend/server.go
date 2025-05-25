// backend/server.go (Updated for Phase 5 - WebSocket Integration)
package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"ripple/pkg/auth"
	"ripple/pkg/config"
	"ripple/pkg/db"
	"ripple/pkg/handlers"
	"ripple/pkg/models"
	"ripple/pkg/utils"
	"ripple/pkg/websocket"
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
	notificationRepo := models.NewNotificationRepository(database.DB)
	groupRepo := models.NewGroupRepository(database.DB)
	groupPostRepo := models.NewGroupPostRepository(database.DB)
	eventRepo := models.NewEventRepository(database.DB)
	messageRepo := models.NewMessageRepository(database.DB) // NEW: Message repository

	// Initialize session manager
	sessionManager := auth.NewSessionManager(database.DB)

	// Initialize WebSocket hub
	hub := websocket.NewHub(database.DB) // Initialize hub with database connection
	go hub.Run()

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(userRepo, sessionManager)
	followHandler := handlers.NewFollowHandler(followRepo, userRepo, notificationRepo)
	postHandler := handlers.NewPostHandler(postRepo)
	uploadHandler := handlers.NewUploadHandler(cfg)
	notificationHandler := handlers.NewNotificationHandler(notificationRepo)
	groupHandler := handlers.NewGroupHandler(groupRepo, groupPostRepo, notificationRepo)
	eventHandler := handlers.NewEventHandler(eventRepo, groupRepo, notificationRepo)
	chatHandler := handlers.NewChatHandler(messageRepo, followRepo, groupRepo, hub) // NEW: Chat handler

	// Setup HTTP server
	mux := http.NewServeMux()

	// Health check endpoint
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"healthy","service":"ripple-backend","version":"1.2.0","phase":"5-chat-system"}`))
	})

	// WebSocket endpoint
	mux.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		websocket.HandleWebSocket(hub, sessionManager, w, r)
	})

	// Public authentication routes
	mux.HandleFunc("/api/auth/register", authHandler.Register)
	mux.HandleFunc("/api/auth/login", authHandler.Login)
	mux.HandleFunc("/api/auth/logout", authHandler.Logout)

	// Protected user routes
	protectedUserMux := http.NewServeMux()
	protectedUserMux.HandleFunc("/api/user/profile", authHandler.GetProfile)
	protectedUserMux.HandleFunc("/api/user/update", authHandler.UpdateProfile)

	// Protected follow routes
	protectedFollowMux := http.NewServeMux()
	protectedFollowMux.HandleFunc("/api/follow/request", followHandler.FollowUser)
	protectedFollowMux.HandleFunc("/api/follow/unfollow", followHandler.UnfollowUser)
	protectedFollowMux.HandleFunc("/api/follow/handle", followHandler.HandleFollowRequest)
	protectedFollowMux.HandleFunc("/api/follow/requests", followHandler.GetFollowRequests)
	protectedFollowMux.HandleFunc("/api/follow/followers/", followHandler.GetFollowers)
	protectedFollowMux.HandleFunc("/api/follow/following/", followHandler.GetFollowing)
	protectedFollowMux.HandleFunc("/api/follow/stats/", followHandler.GetFollowStats)
	protectedFollowMux.HandleFunc("/api/follow/status/", followHandler.GetFollowStatus)

	// Protected post routes
	protectedPostMux := http.NewServeMux()
	protectedPostMux.HandleFunc("/api/posts", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodPost:
			postHandler.CreatePost(w, r)
		case http.MethodGet:
			postHandler.GetFeed(w, r)
		default:
			utils.WriteErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		}
	})
	protectedPostMux.HandleFunc("/api/posts/", func(w http.ResponseWriter, r *http.Request) {
		if strings.Contains(r.URL.Path, "/comments") {
			if r.Method == http.MethodPost {
				postHandler.CreateComment(w, r)
			} else if r.Method == http.MethodGet {
				postHandler.GetComments(w, r)
			} else {
				utils.WriteErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
			}
		} else if r.Method == http.MethodGet {
			postHandler.GetPost(w, r)
		} else if r.Method == http.MethodDelete {
			postHandler.DeletePost(w, r)
		} else {
			utils.WriteErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		}
	})
	protectedPostMux.HandleFunc("/api/posts/user/", postHandler.GetUserPosts)

	// Protected group routes
	protectedGroupMux := http.NewServeMux()

	// Group management
	protectedGroupMux.HandleFunc("/api/groups", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodPost:
			groupHandler.CreateGroup(w, r)
		case http.MethodGet:
			groupHandler.GetAllGroups(w, r)
		default:
			utils.WriteErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		}
	})
	protectedGroupMux.HandleFunc("/api/groups/", func(w http.ResponseWriter, r *http.Request) {
		if strings.Contains(r.URL.Path, "/posts") {
			if r.Method == http.MethodPost {
				groupHandler.CreateGroupPost(w, r) // /api/groups/{id}/posts
			} else if r.Method == http.MethodGet {
				groupHandler.GetGroupPosts(w, r) // /api/groups/{id}/posts
			} else {
				utils.WriteErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
			}
		} else if strings.Contains(r.URL.Path, "/members") {
			groupHandler.GetGroupMembers(w, r) // /api/groups/{id}/members
		} else if strings.Contains(r.URL.Path, "/join-requests") {
			groupHandler.GetPendingJoinRequests(w, r) // /api/groups/{id}/join-requests
		} else if r.Method == http.MethodGet {
			groupHandler.GetGroup(w, r) // /api/groups/{id}
		} else {
			utils.WriteErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		}
	})
	protectedGroupMux.HandleFunc("/api/groups/my", groupHandler.GetUserGroups)
	protectedGroupMux.HandleFunc("/api/groups/invite", groupHandler.InviteToGroup)
	protectedGroupMux.HandleFunc("/api/groups/join", groupHandler.JoinGroup)
	protectedGroupMux.HandleFunc("/api/groups/handle", groupHandler.HandleMembershipRequest)
	protectedGroupMux.HandleFunc("/api/groups/invitations", groupHandler.GetPendingInvitations)

	// Group posts and comments
	protectedGroupMux.HandleFunc("/api/group-posts/", func(w http.ResponseWriter, r *http.Request) {
		if strings.Contains(r.URL.Path, "/comments") {
			if r.Method == http.MethodPost {
				groupHandler.CreateGroupComment(w, r) // /api/group-posts/{id}/comments
			} else if r.Method == http.MethodGet {
				groupHandler.GetGroupComments(w, r) // /api/group-posts/{id}/comments
			} else {
				utils.WriteErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
			}
		}
	})

	// Protected event routes
	protectedEventMux := http.NewServeMux()
	protectedEventMux.HandleFunc("/api/events/", func(w http.ResponseWriter, r *http.Request) {
		if strings.Contains(r.URL.Path, "/respond") {
			eventHandler.RespondToEvent(w, r) // /api/events/{id}/respond
		} else if strings.Contains(r.URL.Path, "/responses") {
			eventHandler.GetEventResponses(w, r) // /api/events/{id}/responses
		} else if r.Method == http.MethodGet {
			eventHandler.GetEvent(w, r) // /api/events/{id}
		} else {
			utils.WriteErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		}
	})
	protectedEventMux.HandleFunc("/api/groups/", func(w http.ResponseWriter, r *http.Request) {
		if strings.Contains(r.URL.Path, "/events") {
			if r.Method == http.MethodPost {
				eventHandler.CreateEvent(w, r) // /api/groups/{id}/events
			} else if r.Method == http.MethodGet {
				eventHandler.GetGroupEvents(w, r) // /api/groups/{id}/events
			} else {
				utils.WriteErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
			}
		}
	})

	// Protected upload routes
	protectedUploadMux := http.NewServeMux()
	protectedUploadMux.HandleFunc("/api/upload/avatar", uploadHandler.UploadAvatar)
	protectedUploadMux.HandleFunc("/api/upload/post", uploadHandler.UploadPostImage)
	protectedUploadMux.HandleFunc("/api/upload/comment", uploadHandler.UploadCommentImage)

	// Protected notification routes
	protectedNotificationMux := http.NewServeMux()
	protectedNotificationMux.HandleFunc("/api/notifications", notificationHandler.GetNotifications)
	protectedNotificationMux.HandleFunc("/api/notifications/read-all", notificationHandler.MarkAllAsRead)
	protectedNotificationMux.HandleFunc("/api/notifications/", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPut {
			notificationHandler.MarkAsRead(w, r)
		} else if r.Method == http.MethodDelete {
			notificationHandler.DeleteNotification(w, r)
		} else {
			utils.WriteErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		}
	})

	// NEW: Protected chat routes
	protectedChatMux := http.NewServeMux()
	protectedChatMux.HandleFunc("/api/chat/conversations", chatHandler.GetConversations)
	protectedChatMux.HandleFunc("/api/chat/private/", chatHandler.GetPrivateMessages) // /api/chat/private/{user_id}
	protectedChatMux.HandleFunc("/api/chat/group/", chatHandler.GetGroupMessages)     // /api/chat/group/{group_id}
	protectedChatMux.HandleFunc("/api/chat/online", chatHandler.GetOnlineUsers)
	protectedChatMux.HandleFunc("/api/chat/typing", chatHandler.TypingIndicator)
	protectedChatMux.HandleFunc("/api/chat/unread", chatHandler.GetUnreadCounts)

	// Apply auth middleware to protected routes
	mux.Handle("/api/user/", sessionManager.AuthMiddleware(protectedUserMux))
	mux.Handle("/api/follow/", sessionManager.AuthMiddleware(protectedFollowMux))
	mux.Handle("/api/posts", sessionManager.AuthMiddleware(protectedPostMux))
	mux.Handle("/api/posts/", sessionManager.AuthMiddleware(protectedPostMux))
	mux.Handle("/api/groups", sessionManager.AuthMiddleware(protectedGroupMux))
	mux.Handle("/api/groups/", sessionManager.AuthMiddleware(protectedGroupMux))
	mux.Handle("/api/group-posts/", sessionManager.AuthMiddleware(protectedGroupMux))
	mux.Handle("/api/events/", sessionManager.AuthMiddleware(protectedEventMux))
	mux.Handle("/api/upload/", sessionManager.AuthMiddleware(protectedUploadMux))
	mux.Handle("/api/notifications", sessionManager.AuthMiddleware(protectedNotificationMux))
	mux.Handle("/api/notifications/", sessionManager.AuthMiddleware(protectedNotificationMux))
	mux.Handle("/api/chat/", sessionManager.AuthMiddleware(protectedChatMux)) // NEW: Chat routes

	// Static file serving for uploads
	uploadsHandler := http.FileServer(http.Dir(cfg.UploadsPath))
	mux.Handle("/uploads/", http.StripPrefix("/uploads", uploadsHandler))

	// Apply middleware chain
	finalHandler := loggingMiddleware(
		securityHeadersMiddleware(
			corsMiddleware(mux, cfg.AllowedOrigins),
		),
	)

	server := &http.Server{
		Addr:    ":" + cfg.ServerPort,
		Handler: finalHandler,
	}

	// Start session cleanup routine
	go func() {
		ticker := time.NewTicker(1 * time.Hour)
		defer ticker.Stop()

		for range ticker.C {
			if err := sessionManager.CleanupExpiredSessions(); err != nil {
				log.Printf("Failed to cleanup expired sessions: %v", err)
			}
		}
	}()

	// Start server in a goroutine
	go func() {
		log.Printf("🚀 Ripple Backend Server starting on port %s", cfg.ServerPort)
		log.Printf("📁 Uploads directory: %s", cfg.UploadsPath)
		log.Printf("🗃️  Database path: %s", cfg.DatabasePath)
		log.Printf("🌐 Frontend URL: %s", cfg.AllowedOrigins[0])
		log.Printf("📦 Max file size: %d MB", cfg.MaxFileSize/(1024*1024))
		log.Printf("🔗 WebSocket endpoint: ws://localhost:%s/ws", cfg.ServerPort)
		log.Printf("💬 Phase 5: Real-time Chat System Ready!")

		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server failed to start: %v", err)
		}
	}()

	// Wait for interrupt signal to gracefully shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("🔄 Shutting down server...")

	// Close WebSocket hub
	hub.Stop()

	// Graceful shutdown with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("✅ Server exited gracefully")
}

func corsMiddleware(next http.Handler, allowedOrigins []string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")

		// Check if origin is allowed
		for _, allowed := range allowedOrigins {
			if origin == allowed {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				break
			}
		}

		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Allow-Credentials", "true")

		// Handle preflight requests
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func securityHeadersMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("X-XSS-Protection", "1; mode=block")
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
		next.ServeHTTP(w, r)
	})
}

func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		// Create a response writer wrapper to capture status code
		rw := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}

		next.ServeHTTP(rw, r)

		// Log with emoji for better readability
		statusEmoji := "✅"
		if rw.statusCode >= 400 {
			statusEmoji = "❌"
		} else if rw.statusCode >= 300 {
			statusEmoji = "🔄"
		}

		// Special emoji for WebSocket connections
		if r.URL.Path == "/ws" {
			statusEmoji = "🔗"
		}

		log.Printf("%s %s %s %d %v", statusEmoji, r.Method, r.URL.Path, rw.statusCode, time.Since(start))
	})
}

type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}
