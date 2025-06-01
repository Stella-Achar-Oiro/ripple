'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import styles from './RegisterForm.module.css'

export default function RegisterForm() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    date_of_birth: '',
    nickname: '',
    about_me: '',
  })
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [avatarPreview, setAvatarPreview] = useState(null)
  const fileInputRef = useRef(null)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      setErrors(prev => ({ 
        ...prev, 
        avatar: 'Image size should be less than 5MB' 
      }))
      return
    }

    if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
      setErrors(prev => ({ 
        ...prev, 
        avatar: 'Only JPEG, PNG and GIF images are allowed' 
      }))
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      setAvatarPreview(e.target.result)
    }
    reader.readAsDataURL(file)
    setErrors(prev => ({ ...prev, avatar: '' }))
  }

  const validateForm = () => {
    const newErrors = {}
    
    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid'
    }
    
    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters'
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain uppercase, lowercase and number'
    }
    
    // Name validation
    if (!formData.first_name) {
      newErrors.first_name = 'First name is required'
    }
    
    if (!formData.last_name) {
      newErrors.last_name = 'Last name is required'
    }
    
    // Date of birth validation
    if (!formData.date_of_birth) {
      newErrors.date_of_birth = 'Date of birth is required'
    } else {
      const birthDate = new Date(formData.date_of_birth)
      const today = new Date()
      let age = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--
      }
      
      if (age < 13) {
        newErrors.date_of_birth = 'You must be at least 13 years old'
      }
    }
    
    // Optional field validations
    if (formData.nickname && formData.nickname.length > 50) {
      newErrors.nickname = 'Nickname must be less than 50 characters'
    }
    
    if (formData.about_me && formData.about_me.length > 500) {
      newErrors.about_me = 'About me must be less than 500 characters'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const getPasswordStrength = () => {
    const { password } = formData
    if (!password) return { strength: 0, label: '' }
    
    let strength = 0
    if (password.length >= 8) strength += 1
    if (/[A-Z]/.test(password)) strength += 1
    if (/[a-z]/.test(password)) strength += 1
    if (/\d/.test(password)) strength += 1
    if (/[^A-Za-z0-9]/.test(password)) strength += 1
    
    const labels = ['Weak', 'Fair', 'Good', 'Strong', 'Excellent']
    return { 
      strength, 
      label: labels[strength - 1] || ''
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    setIsSubmitting(true)
    setSubmitError('')
    
    try {
      // Create FormData for file upload
      const formDataToSend = new FormData()
      
      // Add all text fields
      Object.keys(formData).forEach(key => {
        if (formData[key]) {
          formDataToSend.append(key, formData[key])
        }
      })
      
      // Add avatar if exists
      if (fileInputRef.current && fileInputRef.current.files[0]) {
        formDataToSend.append('avatar', fileInputRef.current.files[0])
      }
      
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        body: formDataToSend,
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.message || 'Registration failed')
      }
      
      // Registration successful
      router.push('/feed')
    } catch (error) {
      setSubmitError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const passwordStrength = getPasswordStrength()

  return (
    <form className={styles.registerForm} onSubmit={handleSubmit}>
      <h2 className={styles.formTitle}>Create Your Account</h2>
      
      {submitError && (
        <div className={styles.errorMessage}>{submitError}</div>
      )}
      
      <div className={styles.formGroup}>
        <label className={styles.formLabel} htmlFor="email">
          Email <span className={styles.required}>*</span>
        </label>
        <input
          type="email"
          id="email"
          name="email"
          className={`${styles.formInput} ${errors.email ? styles.inputError : ''}`}
          placeholder="Enter your email"
          value={formData.email}
          onChange={handleChange}
          required
        />
        {errors.email && <div className={styles.errorText}>{errors.email}</div>}
      </div>
      
      <div className={styles.formGroup}>
        <label className={styles.formLabel} htmlFor="password">
          Password <span className={styles.required}>*</span>
        </label>
        <input
          type="password"
          id="password"
          name="password"
          className={`${styles.formInput} ${errors.password ? styles.inputError : ''}`}
          placeholder="Create a password"
          value={formData.password}
          onChange={handleChange}
          required
        />
        {formData.password && (
          <div className={styles.passwordStrength}>
            <div className={styles.strengthBar}>
              <div 
                className={styles.strengthFill} 
                style={{ 
                  width: `${(passwordStrength.strength / 5) * 100}%`,
                  backgroundColor: 
                    passwordStrength.strength <= 1 ? 'var(--error-red)' :
                    passwordStrength.strength <= 3 ? 'var(--warning-yellow)' : 
                    'var(--success-green)'
                }}
              ></div>
            </div>
            <span className={styles.strengthLabel}>{passwordStrength.label}</span>
          </div>
        )}
        {errors.password && <div className={styles.errorText}>{errors.password}</div>}
        <div className={styles.passwordHint}>
          Password must be at least 8 characters and include uppercase, lowercase, and numbers
        </div>
      </div>
      
      <div className={styles.nameFields}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel} htmlFor="first_name">
            First Name <span className={styles.required}>*</span>
          </label>
          <input
            type="text"
            id="first_name"
            name="first_name"
            className={`${styles.formInput} ${errors.first_name ? styles.inputError : ''}`}
            placeholder="First name"
            value={formData.first_name}
            onChange={handleChange}
            required
          />
          {errors.first_name && <div className={styles.errorText}>{errors.first_name}</div>}
        </div>
        
        <div className={styles.formGroup}>
          <label className={styles.formLabel} htmlFor="last_name">
            Last Name <span className={styles.required}>*</span>
          </label>
          <input
            type="text"
            id="last_name"
            name="last_name"
            className={`${styles.formInput} ${errors.last_name ? styles.inputError : ''}`}
            placeholder="Last name"
            value={formData.last_name}
            onChange={handleChange}
            required
          />
          {errors.last_name && <div className={styles.errorText}>{errors.last_name}</div>}
        </div>
      </div>
      
      <div className={styles.formGroup}>
        <label className={styles.formLabel} htmlFor="date_of_birth">
          Date of Birth <span className={styles.required}>*</span>
        </label>
        <input
          type="date"
          id="date_of_birth"
          name="date_of_birth"
          className={`${styles.formInput} ${errors.date_of_birth ? styles.inputError : ''}`}
          value={formData.date_of_birth}
          onChange={handleChange}
          required
        />
        {errors.date_of_birth && <div className={styles.errorText}>{errors.date_of_birth}</div>}
      </div>
      
      <div className={styles.formGroup}>
        <label className={styles.formLabel} htmlFor="avatar">
          Profile Picture <span className={styles.optional}>(optional)</span>
        </label>
        <div className={styles.avatarUpload}>
          <div 
            className={styles.avatarPreview}
            onClick={() => fileInputRef.current.click()}
          >
            {avatarPreview ? (
              <Image 
                src={avatarPreview} 
                alt="Avatar preview" 
                width={100} 
                height={100}
                className={styles.avatarImage}
              />
            ) : (
              <div className={styles.avatarPlaceholder}>
                <span>Click to upload</span>
              </div>
            )}
          </div>
          <input
            type="file"
            id="avatar"
            name="avatar"
            ref={fileInputRef}
            className={styles.fileInput}
            onChange={handleAvatarChange}
            accept="image/jpeg,image/png,image/gif"
          />
        </div>
        {errors.avatar && <div className={styles.errorText}>{errors.avatar}</div>}
      </div>
      
      <div className={styles.formGroup}>
        <label className={styles.formLabel} htmlFor="nickname">
          Nickname <span className={styles.optional}>(optional)</span>
        </label>
        <input
          type="text"
          id="nickname"
          name="nickname"
          className={`${styles.formInput} ${errors.nickname ? styles.inputError : ''}`}
          placeholder="Your nickname"
          value={formData.nickname}
          onChange={handleChange}
          maxLength={50}
        />
        <div className={styles.charCounter}>
          {formData.nickname.length}/50 characters
        </div>
        {errors.nickname && <div className={styles.errorText}>{errors.nickname}</div>}
      </div>
      
      <div className={styles.formGroup}>
        <label className={styles.formLabel} htmlFor="about_me">
          About Me <span className={styles.optional}>(optional)</span>
        </label>
        <textarea
          id="about_me"
          name="about_me"
          className={`${styles.formTextarea} ${errors.about_me ? styles.inputError : ''}`}
          placeholder="Tell us about yourself"
          value={formData.about_me}
          onChange={handleChange}
          maxLength={500}
          rows={4}
        ></textarea>
        <div className={styles.charCounter}>
          {formData.about_me.length}/500 characters
        </div>
        {errors.about_me && <div className={styles.errorText}>{errors.about_me}</div>}
      </div>
      
      <button 
        type="submit" 
        className={styles.btnRegister}
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Creating Account...' : 'Create Account'}
      </button>
      
      <div className={styles.registerFooter}>
        Already have an account? <Link href="/" className={styles.registerLink}>Sign in</Link>
      </div>
    </form>
  )
}