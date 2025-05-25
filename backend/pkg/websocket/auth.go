// backend/pkg/websocket/auth.go
package websocket

import (
	"net/http"
	"net/url"
	"strconv"

	"ripple/pkg/auth"
)

// AuthenticateWebSocket validates the WebSocket connection and returns user ID
func AuthenticateWebSocket(r *http.Request, sessionManager *auth.SessionManager) (int, error) {
	// Try to get session from cookie first
	cookie, err := r.Cookie("session_id")
	var sessionID string
	
	if err != nil {
		// If no cookie, try to get session_id from query parameters
		queryParams, parseErr := url.ParseQuery(r.URL.RawQuery)
		if parseErr != nil {
			return 0, parseErr
		}
		
		sessionIDs, exists := queryParams["session_id"]
		if !exists || len(sessionIDs) == 0 {
			return 0, err
		}
		sessionID = sessionIDs[0]
	} else {
		sessionID = cookie.Value
	}

	// Validate session
	session, err := sessionManager.GetSession(sessionID)
	if err != nil {
		return 0, err
	}

	return session.UserID, nil
}

// GetUserIDFromQuery extracts user ID from query parameters (for debugging/testing)
func GetUserIDFromQuery(r *http.Request) (int, error) {
	queryParams, err := url.ParseQuery(r.URL.RawQuery)
	if err != nil {
		return 0, err
	}
	
	userIDs, exists := queryParams["user_id"]
	if !exists || len(userIDs) == 0 {
		return 0, err
	}
	
	return strconv.Atoi(userIDs[0])
}