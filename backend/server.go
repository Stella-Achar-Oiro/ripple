package main

import (
	"log"
	"net/http"
)

func main() {
	log.Println("Starting Ripple server...")
	
	// TODO: Initialize database
	// TODO: Set up routes and middleware
	
	log.Println("Server listening on :8080")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		log.Fatalf("Server error: %v", err)
	}
}