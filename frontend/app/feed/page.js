'use client'

import { useRef } from 'react'
import RouteGuard from '../../components/Auth/RouteGuard'
import MainLayout from '../../components/Layout/MainLayout'
import CreatePost from '../../components/Feed/CreatePost'
import OnlineFriends from '../../components/Widgets/OnlineFriends'
import SuggestedGroups from '../../components/Widgets/SuggestedGroups'
import PostList from '../../components/Feed/PostList'
import styles from './page.module.css'

export default function FeedPage() {
  const postListRef = useRef()

  const handlePostCreated = () => {
    if (postListRef.current) {
      postListRef.current.refreshPosts()
    }
  }

  return (
    <RouteGuard requireAuth={true}>
      <MainLayout currentPage="feed">
        <div className={styles.feedLayout}>
          <div className={styles.feedMain}>
            <CreatePost onPostCreated={handlePostCreated} />
            <PostList ref={postListRef} />
          </div>

          <div className={styles.feedSidebar}>
            <OnlineFriends />
            {/* <SuggestedGroups /> */}
          </div>
        </div>
      </MainLayout>
    </RouteGuard>
  )
}
