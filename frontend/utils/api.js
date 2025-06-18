/**
 * Utility functions for API calls with consistent error handling
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

/**
 * Make an authenticated API request with consistent error handling
 * @param {string} endpoint - API endpoint (without base URL)
 * @param {object} options - Fetch options
 * @returns {Promise<object>} - Response data or throws error
 */
export async function apiRequest(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`
  
  const defaultOptions = {
    credentials: 'include',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...options.headers
    }
  }

  const finalOptions = { ...defaultOptions, ...options }

  try {
    const response = await fetch(url, finalOptions)
    
    if (!response.ok) {
      // Try to get error message from response
      let errorMessage = `HTTP ${response.status}`
      try {
        const errorData = await response.json()
        errorMessage = errorData.message || errorData.error || errorMessage
      } catch {
        // If response is not JSON, use status text
        errorMessage = response.statusText || errorMessage
      }
      
      const error = new Error(errorMessage)
      error.status = response.status
      error.response = response
      throw error
    }

    return await response.json()
  } catch (error) {
    // Log the error for debugging
    console.error(`API Error [${finalOptions.method || 'GET'} ${url}]:`, error)
    
    // Re-throw with additional context
    if (error.status) {
      throw error
    }
    
    // Network or other errors
    const networkError = new Error(`Network error: ${error.message}`)
    networkError.original = error
    throw networkError
  }
}

/**
 * Helper for GET requests
 */
export async function apiGet(endpoint, options = {}) {
  return apiRequest(endpoint, { ...options, method: 'GET' })
}

/**
 * Helper for POST requests
 */
export async function apiPost(endpoint, data, options = {}) {
  return apiRequest(endpoint, {
    ...options,
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined
  })
}

/**
 * Helper for PUT requests
 */
export async function apiPut(endpoint, data, options = {}) {
  return apiRequest(endpoint, {
    ...options,
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined
  })
}

/**
 * Helper for DELETE requests
 */
export async function apiDelete(endpoint, options = {}) {
  return apiRequest(endpoint, { ...options, method: 'DELETE' })
}

/**
 * Check if error is an authentication error
 */
export function isAuthError(error) {
  return error?.status === 401
}

/**
 * Check if error is a not found error
 */
export function isNotFoundError(error) {
  return error?.status === 404
}

/**
 * Check if error is a validation error
 */
export function isValidationError(error) {
  return error?.status === 400
}

/**
 * Extract error message from error object
 */
export function getErrorMessage(error) {
  if (typeof error === 'string') return error
  if (error?.message) return error.message
  return 'An unexpected error occurred'
}