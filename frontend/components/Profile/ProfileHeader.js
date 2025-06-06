import { useState } from 'react'
import ProfileEditModal from './ProfileEditModal'
import styles from './ProfileHeader.module.css'

export default function ProfileHeader({ profile, isCurrentUser, onPrivacyToggle, onProfileUpdate }) {
  const [isFollowing, setIsFollowing] = useState(profile.is_following)
  const [isLoading, setIsLoading] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
  
  const handleFollowToggle = async () => {
    setIsLoading(true)
    
    try {
      const endpoint = isFollowing 
        ? `${API_URL}/api/follows/${profile.id}/unfollow` 
        : `${API_URL}/api/follows/${profile.id}/follow`
      
      const response = await fetch(endpoint, {
        method: 'POST',
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error('Failed to update follow status')
      }
      
      setIsFollowing(!isFollowing)
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
          {profile.avatar_path ? (
            <img
              src={`${API_URL}${profile.avatar_path}`}
              alt={`${profile.first_name} ${profile.last_name}`}
            />
          ) : (
            <div className={styles.avatarPlaceholder}>
              {profile.first_name.charAt(0)}{profile.last_name.charAt(0)}
            </div>
          )}
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
              className={`${styles.followButton} ${isFollowing ? styles.following : ''}`}
              onClick={handleFollowToggle}
              disabled={isLoading}
            >
              {isLoading ? (
                <span className={styles.buttonLoader}></span>
              ) : isFollowing ? (
                <>Following <i className="fas fa-check"></i></>
              ) : (
                <>Follow <i className="fas fa-plus"></i></>
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