'use client'

import { useState, useEffect } from 'react'
import RouteGuard from '../../components/Auth/RouteGuard'
import MainLayout from '../../components/Layout/MainLayout'
import GroupCard from '../../components/Groups/GroupCard'
import CreateGroupModal from '../../components/Groups/CreateGroupModal'
import styles from './page.module.css'

export default function GroupsPage() {
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

  // Handle create group button click
  const handleCreateGroupClick = () => {
    setIsCreateModalOpen(true)
  }

  // Handle modal close
  const handleModalClose = () => {
    setIsCreateModalOpen(false)
  }

  return (
    <RouteGuard requireAuth={true}>
      <MainLayout currentPage="groups">
        <div className={styles.contentWrapper}>
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Your Groups</h2>
              <button
                className="btn-primary"
                onClick={handleCreateGroupClick}
              >
                Create Group
              </button>
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
                  <p>Create your first group to start connecting with others who share your interests.</p>
                  <button
                    className="btn-primary"
                    onClick={handleCreateGroupClick}
                  >
                    Create Your First Group
                  </button>
                </div>
              ) : (
                <div className={styles.groupsGrid}>
                  {groups.map(group => (
                    <GroupCard key={group.id} group={group} />
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
