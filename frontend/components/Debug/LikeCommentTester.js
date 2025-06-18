'use client'

import { useState } from 'react'

export default function LikeCommentTester() {
  const [results, setResults] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
  const testPostId = 16

  const likeEndpoints = [
    // Try different like URL patterns
    { name: 'Like - /api/like/{id}', method: 'POST', url: `/api/like/${testPostId}` },
    { name: 'Like - /api/posts/{id}/like', method: 'POST', url: `/api/posts/${testPostId}/like` },
    { name: 'Like - /api/like', method: 'POST', url: `/api/like`, body: { post_id: testPostId } },
    { name: 'Like - /api/posts/like', method: 'POST', url: `/api/posts/like`, body: { post_id: testPostId } },
    
    // Get like status
    { name: 'Like Status - /api/posts/{id}/likes', method: 'GET', url: `/api/posts/${testPostId}/likes` },
    { name: 'Like Status - /api/like/status/{id}', method: 'GET', url: `/api/like/status/${testPostId}` },
    { name: 'Like Status - /api/posts/like-status/{id}', method: 'GET', url: `/api/posts/like-status/${testPostId}` },
  ]

  const commentEndpoints = [
    // Try different comment creation patterns
    { name: 'Create Comment - /api/comments', method: 'POST', url: `/api/comments`, body: { post_id: testPostId, content: 'test comment' } },
    { name: 'Create Comment - /api/posts/{id}/comment', method: 'POST', url: `/api/posts/${testPostId}/comment`, body: { content: 'test comment' } },
    { name: 'Create Comment - /api/comment', method: 'POST', url: `/api/comment`, body: { post_id: testPostId, content: 'test comment' } },
    
    // Try getting comments with different patterns
    { name: 'Get Comments - /api/comments/{id}', method: 'GET', url: `/api/comments/${testPostId}` },
    { name: 'Get Comments - /api/posts/{id}/comments', method: 'GET', url: `/api/posts/${testPostId}/comments` },
  ]

  const testEndpoints = async (endpoints) => {
    const newResults = {}
    
    for (const endpoint of endpoints) {
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
    
    setResults(prev => ({ ...prev, ...newResults }))
  }

  const testAllLikes = async () => {
    setIsLoading(true)
    await testEndpoints(likeEndpoints)
    setIsLoading(false)
  }

  const testAllComments = async () => {
    setIsLoading(true)
    await testEndpoints(commentEndpoints)
    setIsLoading(false)
  }

  const testAll = async () => {
    setIsLoading(true)
    await testEndpoints([...likeEndpoints, ...commentEndpoints])
    setIsLoading(false)
  }

  return (
    <div style={{ padding: '20px', background: '#fff3cd', margin: '20px', borderRadius: '8px', fontFamily: 'monospace' }}>
      <h3>🔍 Like & Comment Endpoint Finder</h3>
      <p>Testing different URL patterns to find working endpoints</p>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={testAllLikes}
          disabled={isLoading}
          style={{ padding: '8px 16px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', marginRight: '10px' }}
        >
          {isLoading ? '🔄 Testing...' : '❤️ Test Likes'}
        </button>
        
        <button 
          onClick={testAllComments}
          disabled={isLoading}
          style={{ padding: '8px 16px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', marginRight: '10px' }}
        >
          {isLoading ? '🔄 Testing...' : '💬 Test Comments'}
        </button>
        
        <button 
          onClick={testAll}
          disabled={isLoading}
          style={{ padding: '8px 16px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          {isLoading ? '🔄 Testing...' : '🧪 Test All'}
        </button>
      </div>

      <div style={{ display: 'grid', gap: '10px' }}>
        {[...likeEndpoints, ...commentEndpoints].map((endpoint, index) => {
          const result = results[endpoint.name]
          
          return (
            <div key={index} style={{ 
              background: result?.success ? '#d4edda' : result ? '#f8d7da' : 'white', 
              padding: '10px', 
              borderRadius: '4px', 
              border: '1px solid #ddd',
              fontSize: '12px'
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                {endpoint.name}
              </div>
              
              <div style={{ color: '#666', marginBottom: '5px' }}>
                <strong>{endpoint.method}</strong> {endpoint.url}
                {endpoint.body && (
                  <div>Body: {JSON.stringify(endpoint.body)}</div>
                )}
              </div>
              
              {result && (
                <div>
                  <div style={{ 
                    color: result.success ? 'green' : 'red',
                    fontWeight: 'bold',
                    marginBottom: '3px'
                  }}>
                    Status: {result.status} {result.statusText}
                  </div>
                  {result.response && (
                    <div style={{ 
                      background: '#f8f9fa', 
                      padding: '5px', 
                      borderRadius: '3px', 
                      overflow: 'auto', 
                      maxHeight: '80px',
                      fontSize: '10px'
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
    </div>
  )
}