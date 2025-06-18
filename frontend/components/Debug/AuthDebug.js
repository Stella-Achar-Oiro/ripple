'use client'

import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'

export default function AuthDebug() {
  const { user, isAuthenticated, isLoading, checkAuth } = useAuth()
  const [testResult, setTestResult] = useState('')
  const [isTestingAPI, setIsTestingAPI] = useState(false)

  const testAPIEndpoint = async () => {
    setIsTestingAPI(true)
    setTestResult('')
    
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
      
      // Test auth profile endpoint
      const authResponse = await fetch(`${API_URL}/api/auth/profile`, {
        credentials: 'include'
      })
      
      const authData = await authResponse.json()
      
      // Test posts feed endpoint
      const postsResponse = await fetch(`${API_URL}/api/posts/feed`, {
        credentials: 'include'
      })
      
      const postsData = await postsResponse.json()
      
      setTestResult(`
Auth Status: ${authResponse.status}
Auth Response: ${JSON.stringify(authData, null, 2)}

Posts Status: ${postsResponse.status}  
Posts Response: ${JSON.stringify(postsData, null, 2)}
      `)
      
    } catch (error) {
      setTestResult(`Error: ${error.message}`)
    } finally {
      setIsTestingAPI(false)
    }
  }

  if (isLoading) {
    return <div style={{ padding: '20px', background: '#f0f0f0', margin: '20px', borderRadius: '8px' }}>
      <h3>🔍 Auth Debug Panel</h3>
      <p>Loading authentication state...</p>
    </div>
  }

  return (
    <div style={{ padding: '20px', background: '#f0f0f0', margin: '20px', borderRadius: '8px', fontFamily: 'monospace' }}>
      <h3>🔍 Auth Debug Panel</h3>
      
      <div style={{ marginBottom: '15px' }}>
        <strong>Authentication Status:</strong>
        <div style={{ color: isAuthenticated ? 'green' : 'red' }}>
          {isAuthenticated ? '✅ Authenticated' : '❌ Not Authenticated'}
        </div>
      </div>
      
      <div style={{ marginBottom: '15px' }}>
        <strong>User Data:</strong>
        <pre style={{ background: 'white', padding: '10px', borderRadius: '4px', overflow: 'auto' }}>
          {user ? JSON.stringify(user, null, 2) : 'No user data'}
        </pre>
      </div>
      
      <div style={{ marginBottom: '15px' }}>
        <button 
          onClick={checkAuth}
          style={{ marginRight: '10px', padding: '8px 16px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          🔄 Refresh Auth
        </button>
        
        <button 
          onClick={testAPIEndpoint}
          disabled={isTestingAPI}
          style={{ padding: '8px 16px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          {isTestingAPI ? '🔄 Testing...' : '🧪 Test API'}
        </button>
      </div>
      
      {testResult && (
        <div style={{ marginTop: '15px' }}>
          <strong>API Test Results:</strong>
          <pre style={{ background: 'white', padding: '10px', borderRadius: '4px', overflow: 'auto', fontSize: '12px' }}>
            {testResult}
          </pre>
        </div>
      )}
    </div>
  )
}