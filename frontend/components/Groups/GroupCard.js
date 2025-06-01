import styles from './GroupCard.module.css'

export default function GroupCard({ group }) {
  return (
    <div className={styles.groupCard}>
      <div className={styles.groupHeader}>
        <i className={group.icon} style={{ fontSize: '32px', color: 'white' }}></i>
      </div>
      <div className={styles.groupInfo}>
        <div className={styles.groupName}>{group.name}</div>
        <div className={styles.groupMeta}>
          {group.members} members • {group.newPosts} new posts
        </div>
        <div className={styles.groupActions}>
          <button className="btn-primary">View Group</button>
          <button className="btn-outline">Settings</button>
        </div>
      </div>
    </div>
  )
}
