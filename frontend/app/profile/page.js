'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../contexts/AuthContext'

export default function ProfileIndexPage() {
  const router = useRouter()
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      // Redirect to the user's profile page
      router.push(`/profile/${user.id}`)
    }
  }, [user, router])
}