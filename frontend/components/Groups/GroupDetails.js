'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiGet, isAuthError, getErrorMessage } from '../../utils/api'
import GroupMembers from './GroupMembers'
import GroupPosts from './GroupPosts'
import styles from './GroupDetails.module.css'

export default function GroupDetails({ 
  group, 
  isMember, 
  isJoining, 
  onJoinGroup, 
  onGroupUpdate 
}) {
  const [activeTab, setActiveTab] = useState('posts')
  const [members, setMembers] = useState([])
  const [posts, setPosts] = useState([])
  const [isLoadingMembers, setIsLoadingMembers] = useState(false)
  const [isLoadingPosts, setIsLoadingPosts] = useState(false)
  
  const router = useRouter()

  // Format member count
  const formatMemberCount = (count) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`
    }
    return count?.toString() || '0'
  }

  // Get group icon with fallback
  const getGroupIcon = () => {
    if (group.icon) return group.icon
    return 'fas fa-users'
  }

  // Format creation date
  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  // Fetch group members
  const fetchMembers = async () => {
    if (!isMember || isLoadingMembers) return

    setIsLoadingMembers(true)
    try {
      const data = await apiGet(`/api/groups/members/${group.id}`)
      setMembers(data.data?.members || [])
    } catch (error) {
      if (isAuthError(error)) {
        router.push('/')
        return
      }
      console.error('Error fetching members:', getErrorMessage(error))
    } finally {
      setIsLoadingMembers(false)
    }
  }

  // Fetch group posts
  const fetchPosts = async () => {
    if (isLoadingPosts) return

    setIsLoadingPosts(true)
    try {
      const data = await apiGet(`/api/groups/posts/get/${group.id}`)
      setPosts(data.data?.posts || [])
    } catch (error) {
      if (isAuthError(error)) {
        router.push('/')
        return
      }
      console.error('Error fetching posts:', getErrorMessage(error))
    } finally {
      setIsLoadingPosts(false)
    }
  }

  // Load data when tab changes
  useEffect(() => {
    if (activeTab === 'members' && isMember) {
      fetchMembers()
    } else if (activeTab === 'posts') {
      fetchPosts()
    }
  }, [activeTab, isMember, group.id])

  // Load posts by default
  useEffect(() => {
    fetchPosts()
  }, [group.id])

  return (
    <div className={styles.groupDetails}>
      {/* Group Header */}
      <div className={styles.groupHeader}>
        <div className={styles.headerBackground}>
          <div className={styles.headerContent}>
            <div className={styles.groupIcon}>
              <i className={getGroupIcon()}></i>
            </div>
            
            <div className={styles.groupInfo}>
              <div className={styles.titleSection}>
                <h1 className={styles.groupName}>{group.name}</h1>
                {group.is_private && (
                  <div className={styles.privateBadge}>
                    <i className="fas fa-lock"></i>
                    Private
                  </div>
                )}
              </div>
              
              <div className={styles.groupMeta}>
                <div className={styles.metaItem}>
                  <i className="fas fa-users"></i>
                  <span>{formatMemberCount(group.member_count)} members</span>
                </div>
                {group.created_at && (
                  <div className={styles.metaItem}>
                    <i className="fas fa-calendar"></i>
                    <span>Created {formatDate(group.created_at)}</span>
                  </div>
                )}
              </div>
              
              {group.description && (
                <p className={styles.groupDescription}>{group.description}</p>
              )}
            </div>
            
            <div className={styles.headerActions}>
              {isMember ? (
                <button
                  className={styles.settingsBtn}
                  onClick={() => router.push(`/groups/${group.id}/settings`)}
                >
                  <i className="fas fa-cog"></i>
                  Settings
                </button>
              ) : (
                <button
                  className={styles.joinBtn}
                  onClick={onJoinGroup}
                  disabled={isJoining}
                >
                  {isJoining ? (
                    <>
                      <div className={styles.loadingSpinner}></div>
                      Joining...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-plus"></i>
                      Join Group
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className={styles.tabsContainer}>
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'posts' ? styles.active : ''}`}
            onClick={() => setActiveTab('posts')}
          >
            <i className="fas fa-comment"></i>
            Posts
          </button>
          
          {isMember && (
            <button
              className={`${styles.tab} ${activeTab === 'members' ? styles.active : ''}`}
              onClick={() => setActiveTab('members')}
            >
              <i className="fas fa-users"></i>
              Members
            </button>
          )}
          
          <button
            className={`${styles.tab} ${activeTab === 'about' ? styles.active : ''}`}
            onClick={() => setActiveTab('about')}
          >
            <i className="fas fa-info-circle"></i>
            About
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className={styles.tabContent}>
        {activeTab === 'posts' && (
          <GroupPosts
            group={group}
            posts={posts}
            isMember={isMember}
            isLoading={isLoadingPosts}
            onPostsUpdate={fetchPosts}
          />
        )}
        
        {activeTab === 'members' && isMember && (
          <GroupMembers
            group={group}
            members={members}
            isLoading={isLoadingMembers}
            onMembersUpdate={fetchMembers}
          />
        )}
        
        {activeTab === 'about' && (
          <div className={styles.aboutSection}>
            <div className={styles.aboutCard}>
              <h3>About this group</h3>
              <div className={styles.aboutContent}>
                <div className={styles.aboutItem}>
                  <strong>Description</strong>
                  <p>{group.description || 'No description provided.'}</p>
                </div>
                
                <div className={styles.aboutItem}>
                  <strong>Privacy</strong>
                  <p>
                    {group.is_private 
                      ? 'This is a private group. Only invited members can join and see content.'
                      : 'This is a public group. Anyone can join and see content.'
                    }
                  </p>
                </div>
                
                <div className={styles.aboutItem}>
                  <strong>Members</strong>
                  <p>{group.member_count} {group.member_count === 1 ? 'member' : 'members'}</p>
                </div>
                
                {group.created_at && (
                  <div className={styles.aboutItem}>
                    <strong>Created</strong>
                    <p>{formatDate(group.created_at)}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Non-member Notice */}
      {!isMember && activeTab === 'posts' && (
        <div className={styles.memberOnlyNotice}>
          <i className="fas fa-lock"></i>
          <h3>Join to see posts</h3>
          <p>Join this group to see posts and participate in discussions.</p>
          <button
            className={styles.joinBtn}
            onClick={onJoinGroup}
            disabled={isJoining}
          >
            {isJoining ? (
              <>
                <div className={styles.loadingSpinner}></div>
                Joining...
              </>
            ) : (
              <>
                <i className="fas fa-plus"></i>
                Join Group
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}