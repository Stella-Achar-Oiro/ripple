'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '../../contexts/AuthContext'
import { useWebSocket } from '../../contexts/WebSocketContext'
import styles from './SuggestedGroups.module.css'

export default function SuggestedGroups() {
  const [recommendations, setRecommendations] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [joiningGroups, setJoiningGroups] = useState(new Set())

  const { user } = useAuth()
  const { groupMembershipChanged } = useWebSocket()

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

  // Fetch group recommendations
  const fetchRecommendations = async () => {
    if (!user) return

    try {
      setIsLoading(true)
      setError('')

      const response = await fetch(`${API_URL}/api/groups/recommendations?limit=3`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch recommendations')
      }

      const data = await response.json()
      if (data.success && data.data) {
        setRecommendations(data.data.recommendations || [])
      } else {
        setRecommendations([])
      }
    } catch (err) {
      console.error('Error fetching group recommendations:', err)
      setError('Failed to load recommendations')
      setRecommendations([])
    } finally {
      setIsLoading(false)
    }
  }

  // Handle joining a group
  const handleJoinGroup = async (groupId) => {
    if (joiningGroups.has(groupId)) return

    try {
      setJoiningGroups(prev => new Set([...prev, groupId]))

      const response = await fetch(`${API_URL}/api/groups/join`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ group_id: groupId }),
      })

      if (!response.ok) {
        throw new Error('Failed to join group')
      }

      // Remove the joined group from recommendations
      setRecommendations(prev => prev.filter(rec => rec.group.id !== groupId))

      // Refresh recommendations to get a new one
      setTimeout(fetchRecommendations, 1000)

    } catch (err) {
      console.error('Error joining group:', err)
      // Could show a toast notification here
    } finally {
      setJoiningGroups(prev => {
        const newSet = new Set(prev)
        newSet.delete(groupId)
        return newSet
      })
    }
  }

  // Fetch recommendations on mount and when user changes
  useEffect(() => {
    fetchRecommendations()
  }, [user])

  // Refresh recommendations when group membership changes
  useEffect(() => {
    if (groupMembershipChanged) {
      fetchRecommendations()
    }
  }, [groupMembershipChanged])

  if (!user) return null

  return (
    <div className={styles.widget}>
      <div className={styles.widgetHeader}>
        <span>Suggested Groups</span>
        {!isLoading && recommendations.length > 0 && (
          <Link href="/groups/browse" className={styles.seeAllLink}>
            See all
          </Link>
        )}
      </div>

      <div className={styles.widgetContent}>
        {isLoading && (
          <div className={styles.loadingState}>
            <i className="fas fa-spinner fa-spin"></i>
            <span>Loading recommendations...</span>
          </div>
        )}

        {error && (
          <div className={styles.errorState}>
            <i className="fas fa-exclamation-triangle"></i>
            <span>{error}</span>
          </div>
        )}

        {!isLoading && !error && recommendations.length === 0 && (
          <div className={styles.emptyState}>
            <i className="fas fa-users"></i>
            <span>No group recommendations available</span>
            <Link href="/groups/browse" className={styles.browseLink}>
              Browse all groups
            </Link>
          </div>
        )}

        {!isLoading && !error && recommendations.length > 0 && (
          <div className={styles.recommendationsList}>
            {recommendations.map((recommendation) => (
              <div key={recommendation.group.id} className={styles.groupCard}>
                <Link href={`/groups/${recommendation.group.id}`} className={styles.groupLink}>
                  <div className={styles.groupHeader}>
                    {recommendation.group.avatar_path ? (
                      <img
                        src={`${API_URL}${recommendation.group.avatar_path}`}
                        alt={recommendation.group.title}
                        className={styles.groupAvatar}
                      />
                    ) : (
                      <div className={styles.groupAvatarPlaceholder}>
                        <i className="fas fa-users"></i>
                      </div>
                    )}
                  </div>

                  <div className={styles.groupInfo}>
                    <div className={styles.groupName}>
                      {recommendation.group.title}
                    </div>

                    <div className={styles.groupMeta}>
                      <span className={styles.memberCount}>
                        {recommendation.group.member_count || 0} members
                      </span>

                      {recommendation.followed_members_count > 0 && (
                        <span className={styles.followedMembers}>
                          {recommendation.followed_members_count} people you follow
                        </span>
                      )}
                    </div>

                    {recommendation.group.description && (
                      <div className={styles.groupDescription}>
                        {recommendation.group.description.length > 60
                          ? `${recommendation.group.description.substring(0, 60)}...`
                          : recommendation.group.description
                        }
                      </div>
                    )}
                  </div>
                </Link>

                <div className={styles.groupActions}>
                  <button
                    className={styles.joinButton}
                    onClick={(e) => {
                      e.preventDefault()
                      handleJoinGroup(recommendation.group.id)
                    }}
                    disabled={joiningGroups.has(recommendation.group.id)}
                  >
                    {joiningGroups.has(recommendation.group.id) ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i>
                        Joining...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-plus"></i>
                        Join
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
