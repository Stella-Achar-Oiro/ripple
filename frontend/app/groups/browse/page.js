'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import RouteGuard from '../../../components/Auth/RouteGuard'
import MainLayout from '../../../components/Layout/MainLayout'
import GroupCard from '../../../components/Groups/GroupCard'
import BrowseGroupCard from '../../../components/Groups/BrowseGroupCard'
import styles from './page.module.css'

export default function BrowseGroupsPage() {
  const router = useRouter()
  const [groups, setGroups] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredGroups, setFilteredGroups] = useState([])

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

  // Fetch all public groups
  const fetchGroups = async () => {
    try {
      const response = await fetch(`${API_URL}/api/groups/all?limit=50`, {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to fetch groups')
      }

      const data = await response.json()
      setGroups(data.data.groups || [])
      setFilteredGroups(data.data.groups || [])
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

  // Filter groups based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredGroups(groups)
    } else {
      const filtered = groups.filter(group =>
        group.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (group.description && group.description.toLowerCase().includes(searchQuery.toLowerCase()))
      )
      setFilteredGroups(filtered)
    }
  }, [searchQuery, groups])

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value)
  }

  const handleBackToMyGroups = () => {
    router.push('/groups')
  }

  const handleGroupJoined = (groupId) => {
    // Refresh the groups list to update membership status
    fetchGroups()
  }

  if (isLoading) {
    return (
      <RouteGuard requireAuth={true}>
        <MainLayout currentPage="groups">
          <div className={styles.loadingContainer}>
            <i className="fas fa-spinner fa-spin"></i>
            <span>Loading groups...</span>
          </div>
        </MainLayout>
      </RouteGuard>
    )
  }

  if (error) {
    return (
      <RouteGuard requireAuth={true}>
        <MainLayout currentPage="groups">
          <div className={styles.errorContainer}>
            <i className="fas fa-exclamation-triangle"></i>
            <h2>Error Loading Groups</h2>
            <p>{error}</p>
            <button className="btn-primary" onClick={fetchGroups}>
              Try Again
            </button>
          </div>
        </MainLayout>
      </RouteGuard>
    )
  }

  return (
    <RouteGuard requireAuth={true}>
      <MainLayout currentPage="groups">
        <div className={styles.container}>
          {/* Header */}
          <div className={styles.header}>
            <button className={styles.backButton} onClick={handleBackToMyGroups}>
              <i className="fas fa-arrow-left"></i>
              Back to My Groups
            </button>
            <h1 className={styles.pageTitle}>Browse Groups</h1>
            <p className={styles.pageSubtitle}>
              Discover and join groups that match your interests
            </p>
          </div>

          {/* Search Section */}
          <div className={styles.searchSection}>
            <div className={styles.searchContainer}>
              <i className="fas fa-search"></i>
              <input
                type="text"
                placeholder="Search groups by name or description..."
                value={searchQuery}
                onChange={handleSearchChange}
                className={styles.searchInput}
              />
            </div>
          </div>

          {/* Groups Grid */}
          <div className={styles.content}>
            {filteredGroups.length === 0 ? (
              <div className={styles.emptyState}>
                {searchQuery ? (
                  <>
                    <i className="fas fa-search"></i>
                    <h3>No groups found</h3>
                    <p>No groups match your search for "{searchQuery}"</p>
                    <button 
                      className="btn-outline"
                      onClick={() => setSearchQuery('')}
                    >
                      Clear Search
                    </button>
                  </>
                ) : (
                  <>
                    <i className="fas fa-users"></i>
                    <h3>No groups available</h3>
                    <p>There are no public groups to browse at the moment.</p>
                    <button 
                      className="btn-primary"
                      onClick={handleBackToMyGroups}
                    >
                      Create Your Own Group
                    </button>
                  </>
                )}
              </div>
            ) : (
              <>
                <div className={styles.resultsHeader}>
                  <span className={styles.resultsCount}>
                    {filteredGroups.length} group{filteredGroups.length !== 1 ? 's' : ''} found
                    {searchQuery && ` for "${searchQuery}"`}
                  </span>
                </div>
                <div className={styles.groupsGrid}>
                  {filteredGroups.map(group => (
                    <BrowseGroupCard 
                      key={group.id} 
                      group={group} 
                      onJoinSuccess={handleGroupJoined}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </MainLayout>
    </RouteGuard>
  )
}
