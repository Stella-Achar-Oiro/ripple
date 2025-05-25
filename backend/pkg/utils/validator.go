// backend/pkg/utils/validator.go
package utils

import (
	"fmt"
	"regexp"
	"strings"
	"time"
	"ripple/pkg/constants"
)

var emailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)

type ValidationError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

type ValidationErrors []ValidationError

func (ve ValidationErrors) Error() string {
	var messages []string
	for _, err := range ve {
		messages = append(messages, fmt.Sprintf("%s: %s", err.Field, err.Message))
	}
	return strings.Join(messages, ", ")
}

func (ve ValidationErrors) HasErrors() bool {
	return len(ve) > 0
}

func ValidateEmail(email string) *ValidationError {
	if strings.TrimSpace(email) == "" {
		return &ValidationError{Field: "email", Message: constants.ErrRequiredField}
	}
	
	if !emailRegex.MatchString(email) {
		return &ValidationError{Field: "email", Message: constants.ErrInvalidEmail}
	}
	
	return nil
}

func ValidatePassword(password string) *ValidationError {
	if strings.TrimSpace(password) == "" {
		return &ValidationError{Field: "password", Message: constants.ErrRequiredField}
	}
	
	if len(password) < 8 {
		return &ValidationError{Field: "password", Message: constants.ErrPasswordTooShort}
	}
	
	return nil
}

func ValidateRequired(value, fieldName string) *ValidationError {
	if strings.TrimSpace(value) == "" {
		return &ValidationError{Field: fieldName, Message: constants.ErrRequiredField}
	}
	return nil
}

func ValidateName(name, fieldName string) *ValidationError {
	if err := ValidateRequired(name, fieldName); err != nil {
		return err
	}
	
	if len(strings.TrimSpace(name)) < 2 {
		return &ValidationError{Field: fieldName, Message: "must be at least 2 characters long"}
	}
	
	return nil
}

func ValidateDateOfBirth(dateStr string) *ValidationError {
	if strings.TrimSpace(dateStr) == "" {
		return &ValidationError{Field: "date_of_birth", Message: constants.ErrRequiredField}
	}
	
	dob, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		return &ValidationError{Field: "date_of_birth", Message: "invalid date format (YYYY-MM-DD required)"}
	}
	
	// Check if user is at least 13 years old
	thirteenYearsAgo := time.Now().AddDate(-13, 0, 0)
	if dob.After(thirteenYearsAgo) {
		return &ValidationError{Field: "date_of_birth", Message: "must be at least 13 years old"}
	}
	
	// Check if date is not in the future
	if dob.After(time.Now()) {
		return &ValidationError{Field: "date_of_birth", Message: "cannot be in the future"}
	}
	
	return nil
}

func ValidateOptionalString(value string, maxLength int, fieldName string) *ValidationError {
	if value != "" && len(value) > maxLength {
		return &ValidationError{Field: fieldName, Message: fmt.Sprintf("must be less than %d characters", maxLength)}
	}
	return nil
}

