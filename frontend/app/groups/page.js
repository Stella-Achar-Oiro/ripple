'use client'

import MainLayout from '../../components/Layout/MainLayout'
import GroupCard from '../../components/Groups/GroupCard'
import styles from './page.module.css'

export default function GroupsPage() {
  const groups = [
    {
      id: 1,
      name: 'Photography Enthusiasts',
      members: '1,234',
      newPosts: 5,
      icon: 'fas fa-camera'
    },
    {
      id: 2,
      name: 'Web Developers',
      members: '567',
      newPosts: 12,
      icon: 'fas fa-code'
    },
    {
      id: 3,
      name: 'Hiking Adventures',
      members: '89',
      newPosts: 3,
      icon: 'fas fa-mountain'
    }
  ]

  return (
    <MainLayout currentPage="groups">
      <div className={styles.contentWrapper}>
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Your Groups</h2>
            <button className="btn-primary">Create Group</button>
          </div>
          <div className="card-body">
            <div className={styles.groupsGrid}>
              {groups.map(group => (
                <GroupCard key={group.id} group={group} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
