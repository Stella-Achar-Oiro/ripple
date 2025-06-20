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

	// Auth routes (no auth required)
	mux.HandleFunc("/api/auth/register", authHandler.Register)
	mux.HandleFunc("/api/auth/login", authHandler.Login)
	mux.HandleFunc("/api/auth/logout", authHandler.Logout)

	// Protected routes (auth required)
	authMiddleware := sessionManager.AuthMiddleware

	// User routes
	mux.Handle("/api/auth/profile", authMiddleware(http.HandlerFunc(authHandler.GetProfile)))
	mux.Handle("/api/auth/profile/update", authMiddleware(http.HandlerFunc(authHandler.UpdateProfile)))
	mux.Handle("/api/users/", authMiddleware(http.HandlerFunc(authHandler.GetUserProfile)))

	// Follow routes
	setupFollowRoutes(mux, followHandler, authMiddleware)

	// Post routes
	setupPostRoutes(mux, postHandler, authMiddleware)

	// Like routes
	setupLikeRoutes(mux, likeHandler, authMiddleware)

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

	// Wrap the main mux with a handler that first checks for static files,
	// then falls back to the API mux. This ensures middleware is applied to all requests.
	finalMux := http.NewServeMux()
	finalMux.Handle("/uploads/", http.StripPrefix("/uploads/", http.FileServer(http.Dir(cfg.UploadsPath))))
	finalMux.Handle("/", mux)

	// Apply middleware stack in the following order:
	// 1. PanicRecoveryMiddleware: Recovers from panics and logs them.
	// 2. SecurityHeadersMiddleware: Adds security-related headers to responses.
	// 3. corsMiddleware: Handles Cross-Origin Resource Sharing (CORS) based on allowed origins.
	// 4. JSONMiddleware: Ensures all responses are in JSON format.
	return applyMiddleware(finalMux,
		handlers.PanicRecoveryMiddleware,
		handlers.SecurityHeadersMiddleware,
		corsMiddleware(cfg.AllowedOrigins),
		// handlers.JSONMiddleware, // JSON middleware should not apply to static files
	)
}
