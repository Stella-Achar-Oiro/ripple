// backend/pkg/utils/time.go
package utils

import (
	"time"
)

func FormatTimeISO(t time.Time) string {
	return t.Format(time.RFC3339)
}

func ParseDateOnly(dateStr string) (time.Time, error) {
	return time.Parse("2006-01-02", dateStr)
}

func IsExpired(expiryTime time.Time) bool {
	return time.Now().After(expiryTime)
}