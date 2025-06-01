'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from './LoginForm.module.css'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const router = useRouter()

  const handleSubmit = (e) => {
    e.preventDefault()
    // Simple validation - in a real app, you'd authenticate with a backend
    if (email && password) {
      // Redirect to feed page
      router.push('/feed')
    }
  }

  return (
    <form className={styles.loginForm} onSubmit={handleSubmit}>
      <div className="form-group">
        <label className="form-label" htmlFor="email">Email</label>
        <input 
          type="email" 
          id="email" 
          className="form-input" 
          placeholder="Enter your email" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
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
          required 
        />
      </div>
      <button type="submit" className={styles.btnLogin}>Sign In</button>
      <div className={styles.loginFooter}>
        Don&apos;t have an account? <Link href="/register" className={styles.loginLink}>Sign up</Link>
      </div>
    </form>
  )
}
