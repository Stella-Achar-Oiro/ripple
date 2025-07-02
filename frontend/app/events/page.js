'use client'

import { useState, useEffect } from 'react'
import RouteGuard from '../../components/Auth/RouteGuard'
import MainLayout from '../../components/Layout/MainLayout'
import EventList from '../../components/Events/EventList'
import CreateEventModal from '../../components/Events/CreateEventModal'
import { useAuth } from '../../contexts/AuthContext'
import styles from './page.module.css'

export default function EventsPage() {
  const { user } = useAuth()
  const [userGroups, setUserGroups] = useState([])
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [isCreateEventModalOpen, setIsCreateEventModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

  // Fetch user's groups for event creation
  const fetchUserGroups = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`${API_URL}/api/groups/user`, {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to fetch user groups')
      }

      const data = await response.json()
      setUserGroups(data.data?.groups || [])
    } catch (err) {
      console.error('Error fetching user groups:', err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchUserGroups()
    }
  }, [user])

  const handleCreateEvent = (group = null) => {
    setSelectedGroup(group)
    setIsCreateEventModalOpen(true)
  }

  const handleCreateEventClose = () => {
    setIsCreateEventModalOpen(false)
    setSelectedGroup(null)
  }

  const handleEventCreated = (newEvent) => {
    // Event created successfully
    setIsCreateEventModalOpen(false)
    setSelectedGroup(null)
    // The EventList component will automatically refresh
  }

  if (isLoading) {
    return (
      <RouteGuard requireAuth={true}>
        <MainLayout currentPage="events">
          <div className={styles.loadingContainer}>
            <i className="fas fa-spinner fa-spin"></i>
            <span>Loading events...</span>
          </div>
        </MainLayout>
      </RouteGuard>
    )
  }

  return (
    <RouteGuard requireAuth={true}>
      <MainLayout currentPage="events">
        <div className={styles.container}>
          {/* Header Section */}
          <div className={styles.header}>
            <div className={styles.headerContent}>
              <div className={styles.headerText}>
                <h1>Events</h1>
                <p>Discover and manage events from all your groups</p>
              </div>
              {userGroups.length > 0 && (
                <div className={styles.headerActions}>
                  <div className={styles.dropdown}>
                    <button className="btn-primary dropdown-toggle">
                      <i className="fas fa-calendar-plus"></i>
                      Create Event
                      <i className="fas fa-chevron-down"></i>
                    </button>
                    <div className={styles.dropdownMenu}>
                      {userGroups.map(group => (
                        <button
                          key={group.id}
                          className={styles.dropdownItem}
                          onClick={() => handleCreateEvent(group)}
                        >
                          <div className={styles.groupInfo}>
                            <span className={styles.groupName}>{group.title}</span>
                            <span className={styles.groupMembers}>
                              {group.member_count} member{group.member_count !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Events Content */}
          <div className={styles.content}>
            {error ? (
              <div className={styles.errorState}>
                {/* <i className="fas fa-exclamation-triangle"></i> */}
                {/* <h3>Error Loading Events</h3>
                <p>{error}</p> */}
                <p>No events found</p>
                <button className="btn-outline" onClick={fetchUserGroups}>
                  Try Again
                </button>
              </div>
            ) : userGroups.length === 0 ? (
              <div className={styles.emptyState}>
                <i className="fas fa-calendar-day"></i>
                <h3>No Groups Yet</h3>
                <p>Join or create groups to see and create events</p>
                <a href="/groups" className="btn-primary">
                  <i className="fas fa-users"></i>
                  Browse Groups
                </a>
              </div>
            ) : (
              <div className={styles.eventsSection}>
                <EventList 
                  showGroupInfo={true}
                  title="All Your Events"
                />
              </div>
            )}
          </div>

          {/* User Groups Overview */}
          {userGroups.length > 0 && (
            <div className={styles.groupsOverview}>
              <h3>Your Groups</h3>
              <div className={styles.groupsList}>
                {userGroups.map(group => (
                  <div key={group.id} className={styles.groupCard}>
                    <div className={styles.groupAvatar}>
                      {group.avatar_path ? (
                        <img 
                          src={`${API_URL}${group.avatar_path}`} 
                          alt={`${group.title} avatar`}
                        />
                      ) : (
                        <span>{group.title.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div className={styles.groupDetails}>
                      <h4>{group.title}</h4>
                      <p>{group.member_count} member{group.member_count !== 1 ? 's' : ''}</p>
                    </div>
                    <button 
                      className="btn-outline btn-sm"
                      onClick={() => handleCreateEvent(group)}
                    >
                      <i className="fas fa-calendar-plus"></i>
                      Create Event
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Create Event Modal */}
        {selectedGroup && (
          <CreateEventModal
            isOpen={isCreateEventModalOpen}
            onClose={handleCreateEventClose}
            onSuccess={handleEventCreated}
            groupId={selectedGroup.id}
            groupTitle={selectedGroup.title}
          />
        )}
      </MainLayout>
    </RouteGuard>
  )
}