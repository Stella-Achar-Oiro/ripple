// backend/pkg/utils/response.go
package utils

import (
	"encoding/json"
	"net/http"
)

type APIResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Error   *APIError   `json:"error,omitempty"`
}

type APIError struct {
	Message string                 `json:"message"`
	Code    string                 `json:"code,omitempty"`
	Details map[string]interface{} `json:"details,omitempty"`
}

func WriteSuccessResponse(w http.ResponseWriter, statusCode int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	
	response := APIResponse{
		Success: true,
		Data:    data,
	}
	
	json.NewEncoder(w).Encode(response)
}

func WriteErrorResponse(w http.ResponseWriter, statusCode int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	
	response := APIResponse{
		Success: false,
		Error: &APIError{
			Message: message,
		},
	}
	
	json.NewEncoder(w).Encode(response)
}

func WriteValidationErrorResponse(w http.ResponseWriter, errors ValidationErrors) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusBadRequest)
	
	// Convert validation errors to map for details
	details := make(map[string]interface{})
	for _, err := range errors {
		details[err.Field] = err.Message
	}
	
	response := APIResponse{
		Success: false,
		Error: &APIError{
			Message: "Validation failed",
			Code:    "VALIDATION_ERROR",
			Details: details,
		},
	}
	
	json.NewEncoder(w).Encode(response)
}

func WriteInternalErrorResponse(w http.ResponseWriter, err error) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusInternalServerError)
	
	response := APIResponse{
		Success: false,
		Error: &APIError{
			Message: "Internal server error",
			Code:    "INTERNAL_ERROR",
		},
	}
	
	json.NewEncoder(w).Encode(response)
}

