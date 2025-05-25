// backend/pkg/constants/errors.go
package constants

const (
	// Authentication errors
	ErrInvalidCredentials = "invalid email or password"
	ErrUserNotFound      = "user not found"
	ErrEmailExists       = "email already exists"
	ErrUnauthorized      = "unauthorized access"
	ErrSessionExpired    = "session expired"

	// Validation errors
	ErrInvalidEmail      = "invalid email format"
	ErrPasswordTooShort  = "password must be at least 8 characters"
	ErrRequiredField     = "this field is required"
	ErrInvalidFileType   = "file type not supported"
	ErrFileTooLarge      = "file size exceeds limit"

	// Business logic errors
	ErrCannotFollowSelf    = "cannot follow yourself"
	ErrAlreadyFollowing    = "already following this user"
	ErrNotFollowing        = "not following this user"
	ErrCannotMessageUser   = "cannot send message to this user"
	ErrNotGroupMember      = "not a member of this group"
	ErrInsufficientPermissions = "insufficient permissions"
)
