'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '../../../contexts/AuthContext'
import { apiGet, apiPost, isAuthError, getErrorMessage } from '../../../utils/api'
import RouteGuard from '../../../components/Auth/RouteGuard'
import MainLayout from '../../../components/Layout/MainLayout'
import GroupDetails from '../../../components/Groups/GroupDetails'
import styles from './groupDetails.module.css'

export default function GroupDetailsPage() {
  const [group, setGroup] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isMember, setIsMember] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const groupId = params.id

  // Fetch group details
  const fetchGroup = async () => {
    if (!isAuthenticated || authLoading || !groupId) return

    setIsLoading(true)
    setError('')

    try {
      // Fetch group details
      const data = await apiGet(`/api/groups/${groupId}`)
      setGroup(data.data)
      
      // Check if user is a member
      setIsMember(data.data?.is_member || false)
      
    } catch (error) {
      if (isAuthError(error)) {
        router.push('/')
        return
      } else if (error.status === 404) {
        setError('Group not found')
        return
      }
      console.error('Error fetching group:', getErrorMessage(error))
      setError('Failed to load group details')
    } finally {
      setIsLoading(false)
    }
  }

  // Join group
  const handleJoinGroup = async () => {
    if (isJoining) return

    setIsJoining(true)
    try {
      await apiPost('/api/groups/join', { group_id: parseInt(groupId) })
      setIsMember(true)
      // Refresh group data to get updated member count
      await fetchGroup()
    } catch (error) {
      if (isAuthError(error)) {
        router.push('/')
        return
      }
      console.error('Error joining group:', getErrorMessage(error))
      // Show error to user - could use a toast notification here
    } finally {
      setIsJoining(false)
    }
  }

  // Handle group updates
  const handleGroupUpdate = () => {
    fetchGroup()
  }

  // Initialize data
  useEffect(() => {
    if (!authLoading && isAuthenticated && groupId) {
      fetchGroup()
    }
  }, [authLoading, isAuthenticated, groupId])

  return (
    <RouteGuard requireAuth={true}>
      <MainLayout currentPage="groups">
        <div className={styles.container}>
          {/* Header */}
          <div className={styles.header}>
            <button 
              className={styles.backBtn}
              onClick={() => router.push('/groups')}
            >
              <i className="fas fa-arrow-left"></i>
              Back to Groups
            </button>
          </div>

          {/* Content */}
          <div className={styles.content}>
            {isLoading ? (
              <div className={styles.loading}>
                <div className={styles.loadingSpinner}></div>
                <p>Loading group details...</p>
              </div>
            ) : error ? (
              <div className={styles.error}>
                <i className="fas fa-exclamation-triangle"></i>
                <h3>Error</h3>
                <p>{error}</p>
                <div className={styles.errorActions}>
                  <button onClick={fetchGroup} className={styles.retryBtn}>
                    Try Again
                  </button>
                  <button 
                    onClick={() => router.push('/groups')} 
                    className={styles.backToGroupsBtn}
                  >
                    Back to Groups
                  </button>
                </div>
              </div>
            ) : group ? (
              <GroupDetails 
                group={group}
                isMember={isMember}
                isJoining={isJoining}
                onJoinGroup={handleJoinGroup}
                onGroupUpdate={handleGroupUpdate}
              />
            ) : null}
          </div>
        </div>
      </MainLayout>
    </RouteGuard>
  )
}