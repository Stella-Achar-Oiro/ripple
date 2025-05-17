package routes

import (
	"database/sql"
	//"net/http"

	"github.com/Stella-Achar-Oiro/ripple/pkg/api/handlers"
	"github.com/Stella-Achar-Oiro/ripple/pkg/api/middleware"
	"github.com/Stella-Achar-Oiro/ripple/pkg/models"
	"github.com/gorilla/mux"
)

func SetupRoutes(db *sql.DB) *mux.Router {
	r := mux.NewRouter()

	// Initialize repositories
	userRepo := models.NewUserRepository(db)

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(userRepo)

	// Auth routes (public)
	r.HandleFunc("/api/auth/register", authHandler.Register).Methods("POST")
	r.HandleFunc("/api/auth/login", authHandler.Login).Methods("POST")
	r.HandleFunc("/api/auth/logout", authHandler.Logout).Methods("POST")

	// Protected routes
	protected := r.PathPrefix("/api").Subrouter()
	protected.Use(middleware.AuthMiddleware)

	// User routes
	protected.HandleFunc("/auth/me", authHandler.Me).Methods("GET")
	// Update routes.go to include profile routes
	protected.HandleFunc("/users/me", userHandler.GetProfile).Methods("GET")
	protected.HandleFunc("/users/{id}", userHandler.GetProfile).Methods("GET")
	protected.HandleFunc("/users/me", userHandler.UpdateProfile).Methods("PUT")
	protected.HandleFunc("/users/me/public", userHandler.TogglePublicStatus).Methods("PUT")

	// Return the router
	return r
}
