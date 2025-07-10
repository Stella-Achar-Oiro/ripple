'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import RouteGuard from '../../components/Auth/RouteGuard'
import MainLayout from '../../components/Layout/MainLayout'
import Avatar from '../../components/shared/Avatar'
import styles from './page.module.css'

export default function SearchPage() {
  const searchParams = useSearchParams()
  const query = searchParams.get('q') || ''
  
  const [searchResults, setSearchResults] = useState({
    users: [],
    groups: [],
    posts: []
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('users')
  const [searchQuery, setSearchQuery] = useState(query)

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

  const performSearch = async (searchTerm) => {
    if (!searchTerm.trim()) {
      setSearchResults({ users: [], groups: [], posts: [] })
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Search users
      let users = []
      try {
        const usersResponse = await fetch(`${API_URL}/api/auth/search?q=${encodeURIComponent(searchTerm)}`, {
          credentials: 'include',
        })

        if (usersResponse.ok) {
          const usersData = await usersResponse.json()
          console.log('Users API response:', usersData)
          users = Array.isArray(usersData.data?.users) ? usersData.data.users : []
        } else {
          console.error('Users search failed:', usersResponse.status, usersResponse.statusText)
        }
      } catch (userError) {
        console.error('Users search error:', userError.message)
      }

      // Search groups  
      let groups = []
      try {
        const groupsResponse = await fetch(`${API_URL}/api/groups/search?q=${encodeURIComponent(searchTerm)}`, {
          credentials: 'include',
        })

        if (groupsResponse.ok) {
          const groupsData = await groupsResponse.json()
          console.log('Groups API response:', groupsData)
          groups = Array.isArray(groupsData.data) ? groupsData.data : []
        } else {
          console.warn('Groups search not available:', groupsResponse.status, groupsResponse.statusText)
          // Don't treat this as a critical error, just continue with empty groups
        }
      } catch (groupError) {
        console.warn('Groups search error:', groupError.message)
        // Continue with empty groups array
      }

      // Future: Search posts (not implemented in backend yet)
      const posts = []

      setSearchResults({ users, groups, posts })

    } catch (err) {
      console.error('Search error:', err)
      setError('Failed to perform search. Please try again.')
      setSearchResults({ users: [], groups: [], posts: [] })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (query) {
      setSearchQuery(query)
      performSearch(query)
    }
  }, [query])

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      const newUrl = `/search?q=${encodeURIComponent(searchQuery.trim())}`
      window.history.pushState({}, '', newUrl)
      performSearch(searchQuery.trim())
    }
  }

  const handleFollowToggle = async (userId, isFollowing) => {
    try {
      const endpoint = isFollowing ? '/api/unfollow' : '/api/follow'
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ user_id: userId })
      })

      if (response.ok) {
        const data = await response.json()
        
        if (isFollowing) {
          // Unfollowing - remove follow status
          setSearchResults(prev => ({
            ...prev,
            users: Array.isArray(prev.users) ? prev.users.map(user => 
              user.id === userId 
                ? { ...user, is_following: false, follow_status: '' }
                : user
            ) : []
          }))
        } else {
          // Following - update based on response
          const followRequest = data.data?.follow_request || data.follow_request
          setSearchResults(prev => ({
            ...prev,
            users: Array.isArray(prev.users) ? prev.users.map(user => 
              user.id === userId 
                ? { 
                    ...user, 
                    is_following: followRequest?.status === 'accepted',
                    follow_status: followRequest?.status
                  }
                : user
            ) : []
          }))
        }
      }
    } catch (error) {
      console.error('Error toggling follow:', error)
    }
  }

  const handleGroupJoin = async (groupId) => {
    try {
      const response = await fetch(`${API_URL}/api/groups/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ group_id: groupId })
      })

      if (response.ok) {
        // Update the group in search results
        setSearchResults(prev => ({
          ...prev,
          groups: Array.isArray(prev.groups) ? prev.groups.map(group => 
            group.id === groupId 
              ? { ...group, membership_status: 'pending' }
              : group
          ) : []
        }))
      }
    } catch (error) {
      console.error('Error joining group:', error)
    }
  }

  const getTotalResults = () => {
    const users = Array.isArray(searchResults.users) ? searchResults.users : []
    const groups = Array.isArray(searchResults.groups) ? searchResults.groups : []
    const posts = Array.isArray(searchResults.posts) ? searchResults.posts : []
    return users.length + groups.length + posts.length
  }

  return (
    <RouteGuard requireAuth={true}>
      <MainLayout currentPage="search">
        <div className={styles.searchContainer}>
          <div className={styles.searchHeader}>
            <form onSubmit={handleSearch} className={styles.searchForm}>
              <div className={styles.searchInputContainer}>
                <i className="fas fa-search"></i>
                <input
                  type="text"
                  placeholder="Search users, groups, and more..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={styles.searchInput}
                />
                <button type="submit" className={styles.searchButton}>
                  Search
                </button>
              </div>
            </form>

            {query && (
              <div className={styles.searchInfo}>
                <h2>Search Results for "{query}"</h2>
                {!loading && (
                  <p>{getTotalResults()} result{getTotalResults() !== 1 ? 's' : ''} found</p>
                )}
              </div>
            )}
          </div>

          {loading && (
            <div className={styles.loadingState}>
              <i className="fas fa-spinner fa-spin"></i>
              <span>Searching...</span>
            </div>
          )}

          {error && (
            <div className={styles.errorState}>
              <i className="fas fa-exclamation-triangle"></i>
              <p>{error}</p>
              <button onClick={() => performSearch(searchQuery)} className="btn-outline">
                Try Again
              </button>
            </div>
          )}

          {!loading && !error && query && (
            <>
              {/* Search Tabs */}
              <div className={styles.searchTabs}>
                <button
                  className={`${styles.tab} ${activeTab === 'users' ? styles.active : ''}`}
                  onClick={() => setActiveTab('users')}
                >
                  <i className="fas fa-users"></i>
                  Users ({Array.isArray(searchResults.users) ? searchResults.users.length : 0})
                </button>
                <button
                  className={`${styles.tab} ${activeTab === 'groups' ? styles.active : ''}`}
                  onClick={() => setActiveTab('groups')}
                >
                  <i className="fas fa-layer-group"></i>
                  Groups ({Array.isArray(searchResults.groups) ? searchResults.groups.length : 0})
                </button>
                <button
                  className={`${styles.tab} ${activeTab === 'posts' ? styles.active : ''}`}
                  onClick={() => setActiveTab('posts')}
                  disabled
                >
                  <i className="fas fa-file-alt"></i>
                  Posts ({Array.isArray(searchResults.posts) ? searchResults.posts.length : 0})
                </button>
              </div>

              {/* Search Results */}
              <div className={styles.searchResults}>
                {activeTab === 'users' && (
                  <div className={styles.usersResults}>
                    {!Array.isArray(searchResults.users) || searchResults.users.length === 0 ? (
                      <div className={styles.emptyResults}>
                        <i className="fas fa-user-slash"></i>
                        <p>No users found for "{query}"</p>
                      </div>
                    ) : (
                      (Array.isArray(searchResults.users) ? searchResults.users : []).map(user => (
                        <div key={user.id} className={styles.userCard}>
                          <Link href={`/profile/${user.id}`} className={styles.avatarLink}>
                            <Avatar user={user} size="large" />
                          </Link>
                          <div className={styles.userInfo}>
                            <Link href={`/profile/${user.id}`} className={styles.userNameLink}>
                              <h3>{user.first_name} {user.last_name}</h3>
                            </Link>
                            {user.nickname && <p>@{user.nickname}</p>}
                            {user.about_me && <span>{user.about_me}</span>}
                          </div>
                          <div className={styles.userActions}>
                            <button
                              onClick={() => window.location.href = `/profile/${user.id}`}
                              className="btn-outline"
                            >
                              View Profile
                            </button>
                            {!user.is_own_profile && (
                              <button
                                onClick={() => handleFollowToggle(user.id, user.is_following || user.follow_status === 'pending')}
                                className={`${styles.followButton} ${user.is_following ? styles.following : ''} ${user.follow_status === 'pending' ? styles.pending : ''}`}
                                disabled={user.follow_status === 'pending'}
                              >
                                {user.is_following ? (
                                  <>
                                    <i className="fas fa-check"></i>
                                    Following
                                  </>
                                ) : user.follow_status === 'pending' ? (
                                  <>
                                    <i className="fas fa-clock"></i>
                                    Requested
                                  </>
                                ) : (
                                  <>
                                    <i className="fas fa-user-plus"></i>
                                    Follow
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activeTab === 'groups' && (
                  <div className={styles.groupsResults}>
                    {!Array.isArray(searchResults.groups) || searchResults.groups.length === 0 ? (
                      <div className={styles.emptyResults}>
                        <i className="fas fa-users-slash"></i>
                        <p>No groups found for "{query}"</p>
                      </div>
                    ) : (
                      (Array.isArray(searchResults.groups) ? searchResults.groups : []).map(group => (
                        <div key={group.id} className={styles.groupCard}>
                          <div className={styles.groupAvatar}>
                            {group.avatar_path ? (
                              <img src={`${API_URL}${group.avatar_path}`} alt={group.title} />
                            ) : (
                              group.title?.charAt(0)?.toUpperCase() || 'G'
                            )}
                          </div>
                          <div className={styles.groupInfo}>
                            <h3>{group.title}</h3>
                            {group.description && <p>{group.description}</p>}
                            <span>{group.member_count} member{group.member_count !== 1 ? 's' : ''}</span>
                          </div>
                          <div className={styles.groupActions}>
                            <button
                              onClick={() => window.location.href = `/groups/${group.id}`}
                              className="btn-outline"
                            >
                              View Group
                            </button>
                            {!group.is_member && group.membership_status !== 'pending' && (
                              <button
                                onClick={() => handleGroupJoin(group.id)}
                                className="btn-primary"
                              >
                                Join Group
                              </button>
                            )}
                            {group.membership_status === 'pending' && (
                              <button className="btn-outline" disabled>
                                Request Sent
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activeTab === 'posts' && (
                  <div className={styles.postsResults}>
                    <div className={styles.emptyResults}>
                      <i className="fas fa-search"></i>
                      <p>Post search coming soon!</p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {!loading && !error && !query && (
            <div className={styles.noSearchState}>
              <i className="fas fa-search"></i>
              <h2>Search Ripple</h2>
              <p>Find people, groups, and content you're interested in</p>
            </div>
          )}
        </div>
      </MainLayout>
    </RouteGuard>
  )
}