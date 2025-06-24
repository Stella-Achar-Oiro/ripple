'use client'

import RouteGuard from '../../components/Auth/RouteGuard'
import MainLayout from '../../components/Layout/MainLayout'
import CreatePost from '../../components/Feed/CreatePost'
import OnlineFriends from '../../components/Widgets/OnlineFriends'
import SuggestedGroups from '../../components/Widgets/SuggestedGroups'
import PostList from '../../components/Feed/PostList'
import styles from './page.module.css'
import { useState } from 'react'

export default function FeedPage() {
  const [refreshPosts, setRefreshPosts] = useState(0)
  const handlePostCreated = () => setRefreshPosts(r => r + 1)
  return (
    <RouteGuard requireAuth={true}>
      <MainLayout currentPage="feed">
        <div className={styles.feedLayout}>
          <div className={styles.feedMain}>
            <CreatePost onPostCreated={handlePostCreated} />
            <PostList refreshTrigger={refreshPosts} />
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
