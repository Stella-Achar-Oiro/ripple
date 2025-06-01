'use client'

import RegisterForm from '../../components/Auth/RegisterForm'
import styles from '../page.module.css'

export default function RegisterPage() {
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
