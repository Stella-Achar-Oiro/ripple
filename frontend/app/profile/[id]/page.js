'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
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
  const [activeTab, setActiveTab] = useState('posts')
  const [profile, setProfile] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isCurrentUser, setIsCurrentUser] = useState(false)
  const [currentUserProfile, setCurrentUserProfile] = useState(null)
  
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
  
  // Fetch profile data
  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true)
      setError(null)

      try {
        // First get current user profile to check if viewing own profile
        const currentUserResponse = await fetch(`${API_URL}/api/auth/profile`, {
          credentials: 'include'
        })

        if (!currentUserResponse.ok) {
          // If not authenticated, redirect to login
          if (currentUserResponse.status === 401) {
            router.push('/')
            return
          }
          throw new Error('Failed to fetch current user profile')
        }

        const currentUserData = await currentUserResponse.json()

        setCurrentUserProfile(currentUserData)

        const targetUserId = params.id
        const isOwnProfile = String(targetUserId) === String(currentUserData.data.id)
        setIsCurrentUser(isOwnProfile)

        // Fetch the requested profile
        let profileResponse
        if (isOwnProfile) {
          // Use the current user profile endpoint for own profile
          profileResponse = currentUserResponse
        } else {
          // Use the user profile endpoint for other users
          profileResponse = await fetch(`${API_URL}/api/users/${targetUserId}`, {
            credentials: 'include'
          })
        }

        if (!profileResponse.ok) {
          if (profileResponse.status === 404) {
            throw new Error('User not found')
          }
          throw new Error('Failed to fetch profile')
        }

        const profileData = isOwnProfile ? currentUserData : await profileResponse.json()
        console.log("profile data <<<<<< ", profileData.data)
        setProfile(profileData.data)
      } catch (err) {
        console.error('Error fetching profile:', err)
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfile()
  }, [params.id, router, API_URL])
  
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
  
  if (isLoading) {
    return (
      <Layout currentPage="profile">
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p>Loading profile...</p>
        </div>
      </Layout>
    )
  }
  
  if (error) {
    return (
      <Layout currentPage="profile">
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
      </Layout>
    )
  }
  
  if (!profile) {
    return (
      <Layout currentPage="profile">
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
      </Layout>
    )
  }
  
  // Check if current user can view this profile
  const canViewProfile = isCurrentUser || profile.is_public || profile.is_following
  
  return (
    <Layout currentPage="profile">
      <div className={styles.profileContainer}>
        <ProfileHeader 
          profile={profile}
          isCurrentUser={isCurrentUser}
          onPrivacyToggle={handlePrivacyToggle}
        />
        
        {canViewProfile ? (
          <>
            <ProfileTabs 
              activeTab={activeTab} 
              onTabChange={setActiveTab}
            />
            
            {activeTab === 'posts' && (
              <ProfilePosts userId={profile.id} />
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
  )
}
