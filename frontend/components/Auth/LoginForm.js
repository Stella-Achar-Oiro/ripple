'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '../../contexts/AuthContext'
import styles from './LoginForm.module.css'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const { login } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Reset error state
    setError('')

    // Basic validation
    if (!email || !password) {
      setError('Email and password are required')
      return
    }

    setIsLoading(true)

    try {
      const result = await login(email, password)

      if (result.success) {
        // Login successful - redirect to feed page
        router.push('/feed')
      } else {
        setError(result.error || 'An error occurred during login')
      }
    } catch (err) {
      setError(err.message || 'An error occurred during login')
      console.error('Login error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form className={styles.loginForm} onSubmit={handleSubmit}>
      {error && (
        <div className={styles.errorMessage}>{error}</div>
      )}
      
      <div className={styles.formGroup}>
        <label className={styles.formLabel} htmlFor="email">Email Address</label>
        <input 
          type="email" 
          id="email" 
          className={styles.formInput} 
          placeholder="Enter your email address" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
          required 
        />
      </div>
      
      <div className={styles.formGroup}>
        <label className={styles.formLabel} htmlFor="password">Password</label>
        <input 
          type="password" 
          id="password" 
          className={styles.formInput} 
          placeholder="Enter your password" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
          required 
        />
      </div>

      <div className={styles.forgotPassword}>
        <a href="#" className={styles.forgotPasswordLink}>Forgot your password?</a>
      </div>
      
      <button 
        type="submit" 
        className={styles.btnLogin}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <span className="pulse">Signing in...</span>
          </>
        ) : (
          'Sign In'
        )}
      </button>
      
      <div className={styles.loginFooter}>
        New to Ripple? <Link href="/register" className={styles.loginLink}>Join now</Link>
      </div>
    </form>
  )
}
