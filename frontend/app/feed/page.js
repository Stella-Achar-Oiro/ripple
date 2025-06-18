'use client'

import { useState } from 'react'
import RouteGuard from '../../components/Auth/RouteGuard'
import MainLayout from '../../components/Layout/MainLayout'
import CreatePost from '../../components/Feed/CreatePost'
import OnlineFriends from '../../components/Widgets/OnlineFriends'
import SuggestedGroups from '../../components/Widgets/SuggestedGroups'
import PostList from '../../components/Feed/PostList'
import styles from './page.module.css'

export default function FeedPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handlePostCreated = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  return (
    <RouteGuard requireAuth={true}>
      <MainLayout currentPage="feed">
        <div className={styles.feedLayout}>
          <div className={styles.feedMain}>
            <CreatePost onPostCreated={handlePostCreated} />
            <PostList refreshTrigger={refreshTrigger} />
          </div>

          <div className={styles.feedSidebar}>
            <OnlineFriends />
            <SuggestedGroups />
          </div>
        </div>
      </MainLayout>
    </RouteGuard>
  )
}
