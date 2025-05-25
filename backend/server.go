// backend/server.go
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

	// Initialize session manager
	sessionManager := auth.NewSessionManager(database.DB)

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(userRepo, sessionManager)
	followHandler := handlers.NewFollowHandler(followRepo, userRepo, notificationRepo)
	postHandler := handlers.NewPostHandler(postRepo)
	uploadHandler := handlers.NewUploadHandler(cfg)
	notificationHandler := handlers.NewNotificationHandler(notificationRepo)

	// Setup HTTP server
	mux := http.NewServeMux()

	// Health check endpoint
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"healthy","service":"ripple-backend","version":"1.0.0"}`))
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
	protectedFollowMux.HandleFunc("/api/follow/followers/", followHandler.GetFollowers) // /api/follow/followers/{userID}
	protectedFollowMux.HandleFunc("/api/follow/following/", followHandler.GetFollowing) // /api/follow/following/{userID}
	protectedFollowMux.HandleFunc("/api/follow/stats/", followHandler.GetFollowStats)   // /api/follow/stats/{userID}
	protectedFollowMux.HandleFunc("/api/follow/status/", followHandler.GetFollowStatus) // /api/follow/status/{userID}

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
				postHandler.CreateComment(w, r) // /api/posts/{postID}/comments
			} else if r.Method == http.MethodGet {
				postHandler.GetComments(w, r) // /api/posts/{postID}/comments
			} else {
				utils.WriteErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
			}
		} else if strings.HasSuffix(r.URL.Path, "/") || strings.Count(r.URL.Path, "/") == 3 {
			// Handle direct post operations
			if r.Method == http.MethodGet {
				postHandler.GetPost(w, r) // /api/posts/{postID}
			} else if r.Method == http.MethodDelete {
				postHandler.DeletePost(w, r) // /api/posts/{postID}
			} else {
				utils.WriteErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
			}
		} else {
			utils.WriteErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		}
	})
	protectedPostMux.HandleFunc("/api/posts/user/", postHandler.GetUserPosts) // /api/posts/user/{userID}

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
			notificationHandler.MarkAsRead(w, r) // /api/notifications/{id}/read
		} else if r.Method == http.MethodDelete {
			notificationHandler.DeleteNotification(w, r) // /api/notifications/{id}
		} else {
			utils.WriteErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		}
	})

	// Apply auth middleware to protected routes
	mux.Handle("/api/user/", sessionManager.AuthMiddleware(protectedUserMux))
	mux.Handle("/api/follow/", sessionManager.AuthMiddleware(protectedFollowMux))
	mux.Handle("/api/posts/", sessionManager.AuthMiddleware(protectedPostMux))
	mux.Handle("/api/upload/", sessionManager.AuthMiddleware(protectedUploadMux))
	mux.Handle("/api/notifications/", sessionManager.AuthMiddleware(protectedNotificationMux))

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

		for {
			select {
			case <-ticker.C:
				if err := sessionManager.CleanupExpiredSessions(); err != nil {
					log.Printf("Failed to cleanup expired sessions: %v", err)
				}
			}
		}
	}()

	// Start server in a goroutine
	go func() {
		log.Printf("🚀 Ripple Backend Server starting on port %s", cfg.ServerPort)
		log.Printf("📁 Uploads directory: %s", cfg.UploadsPath)
		log.Printf("💾 Database path: %s", cfg.DatabasePath)
		log.Printf("🌐 Frontend URL: %s", cfg.AllowedOrigins[0])
		log.Printf("📊 Max file size: %d MB", cfg.MaxFileSize/(1024*1024))

		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server failed to start: %v", err)
		}
	}()

	// Wait for interrupt signal to gracefully shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("🔄 Shutting down server...")

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
