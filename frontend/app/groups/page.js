'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import RouteGuard from '../../components/Auth/RouteGuard'
import MainLayout from '../../components/Layout/MainLayout'
import GroupCard from '../../components/Groups/GroupCard'
import CreateGroupModal from '../../components/Groups/CreateGroupModal'
import PendingInvitations from '../../components/Groups/PendingInvitations'
import styles from './page.module.css'

export default function GroupsPage() {
  const router = useRouter()
  const [groups, setGroups] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  // Fetch user's groups
  const fetchGroups = async () => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
      const response = await fetch(`${API_URL}/api/groups/user`, {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to fetch groups')
      }

      const data = await response.json()
      setGroups(data.data.groups || [])
    } catch (err) {
      setError(err.message || 'Failed to load groups')
      console.error('Error fetching groups:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Load groups on component mount
  useEffect(() => {
    fetchGroups()
  }, [])

  // Handle successful group creation
  const handleGroupCreated = (newGroup) => {
    setGroups(prev => [newGroup, ...prev])
  }

  // Handle invitation acceptance/decline
  const handleInvitationHandled = () => {
    // Refresh groups list when user accepts an invitation
    fetchGroups()
  }

  // Handle group updates
  const handleGroupUpdated = (updatedGroup) => {
    setGroups(prev => prev.map(group =>
      group.id === updatedGroup.id ? updatedGroup : group
    ))
  }

  // Handle create group button click
  const handleCreateGroupClick = () => {
    setIsCreateModalOpen(true)
  }

  // Handle browse groups button click
  const handleBrowseGroupsClick = () => {
    router.push('/groups/browse')
  }

  // Handle modal close
  const handleModalClose = () => {
    setIsCreateModalOpen(false)
  }

  return (
    <RouteGuard requireAuth={true}>
      <MainLayout currentPage="groups">
        <div className={styles.contentWrapper}>
          {/* Pending Invitations */}
          <PendingInvitations onInvitationHandled={handleInvitationHandled} />

          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Your Groups</h2>
              <div className={styles.headerActions}>
                <button
                  className="btn-outline"
                  onClick={handleBrowseGroupsClick}
                >
                  <i className="fas fa-search"></i>
                  Browse Groups
                </button>
                <button
                  className="btn-primary"
                  onClick={handleCreateGroupClick}
                >
                  <i className="fas fa-plus"></i>
                  Create Group
                </button>
              </div>
            </div>
            <div className="card-body">
              {isLoading ? (
                <div className={styles.loadingState}>
                  <i className="fas fa-spinner fa-spin"></i>
                  <span>Loading your groups...</span>
                </div>
              ) : error ? (
                <div className={styles.errorState}>
                  <i className="fas fa-exclamation-triangle"></i>
                  <span>{error}</span>
                  <button
                    className="btn-outline"
                    onClick={fetchGroups}
                  >
                    Try Again
                  </button>
                </div>
              ) : groups.length === 0 ? (
                <div className={styles.emptyState}>
                  <i className="fas fa-users"></i>
                  <h3>No groups yet</h3>
                  <p>Create your first group or browse existing groups to start connecting with others who share your interests.</p>
                  <div className={styles.emptyStateActions}>
                    <button
                      className="btn-primary"
                      onClick={handleCreateGroupClick}
                    >
                      <i className="fas fa-plus"></i>
                      Create Your First Group
                    </button>
                    <button
                      className="btn-outline"
                      onClick={handleBrowseGroupsClick}
                    >
                      <i className="fas fa-search"></i>
                      Browse Existing Groups
                    </button>
                  </div>
                </div>
              ) : (
                <div className={styles.groupsGrid}>
                  {groups.map(group => (
                    <GroupCard
                      key={group.id}
                      group={group}
                      onGroupUpdated={handleGroupUpdated}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <CreateGroupModal
          isOpen={isCreateModalOpen}
          onClose={handleModalClose}
          onGroupCreated={handleGroupCreated}
        />
      </MainLayout>
    </RouteGuard>
  )
}
