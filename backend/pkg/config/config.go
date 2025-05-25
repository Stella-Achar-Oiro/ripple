// backend/pkg/config/config.go
package config

import (
	"log"
	"os"
	"strconv"
)

type Config struct {
	DatabasePath     string
	MigrationsPath   string
	ServerPort       string
	SessionSecret    string
	UploadsPath      string
	AllowedOrigins   []string
	MaxFileSize      int64
}

func LoadConfig() *Config {
	config := &Config{
		DatabasePath:   getEnv("DATABASE_PATH", "./data/ripple.db"),
		MigrationsPath: getEnv("MIGRATIONS_PATH", "./pkg/db/migrations/sqlite"),
		ServerPort:     getEnv("SERVER_PORT", "8080"),
		SessionSecret:  getEnv("SESSION_SECRET", "your-super-secret-key-change-this"),
		UploadsPath:    getEnv("UPLOADS_PATH", "./uploads"),
		AllowedOrigins: []string{
			getEnv("FRONTEND_URL", "http://localhost:3000"),
		},
		MaxFileSize: parseIntEnv("MAX_FILE_SIZE", 10<<20), // 10MB default
	}

	// Create uploads directory if it doesn't exist
	if err := os.MkdirAll(config.UploadsPath, 0755); err != nil {
		log.Printf("Warning: failed to create uploads directory: %v", err)
	}

	// Create subdirectories for different upload types
	uploadDirs := []string{"avatars", "posts", "comments"}
	for _, dir := range uploadDirs {
		fullPath := config.UploadsPath + "/" + dir
		if err := os.MkdirAll(fullPath, 0755); err != nil {
			log.Printf("Warning: failed to create upload directory %s: %v", fullPath, err)
		}
	}

	return config
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func parseIntEnv(key string, defaultValue int64) int64 {
	if value := os.Getenv(key); value != "" {
		if parsed, err := strconv.ParseInt(value, 10, 64); err == nil {
			return parsed
		}
	}
	return defaultValue
}