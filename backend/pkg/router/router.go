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
	mainMux := http.NewServeMux()

	// Create separate mux for API routes that need JSON middleware
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
	apiMux.Handle("/api/auth/search", authMiddleware(http.HandlerFunc(authHandler.SearchUsers)))
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

	// WebSocket route (no JSON middleware needed)
	apiMux.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		websocket.HandleWebSocket(wsHub, sessionManager, w, r)
	})

	// Apply middleware stack to API routes only:
	// 1. PanicRecoveryMiddleware: Recovers from panics and logs them.
	// 2. SecurityHeadersMiddleware: Adds security-related headers to responses.
	// 3. corsMiddleware: Handles Cross-Origin Resource Sharing (CORS) based on allowed origins.
	// 4. JSONMiddleware: Ensures all API responses are in JSON format.
	apiHandler := applyMiddleware(apiMux,
		handlers.PanicRecoveryMiddleware,
		handlers.SecurityHeadersMiddleware,
		corsMiddleware(cfg.AllowedOrigins),
		handlers.JSONMiddleware, // JSON middleware should not apply to static files
	)

	// Mount API routes with middleware
	mainMux.Handle("/api/", apiHandler)
	mainMux.Handle("/ws", apiHandler)

	// Serve static files without JSON middleware (preserves proper MIME types)
	fs := http.FileServer(http.Dir(cfg.UploadsPath))
	staticHandler := http.StripPrefix("/uploads/", fs)

	// Apply only basic middleware to static files (no JSON middleware)
	staticWithMiddleware := applyMiddleware(staticHandler,
		handlers.PanicRecoveryMiddleware,
		handlers.SecurityHeadersMiddleware,
		corsMiddleware(cfg.AllowedOrigins),
	)

	mainMux.Handle("/uploads/", staticWithMiddleware)

	return mainMux
}
