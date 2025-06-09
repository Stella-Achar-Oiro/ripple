'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import RouteGuard from '../../components/Auth/RouteGuard'
import { useAuth } from '../../contexts/AuthContext'

export default function ProfileIndexPage() {
  const router = useRouter()
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      // Redirect to the user's profile page
      router.push(`/profile/${user.id}`)
    }
  }, [user, router])

  // Show loading state while redirecting
  return (
    <RouteGuard requireAuth={true}>
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
    </RouteGuard>
  )
}