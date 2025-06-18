'use client'

import { useRouter } from 'next/navigation'
import styles from './GroupCard.module.css'

export default function GroupCard({ 
  group, 
  isMember = false, 
  isJoining = false, 
  onJoinGroup, 
  onGroupUpdate 
}) {
  const router = useRouter()

  const handleViewGroup = () => {
    router.push(`/groups/${group.id}`)
  }

  const handleJoinClick = (e) => {
    e.stopPropagation()
    if (onJoinGroup && !isJoining) {
      onJoinGroup()
    }
  }

  // Format member count
  const formatMemberCount = (count) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`
    }
    return count?.toString() || '0'
  }

  // Get group icon or default
  const getGroupIcon = () => {
    if (group.icon) return group.icon
    
    // Default icons based on group name/category
    const name = group.name?.toLowerCase() || ''
    if (name.includes('photo') || name.includes('camera')) return 'fas fa-camera'
    if (name.includes('code') || name.includes('dev') || name.includes('programming')) return 'fas fa-code'
    if (name.includes('music') || name.includes('song')) return 'fas fa-music'
    if (name.includes('book') || name.includes('read')) return 'fas fa-book'
    if (name.includes('game') || name.includes('gaming')) return 'fas fa-gamepad'
    if (name.includes('food') || name.includes('cook')) return 'fas fa-utensils'
    if (name.includes('travel') || name.includes('adventure')) return 'fas fa-map-marked-alt'
    if (name.includes('fitness') || name.includes('workout')) return 'fas fa-dumbbell'
    if (name.includes('art') || name.includes('design')) return 'fas fa-palette'
    if (name.includes('business') || name.includes('entrepreneur')) return 'fas fa-briefcase'
    
    return 'fas fa-users' // Default group icon
  }

  return (
    <div className={styles.groupCard} onClick={isMember ? handleViewGroup : undefined}>
      <div className={styles.groupHeader}>
        <div className={styles.groupIcon}>
          <i className={getGroupIcon()}></i>
        </div>
        {group.is_private && (
          <div className={styles.privateBadge}>
            <i className="fas fa-lock"></i>
          </div>
        )}
      </div>
      
      <div className={styles.groupInfo}>
        <div className={styles.groupName} title={group.name}>
          {group.name || 'Unnamed Group'}
        </div>
        
        {group.description && (
          <div className={styles.groupDescription} title={group.description}>
            {group.description}
          </div>
        )}
        
        <div className={styles.groupMeta}>
          <div className={styles.metaItem}>
            <i className="fas fa-users"></i>
            <span>{formatMemberCount(group.member_count)} members</span>
          </div>
          {group.recent_posts_count !== undefined && (
            <div className={styles.metaItem}>
              <i className="fas fa-comment"></i>
              <span>{group.recent_posts_count} recent posts</span>
            </div>
          )}
        </div>

        <div className={styles.groupActions}>
          {isMember ? (
            <>
              <button className={styles.primaryBtn} onClick={handleViewGroup}>
                <i className="fas fa-eye"></i>
                View Group
              </button>
              <button 
                className={styles.secondaryBtn}
                onClick={(e) => {
                  e.stopPropagation()
                  router.push(`/groups/${group.id}/settings`)
                }}
              >
                <i className="fas fa-cog"></i>
                Settings
              </button>
            </>
          ) : (
            <>
              <button 
                className={styles.primaryBtn}
                onClick={handleJoinClick}
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
              <button 
                className={styles.secondaryBtn}
                onClick={(e) => {
                  e.stopPropagation()
                  handleViewGroup()
                }}
              >
                <i className="fas fa-info-circle"></i>
                Preview
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
