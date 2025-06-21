'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import RouteGuard from '../../../components/Auth/RouteGuard'
import { useAuth } from '../../../contexts/AuthContext'
import Layout from '../../../components/Layout/MainLayout'
import ProfileHeader from '../../../components/Profile/ProfileHeader'
import ProfileTabs from '../../../components/Profile/ProfileTabs'
import ProfilePosts from '../../../components/Profile/ProfilePosts'
import ProfileFollowers from '../../../components/Profile/ProfileFollowers'
import ProfileFollowing from '../../../components/Profile/ProfileFollowing'
import styles from './profile.module.css'

export default function ProfilePage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState(null) // Start with no tab selected
  const [profile, setProfile] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isCurrentUser, setIsCurrentUser] = useState(false)

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
  
  // Fetch profile data
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return // Wait for user to be loaded

      setIsLoading(true)
      setError(null)

      try {
        const targetUserId = params.id
        const isOwnProfile = String(targetUserId) === String(user.id)
        setIsCurrentUser(isOwnProfile)

        // Fetch the requested profile
        let profileData
        if (isOwnProfile) {
          // Use the current user data from context
          profileData = { data: user }
        } else {
          // Use the user profile endpoint for other users
          const profileResponse = await fetch(`${API_URL}/api/users/${targetUserId}`, {
            credentials: 'include'
          })

          if (!profileResponse.ok) {
            if (profileResponse.status === 404) {
              throw new Error('User not found')
            }
            throw new Error('Failed to fetch profile')
          }

          profileData = await profileResponse.json()
        }

        setProfile(profileData.data)
      } catch (err) {
        console.error('Error fetching profile:', err)
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfile()
  }, [params.id, user, API_URL])
  
  // Handle privacy toggle
  const handlePrivacyToggle = async (isPublic) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/profile/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_public: isPublic }),
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error('Failed to update profile privacy')
      }
      
      // Update local state
      setProfile(prev => ({
        ...prev,
        is_public: isPublic
      }))
    } catch (err) {
      console.error('Error updating privacy:', err)
      // Show error notification
    }
  }

  // Handle profile update from edit modal
  const handleProfileUpdate = (updatedProfile) => {
    setProfile(updatedProfile)
    // Note: The auth context will be updated when the user refreshes or navigates
    // For real-time updates, we could add an updateUser function to the auth context
  }

  // Prepare loading component
  const loadingComponent = (
    <div className={styles.loadingContainer}>
      <div className={styles.loadingSpinner}></div>
      <p>Loading profile...</p>
    </div>
  )

  // Prepare error component
  const errorComponent = (
    <div className={styles.errorContainer}>
      <h2>Error</h2>
      <p>{error}</p>
      <button
        className={styles.backButton}
        onClick={() => router.push('/feed')}
      >
        Back to Feed
      </button>
    </div>
  )

  // Prepare not found component
  const notFoundComponent = (
    <div className={styles.errorContainer}>
      <h2>Profile Not Found</h2>
      <p>The requested profile could not be found.</p>
      <button
        className={styles.backButton}
        onClick={() => router.push('/feed')}
      >
        Back to Feed
      </button>
    </div>
  )

  // Determine what to show in main content
  const shouldShowError = error || (!isLoading && !profile)
  const currentErrorComponent = error ? errorComponent : notFoundComponent

  // Check if current user can view this profile
  const canViewProfile = isCurrentUser || profile?.is_public || profile?.is_following

  return (
    <RouteGuard requireAuth={true}>
      <Layout
        currentPage="profile"
        isLoading={isLoading}
        error={shouldShowError}
        loadingComponent={loadingComponent}
        errorComponent={currentErrorComponent}
      >
        <div className={styles.profileContainer}>
          <ProfileHeader
            profile={profile}
            isCurrentUser={isCurrentUser}
            onPrivacyToggle={handlePrivacyToggle}
            onProfileUpdate={handleProfileUpdate}
          />

          {canViewProfile ? (
            <>
              <ProfileTabs
                activeTab={activeTab}
                onTabChange={setActiveTab}
              />

              {!activeTab && (
                <div className={styles.profileWelcome}>
                  <div className={styles.welcomeContent}>
                    <h3>Welcome to {isCurrentUser ? 'your' : `${profile.first_name}'s`} profile!</h3>
                    <p>Click on the tabs above to explore {isCurrentUser ? 'your' : 'their'} posts, followers, and following.</p>
                  </div>
                </div>
              )}

              {activeTab === 'posts' && profile.id && (
                <ProfilePosts key={`posts-${profile.id}`} userId={profile.id} />
              )}

              {activeTab === 'followers' && (
                <ProfileFollowers userId={profile.id} />
              )}

              {activeTab === 'following' && (
                <ProfileFollowing userId={profile.id} />
              )}
            </>
          ) : (
            <div className={styles.privateProfileMessage}>
              <i className="fas fa-lock"></i>
              <h3>This profile is private</h3>
              <p>Follow this user to see their posts and activity.</p>
            </div>
          )}
        </div>
      </Layout>
    </RouteGuard>
  )
}
