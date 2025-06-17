'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import RouteGuard from '../../components/Auth/RouteGuard'
import MainLayout from '../../components/Layout/MainLayout'
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
      const usersResponse = await fetch(`${API_URL}/api/auth/search?q=${encodeURIComponent(searchTerm)}`, {
        credentials: 'include',
      })

      let users = []
      if (usersResponse.ok) {
        const usersData = await usersResponse.json()
        users = usersData.data || []
      }

      // Search groups  
      const groupsResponse = await fetch(`${API_URL}/api/groups/search?q=${encodeURIComponent(searchTerm)}`, {
        credentials: 'include',
      })

      let groups = []
      if (groupsResponse.ok) {
        const groupsData = await groupsResponse.json()
        groups = groupsData.data || []
      }

      // Future: Search posts (not implemented in backend yet)
      const posts = []

      setSearchResults({ users, groups, posts })

    } catch (err) {
      console.error('Search error:', err)
      setError('Failed to perform search. Please try again.')
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
        // Update the user in search results
        setSearchResults(prev => ({
          ...prev,
          users: prev.users.map(user => 
            user.id === userId 
              ? { ...user, is_following: !isFollowing }
              : user
          )
        }))
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
          groups: prev.groups.map(group => 
            group.id === groupId 
              ? { ...group, membership_status: 'pending' }
              : group
          )
        }))
      }
    } catch (error) {
      console.error('Error joining group:', error)
    }
  }

  const getTotalResults = () => {
    return searchResults.users.length + searchResults.groups.length + searchResults.posts.length
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
                  Users ({searchResults.users.length})
                </button>
                <button
                  className={`${styles.tab} ${activeTab === 'groups' ? styles.active : ''}`}
                  onClick={() => setActiveTab('groups')}
                >
                  <i className="fas fa-layer-group"></i>
                  Groups ({searchResults.groups.length})
                </button>
                <button
                  className={`${styles.tab} ${activeTab === 'posts' ? styles.active : ''}`}
                  onClick={() => setActiveTab('posts')}
                  disabled
                >
                  <i className="fas fa-file-alt"></i>
                  Posts ({searchResults.posts.length})
                </button>
              </div>

              {/* Search Results */}
              <div className={styles.searchResults}>
                {activeTab === 'users' && (
                  <div className={styles.usersResults}>
                    {searchResults.users.length === 0 ? (
                      <div className={styles.emptyResults}>
                        <i className="fas fa-user-slash"></i>
                        <p>No users found for "{query}"</p>
                      </div>
                    ) : (
                      searchResults.users.map(user => (
                        <div key={user.id} className={styles.userCard}>
                          <div className={styles.userAvatar}>
                            {user.avatar_path ? (
                              <img src={`${API_URL}${user.avatar_path}`} alt={`${user.first_name} ${user.last_name}`} />
                            ) : (
                              `${user.first_name?.charAt(0) || ''}${user.last_name?.charAt(0) || ''}`
                            )}
                          </div>
                          <div className={styles.userInfo}>
                            <h3>{user.first_name} {user.last_name}</h3>
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
                                onClick={() => handleFollowToggle(user.id, user.is_following)}
                                className={user.is_following ? "btn-outline" : "btn-primary"}
                              >
                                {user.is_following ? 'Unfollow' : 'Follow'}
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
                    {searchResults.groups.length === 0 ? (
                      <div className={styles.emptyResults}>
                        <i className="fas fa-users-slash"></i>
                        <p>No groups found for "{query}"</p>
                      </div>
                    ) : (
                      searchResults.groups.map(group => (
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