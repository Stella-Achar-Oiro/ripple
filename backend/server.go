package main

import (
	"log"
	"net/http"

	"github.com/Stella-Achar-Oiro/ripple/pkg/api/routes"
	"github.com/Stella-Achar-Oiro/ripple/pkg/db/sqlite"
	_ "github.com/mattn/go-sqlite3"
)

func main() {
	log.Println("Starting Ripple server...")

	db, err := sqlite.New()
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	if err = db.Migrate(); err != nil {
		log.Fatal("Failed to migrate database")
	}
	
	defer db.Close()

	// Set up routes
	router := routes.SetupRoutes(db.DB)

	// Start server
	log.Println("Server listening on :8080")
	if err := http.ListenAndServe(":8080", router); err != nil {
		log.Fatalf("Server error: %v", err)
	}
}
