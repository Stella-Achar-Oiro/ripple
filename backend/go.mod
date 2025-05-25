// backend/go.mod
module ripple

go 1.23.0

toolchain go1.24.2

require (
	github.com/golang-migrate/migrate/v4 v4.16.2
	github.com/mattn/go-sqlite3 v1.14.17
)

require github.com/gorilla/websocket v1.5.3

require github.com/google/uuid v1.6.0 // indirect

require (
	github.com/hashicorp/errwrap v1.1.0 // indirect
	github.com/hashicorp/go-multierror v1.1.1 // indirect
	go.uber.org/atomic v1.7.0 // indirect
	golang.org/x/crypto v0.38.0
)
