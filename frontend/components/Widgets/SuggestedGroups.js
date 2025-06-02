import styles from './SuggestedGroups.module.css'

export default function SuggestedGroups() {
  const groups = [
    {
      id: 1,
      name: 'Photography Enthusiasts',
      members: '1.2k',
      icon: 'fas fa-camera'
    }
  ]

  return (
    <div className={styles.widget}>
      <div className={styles.widgetHeader}>
        Suggested Groups
      </div>
      <div className={styles.widgetContent}>
        {groups.map(group => (
          <div key={group.id} className={styles.groupCard}>
            <div className={styles.groupHeader}>
              <i className={group.icon} style={{ fontSize: '24px', color: 'white' }}></i>
            </div>
            <div className={styles.groupInfo}>
              <div className={styles.groupName}>{group.name}</div>
              <div className={styles.groupMeta}>{group.members} members</div>
              <div className={styles.groupActions}>
                <button className="btn-outline" style={{ padding: '6px 12px', fontSize: '12px' }}>
                  Join
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
