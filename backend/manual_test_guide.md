# Manual Testing Guide for Session Issues

## Quick Manual Test

1. **Start the server:**
   ```bash
   cd backend
   go run server.go
   ```

2. **Open two terminal windows and test step by step:**

   **Terminal 1 - Register:**
   ```bash
   curl -c cookies.txt -X POST http://localhost:8080/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "email": "manual@example.com",
       "password": "password123",
       "first_name": "Manual",
       "last_name": "Test",
       "date_of_birth": "1990-01-01"
     }'
   ```

   **Terminal 1 - Check cookies:**
   ```bash
   cat cookies.txt
   ```

   **Terminal 1 - Test profile access:**
   ```bash
   curl -b cookies.txt -X GET http://localhost:8080/api/user/profile
   ```

3. **If profile access fails, try login:**
   ```bash
   curl -c cookies.txt -X POST http://localhost:8080/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{
       "email": "manual@example.com",
       "password": "password123"
     }'
   ```

   **Then test profile again:**
   ```bash
   curl -b cookies.txt -X GET http://localhost:8080/api/user/profile
   ```

## Expected Behavior

- Registration should set a session cookie
- Profile access should work immediately after registration
- If not, it should definitely work after login

## Debugging Steps

1. **Check if sessions are being created:**
   ```bash
   sqlite3 data/ripple.db "SELECT * FROM sessions;"
   ```

2. **Check if users are being created:**
   ```bash
   sqlite3 data/ripple.db "SELECT id, email, first_name FROM users;"
   ```

3. **Check server logs for errors**

4. **Verify cookie format** - should look like:
   ```
   # Netscape HTTP Cookie File
   localhost	FALSE	/	FALSE	1748064000	session_id	abc123def456...
   ```
