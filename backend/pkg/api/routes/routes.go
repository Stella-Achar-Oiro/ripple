package routes

import (
	"database/sql"
	"net/http"

	"github.com/Stella-Achar-Oiro/ripple/pkg/api/handlers"
	"github.com/Stella-Achar-Oiro/ripple/pkg/api/middleware"
	"github.com/Stella-Achar-Oiro/ripple/pkg/models"
	"github.com/gorilla/mux"
)

func SetupRoutes(db *sql.DB) *mux.Router {
	r := mux.NewRouter()

	// Apply CORS middleware to all routes
	r.Use(middleware.CorsMiddleware)

	// Initialize repositories
	userRepo := models.NewUserRepository(db)
	postRepo := models.NewPostRepository(db)
	commentRepo := models.NewCommentRepository(db)

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(userRepo)
	userHandler := handlers.NewUserHandler(userRepo)
	postHandler := handlers.NewPostHandler(postRepo, commentRepo)
	commentHandler := handlers.NewCommentHandler(commentRepo, postRepo)

	// Auth routes (public)
	r.HandleFunc("/api/auth/register", authHandler.Register).Methods("POST", "OPTIONS")
	r.HandleFunc("/api/auth/login", authHandler.Login).Methods("POST", "OPTIONS")
	r.HandleFunc("/api/auth/logout", authHandler.Logout).Methods("POST", "OPTIONS")

	// Protected routes
	protected := r.PathPrefix("/api").Subrouter()
	protected.Use(middleware.AuthMiddleware)
	
	// Add OPTIONS method to all protected routes
	protected.Methods("OPTIONS").HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	// User routes
	protected.HandleFunc("/auth/me", authHandler.Me).Methods("GET")
	// Update routes.go to include profile routes
	protected.HandleFunc("/users/me", userHandler.GetProfile).Methods("GET")
	protected.HandleFunc("/users/{id}", userHandler.GetProfile).Methods("GET")
	protected.HandleFunc("/users/me", userHandler.UpdateProfile).Methods("PUT")
	protected.HandleFunc("/users/me/public", userHandler.TogglePublicStatus).Methods("PUT")

	// Add these to your existing routes.go file inside the SetupRoutes function
	// Post routes
	protected.HandleFunc("/posts", postHandler.CreatePost).Methods("POST")
	protected.HandleFunc("/posts/feed", postHandler.GetFeed).Methods("GET")
	protected.HandleFunc("/posts/{postId}", postHandler.GetPost).Methods("GET")
	protected.HandleFunc("/posts/{postId}", postHandler.UpdatePost).Methods("PUT")
	protected.HandleFunc("/posts/{postId}", postHandler.DeletePost).Methods("DELETE")
	protected.HandleFunc("/posts/{postId}/like", postHandler.LikePost).Methods("POST")
	protected.HandleFunc("/posts/{postId}/unlike", postHandler.UnlikePost).Methods("POST")
	protected.HandleFunc("/users/{userId}/posts", postHandler.GetUserPosts).Methods("GET")

	// Comment routes
	protected.HandleFunc("/posts/{postId}/comments", commentHandler.GetComments).Methods("GET")
	protected.HandleFunc("/posts/{postId}/comments", commentHandler.CreateComment).Methods("POST")
	protected.HandleFunc("/comments/{commentId}", commentHandler.UpdateComment).Methods("PUT")
	protected.HandleFunc("/comments/{commentId}", commentHandler.DeleteComment).Methods("DELETE")

	// Return the router
	return r
}
