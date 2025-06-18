'use client'

import { useRouter } from 'next/navigation'
import FollowButton from '../Social/FollowButton'
import styles from './UserCard.module.css'

export default function UserCard({ user, onSelect, showFollowButton = true }) {
  const router = useRouter()

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

  const handleCardClick = () => {
    if (onSelect) {
      onSelect(user)
    }
  }

  const handleFollowChange = ({ status, wasFollowing }) => {
    // Update the user object with new follow status if needed
    // This could be used to update parent component state
    console.log(`Follow status changed for ${user.id}:`, { status, wasFollowing })
  }

  const getInitials = () => {
    if (user.first_name && user.last_name) {
      return `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`
    }
    if (user.email) {
      return user.email.charAt(0).toUpperCase()
    }
    return '?'
  }

  const getDisplayName = () => {
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`
    }
    if (user.nickname) {
      return user.nickname
    }
    return user.email || 'Unknown User'
  }

  const getSubtitle = () => {
    if (user.nickname && user.first_name && user.last_name) {
      return `@${user.nickname}`
    }
    if (user.about_me) {
      return user.about_me.length > 50 
        ? `${user.about_me.substring(0, 50)}...` 
        : user.about_me
    }
    return user.email
  }

  return (
    <div className={styles.userCard} onClick={handleCardClick}>
      <div className={styles.userAvatar}>
        {user.avatar_path ? (
          <img
            src={`${API_URL}${user.avatar_path}`}
            alt={getDisplayName()}
            className={styles.avatarImage}
          />
        ) : (
          <div className={styles.avatarPlaceholder}>
            {getInitials()}
          </div>
        )}
      </div>
      
      <div className={styles.userInfo}>
        <div className={styles.userName}>
          {getDisplayName()}
        </div>
        <div className={styles.userSubtitle}>
          {getSubtitle()}
        </div>
        {user.follower_count !== undefined && (
          <div className={styles.userStats}>
            {user.follower_count} followers
          </div>
        )}
      </div>

      {showFollowButton && (
        <div className={styles.userActions} onClick={(e) => e.stopPropagation()}>
          <FollowButton
            userId={user.id}
            initialFollowStatus={user.is_following ? 'following' : null}
            isPrivateUser={user.is_public === false}
            size="small"
            variant="outline"
            onFollowChange={handleFollowChange}
          />
        </div>
      )}
    </div>
  )
}