'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { redirect } from 'next/navigation'

export default function ProfileIndexPage() {
  const router = useRouter()
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
  
  useEffect(() => {
    const redirectToUserProfile = async () => {
      try {
        // Get current user profile
        const response = await fetch(`${API_URL}/api/auth/profile`, {
          credentials: 'include'
        })
        // console.log(response)
        
        if (!response.ok) {
          // If not authenticated, redirect to login
          if (response.status === 401) {
            router.push('/')
            return
          }
          throw new Error('Failed to fetch user profile')
        }
        
        const userData = await response.json()
        
        // Redirect to the user's profile page
        router.push(`/profile/${userData.data.id}`)
      } catch (err) {
        console.error('Error fetching user profile:', err)
        // On error, redirect to login
        router.push('/')
      }
    }
    
    redirectToUserProfile()
  }, [router, API_URL])
  
  // Show loading state while redirecting
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh' 
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          border: '4px solid rgba(0, 0, 0, 0.1)',
          borderRadius: '50%',
          borderTop: '4px solid #3498db',
          width: '40px',
          height: '40px',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 16px'
        }}></div>
        <p>Loading your profile...</p>
        
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  )
}