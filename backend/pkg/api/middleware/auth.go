package middleware

import (
	"context"
	"net/http"
	"strings"
	"github.com/Stella-Achar-Oiro/ripple/pkg/utils"

)

func AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Skip auth check for OPTIONS requests
		if r.Method == "OPTIONS" {
			next.ServeHTTP(w, r)
			return
		}
		
		// Get token from cookie or Authorization header
		tokenString := getTokenFromRequest(r)
		
		if tokenString == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}
		
		// Validate token
		claims, err := utils.ValidateToken(tokenString)
		if err != nil {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}
		
		// Set user ID in context
		ctx := context.WithValue(r.Context(), "userID", claims.UserID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func getTokenFromRequest(r *http.Request) string {
	// Try to get token from cookie
	cookie, err := r.Cookie("auth_token")
	if err == nil {
		return cookie.Value
	}
	
	// Try to get token from Authorization header
	authHeader := r.Header.Get("Authorization")
	if authHeader != "" {
		parts := strings.Split(authHeader, " ")
		if len(parts) == 2 && parts[0] == "Bearer" {
			return parts[1]
		}
	}
	
	return ""
}