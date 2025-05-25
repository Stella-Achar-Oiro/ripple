// backend/pkg/auth/middleware.go
package auth

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"ripple/pkg/utils"
)

type contextKey string

const UserIDKey contextKey = "userID"

func (sm *SessionManager) AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Printf("AuthMiddleware: Processing request to %s", r.URL.Path)

		// Get session cookie
		cookie, err := r.Cookie("session_id")
		if err != nil {
			log.Printf("AuthMiddleware: No session cookie found: %v", err)
			utils.WriteErrorResponse(w, http.StatusUnauthorized, "Authentication required")
			return
		}

		log.Printf("AuthMiddleware: Found session cookie: %s", cookie.Value)

		// Validate session
		session, err := sm.GetSession(cookie.Value)
		if err != nil {
			log.Printf("AuthMiddleware: Session validation failed for %s: %v", cookie.Value, err)
			utils.WriteErrorResponse(w, http.StatusUnauthorized, "Invalid or expired session")
			return
		}

		log.Printf("AuthMiddleware: Session validated successfully: UserID=%d", session.UserID)

		// Add user ID to request context
		ctx := context.WithValue(r.Context(), UserIDKey, session.UserID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func GetUserIDFromContext(ctx context.Context) (int, error) {
	userID, ok := ctx.Value(UserIDKey).(int)
	if !ok {
		return 0, fmt.Errorf("user ID not found in context")
	}
	return userID, nil
}