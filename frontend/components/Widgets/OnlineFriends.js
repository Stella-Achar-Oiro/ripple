import styles from './OnlineFriends.module.css'

export default function OnlineFriends() {
  const friends = [
    { id: 1, name: 'Sarah Anderson', initials: 'SA', isOnline: true },
    { id: 2, name: 'Mike Torres', initials: 'MT', isOnline: true },
    { id: 3, name: 'Alex Liu', initials: 'AL', isOnline: true },
    { id: 4, name: 'Emma Brown', initials: 'EB', isOnline: true }
  ]

  return (
    <div className={styles.widget}>
      <div className={styles.widgetHeader}>
        Online Friends ({friends.length})
      </div>
      <div className={styles.widgetContent}>
        <div className={styles.onlineFriends}>
          {friends.map(friend => (
            <div key={friend.id} className={styles.friendItem}>
              <div className="friend-avatar">
                {friend.initials}
                {friend.isOnline && <div className="online-indicator"></div>}
              </div>
              <div className={styles.friendName}>{friend.name}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
