'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import RouteGuard from '../../components/Auth/RouteGuard'
import MainLayout from '../../components/Layout/MainLayout'
import Avatar from '../../components/shared/Avatar'
import ImageModal from '../../components/shared/ImageModal'
import ConfirmationModal from '../../components/shared/ConfirmationModal'
import styles from './page.module.css'

function SearchContent() {
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
  const [showImageModal, setShowImageModal] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const [showUnfollowConfirmation, setShowUnfollowConfirmation] = useState(false)
  const [userToUnfollow, setUserToUnfollow] = useState(null)

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
          groups = Array.isArray(groupsData.data?.groups) ? groupsData.data.groups : []
        } else {
          console.warn('Groups search failed:', groupsResponse.status, groupsResponse.statusText)
          // Don't treat this as a critical error, just continue with empty groups
        }
      } catch (groupError) {
        console.warn('Groups search error:', groupError.message)
        // Continue with empty groups array
      }

      // Search posts
      let posts = []
      try {
        const postsResponse = await fetch(`${API_URL}/api/posts/search?q=${encodeURIComponent(searchTerm)}`, {
          credentials: 'include',
        })

        if (postsResponse.ok) {
          const postsData = await postsResponse.json()
          console.log('Posts API response:', postsData)
          posts = Array.isArray(postsData.data?.posts) ? postsData.data.posts : []
        } else {
          console.warn('Posts search failed:', postsResponse.status, postsResponse.statusText)
          // Don't treat this as a critical error, just continue with empty posts
        }
      } catch (postError) {
        console.warn('Posts search error:', postError.message)
        // Continue with empty posts array
      }

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
    // If unfollowing a private user, show confirmation modal
    if (isFollowing) {
      const user = searchResults.users.find(u => u.id === userId)
      if (user && !user.is_public) {
        setUserToUnfollow(user)
        setShowUnfollowConfirmation(true)
        return
      }
    }

    // Proceed with follow/unfollow
    await performFollowToggle(userId, isFollowing)
  }

  const performFollowToggle = async (userId, isFollowing) => {
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

  const handleUnfollowConfirm = async () => {
    if (userToUnfollow) {
      setShowUnfollowConfirmation(false)
      await performFollowToggle(userToUnfollow.id, true)
      setUserToUnfollow(null)
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
                    {!Array.isArray(searchResults.posts) || searchResults.posts.length === 0 ? (
                      <div className={styles.emptyResults}>
                        <i className="fas fa-file-slash"></i>
                        <p>No posts found for "{query}"</p>
                      </div>
                    ) : (
                      (Array.isArray(searchResults.posts) ? searchResults.posts : []).map(post => (
                        <div key={post.id} className={styles.postCard}>
                          <div className={styles.postHeader}>
                            <Link href={`/profile/${post.author.id}`} className={styles.avatarLink}>
                              <Avatar user={post.author} size="medium" />
                            </Link>
                            <div className={styles.postInfo}>
                              <Link href={`/profile/${post.author.id}`} className={styles.authorLink}>
                                <h4>{post.author.first_name} {post.author.last_name}</h4>
                              </Link>
                              {post.author.nickname && <span>@{post.author.nickname}</span>}
                              <time>{new Date(post.created_at).toLocaleDateString()}</time>
                            </div>
                          </div>
                          <div className={styles.postContent}>
                            <p>{post.content}</p>
                            {post.image_path && (
                              <div
                                className={styles.postImage}
                                onClick={() => {
                                  setSelectedImage(`${API_URL}${post.image_path}`)
                                  setShowImageModal(true)
                                }}
                              >
                                <img
                                  src={`${API_URL}${post.image_path}`}
                                  alt="Post image"
                                  loading="lazy"
                                  onLoad={() => {
                                    console.log('Image loaded successfully:', `${API_URL}${post.image_path}`)
                                  }}
                                  onError={(e) => {
                                    console.error('Image failed to load:', e.target.src)
                                    e.target.style.display = 'none'
                                  }}
                                />
                              </div>
                            )}
                          </div>
                          <div className={styles.postStats}>
                            <span><i className="fas fa-heart"></i> {post.likes_count}</span>
                            <span><i className="fas fa-comment"></i> {post.comment_count}</span>
                          </div>
                        </div>
                      ))
                    )}
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
      {/* Image Modal */}
      {selectedImage && (
        <ImageModal
          src={selectedImage}
          alt="Post image"
          isOpen={showImageModal}
          onClose={() => {
            setShowImageModal(false)
            setSelectedImage(null)
          }}
        />
      )}

      <ConfirmationModal
        isOpen={showUnfollowConfirmation}
        onClose={() => {
          setShowUnfollowConfirmation(false)
          setUserToUnfollow(null)
        }}
        onConfirm={handleUnfollowConfirm}
        title="Unfollow Private User"
        message={userToUnfollow ? `Are you sure you want to unfollow ${userToUnfollow.first_name} ${userToUnfollow.last_name}? Since this is a private account, you'll need to send a follow request again if you want to follow them in the future.` : ''}
        confirmText="Unfollow"
        cancelText="Cancel"
        type="warning"
      />
    </div>
  )
}

export default function SearchPage() {
  return (
    <RouteGuard requireAuth={true}>
      <MainLayout currentPage="search">
        <Suspense fallback={<div className="loading-state"><i className="fas fa-spinner fa-spin"></i><span>Loading...</span></div>}>
          <SearchContent />
        </Suspense>
      </MainLayout>
    </RouteGuard>
  )
}