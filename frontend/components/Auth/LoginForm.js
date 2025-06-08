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
      
      <div className="form-group">
        <label className="form-label" htmlFor="email">Email</label>
        <input 
          type="email" 
          id="email" 
          className="form-input" 
          placeholder="Enter your email" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
          required 
        />
      </div>
      
      <div className="form-group">
        <label className="form-label" htmlFor="password">Password</label>
        <input 
          type="password" 
          id="password" 
          className="form-input" 
          placeholder="Enter your password" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
          required 
        />
      </div>
      
      <button 
        type="submit" 
        className={styles.btnLogin}
        disabled={isLoading}
      >
        {isLoading ? 'Signing in...' : 'Sign In'}
      </button>
      
      <div className={styles.loginFooter}>
        Don&apos;t have an account? <Link href="/register" className={styles.loginLink}>Sign up</Link>
      </div>
    </form>
  )
}
