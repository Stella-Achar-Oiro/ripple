'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import RegisterForm from '../../components/Auth/RegisterForm'
import styles from '../page.module.css'

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const router = useRouter()
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        const response = await fetch(`${API_URL}/api/auth/profile`, {
          credentials: 'include'
        })

        if (response.ok) {
          // User is authenticated, redirect to feed
          setIsAuthenticated(true)
          router.push('/feed')
          return
        }

        // User is not authenticated, show register form
        setIsAuthenticated(false)
      } catch (error) {
        console.error('Authentication check failed:', error)
        // On error, assume not authenticated
        setIsAuthenticated(false)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuthentication()
  }, [router, API_URL])

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className={styles.loginContainer}>
        <div className={styles.registerCard}>
          <div className={styles.loginHeader}>
            <h1 className={styles.loginTitle}>Ripple</h1>
            <p className={styles.loginSubtitle}>Join your world</p>
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '40px 0'
          }}>
            <div style={{
              border: '4px solid rgba(0, 0, 0, 0.1)',
              borderRadius: '50%',
              borderTop: '4px solid #3498db',
              width: '40px',
              height: '40px',
              animation: 'spin 1s linear infinite'
            }}></div>
            <style jsx>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        </div>
      </div>
    )
  }

  // Don't render register form if user is authenticated (they're being redirected)
  if (isAuthenticated) {
    return null
  }

  // Show register form for unauthenticated users
  return (
    <div className={styles.loginContainer}>
      <div className={styles.registerCard}>
        <div className={styles.loginHeader}>
          <h1 className={styles.loginTitle}>Ripple</h1>
          <p className={styles.loginSubtitle}>Join your world</p>
        </div>
        <RegisterForm />
      </div>
    </div>
  )
}
