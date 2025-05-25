// backend/server.go
package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"ripple/pkg/auth"
	"ripple/pkg/config"
	"ripple/pkg/db"
	"ripple/pkg/handlers"
	"ripple/pkg/models"
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

	// Initialize session manager
	sessionManager := auth.NewSessionManager(database.DB)

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(userRepo, sessionManager)

	// Setup HTTP server
	mux := http.NewServeMux()
	
	// Health check endpoint
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"healthy","service":"ripple-backend"}`))
	})

	// Public authentication routes
	mux.HandleFunc("/api/auth/register", authHandler.Register)
	mux.HandleFunc("/api/auth/login", authHandler.Login)
	mux.HandleFunc("/api/auth/logout", authHandler.Logout)

	// Protected routes (require authentication)
	protectedMux := http.NewServeMux()
	protectedMux.HandleFunc("/api/user/profile", authHandler.GetProfile)
	protectedMux.HandleFunc("/api/user/update", authHandler.UpdateProfile)

	// Apply auth middleware to protected routes
	mux.Handle("/api/user/", sessionManager.AuthMiddleware(protectedMux))

	// Static file serving for uploads
	uploadsHandler := http.FileServer(http.Dir(cfg.UploadsPath))
	mux.Handle("/uploads/", http.StripPrefix("/uploads", uploadsHandler))

	// Apply CORS and logging middleware
	finalHandler := loggingMiddleware(corsMiddleware(mux, cfg.AllowedOrigins))

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
		log.Printf("Server starting on port %s", cfg.ServerPort)
		log.Printf("Uploads directory: %s", cfg.UploadsPath)
		log.Printf("Database path: %s", cfg.DatabasePath)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server failed to start: %v", err)
		}
	}()

	// Wait for interrupt signal to gracefully shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")

	// Graceful shutdown with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exited")
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

func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		
		// Create a response writer wrapper to capture status code
		rw := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}
		
		next.ServeHTTP(rw, r)
		
		log.Printf("%s %s %d %v", r.Method, r.URL.Path, rw.statusCode, time.Since(start))
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