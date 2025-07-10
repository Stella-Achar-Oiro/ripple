import { useState, useEffect } from 'react'
import ProfileEditModal from './ProfileEditModal'
import Avatar from '../shared/Avatar'
import styles from './ProfileHeader.module.css'

export default function ProfileHeader({ profile, isCurrentUser, onPrivacyToggle, onProfileUpdate }) {
  const [followStatus, setFollowStatus] = useState({
    is_following: profile.is_following || false,
    is_pending: false,
    is_declined: false,
    can_send_request: true,
    has_pending_request: false
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

  // Fetch detailed follow status when component mounts or profile changes
  useEffect(() => {
    const fetchFollowStatus = async () => {
      if (isCurrentUser || !profile?.id) return

      try {
        const response = await fetch(`${API_URL}/api/follow/status/${profile.id}`, {
          credentials: 'include'
        })

        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setFollowStatus({
              is_following: data.data.is_following || false,
              is_pending: data.data.is_pending || false,
              is_declined: data.data.is_declined || false,
              can_send_request: data.data.can_send_request || false,
              has_pending_request: data.data.has_pending_request || false
            })
          }
        }
      } catch (error) {
        console.error('Error fetching follow status:', error)
      }
    }

    fetchFollowStatus()
  }, [profile?.id, isCurrentUser, API_URL])

  const handleFollowToggle = async () => {
    setIsLoading(true)

    try {
      const endpoint = followStatus.is_following
        ? `${API_URL}/api/unfollow`
        : `${API_URL}/api/follow`

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          user_id: profile.id
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update follow status')
      }

      const data = await response.json()

      if (followStatus.is_following) {
        // Unfollowing - reset to initial state
        setFollowStatus({
          is_following: false,
          is_pending: false,
          is_declined: false,
          can_send_request: true,
          has_pending_request: false
        })
      } else {
        // Following/requesting - update based on response
        const followRequest = data.data?.follow_request
        setFollowStatus({
          is_following: followRequest?.status === 'accepted',
          is_pending: followRequest?.status === 'pending',
          is_declined: false,
          can_send_request: false,
          has_pending_request: followRequest?.status === 'pending'
        })
      }
    } catch (err) {
      console.error('Error updating follow status:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleProfileSave = (updatedProfile) => {
    if (onProfileUpdate) {
      onProfileUpdate(updatedProfile)
    }
  }

  return (
    <div className={styles.profileHeader}>
      <div className={styles.profileCover}>
        {profile.cover_path ? (
          <img
            src={`${API_URL}${profile.cover_path}`}
            alt="Cover photo"
            className={styles.coverImage}
          />
        ) : (
          <div className={styles.coverPlaceholder}></div>
        )}
        {isCurrentUser && (
          <div className={styles.coverEditOverlay}>
            <button
              className={styles.coverEditButton}
              onClick={() => setIsEditModalOpen(true)}
              title="Edit cover photo"
            >
              <i className="fas fa-camera"></i>
            </button>
          </div>
        )}
        <div className={styles.profileAvatar}>
          <Avatar user={profile} size="xlarge" />
          {isCurrentUser && (
            <button
              className={styles.avatarEditButton}
              onClick={() => setIsEditModalOpen(true)}
              title="Edit profile picture"
            >
              <i className="fas fa-camera"></i>
            </button>
          )}
        </div>
      </div>
      
      <div className={styles.profileInfo}>
        <div className={styles.profileNameRow}>
          <h1 className={styles.profileName}>
            {profile.first_name} {profile.last_name}
            {profile.nickname && <span className={styles.nickname}>({profile.nickname})</span>}
          </h1>
          
          {isCurrentUser ? (
            <div className={styles.profileActions}>
              <button
                className={styles.editButton}
                onClick={() => setIsEditModalOpen(true)}
              >
                <i className="fas fa-edit"></i>
                Edit Profile
              </button>
              <div className={styles.privacyToggle}>
                <label className={styles.toggleLabel}>
                  <span>Public Profile</span>
                  <input
                    type="checkbox"
                    checked={profile.is_public}
                    onChange={(e) => onPrivacyToggle(e.target.checked)}
                    className={styles.toggleCheckbox}
                  />
                  <span className={styles.toggleSwitch}></span>
                </label>
              </div>
            </div>
          ) : (
            <button
              className={`${styles.followButton} ${
                followStatus.is_following ? styles.following : ''
              } ${
                followStatus.is_pending ? styles.pending : ''
              }`}
              onClick={handleFollowToggle}
              disabled={isLoading || followStatus.is_pending}
            >
              {isLoading ? (
                <>
                  <span className={styles.buttonLoader}></span>
                  Loading...
                </>
              ) : followStatus.is_following ? (
                <>
                  <i className="fas fa-check"></i>
                  Following
                </>
              ) : followStatus.is_pending ? (
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
        
        <div className={styles.profileStats}>
          <div className={styles.statItem}>
            <span className={styles.statValue}>{profile.post_count || 0}</span>
            <span className={styles.statLabel}>Posts</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statValue}>{profile.follower_count || 0}</span>
            <span className={styles.statLabel}>Followers</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statValue}>{profile.following_count || 0}</span>
            <span className={styles.statLabel}>Following</span>
          </div>
        </div>
        
        {profile.about_me && (
          <div className={styles.profileBio}>
            <p>{profile.about_me}</p>
          </div>
        )}
        
        <div className={styles.profileMeta}>
          <div className={styles.metaItem}>
            <i className="fas fa-envelope"></i>
            <span>{profile.email}</span>
          </div>
          <div className={styles.metaItem}>
            <i className="fas fa-calendar"></i>
            <span>Joined {new Date(profile.created_at).toLocaleDateString()}</span>
          </div>
          {profile.date_of_birth && (
            <div className={styles.metaItem}>
              <i className="fas fa-birthday-cake"></i>
              <span>Born {new Date(profile.date_of_birth).toLocaleDateString()}</span>
            </div>
          )}
          <div className={styles.metaItem}>
            <i className={profile.is_public ? "fas fa-globe" : "fas fa-lock"}></i>
            <span>{profile.is_public ? "Public profile" : "Private profile"}</span>
          </div>
        </div>
      </div>

      <ProfileEditModal
        profile={profile}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleProfileSave}
      />
    </div>
  )
}