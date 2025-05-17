package main

import (
	"database/sql"
	"log"
	"net/http"

	"github.com/Stella-Achar-Oiro/ripple/pkg/api/routes"
	_ "github.com/mattn/go-sqlite3"
)

func main() {
	log.Println("Starting Ripple server...")
	
	// Initialize database
	db, err := sql.Open("sqlite3", "./ripple.db")
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()
	
	// Set up routes
	router := routes.SetupRoutes(db)
	
	// Start server
	log.Println("Server listening on :8080")
	if err := http.ListenAndServe(":8080", router); err != nil {
		log.Fatalf("Server error: %v", err)
	}
}