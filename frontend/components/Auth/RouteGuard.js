'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../contexts/AuthContext'

const LoadingSpinner = () => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '100vh',
    flexDirection: 'column'
  }}>
    <div style={{
      border: '4px solid rgba(0, 0, 0, 0.1)',
      borderRadius: '50%',
      borderTop: '4px solid #3498db',
      width: '40px',
      height: '40px',
      animation: 'spin 1s linear infinite',
      marginBottom: '16px'
    }}></div>
    <p>Loading...</p>
    <style jsx>{`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
  </div>
)

export default function RouteGuard({ children, requireAuth = true }) {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading) {
      if (requireAuth && !isAuthenticated) {
        // User needs to be authenticated but isn't - redirect to login
        router.push('/')
      } else if (!requireAuth && isAuthenticated) {
        // User is authenticated but trying to access public route (login/register) - redirect to feed
        router.push('/feed')
      }
    }
  }, [isAuthenticated, isLoading, requireAuth, router])

  // Show loading spinner while checking authentication
  if (isLoading) {
    return <LoadingSpinner />
  }

  // For protected routes: only render if authenticated
  if (requireAuth && !isAuthenticated) {
    return <LoadingSpinner /> // Will redirect via useEffect
  }

  // For public routes (login/register): only render if not authenticated
  if (!requireAuth && isAuthenticated) {
    return <LoadingSpinner /> // Will redirect via useEffect
  }

  // Render the protected content
  return children
}
