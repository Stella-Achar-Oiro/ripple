// backend/pkg/utils/file.go
package utils

import (
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"ripple/pkg/constants"
	"strings"
	"time"
)

var allowedMediaTypes = map[string]bool{
	"image/jpeg":      true,
	"image/jpg":       true,
	"image/png":       true,
	"image/gif":       true,
	"video/mp4":       true,
	"video/webm":      true,
	"video/quicktime": true,
}

func SaveUploadedFile(file multipart.File, header *multipart.FileHeader, uploadDir string, maxSize int64) (string, error) {
	// Validate file size
	if header.Size > maxSize {
		return "", fmt.Errorf(constants.ErrFileTooLarge)
	}

	// Validate file type
	contentType := header.Header.Get("Content-Type")
	if !allowedMediaTypes[contentType] {
		return "", fmt.Errorf(constants.ErrInvalidFileType)
	}

	// Generate unique filename
	ext := filepath.Ext(header.Filename)
	filename := fmt.Sprintf("%d_%s%s", time.Now().Unix(), generateRandomString(8), ext)

	// Create full path
	fullPath := filepath.Join(uploadDir, filename)

	// Create directory if it doesn't exist
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		return "", fmt.Errorf("failed to create upload directory: %w", err)
	}

	// Create destination file
	dst, err := os.Create(fullPath)
	if err != nil {
		return "", fmt.Errorf("failed to create file: %w", err)
	}
	defer dst.Close()

	// Copy file content
	if _, err := io.Copy(dst, file); err != nil {
		return "", fmt.Errorf("failed to save file: %w", err)
	}

	return filename, nil
}

func generateRandomString(length int) string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	result := make([]byte, length)
	for i := range result {
		result[i] = charset[time.Now().UnixNano()%int64(len(charset))]
	}
	return string(result)
}

func GetFileExtension(filename string) string {
	return strings.ToLower(filepath.Ext(filename))
}

func IsValidMediaType(contentType string) bool {
	return allowedMediaTypes[contentType]
}
