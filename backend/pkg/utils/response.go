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

// WriteSuccessResponse writes a successful JSON response to the http.ResponseWriter
// with the given status code and data.
//
// Parameters:
//   - w: http.ResponseWriter to write the response to
//   - statusCode: HTTP status code for the response
//   - data: any data to be included in the response
func WriteSuccessResponse(w http.ResponseWriter, statusCode int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	
	response := APIResponse{
		Success: true,
		Data:    data,
	}
	
	json.NewEncoder(w).Encode(response)
}

// WriteErrorResponse writes an error JSON response to the http.ResponseWriter
// with the given status code and error message.
//
// Parameters:
//   - w: http.ResponseWriter to write the response to
//   - statusCode: HTTP status code for the error response
//   - message: error message to be included in the response
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

// WriteValidationErrorResponse writes a validation error JSON response to the http.ResponseWriter
// with a 400 Bad Request status code and details about the validation errors.
//
// Parameters:
//   - w: http.ResponseWriter to write the response to
//   - errors: ValidationErrors containing the validation errors to be included in the response
func WriteValidationErrorResponse(w http.ResponseWriter, errors ValidationErrors) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusBadRequest)
	
	// Convert validation errors to map for details
	details := make(map[string]any)
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

// WriteInternalErrorResponse writes an internal server error JSON response to the http.ResponseWriter
// with a 500 Internal Server Error status code.
//
// Parameters:
//   - w: http.ResponseWriter to write the response to
//   - err: The error that caused the internal server error (not included in the response)
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

// WriteJSONResponse writes a JSON response to the http.ResponseWriter with the given status code and data.
//
// Parameters:
//   - w: http.ResponseWriter to write the response to
//   - status: HTTP status code for the response
//   - data: any data to be encoded as JSON and included in the response
func WriteJSONResponse(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}