'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useAuth } from '../../../../contexts/AuthContext'
import RouteGuard from '../../../../components/Auth/RouteGuard'
import MainLayout from '../../../../components/Layout/MainLayout'
import PrivateChat from '../../../../components/Chat/PrivateChat'
import styles from './page.module.css'

export default function PrivateChatPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const [recipient, setRecipient] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRecipientData = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/users/${id}`)
        if (response.ok) {
          const data = await response.json()
          setRecipient(data)
        }
      } catch (error) {
        console.error('Error fetching recipient data:', error)
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchRecipientData()
    }
  }, [id])

  return (
    <RouteGuard requireAuth={true}>
      <MainLayout currentPage="chat">
        <div className={styles.privateChatContainer}>
          {loading ? (
            <div className={styles.loading}>Loading...</div>
          ) : recipient ? (
            <>
              <div className={styles.chatHeader}>
                <div className={styles.recipientAvatar}>
                  {recipient.profile_image ? (
                    <img src={recipient.profile_image} alt={recipient.name} />
                  ) : (
                    <div className={styles.initialsAvatar}>
                      {`${recipient.first_name?.[0] || ''}${recipient.last_name?.[0] || ''}`}
                    </div>
                  )}
                  {recipient.is_online && <div className={styles.onlineIndicator}></div>}
                </div>
                <div className={styles.recipientInfo}>
                  <h2>{`${recipient.first_name} ${recipient.last_name}`}</h2>
                  <p>{recipient.is_online ? 'Online' : 'Offline'}</p>
                </div>
              </div>
              <PrivateChat 
                userId={user?.id} 
                recipientId={parseInt(id)} 
              />
            </>
          ) : (
            <div className={styles.notFound}>User not found</div>
          )}
        </div>
      </MainLayout>
    </RouteGuard>
  )
}