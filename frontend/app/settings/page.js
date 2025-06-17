'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import RouteGuard from '../../components/Auth/RouteGuard'
import MainLayout from '../../components/Layout/MainLayout'
import styles from './page.module.css'

export default function SettingsPage() {
  const { user, updateUser } = useAuth()
  const [activeTab, setActiveTab] = useState('profile')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  // Profile settings
  const [profileData, setProfileData] = useState({
    first_name: '',
    last_name: '',
    nickname: '',
    about_me: '',
    is_public: true
  })

  // Password change
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  })

  // Notification preferences
  const [notificationSettings, setNotificationSettings] = useState({
    email_notifications: true,
    push_notifications: true,
    group_invitations: true,
    follow_requests: true,
    event_reminders: true
  })

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

  useEffect(() => {
    if (user) {
      setProfileData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        nickname: user.nickname || '',
        about_me: user.about_me || '',
        is_public: user.is_public !== undefined ? user.is_public : true
      })
    }
  }, [user])

  const handleProfileChange = (e) => {
    const { name, value, type, checked } = e.target
    setProfileData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handlePasswordChange = (e) => {
    const { name, value } = e.target
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleNotificationChange = (e) => {
    const { name, checked } = e.target
    setNotificationSettings(prev => ({
      ...prev,
      [name]: checked
    }))
  }

  const saveProfile = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setError('')

    try {
      const response = await fetch(`${API_URL}/api/auth/profile/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(profileData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Failed to update profile')
      }

      const data = await response.json()
      updateUser(data.data)
      setMessage('Profile updated successfully!')
      
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setError(err.message)
      setTimeout(() => setError(''), 5000)
    } finally {
      setLoading(false)
    }
  }

  const changePassword = async (e) => {
    e.preventDefault()
    
    if (passwordData.new_password !== passwordData.confirm_password) {
      setError('New passwords do not match')
      setTimeout(() => setError(''), 5000)
      return
    }

    if (passwordData.new_password.length < 6) {
      setError('New password must be at least 6 characters long')
      setTimeout(() => setError(''), 5000)
      return
    }

    setLoading(true)
    setMessage('')
    setError('')

    try {
      const response = await fetch(`${API_URL}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          current_password: passwordData.current_password,
          new_password: passwordData.new_password
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Failed to change password')
      }

      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: ''
      })
      setMessage('Password changed successfully!')
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setError(err.message)
      setTimeout(() => setError(''), 5000)
    } finally {
      setLoading(false)
    }
  }

  const saveNotifications = async (e) => {
    e.preventDefault()
    setMessage('Notification preferences saved!')
    setTimeout(() => setMessage(''), 3000)
  }

  const deleteAccount = async () => {
    if (!window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return
    }

    if (!window.confirm('This will permanently delete all your data, posts, and connections. Are you absolutely sure?')) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/api/auth/delete-account`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (response.ok) {
        window.location.href = '/'
      } else {
        throw new Error('Failed to delete account')
      }
    } catch (err) {
      setError('Failed to delete account. Please try again.')
      setTimeout(() => setError(''), 5000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <RouteGuard requireAuth={true}>
      <MainLayout currentPage="settings">
        <div className={styles.settingsContainer}>
          <div className={styles.settingsHeader}>
            <h1>Settings</h1>
            <p>Manage your account preferences and privacy settings</p>
          </div>

          {message && (
            <div className={styles.successMessage}>
              <i className="fas fa-check-circle"></i>
              {message}
            </div>
          )}

          {error && (
            <div className={styles.errorMessage}>
              <i className="fas fa-exclamation-triangle"></i>
              {error}
            </div>
          )}

          <div className={styles.settingsLayout}>
            {/* Settings Navigation */}
            <div className={styles.settingsNav}>
              <button
                className={`${styles.navItem} ${activeTab === 'profile' ? styles.active : ''}`}
                onClick={() => setActiveTab('profile')}
              >
                <i className="fas fa-user"></i>
                Profile
              </button>
              <button
                className={`${styles.navItem} ${activeTab === 'privacy' ? styles.active : ''}`}
                onClick={() => setActiveTab('privacy')}
              >
                <i className="fas fa-shield-alt"></i>
                Privacy
              </button>
              <button
                className={`${styles.navItem} ${activeTab === 'password' ? styles.active : ''}`}
                onClick={() => setActiveTab('password')}
              >
                <i className="fas fa-lock"></i>
                Password
              </button>
              <button
                className={`${styles.navItem} ${activeTab === 'notifications' ? styles.active : ''}`}
                onClick={() => setActiveTab('notifications')}
              >
                <i className="fas fa-bell"></i>
                Notifications
              </button>
              <button
                className={`${styles.navItem} ${activeTab === 'danger' ? styles.active : ''}`}
                onClick={() => setActiveTab('danger')}
              >
                <i className="fas fa-exclamation-triangle"></i>
                Danger Zone
              </button>
            </div>

            {/* Settings Content */}
            <div className={styles.settingsContent}>
              {activeTab === 'profile' && (
                <div className={styles.settingsSection}>
                  <h2>Profile Information</h2>
                  <p>Update your profile details and personal information</p>
                  
                  <form onSubmit={saveProfile} className={styles.settingsForm}>
                    <div className={styles.formRow}>
                      <div className={styles.formGroup}>
                        <label htmlFor="first_name">First Name</label>
                        <input
                          type="text"
                          id="first_name"
                          name="first_name"
                          value={profileData.first_name}
                          onChange={handleProfileChange}
                          required
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label htmlFor="last_name">Last Name</label>
                        <input
                          type="text"
                          id="last_name"
                          name="last_name"
                          value={profileData.last_name}
                          onChange={handleProfileChange}
                          required
                        />
                      </div>
                    </div>

                    <div className={styles.formGroup}>
                      <label htmlFor="nickname">Nickname (Optional)</label>
                      <input
                        type="text"
                        id="nickname"
                        name="nickname"
                        value={profileData.nickname}
                        onChange={handleProfileChange}
                        placeholder="@username"
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label htmlFor="about_me">About Me</label>
                      <textarea
                        id="about_me"
                        name="about_me"
                        value={profileData.about_me}
                        onChange={handleProfileChange}
                        rows={4}
                        placeholder="Tell others about yourself..."
                      />
                    </div>

                    <button type="submit" className="btn-primary" disabled={loading}>
                      {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </form>
                </div>
              )}

              {activeTab === 'privacy' && (
                <div className={styles.settingsSection}>
                  <h2>Privacy Settings</h2>
                  <p>Control who can see your profile and content</p>
                  
                  <form onSubmit={saveProfile} className={styles.settingsForm}>
                    <div className={styles.privacyOption}>
                      <div className={styles.optionInfo}>
                        <h3>Public Profile</h3>
                        <p>Allow anyone to see your profile and follow you without approval</p>
                      </div>
                      <label className={styles.switch}>
                        <input
                          type="checkbox"
                          name="is_public"
                          checked={profileData.is_public}
                          onChange={handleProfileChange}
                        />
                        <span className={styles.slider}></span>
                      </label>
                    </div>

                    <button type="submit" className="btn-primary" disabled={loading}>
                      {loading ? 'Saving...' : 'Save Privacy Settings'}
                    </button>
                  </form>
                </div>
              )}

              {activeTab === 'password' && (
                <div className={styles.settingsSection}>
                  <h2>Change Password</h2>
                  <p>Update your password to keep your account secure</p>
                  
                  <form onSubmit={changePassword} className={styles.settingsForm}>
                    <div className={styles.formGroup}>
                      <label htmlFor="current_password">Current Password</label>
                      <input
                        type="password"
                        id="current_password"
                        name="current_password"
                        value={passwordData.current_password}
                        onChange={handlePasswordChange}
                        required
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label htmlFor="new_password">New Password</label>
                      <input
                        type="password"
                        id="new_password"
                        name="new_password"
                        value={passwordData.new_password}
                        onChange={handlePasswordChange}
                        required
                        minLength={6}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label htmlFor="confirm_password">Confirm New Password</label>
                      <input
                        type="password"
                        id="confirm_password"
                        name="confirm_password"
                        value={passwordData.confirm_password}
                        onChange={handlePasswordChange}
                        required
                        minLength={6}
                      />
                    </div>

                    <button type="submit" className="btn-primary" disabled={loading}>
                      {loading ? 'Changing...' : 'Change Password'}
                    </button>
                  </form>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className={styles.settingsSection}>
                  <h2>Notification Preferences</h2>
                  <p>Choose what notifications you want to receive</p>
                  
                  <form onSubmit={saveNotifications} className={styles.settingsForm}>
                    <div className={styles.notificationOption}>
                      <div className={styles.optionInfo}>
                        <h3>Email Notifications</h3>
                        <p>Receive notifications via email</p>
                      </div>
                      <label className={styles.switch}>
                        <input
                          type="checkbox"
                          name="email_notifications"
                          checked={notificationSettings.email_notifications}
                          onChange={handleNotificationChange}
                        />
                        <span className={styles.slider}></span>
                      </label>
                    </div>

                    <div className={styles.notificationOption}>
                      <div className={styles.optionInfo}>
                        <h3>Group Invitations</h3>
                        <p>Get notified when someone invites you to a group</p>
                      </div>
                      <label className={styles.switch}>
                        <input
                          type="checkbox"
                          name="group_invitations"
                          checked={notificationSettings.group_invitations}
                          onChange={handleNotificationChange}
                        />
                        <span className={styles.slider}></span>
                      </label>
                    </div>

                    <div className={styles.notificationOption}>
                      <div className={styles.optionInfo}>
                        <h3>Follow Requests</h3>
                        <p>Get notified when someone wants to follow you</p>
                      </div>
                      <label className={styles.switch}>
                        <input
                          type="checkbox"
                          name="follow_requests"
                          checked={notificationSettings.follow_requests}
                          onChange={handleNotificationChange}
                        />
                        <span className={styles.slider}></span>
                      </label>
                    </div>

                    <div className={styles.notificationOption}>
                      <div className={styles.optionInfo}>
                        <h3>Event Reminders</h3>
                        <p>Get reminded about upcoming events</p>
                      </div>
                      <label className={styles.switch}>
                        <input
                          type="checkbox"
                          name="event_reminders"
                          checked={notificationSettings.event_reminders}
                          onChange={handleNotificationChange}
                        />
                        <span className={styles.slider}></span>
                      </label>
                    </div>

                    <button type="submit" className="btn-primary" disabled={loading}>
                      {loading ? 'Saving...' : 'Save Preferences'}
                    </button>
                  </form>
                </div>
              )}

              {activeTab === 'danger' && (
                <div className={styles.settingsSection}>
                  <h2>Danger Zone</h2>
                  <p>Irreversible and destructive actions</p>
                  
                  <div className={styles.dangerZone}>
                    <div className={styles.dangerAction}>
                      <div className={styles.dangerInfo}>
                        <h3>Delete Account</h3>
                        <p>Permanently delete your account and all associated data. This action cannot be undone.</p>
                      </div>
                      <button 
                        onClick={deleteAccount}
                        className={styles.dangerButton}
                        disabled={loading}
                      >
                        {loading ? 'Deleting...' : 'Delete Account'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </MainLayout>
    </RouteGuard>
  )
}