'use client'

import LoginForm from '../components/Auth/LoginForm'
import styles from './page.module.css'

export default function LoginPage() {
  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginCard}>
        <div className={styles.loginHeader}>
          <h1 className={styles.loginTitle}>Ripple</h1>
          <p className={styles.loginSubtitle}>Connect with your world</p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
