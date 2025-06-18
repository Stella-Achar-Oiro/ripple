'use client'

import { useState } from 'react'

export default function BackendTester() {
  const [results, setResults] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

  // Test different URL patterns based on the backend parsing bug
  const testPatterns = [
    // If backend expects ID at pathParts[3], test these patterns:
    { name: 'Pattern 1: /api/posts/16', method: 'POST', url: '/api/posts/16' },
    { name: 'Pattern 2: /api/posts/16/like', method: 'POST', url: '/api/posts/16/like' },
    
    // Test comment patterns
    { name: 'Comment 1: /api/posts/16', method: 'GET', url: '/api/posts/16' },
    { name: 'Comment 2: /api/posts/16/comments', method: 'GET', url: '/api/posts/16/comments' },
    
    // Test if the backend has different endpoints
    { name: 'Like Alt: /api/like/16', method: 'POST', url: '/api/like/16' },
    { name: 'Comment Alt: /api/comments/16', method: 'GET', url: '/api/comments/16' },
  ]

  const testAllPatterns = async () => {
    setIsLoading(true)
    const newResults = {}
    
    for (const pattern of testPatterns) {
      try {
        const response = await fetch(`${API_URL}${pattern.url}`, {
          method: pattern.method,
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include'
        })
        
        const text = await response.text()
        let data
        try {
          data = JSON.parse(text)
        } catch {
          data = text
        }
        
        newResults[pattern.name] = {
          status: response.status,
          statusText: response.statusText,
          response: data,
          success: response.ok,
          url: pattern.url
        }
      } catch (error) {
        newResults[pattern.name] = {
          status: 'ERROR',
          statusText: error.message,
          response: '',
          success: false,
          url: pattern.url
        }
      }
    }
    
    setResults(newResults)
    setIsLoading(false)
  }

  return (
    <div style={{ padding: '20px', background: '#f0fff0', margin: '20px', borderRadius: '8px', fontFamily: 'monospace' }}>
      <h3>🧪 Backend URL Pattern Tester</h3>
      <p>Testing different URL patterns to find what actually works with the backend parsing</p>
      
      <button 
        onClick={testAllPatterns}
        disabled={isLoading}
        style={{ padding: '10px 20px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', marginBottom: '20px' }}
      >
        {isLoading ? '🔄 Testing Patterns...' : '🧪 Test All URL Patterns'}
      </button>

      <div style={{ display: 'grid', gap: '10px' }}>
        {testPatterns.map((pattern, index) => {
          const result = results[pattern.name]
          
          return (
            <div key={index} style={{ 
              background: result?.success ? '#d4edda' : result?.status === 'ERROR' ? '#f8d7da' : result ? '#fff3cd' : 'white', 
              padding: '12px', 
              borderRadius: '6px', 
              border: '1px solid #ddd',
              fontSize: '12px'
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '8px', color: result?.success ? '#155724' : '#721c24' }}>
                {pattern.name}
              </div>
              
              <div style={{ color: '#666', marginBottom: '8px' }}>
                <strong>{pattern.method}</strong> {pattern.url}
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
          <h4>📋 Summary:</h4>
          <div style={{ fontSize: '12px' }}>
            <strong>✅ Working patterns:</strong> {Object.entries(results).filter(([k, v]) => v.success).map(([k]) => k).join(', ') || 'None found'}
            <br />
            <strong>❌ Failed patterns:</strong> {Object.entries(results).filter(([k, v]) => !v.success && v.status !== 'ERROR').length}
            <br />
            <strong>🔥 Error patterns:</strong> {Object.entries(results).filter(([k, v]) => v.status === 'ERROR').length}
          </div>
        </div>
      )}
    </div>
  )
}