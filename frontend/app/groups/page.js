'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../contexts/AuthContext'
import { apiGet, apiPost, isAuthError, getErrorMessage } from '../../utils/api'
import RouteGuard from '../../components/Auth/RouteGuard'
import MainLayout from '../../components/Layout/MainLayout'
import GroupCard from '../../components/Groups/GroupCard'
import CreateGroupForm from '../../components/Groups/CreateGroupForm'
import styles from './groups.module.css'

export default function GroupsPage() {
  const [userGroups, setUserGroups] = useState([])
  const [allGroups, setAllGroups] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('my-groups') // 'my-groups' or 'discover'
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [joiningGroupId, setJoiningGroupId] = useState(null)
  
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()

  // Fetch user's groups
  const fetchUserGroups = async () => {
    if (!isAuthenticated || authLoading) return

    try {
      const data = await apiGet('/api/groups/user')
      setUserGroups(data.data?.groups || [])
    } catch (error) {
      if (isAuthError(error)) {
        router.push('/')
        return
      }
      console.error('Error fetching user groups:', getErrorMessage(error))
    }
  }

  // Fetch all groups for discovery
  const fetchAllGroups = async () => {
    if (!isAuthenticated || authLoading) return

    try {
      const data = await apiGet('/api/groups/all')
      setAllGroups(data.data?.groups || [])
    } catch (error) {
      if (isAuthError(error)) {
        router.push('/')
        return
      }
      console.error('Error fetching all groups:', getErrorMessage(error))
      setError('Failed to load groups')
    }
  }

  // Join a group
  const handleJoinGroup = async (groupId) => {
    if (joiningGroupId) return // Prevent double-clicking

    setJoiningGroupId(groupId)
    try {
      await apiPost('/api/groups/join', { group_id: groupId })
      
      // Refresh both lists
      await Promise.all([fetchUserGroups(), fetchAllGroups()])
      
      // Show success message or notification here if needed
    } catch (error) {
      if (isAuthError(error)) {
        router.push('/')
        return
      }
      console.error('Error joining group:', getErrorMessage(error))
      // Show error message to user
    } finally {
      setJoiningGroupId(null)
    }
  }

  // Handle group creation success
  const handleGroupCreated = () => {
    setShowCreateForm(false)
    fetchUserGroups() // Refresh user's groups
  }

  // Load initial data
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      setIsLoading(true)
      Promise.all([fetchUserGroups(), fetchAllGroups()])
        .finally(() => setIsLoading(false))
    }
  }, [authLoading, isAuthenticated])

  // Filter groups based on search
  const getFilteredGroups = (groups) => {
    if (!searchQuery.trim()) return groups
    
    return groups.filter(group =>
      group.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }

  // Get groups that user is not a member of
  const getDiscoverableGroups = () => {
    const userGroupIds = new Set(userGroups.map(g => g.id))
    return allGroups.filter(group => !userGroupIds.has(group.id))
  }

  const filteredUserGroups = getFilteredGroups(userGroups)
  const filteredDiscoverGroups = getFilteredGroups(getDiscoverableGroups())

  return (
    <RouteGuard requireAuth={true}>
      <MainLayout currentPage="groups">
        <div className={styles.container}>
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.titleSection}>
              <h1 className={styles.title}>Groups</h1>
              <p className={styles.subtitle}>
                Connect with like-minded people and share your interests
              </p>
            </div>
            
            <div className={styles.headerActions}>
              <button
                className={styles.createBtn}
                onClick={() => setShowCreateForm(true)}
              >
                <i className="fas fa-plus"></i>
                Create Group
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className={styles.searchSection}>
            <div className={styles.searchBar}>
              <i className="fas fa-search"></i>
              <input
                type="text"
                placeholder="Search groups..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
              />
            </div>
          </div>

          {/* Tabs */}
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${activeTab === 'my-groups' ? styles.active : ''}`}
              onClick={() => setActiveTab('my-groups')}
            >
              <i className="fas fa-users"></i>
              My Groups ({userGroups.length})
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'discover' ? styles.active : ''}`}
              onClick={() => setActiveTab('discover')}
            >
              <i className="fas fa-compass"></i>
              Discover Groups
            </button>
          </div>

          {/* Content */}
          <div className={styles.content}>
            {isLoading ? (
              <div className={styles.loading}>
                <div className={styles.loadingSpinner}></div>
                <p>Loading groups...</p>
              </div>
            ) : error ? (
              <div className={styles.error}>
                <i className="fas fa-exclamation-triangle"></i>
                <h3>Error</h3>
                <p>{error}</p>
                <button 
                  onClick={() => {
                    setError('')
                    setIsLoading(true)
                    Promise.all([fetchUserGroups(), fetchAllGroups()])
                      .finally(() => setIsLoading(false))
                  }}
                  className={styles.retryBtn}
                >
                  Try Again
                </button>
              </div>
            ) : (
              <>
                {/* My Groups Tab */}
                {activeTab === 'my-groups' && (
                  <div className={styles.groupsSection}>
                    {filteredUserGroups.length === 0 ? (
                      <div className={styles.empty}>
                        {searchQuery ? (
                          <>
                            <i className="fas fa-search"></i>
                            <h3>No groups found</h3>
                            <p>No groups match your search criteria.</p>
                            <button 
                              onClick={() => setSearchQuery('')}
                              className={styles.clearSearchBtn}
                            >
                              Clear Search
                            </button>
                          </>
                        ) : (
                          <>
                            <i className="fas fa-users"></i>
                            <h3>No Groups Yet</h3>
                            <p>You haven't joined any groups yet. Discover new communities!</p>
                            <button
                              onClick={() => setActiveTab('discover')}
                              className={styles.discoverBtn}
                            >
                              Discover Groups
                            </button>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className={styles.groupsGrid}>
                        {filteredUserGroups.map((group) => (
                          <GroupCard
                            key={group.id}
                            group={group}
                            isMember={true}
                            onGroupUpdate={fetchUserGroups}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Discover Groups Tab */}
                {activeTab === 'discover' && (
                  <div className={styles.groupsSection}>
                    {filteredDiscoverGroups.length === 0 ? (
                      <div className={styles.empty}>
                        {searchQuery ? (
                          <>
                            <i className="fas fa-search"></i>
                            <h3>No groups found</h3>
                            <p>No groups match your search criteria.</p>
                            <button 
                              onClick={() => setSearchQuery('')}
                              className={styles.clearSearchBtn}
                            >
                              Clear Search
                            </button>
                          </>
                        ) : (
                          <>
                            <i className="fas fa-compass"></i>
                            <h3>All Caught Up!</h3>
                            <p>You've joined all available groups. Why not create a new one?</p>
                            <button
                              onClick={() => setShowCreateForm(true)}
                              className={styles.createBtn}
                            >
                              Create Group
                            </button>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className={styles.groupsGrid}>
                        {filteredDiscoverGroups.map((group) => (
                          <GroupCard
                            key={group.id}
                            group={group}
                            isMember={false}
                            isJoining={joiningGroupId === group.id}
                            onJoinGroup={() => handleJoinGroup(group.id)}
                            onGroupUpdate={fetchAllGroups}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Create Group Modal */}
          {showCreateForm && (
            <CreateGroupForm
              onClose={() => setShowCreateForm(false)}
              onGroupCreated={handleGroupCreated}
            />
          )}
        </div>
      </MainLayout>
    </RouteGuard>
  )
}
