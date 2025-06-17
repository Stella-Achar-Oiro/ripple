'use client'

import RouteGuard from '../../components/Auth/RouteGuard'
import RegisterForm from '../../components/Auth/RegisterForm'
import styles from './register.module.css'

export default function RegisterPage() {
  return (
    <RouteGuard requireAuth={false}>
      <div className={styles.registerContainer}>
        <div className={styles.registerContent}>
          <div className={styles.registerHeader}>
            <h1 className={styles.registerTitle}>Join Ripple</h1>
            <p className={styles.registerSubtitle}>
              Start your professional journey today
            </p>
          </div>
          <RegisterForm />
        </div>
        
        {/* Background decoration */}
        <div className={styles.backgroundDecoration}>
          <div className={styles.floatingCard + ' ' + styles.card1}>
            <div className={styles.cardIcon}>🚀</div>
            <h3>Connect</h3>
            <p>Build meaningful relationships</p>
          </div>
          <div className={styles.floatingCard + ' ' + styles.card2}>
            <div className={styles.cardIcon}>💼</div>
            <h3>Grow</h3>
            <p>Advance your career</p>
          </div>
          <div className={styles.floatingCard + ' ' + styles.card3}>
            <div className={styles.cardIcon}>🌟</div>
            <h3>Shine</h3>
            <p>Showcase your achievements</p>
          </div>
        </div>
      </div>
    </RouteGuard>
  )
}
