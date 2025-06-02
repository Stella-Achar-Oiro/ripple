'use client'

import MainLayout from '../../components/Layout/MainLayout'
import CreatePost from '../../components/Feed/CreatePost'
import Post from '../../components/Feed/Post'
import OnlineFriends from '../../components/Widgets/OnlineFriends'
import SuggestedGroups from '../../components/Widgets/SuggestedGroups'
import styles from './page.module.css'

export default function FeedPage() {
  const posts = [
    {
      id: 1,
      user: {
        name: 'Sarah Anderson',
        avatar: 'SA',
        initials: 'SA'
      },
      content: 'Just finished an amazing hike in the mountains! The view was absolutely breathtaking. Nothing beats nature\'s therapy 🏔️ #hiking #nature',
      timestamp: '2 hours ago',
      privacy: 'Public',
      hasImage: true,
      imageDescription: 'Mountain View Photo',
      stats: {
        likes: 24,
        comments: 8,
        shares: 3
      },
      isLiked: false
    },
    {
      id: 2,
      user: {
        name: 'Mike Torres',
        avatar: 'MT',
        initials: 'MT'
      },
      content: 'Excited to announce that our team won the hackathon! 🎉 Thanks to everyone who supported us. Hard work really pays off!',
      timestamp: '5 hours ago',
      privacy: 'Friends',
      hasImage: false,
      stats: {
        likes: 42,
        comments: 15,
        shares: 7
      },
      isLiked: true
    }
  ]

  return (
    <MainLayout currentPage="feed">
      <div className={styles.feedLayout}>
        <div className={styles.feedMain}>
          <CreatePost />
          {posts.map(post => (
            <Post key={post.id} post={post} />
          ))}
        </div>
        
        <div className={styles.feedSidebar}>
          <OnlineFriends />
          <SuggestedGroups />
        </div>
      </div>
    </MainLayout>
  )
}
