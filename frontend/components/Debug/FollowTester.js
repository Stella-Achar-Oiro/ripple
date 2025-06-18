'use client'

import { useState } from 'react'

export default function FollowTester() {
  const [results, setResults] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
  const testUserId = 2 // Test with user ID 2

  const testEndpoints = [
    // Follow endpoints based on backend analysis
    { name: 'Follow User', method: 'POST', url: '/api/follow', body: { user_id: testUserId } },
    { name: 'Unfollow User', method: 'POST', url: '/api/unfollow', body: { user_id: testUserId } },
    { name: 'Follow Status', method: 'GET', url: `/api/follow/status/${testUserId}` },
    { name: 'Follow Requests', method: 'GET', url: '/api/follow/requests' },
    { name: 'Follow Stats', method: 'GET', url: `/api/follow/stats/${testUserId}` },
  ]

  const testAllFollows = async () => {
    setIsLoading(true)
    const newResults = {}
    
    for (const endpoint of testEndpoints) {
      try {
        const options = {
          method: endpoint.method,
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include'
        }
        
        if (endpoint.body) {
          options.body = JSON.stringify(endpoint.body)
        }
        
        const response = await fetch(`${API_URL}${endpoint.url}`, options)
        const text = await response.text()
        
        let data
        try {
          data = JSON.parse(text)
        } catch {
          data = text
        }
        
        newResults[endpoint.name] = {
          status: response.status,
          statusText: response.statusText,
          response: data,
          success: response.ok,
          url: endpoint.url,
          method: endpoint.method
        }
      } catch (error) {
        newResults[endpoint.name] = {
          status: 'ERROR',
          statusText: error.message,
          response: '',
          success: false,
          url: endpoint.url,
          method: endpoint.method
        }
      }
    }
    
    setResults(newResults)
    setIsLoading(false)
  }

  return (
    <div style={{ padding: '20px', background: '#fff0f5', margin: '20px', borderRadius: '8px', fontFamily: 'monospace' }}>
      <h3>👥 Follow System Tester</h3>
      <p>Testing follow/unfollow endpoints with corrected API calls</p>
      
      <button 
        onClick={testAllFollows}
        disabled={isLoading}
        style={{ padding: '10px 20px', background: '#e91e63', color: 'white', border: 'none', borderRadius: '4px', marginBottom: '20px' }}
      >
        {isLoading ? '🔄 Testing Follow System...' : '👥 Test Follow Endpoints'}
      </button>

      <div style={{ display: 'grid', gap: '10px' }}>
        {testEndpoints.map((endpoint, index) => {
          const result = results[endpoint.name]
          
          return (
            <div key={index} style={{ 
              background: result?.success ? '#d4edda' : result?.status === 'ERROR' ? '#f8d7da' : result ? '#fff3cd' : 'white', 
              padding: '12px', 
              borderRadius: '6px', 
              border: '1px solid #ddd',
              fontSize: '12px'
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '8px', color: result?.success ? '#155724' : '#721c24' }}>
                {endpoint.name}
              </div>
              
              <div style={{ color: '#666', marginBottom: '8px' }}>
                <strong>{endpoint.method}</strong> {endpoint.url}
                {endpoint.body && (
                  <div>Body: {JSON.stringify(endpoint.body)}</div>
                )}
              </div>
              
              {result && (
                <div>
                  <div style={{ 
                    color: result.success ? '#155724' : result.status === 'ERROR' ? '#721c24' : '#856404',
                    fontWeight: 'bold',
                    marginBottom: '5px'
                  }}>
                    Status: {result.status} {result.statusText}
                  </div>
                  {result.response && (
                    <div style={{ 
                      background: '#f8f9fa', 
                      padding: '8px', 
                      borderRadius: '4px', 
                      overflow: 'auto', 
                      maxHeight: '100px',
                      fontSize: '11px',
                      wordBreak: 'break-all'
                    }}>
                      {typeof result.response === 'object' 
                        ? JSON.stringify(result.response, null, 2)
                        : result.response
                      }
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
      
      {Object.keys(results).length > 0 && (
        <div style={{ marginTop: '20px', padding: '15px', background: '#e7f3ff', borderRadius: '6px' }}>
          <h4>📋 Follow System Status:</h4>
          <div style={{ fontSize: '12px' }}>
            <strong>✅ Working:</strong> {Object.entries(results).filter(([k, v]) => v.success).map(([k]) => k).join(', ') || 'None'}
            <br />
            <strong>❌ Failed:</strong> {Object.entries(results).filter(([k, v]) => !v.success && v.status !== 'ERROR').length}
            <br />
            <strong>🔥 Errors:</strong> {Object.entries(results).filter(([k, v]) => v.status === 'ERROR').length}
          </div>
        </div>
      )}
    </div>
  )
}