package router

import (
	"net/http"

	"ripple/pkg/auth"
	"ripple/pkg/config"
	"ripple/pkg/handlers"
	"ripple/pkg/websocket"
)

// SetupRoutes configures all application routes
func SetupRoutes(
	cfg *config.Config,
	authHandler *handlers.AuthHandler,
	followHandler *handlers.FollowHandler,
	postHandler *handlers.PostHandler,
	groupHandler *handlers.GroupHandler,
	eventHandler *handlers.EventHandler,
	notificationHandler *handlers.NotificationHandler,
	uploadHandler *handlers.UploadHandler,
	chatHandler *handlers.ChatHandler,
	sessionManager *auth.SessionManager,
	wsHub *websocket.Hub,
) http.Handler {
	mux := http.NewServeMux()

	// Serve static files
	fs := http.FileServer(http.Dir(cfg.UploadsPath))
	mux.Handle("/uploads/", http.StripPrefix("/uploads/", fs))

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
	setupFollowRoutes(mux, followHandler, authMiddleware)

	// Post routes
	setupPostRoutes(mux, postHandler, authMiddleware)

	// Group routes
	setupGroupRoutes(mux, groupHandler, authMiddleware)

	// Event routes
	setupEventRoutes(mux, eventHandler, authMiddleware)

	// Upload routes
	setupUploadRoutes(mux, uploadHandler, authMiddleware)

	// Notification routes
	setupNotificationRoutes(mux, notificationHandler, authMiddleware)

	// Chat API routes (REST endpoints)
	setupChatRoutes(mux, chatHandler, authMiddleware)

	// WebSocket route
	mux.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		websocket.HandleWebSocket(wsHub, sessionManager, w, r)
	})

	// Apply middleware stack
	return applyMiddleware(mux,
		handlers.PanicRecoveryMiddleware,
		handlers.SecurityHeadersMiddleware,
		corsMiddleware(cfg.AllowedOrigins),
		handlers.JSONMiddleware,
	)
}

