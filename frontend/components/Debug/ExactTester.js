'use client'

import { useState } from 'react'

export default function ExactTester() {
  const [result, setResult] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

  const testExactEndpoint = async (url, method = 'POST', body = null) => {
    setIsLoading(true)
    try {
      const options = {
        method,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      }
      
      if (body) {
        options.body = JSON.stringify(body)
      }
      
      const response = await fetch(`${API_URL}${url}`, options)
      const text = await response.text()
      
      setResult(`
URL: ${url}
Method: ${method}
Status: ${response.status} ${response.statusText}
Response: ${text}
Cookies: ${document.cookie}
      `)
    } catch (error) {
      setResult(`Error: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{ padding: '20px', background: '#e7f3ff', margin: '20px', borderRadius: '8px', fontFamily: 'monospace' }}>
      <h3>🎯 Exact Endpoint Tester</h3>
      <p>Test specific endpoints to verify exact behavior</p>
      
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button 
          onClick={() => testExactEndpoint('/api/posts/like/16', 'POST')}
          disabled={isLoading}
          style={{ padding: '8px 12px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          Like Post 16
        </button>
        
        <button 
          onClick={() => testExactEndpoint('/api/posts/unlike/16', 'DELETE')}
          disabled={isLoading}
          style={{ padding: '8px 12px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          Unlike Post 16
        </button>
        
        <button 
          onClick={() => testExactEndpoint('/api/posts/comment/16', 'POST', { content: 'Test comment from frontend' })}
          disabled={isLoading}
          style={{ padding: '8px 12px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          Comment on Post 16
        </button>
        
        <button 
          onClick={() => testExactEndpoint('/api/posts/comments/16', 'GET')}
          disabled={isLoading}
          style={{ padding: '8px 12px', background: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          Get Comments 16
        </button>
        
        <button 
          onClick={() => testExactEndpoint('/api/posts/like-status/16', 'GET')}
          disabled={isLoading}
          style={{ padding: '8px 12px', background: '#ffc107', color: 'black', border: 'none', borderRadius: '4px' }}
        >
          Like Status 16
        </button>
      </div>

      {result && (
        <div style={{ 
          background: 'white', 
          padding: '15px', 
          borderRadius: '4px', 
          border: '1px solid #ddd',
          whiteSpace: 'pre-wrap',
          fontSize: '12px'
        }}>
          {result}
        </div>
      )}
      
      {isLoading && (
        <div style={{ textAlign: 'center', color: '#007bff' }}>
          🔄 Testing endpoint...
        </div>
      )}
    </div>
  )
}