'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import RouteGuard from '../../../components/Auth/RouteGuard'
import MainLayout from '../../../components/Layout/MainLayout'
import InviteUsersModal from '../../../components/Groups/InviteUsersModal'
import JoinRequestsManager from '../../../components/Groups/JoinRequestsManager'
import GroupPostList from '../../../components/Groups/GroupPostList'
import EventList from '../../../components/Events/EventList'
import CreateEventModal from '../../../components/Events/CreateEventModal'
import GroupSettingsModal from '../../../components/Groups/GroupSettingsModal'
import GroupChat from '../../../components/Groups/GroupChat'
import styles from './page.module.css'

export default function GroupDetailPage() {
  const params = useParams()

  const router = useRouter()
  const groupId = params.id

  const [group, setGroup] = useState(null)
  const [members, setMembers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [isCreateEventModalOpen, setIsCreateEventModalOpen] = useState(false)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('members')

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

  // Fetch group details
  const fetchGroup = async () => {
    try {
      const response = await fetch(`${API_URL}/api/groups/${groupId}`, {
        credentials: 'include',
      })

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Group not found')
        }
        throw new Error('Failed to fetch group details')
      }

      const data = await response.json()

      setGroup(data.data)
    } catch (err) {
      setError(err.message || 'Failed to load group')
      console.error('Error fetching group:', err)
    }
  }

  // Fetch group members
  const fetchMembers = async () => {
    try {
      const response = await fetch(`${API_URL}/api/groups/${groupId}/members`, {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to fetch group members')
      }

      const data = await response.json()
      setMembers(data.data.members || [])
    } catch (err) {
      console.error('Error fetching members:', err)
      // Don't set error for members as it's not critical
    }
  }

  // Load group data on component mount
  useEffect(() => {
    if (groupId) {
      Promise.all([fetchGroup(), fetchMembers()])
        .finally(() => setIsLoading(false))
    }
  }, [groupId])

  const handleInviteUsers = () => {
    setIsInviteModalOpen(true)
  }

  const handleInviteModalClose = () => {
    setIsInviteModalOpen(false)
  }

  const handleInviteSuccess = () => {
    // Refresh members list after successful invite
    fetchMembers()
    setIsInviteModalOpen(false)
  }

  const handleCreateEvent = () => {
    setIsCreateEventModalOpen(true)
  }

  const handleCreateEventClose = () => {
    setIsCreateEventModalOpen(false)
  }

  const handleEventCreated = (newEvent) => {
    // Optionally switch to events tab to show the new event
    setActiveTab('events')
    setIsCreateEventModalOpen(false)
  }

  const handleBackToGroups = () => {
    router.push('/groups')
  }

  const handleSettings = () => {
    setIsSettingsModalOpen(true)
  }

  const handleSettingsModalClose = () => {
    setIsSettingsModalOpen(false)
  }

  const handleGroupUpdated = (updatedGroup) => {
    setGroup(updatedGroup)
    setIsSettingsModalOpen(false)
  }

  if (isLoading) {
    return (
      <RouteGuard requireAuth={true}>
        <MainLayout currentPage="groups">
          <div className={styles.loadingContainer}>
            <i className="fas fa-spinner fa-spin"></i>
            <span>Loading group details...</span>
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
            <h2>Error Loading Group</h2>
            <p>{error}</p>
            <button className="btn-primary" onClick={handleBackToGroups}>
              Back to Groups
            </button>
          </div>
        </MainLayout>
      </RouteGuard>
    )
  }

  if (!group) {
    return (
      <RouteGuard requireAuth={true}>
        <MainLayout currentPage="groups">
          <div className={styles.errorContainer}>
            <i className="fas fa-users"></i>
            <h2>Group Not Found</h2>
            <p>The group you're looking for doesn't exist or you don't have access to it.</p>
            <button className="btn-primary" onClick={handleBackToGroups}>
              Back to Groups
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
          {/* Header Section */}
          <div className={styles.header}>
            <button className={styles.backButton} onClick={handleBackToGroups}>
              <i className="fas fa-arrow-left"></i>
              Back to Groups
            </button>
          </div>

          {/* Group Cover and Info */}
          <div className={styles.groupCover}>
            {group.cover_path && (
              <img 
                src={`${API_URL}${group.cover_path}`} 
                alt="Group cover"
                className={styles.coverImage}
              />
            )}
            <div className={styles.groupInfo}>
              <div className={styles.groupAvatar}>
                {group.avatar_path ? (
                  <img 
                    src={`${API_URL}${group.avatar_path}`} 
                    alt={`${group.title} avatar`}
                    className={styles.avatarImage}
                  />
                ) : (
                  <div className={styles.avatarPlaceholder}>
                    {group.title?.charAt(0)?.toUpperCase() || 'G'}
                  </div>
                )}
              </div>
              <div className={styles.groupDetails}>
                <h1 className={styles.groupTitle}>{group.title}</h1>
                {group.description && (
                  <p className={styles.groupDescription}>{group.description}</p>
                )}
                <div className={styles.groupMeta}>
                  <span className={styles.memberCount}>
                    <i className="fas fa-users"></i>
                    {group.member_count} member{group.member_count !== 1 ? 's' : ''}
                  </span>
                  {group.is_creator && (
                    <span className={styles.creatorBadge}>
                      <i className="fas fa-crown"></i>
                      Creator
                    </span>
                  )}
                </div>
              </div>
              {(group.is_member || group.is_creator) && (
                <div className={styles.groupActions}>
                  <button
                    className="btn-primary"
                    onClick={handleInviteUsers}
                  >
                    <i className="fas fa-user-plus"></i>
                    Invite Users
                  </button>
                  <button
                    className="btn-outline"
                    onClick={handleCreateEvent}
                  >
                    <i className="fas fa-calendar-plus"></i>
                    Create Event
                  </button>
                  {group.is_creator && (
                    <button className="btn-outline" onClick={handleSettings}>
                      <i className="fas fa-cog"></i>
                      Settings
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Join Requests Manager (for group creators only) */}
          {group.is_creator && (
            <JoinRequestsManager
              groupId={groupId}
              isVisible={true}
              onRequestHandled={() => {
                // Refresh members list when a request is handled
                fetchMembers()
              }}
            />
          )}

          {/* Content Tabs */}
          <div className={styles.contentTabs}>
            <div className={styles.tabList}>
              <button
                className={`${styles.tab} ${activeTab === 'members' ? styles.active : ''}`}
                onClick={() => setActiveTab('members')}
              >
                <i className="fas fa-users"></i>
                Members ({members.length})
              </button>
              <button
                className={`${styles.tab} ${activeTab === 'posts' ? styles.active : ''}`}
                onClick={() => setActiveTab('posts')}
              >
                <i className="fas fa-comments"></i>
                Posts
              </button>
              <button
                className={`${styles.tab} ${activeTab === 'events' ? styles.active : ''}`}
                onClick={() => setActiveTab('events')}
              >
                <i className="fas fa-calendar"></i>
                Events
              </button>
              {(group.is_member || group.is_creator) && (
                <button
                  className={`${styles.tab} ${activeTab === 'chat' ? styles.active : ''}`}
                  onClick={() => setActiveTab('chat')}
                >
                  <i className="fas fa-comments"></i>
                  Chat
                </button>
              )}
            </div>

            {/* Tab Content */}
            <div className={styles.tabContent}>
              {activeTab === 'members' && (
                <div className={styles.membersList}>
                  {members.length === 0 ? (
                      <div className={styles.emptyState}>
                        <i className="fas fa-users"></i>
                        <p>No members yet</p>
                        {group.is_creator && (
                          <button
                            className="btn-primary"
                            onClick={handleInviteUsers}
                          >
                            Invite the first members
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className={styles.membersGrid}>
                        {members.map(member => {
                          // Check if this member is the creator
                          const isCreator = member.user_id === group.creator_id
                          const memberUser = member.user || member // Handle different response structures

                          return (
                            <div key={member.id} className={styles.memberCard}>
                              <div className={styles.memberAvatar}>
                                {memberUser.avatar_path ? (
                                  <img
                                    src={`${API_URL}${memberUser.avatar_path}`}
                                    alt={`${memberUser.first_name} ${memberUser.last_name}`}
                                  />
                                ) : (
                                  <div className={styles.memberAvatarPlaceholder}>
                                    {memberUser.first_name?.charAt(0)?.toUpperCase() || 'U'}
                                  </div>
                                )}
                              </div>
                              <div className={styles.memberInfo}>
                                <button
                                  className={styles.memberNameButton}
                                  onClick={() => router.push(`/profile/${memberUser.id}`)}
                                >
                                  {memberUser.first_name} {memberUser.last_name}
                                </button>
                                {memberUser.nickname && (
                                  <p className={styles.memberNickname}>@{memberUser.nickname}</p>
                                )}
                                <span className={styles.memberRole}>
                                  {isCreator ? (
                                    <>
                                      <i className="fas fa-crown"></i>
                                      Creator
                                    </>
                                  ) : (
                                    'Member'
                                  )}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )
                  }
                </div>
              )}

              {activeTab === 'posts' && (
                <GroupPostList
                  groupId={groupId}
                  isGroupMember={group.is_member || group.is_creator}
                />
              )}

              {activeTab === 'events' && (
                <EventList
                  groupId={groupId}
                  title="Group Events"
                />
              )}

              {activeTab === 'chat' && (group.is_member || group.is_creator) && (
                <div className={styles.chatContainer}>
                  <GroupChat groupId={groupId} groupTitle={group.title} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Invite Users Modal */}
        <InviteUsersModal
          isOpen={isInviteModalOpen}
          onClose={handleInviteModalClose}
          onSuccess={handleInviteSuccess}
          groupId={groupId}
          groupTitle={group.title}
        />

        {/* Create Event Modal */}
        <CreateEventModal
          isOpen={isCreateEventModalOpen}
          onClose={handleCreateEventClose}
          onSuccess={handleEventCreated}
          groupId={groupId}
          groupTitle={group.title}
        />

        {/* Group Settings Modal */}
        <GroupSettingsModal
          isOpen={isSettingsModalOpen}
          onClose={handleSettingsModalClose}
          onGroupUpdated={handleGroupUpdated}
          group={group}
        />
      </MainLayout>
    </RouteGuard>
  )
}
