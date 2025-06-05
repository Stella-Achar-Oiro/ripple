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
	"ripple/pkg/router"
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
	authHandler := handlers.NewAuthHandler(userRepo, followRepo, postRepo, sessionManager)
	followHandler := handlers.NewFollowHandler(followRepo, userRepo, notificationRepo)
	postHandler := handlers.NewPostHandler(postRepo)
	groupHandler := handlers.NewGroupHandler(groupRepo, groupPostRepo, notificationRepo)
	eventHandler := handlers.NewEventHandler(eventRepo, groupRepo, notificationRepo)
	notificationHandler := handlers.NewNotificationHandler(notificationRepo)
	uploadHandler := handlers.NewUploadHandler(cfg)
	chatHandler := handlers.NewChatHandler(messageRepo, followRepo, groupRepo, wsHub)

	// Setup routes
	handler := router.SetupRoutes(
		cfg,
		authHandler,
		followHandler,
		postHandler,
		groupHandler,
		eventHandler,
		notificationHandler,
		uploadHandler,
		chatHandler,
		sessionManager,
		wsHub,
	)

	// Create server
	server := &http.Server{
		Addr:         ":" + cfg.ServerPort,
		Handler:      handler,
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
