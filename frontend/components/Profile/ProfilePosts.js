import { useState, useEffect } from 'react'
import PostList from '../Feed/PostList'
import styles from './ProfilePosts.module.css'

export default function ProfilePosts({ userId }) {
  return (
    <div className={styles.postsContainer}>
      <PostList userId={userId} />
    </div>
  )
}