'use client'

import RouteGuard from '../components/Auth/RouteGuard'
import LoginForm from '../components/Auth/LoginForm'
import styles from './page.module.css'

export default function LoginPage() {
  return (
    <RouteGuard requireAuth={false}>
      <div className={styles.loginContainer}>
        {/* Hero Section */}
        <div className={styles.loginHero}>
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>Ripple</h1>
            <p className={styles.heroSubtitle}>
              Connect with professionals, share your journey, and grow your network
            </p>
            
            <div className={styles.heroFeatures}>
              <div className={styles.heroFeature}>
                <div className={styles.featureIcon}>🚀</div>
                <div className={styles.featureText}>Build meaningful professional connections</div>
              </div>
              <div className={styles.heroFeature}>
                <div className={styles.featureIcon}>💼</div>
                <div className={styles.featureText}>Share your professional achievements</div>
              </div>
              <div className={styles.heroFeature}>
                <div className={styles.featureIcon}>🌐</div>
                <div className={styles.featureText}>Discover opportunities worldwide</div>
              </div>
              <div className={styles.heroFeature}>
                <div className={styles.featureIcon}>📈</div>
                <div className={styles.featureText}>Accelerate your career growth</div>
              </div>
            </div>
          </div>
        </div>

        {/* Login Form Section */}
        <div className={styles.loginFormSection}>
          <div className={styles.loginCard}>
            <div className={styles.loginHeader}>
              <h2 className={styles.loginTitle}>Welcome Back</h2>
              <p className={styles.loginSubtitle}>Sign in to continue your professional journey</p>
            </div>
            <LoginForm />
          </div>
        </div>
      </div>
    </RouteGuard>
  )
}
