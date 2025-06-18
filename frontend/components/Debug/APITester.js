'use client'

import { useState } from 'react'

export default function APITester() {
  const [results, setResults] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
  const testPostId = 16 // Use a known post ID from the errors

  const testEndpoints = [
    // Like endpoints to test
    { name: 'Like - Current', method: 'POST', url: `/api/posts/like/${testPostId}` },
    { name: 'Like - Alternative 1', method: 'POST', url: `/api/posts/${testPostId}/like` },
    { name: 'Like - Alternative 2', method: 'POST', url: `/api/posts/${testPostId}` },
    { name: 'Like - No Trailing', method: 'POST', url: `/api/posts/like${testPostId}` },
    
    // Comment endpoints to test  
    { name: 'Comments - Current', method: 'GET', url: `/api/posts/comments/${testPostId}` },
    { name: 'Comments - Alternative 1', method: 'GET', url: `/api/posts/${testPostId}/comments` },
    { name: 'Comments - Alternative 2', method: 'GET', url: `/api/posts/${testPostId}` },
    
    // Create comment endpoints
    { name: 'Create Comment - Current', method: 'POST', url: `/api/posts/comment/${testPostId}`, body: { content: 'test' } },
    { name: 'Create Comment - Alt 1', method: 'POST', url: `/api/posts/${testPostId}/comment`, body: { content: 'test' } },
    { name: 'Create Comment - Alt 2', method: 'POST', url: `/api/posts/${testPostId}/comments`, body: { content: 'test' } },
  ]

  const testAllEndpoints = async () => {
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
        const data = await response.text()
        
        newResults[endpoint.name] = {
          status: response.status,
          statusText: response.statusText,
          response: data,
          success: response.ok
        }
      } catch (error) {
        newResults[endpoint.name] = {
          status: 'ERROR',
          statusText: error.message,
          response: '',
          success: false
        }
      }
    }
    
    setResults(newResults)
    setIsLoading(false)
  }

  const testIndividual = async (endpoint) => {
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
      const data = await response.text()
      
      setResults(prev => ({
        ...prev,
        [endpoint.name]: {
          status: response.status,
          statusText: response.statusText,
          response: data,
          success: response.ok
        }
      }))
    } catch (error) {
      setResults(prev => ({
        ...prev,
        [endpoint.name]: {
          status: 'ERROR',
          statusText: error.message,
          response: '',
          success: false
        }
      }))
    }
  }

  return (
    <div style={{ padding: '20px', background: '#f8f9fa', margin: '20px', borderRadius: '8px', fontFamily: 'monospace' }}>
      <h3>🔧 API Endpoint Tester</h3>
      <p>Testing different URL patterns to find working endpoints</p>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={testAllEndpoints}
          disabled={isLoading}
          style={{ padding: '10px 20px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', marginRight: '10px' }}
        >
          {isLoading ? '🔄 Testing All...' : '🧪 Test All Endpoints'}
        </button>
      </div>

      <div style={{ display: 'grid', gap: '15px' }}>
        {testEndpoints.map((endpoint, index) => {
          const result = results[endpoint.name]
          
          return (
            <div key={index} style={{ background: 'white', padding: '15px', borderRadius: '6px', border: '1px solid #ddd' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <strong>{endpoint.name}</strong>
                <button 
                  onClick={() => testIndividual(endpoint)}
                  style={{ padding: '5px 10px', background: '#28a745', color: 'white', border: 'none', borderRadius: '3px', fontSize: '12px' }}
                >
                  Test
                </button>
              </div>
              
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                <strong>{endpoint.method}</strong> {endpoint.url}
                {endpoint.body && (
                  <div>Body: {JSON.stringify(endpoint.body)}</div>
                )}
              </div>
              
              {result && (
                <div style={{ fontSize: '11px' }}>
                  <div style={{ 
                    color: result.success ? 'green' : result.status === 'ERROR' ? 'red' : 'orange',
                    fontWeight: 'bold',
                    marginBottom: '5px'
                  }}>
                    Status: {result.status} {result.statusText}
                  </div>
                  {result.response && (
                    <div style={{ background: '#f8f9fa', padding: '8px', borderRadius: '3px', overflow: 'auto', maxHeight: '100px' }}>
                      {result.response}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}