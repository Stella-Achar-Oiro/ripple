import { useRouter } from 'next/navigation'
import styles from './GroupCard.module.css'

export default function GroupCard({ group }) {
  const router = useRouter()
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

  // Generate a default icon based on group title
  const getGroupIcon = (title) => {
    const firstLetter = title?.charAt(0)?.toUpperCase() || 'G'
    return firstLetter
  }

  // Format member count
  const formatMemberCount = (count) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`
    }
    return count?.toString() || '0'
  }

  const handleViewGroup = () => {
    router.push(`/groups/${group.id}`)
  }

  return (
    <div className={styles.groupCard}>
      <div
        className={styles.groupHeader}
        style={{
          backgroundImage: group.cover_path
            ? `url(${API_URL}${group.cover_path})`
            : 'linear-gradient(135deg, var(--primary-navy), var(--secondary-navy))'
        }}
      >
        <div className={styles.groupIcon}>
          {group.avatar_path ? (
            <img
              src={`${API_URL}${group.avatar_path}`}
              alt={`${group.title} avatar`}
              className={styles.groupAvatarImage}
            />
          ) : (
            getGroupIcon(group.title)
          )}
        </div>
      </div>
      <div className={styles.groupInfo}>
        <div className={styles.groupName}>{group.title}</div>
        {group.description && (
          <div className={styles.groupDescription}>
            {group.description.length > 100
              ? `${group.description.substring(0, 100)}...`
              : group.description
            }
          </div>
        )}
        <div className={styles.groupMeta}>
          {formatMemberCount(group.member_count)} member{group.member_count !== 1 ? 's' : ''}
          {group.is_creator && (
            <span className={styles.creatorBadge}>
              <i className="fas fa-crown"></i> Creator
            </span>
          )}
        </div>
        <div className={styles.groupActions}>
          <button className="btn-primary" onClick={handleViewGroup}>
            View Group
          </button>
          {group.is_creator && (
            <button className="btn-outline">Settings</button>
          )}
        </div>
      </div>
    </div>
  )
}
