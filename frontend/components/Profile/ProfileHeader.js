import { useState } from 'react'
import ProfileEditModal from './ProfileEditModal'
import FollowButton from '../Social/FollowButton'
import styles from './ProfileHeader.module.css'

export default function ProfileHeader({ profile, isCurrentUser, onPrivacyToggle, onProfileUpdate }) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [followerCount, setFollowerCount] = useState(profile.follower_count || 0)
  
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

  const handleFollowChange = ({ status, wasFollowing }) => {
    // Update follower count based on follow status change
    if (status === 'following' && !wasFollowing) {
      setFollowerCount(prev => prev + 1)
    } else if (!status && wasFollowing) {
      setFollowerCount(prev => Math.max(0, prev - 1))
    }

    // Notify parent component if needed
    if (onProfileUpdate) {
      onProfileUpdate({
        ...profile,
        is_following: status === 'following',
        follower_count: followerCount
      })
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
            <FollowButton
              userId={profile.id}
              initialFollowStatus={profile.is_following ? 'following' : null}
              isPrivateUser={!profile.is_public}
              size="large"
              variant="primary"
              onFollowChange={handleFollowChange}
            />
          )}
        </div>
        
        <div className={styles.profileStats}>
          <div className={styles.statItem}>
            <span className={styles.statValue}>{profile.post_count || 0}</span>
            <span className={styles.statLabel}>Posts</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statValue}>{followerCount}</span>
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