'use client'

import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'

export default function AuthDetailer() {
  const [testResults, setTestResults] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const { user } = useAuth()
  
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

  const runDiagnostics = async () => {
    setIsLoading(true)
    const results = {}

    try {
      // Test 1: Check browser cookies
      results.cookies = {
        all: document.cookie,
        sessionCookie: document.cookie.split(';').find(c => c.trim().startsWith('session_token=')),
        count: document.cookie.split(';').length
      }

      // Test 2: Test auth endpoint
      const authResponse = await fetch(`${API_URL}/api/auth/profile`, {
        credentials: 'include'
      })
      results.authTest = {
        status: authResponse.status,
        statusText: authResponse.statusText,
        headers: Object.fromEntries(authResponse.headers.entries()),
        body: await authResponse.text()
      }

      // Test 3: Test simple like endpoint with full headers
      const likeResponse = await fetch(`${API_URL}/api/posts/like/16`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include'
      })
      results.likeTest = {
        status: likeResponse.status,
        statusText: likeResponse.statusText,
        headers: Object.fromEntries(likeResponse.headers.entries()),
        body: await likeResponse.text()
      }

      // Test 4: Test with explicit cookie
      const sessionCookie = document.cookie.split(';').find(c => c.trim().startsWith('session_token='))
      if (sessionCookie) {
        const cookieValue = sessionCookie.split('=')[1]
        const explicitCookieResponse = await fetch(`${API_URL}/api/posts/like/16`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': `session_token=${cookieValue}`
          }
        })
        results.explicitCookieTest = {
          status: explicitCookieResponse.status,
          statusText: explicitCookieResponse.statusText,
          body: await explicitCookieResponse.text(),
          cookieUsed: `session_token=${cookieValue}`
        }
      }

    } catch (error) {
      results.error = error.message
    }

    setTestResults(results)
    setIsLoading(false)
  }

  return (
    <div style={{ padding: '20px', background: '#fff5f5', margin: '20px', borderRadius: '8px', fontFamily: 'monospace' }}>
      <h3>🩺 Authentication Diagnostics</h3>
      
      <div style={{ marginBottom: '15px' }}>
        <strong>Current User:</strong> {user ? `${user.first_name} ${user.last_name} (ID: ${user.id})` : 'Not logged in'}
      </div>

      <button 
        onClick={runDiagnostics}
        disabled={isLoading}
        style={{ padding: '10px 20px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', marginBottom: '20px' }}
      >
        {isLoading ? '🔄 Running Diagnostics...' : '🩺 Run Full Diagnostics'}
      </button>

      {Object.keys(testResults).length > 0 && (
        <div style={{ background: 'white', padding: '15px', borderRadius: '4px', border: '1px solid #ddd' }}>
          <h4>📋 Diagnostic Results:</h4>
          
          {testResults.cookies && (
            <div style={{ marginBottom: '15px' }}>
              <strong>🍪 Browser Cookies:</strong>
              <pre style={{ background: '#f8f9fa', padding: '8px', fontSize: '11px', overflow: 'auto' }}>
                Count: {testResults.cookies.count}
                Session Cookie: {testResults.cookies.sessionCookie || 'NOT FOUND'}
                All Cookies: {testResults.cookies.all || 'NONE'}
              </pre>
            </div>
          )}

          {testResults.authTest && (
            <div style={{ marginBottom: '15px' }}>
              <strong>🔐 Auth Profile Test:</strong>
              <pre style={{ background: '#f8f9fa', padding: '8px', fontSize: '11px', overflow: 'auto' }}>
                Status: {testResults.authTest.status} {testResults.authTest.statusText}
                Response: {testResults.authTest.body}
              </pre>
            </div>
          )}

          {testResults.likeTest && (
            <div style={{ marginBottom: '15px' }}>
              <strong>❤️ Like Endpoint Test:</strong>
              <pre style={{ background: '#f8f9fa', padding: '8px', fontSize: '11px', overflow: 'auto' }}>
                Status: {testResults.likeTest.status} {testResults.likeTest.statusText}
                Response: {testResults.likeTest.body}
                Headers: {JSON.stringify(testResults.likeTest.headers, null, 2)}
              </pre>
            </div>
          )}

          {testResults.explicitCookieTest && (
            <div style={{ marginBottom: '15px' }}>
              <strong>🍪 Explicit Cookie Test:</strong>
              <pre style={{ background: '#f8f9fa', padding: '8px', fontSize: '11px', overflow: 'auto' }}>
                Status: {testResults.explicitCookieTest.status} {testResults.explicitCookieTest.statusText}
                Response: {testResults.explicitCookieTest.body}
                Cookie Used: {testResults.explicitCookieTest.cookieUsed}
              </pre>
            </div>
          )}

          {testResults.error && (
            <div style={{ marginBottom: '15px' }}>
              <strong>❌ Error:</strong>
              <pre style={{ background: '#f8d7da', padding: '8px', fontSize: '11px', color: '#721c24' }}>
                {testResults.error}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}