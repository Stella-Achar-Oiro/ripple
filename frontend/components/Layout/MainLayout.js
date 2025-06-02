'use client'

import { useState } from 'react'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import styles from './MainLayout.module.css'

export default function MainLayout({ children, currentPage = 'feed' }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className={styles.appContainer}>
      <Navbar />
      <div className={styles.mainContainer}>
        <Sidebar 
          currentPage={currentPage} 
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <main className={styles.mainContent}>
          {children}
        </main>
      </div>
    </div>
  )
}
