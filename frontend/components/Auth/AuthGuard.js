'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../contexts/AuthContext'

export default function AuthGuard({ children }) {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      // Wait for auth context to finish loading
      if (isLoading) {
        return
      }

      // If no user after loading completes, redirect to login
      if (!user) {
        console.log('No authenticated user found, redirecting to login')
        router.push('/')
        return
      }

      setIsChecking(false)
    }

    checkAuth()
  }, [user, isLoading, router])

  // Show loading while checking authentication
  if (isLoading || isChecking) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'var(--background)',
        color: 'var(--text-primary)'
      }}>
        <div style={{
          textAlign: 'center'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid var(--border)',
            borderTop: '3px solid var(--primary-purple)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p>Loading...</p>
        </div>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  // If we have a user, render the protected content
  if (user) {
    return children
  }

  // This shouldn't be reached due to the redirect above, but just in case
  return null
}