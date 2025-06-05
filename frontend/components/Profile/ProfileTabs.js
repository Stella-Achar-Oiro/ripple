import styles from './ProfileTabs.module.css'

export default function ProfileTabs({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'posts', label: 'Posts', icon: 'fas fa-th-large' },
    { id: 'followers', label: 'Followers', icon: 'fas fa-user-friends' },
    { id: 'following', label: 'Following', icon: 'fas fa-user-plus' }
  ]
  
  return (
    <div className={styles.tabsContainer}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          <i className={tab.icon}></i>
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  )
}