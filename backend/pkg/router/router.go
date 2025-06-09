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
	likeHandler *handlers.LikeHandler,
	groupHandler *handlers.GroupHandler,
	eventHandler *handlers.EventHandler,
	notificationHandler *handlers.NotificationHandler,
	uploadHandler *handlers.UploadHandler,
	chatHandler *handlers.ChatHandler,
	sessionManager *auth.SessionManager,
	wsHub *websocket.Hub,
) http.Handler {
	mux := http.NewServeMux()

	// Serve static files (without JSON middleware)
	fs := http.FileServer(http.Dir(cfg.UploadsPath))
	staticHandler := http.StripPrefix("/uploads/", fs)
	// Apply only security and CORS middleware to static files
	mux.Handle("/uploads/", applyMiddleware(staticHandler,
		handlers.PanicRecoveryMiddleware,
		handlers.SecurityHeadersMiddleware,
		corsMiddleware(cfg.AllowedOrigins),
	))

	// Create API mux for routes that need JSON middleware
	apiMux := http.NewServeMux()

	// Auth routes (no auth required)
	apiMux.HandleFunc("/api/auth/register", authHandler.Register)
	apiMux.HandleFunc("/api/auth/login", authHandler.Login)
	apiMux.HandleFunc("/api/auth/logout", authHandler.Logout)

	// Protected routes (auth required)
	authMiddleware := sessionManager.AuthMiddleware

	// User routes
	apiMux.Handle("/api/auth/profile", authMiddleware(http.HandlerFunc(authHandler.GetProfile)))
	apiMux.Handle("/api/auth/profile/update", authMiddleware(http.HandlerFunc(authHandler.UpdateProfile)))
	apiMux.Handle("/api/users/", authMiddleware(http.HandlerFunc(authHandler.GetUserProfile)))

	// Follow routes
	setupFollowRoutes(apiMux, followHandler, authMiddleware)

	// Post routes
	setupPostRoutes(apiMux, postHandler, authMiddleware)

	// Like routes
	setupLikeRoutes(apiMux, likeHandler, authMiddleware)

	// Group routes
	setupGroupRoutes(apiMux, groupHandler, authMiddleware)

	// Event routes
	setupEventRoutes(apiMux, eventHandler, authMiddleware)

	// Upload routes
	setupUploadRoutes(apiMux, uploadHandler, authMiddleware)

	// Notification routes
	setupNotificationRoutes(apiMux, notificationHandler, authMiddleware)

	// Chat API routes (REST endpoints)
	setupChatRoutes(apiMux, chatHandler, authMiddleware)

	// Apply full middleware stack to API routes (including JSON middleware)
	apiHandler := applyMiddleware(apiMux,
		handlers.PanicRecoveryMiddleware,
		handlers.SecurityHeadersMiddleware,
		corsMiddleware(cfg.AllowedOrigins),
		handlers.JSONMiddleware,
	)

	// Mount the API handler
	mux.Handle("/api/", apiHandler)

	// WebSocket route (without JSON middleware since it's not JSON)
	mux.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		websocket.HandleWebSocket(wsHub, sessionManager, w, r)
	})

	// Return the main mux with basic middleware (no JSON middleware)
	return applyMiddleware(mux,
		handlers.PanicRecoveryMiddleware,
		handlers.SecurityHeadersMiddleware,
		corsMiddleware(cfg.AllowedOrigins),
	)
}