'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Bell, Shield, Palette, Moon, Sun, Monitor } from 'lucide-react';
import Avatar from '@/components/Avatar';
import Button from '@/components/Button';
import Input from '@/components/Input';
import useAuthStore from '@/store/auth';
import useThemeStore from '@/store/theme';
import { useToast } from '@/components/ToastContainer';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  email: z.string().email('Invalid email address'),
  bio: z.string().max(160, 'Bio must be 160 characters or less').optional(),
  website: z.string().url('Invalid URL').or(z.literal('')).optional(),
  location: z.string().max(30, 'Location must be 30 characters or less').optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type PasswordFormData = z.infer<typeof passwordSchema>;

type SettingsTab = 'profile' | 'account' | 'notifications' | 'privacy' | 'appearance';

export default function SettingsPage() {
  const { user, setUser } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      username: user?.username || '',
      email: user?.email || '',
      bio: user?.bio || '',
      website: '',
      location: '',
    },
  });
  
  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors },
    reset: resetPassword,
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });
  
  const onProfileSubmit = async (data: ProfileFormData) => {
    if (!user) return;
    
    setIsSubmitting(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Update user data
    setUser({
      ...user,
      name: data.name,
      username: data.username,
      email: data.email,
      bio: data.bio || user.bio,
    });
    
    setIsSubmitting(false);
    
    showToast({
      type: 'success',
      title: 'Profile updated',
      message: 'Your profile information has been updated successfully.',
    });
  };
  
  const onPasswordSubmit = async (data: PasswordFormData) => {
    setIsSubmitting(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setIsSubmitting(false);
    resetPassword();
    
    showToast({
      type: 'success',
      title: 'Password updated',
      message: 'Your password has been changed successfully.',
    });
  };
  
  const tabs = [
    { id: 'profile', label: 'Profile', icon: <User size={20} /> },
    { id: 'account', label: 'Account', icon: <Shield size={20} /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={20} /> },
    { id: 'privacy', label: 'Privacy', icon: <Shield size={20} /> },
    { id: 'appearance', label: 'Appearance', icon: <Palette size={20} /> },
  ] as const;
  
  if (!user) return null;
  
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row">
          {/* Tabs sidebar */}
          <div className="sm:w-64 border-b sm:border-b-0 sm:border-r border-gray-200 dark:border-gray-700">
            <nav className="flex sm:flex-col overflow-x-auto sm:overflow-x-visible">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  className={`flex items-center px-4 py-3 whitespace-nowrap sm:whitespace-normal transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary/5 text-primary border-b-2 sm:border-b-0 sm:border-l-2 border-primary'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750'
                  }`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <span className="mr-3">{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
          
          {/* Tab content */}
          <div className="flex-1 p-6">
            {activeTab === 'profile' && (
              <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <Avatar 
                    src={user.avatar} 
                    alt={user.name} 
                    size="xl"
                  />
                  
                  <div>
                    <h2 className="text-lg font-medium">Profile Picture</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                      Upload a new profile picture
                    </p>
                    <Button variant="outline" size="sm">
                      Change Photo
                    </Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <Input
                    label="Name"
                    error={profileErrors.name?.message}
                    {...registerProfile('name')}
                  />
                  
                  <Input
                    label="Username"
                    error={profileErrors.username?.message}
                    {...registerProfile('username')}
                  />
                  
                  <Input
                    label="Email"
                    type="email"
                    error={profileErrors.email?.message}
                    {...registerProfile('email')}
                  />
                  
                  <Input
                    label="Website"
                    error={profileErrors.website?.message}
                    {...registerProfile('website')}
                  />
                  
                  <Input
                    label="Location"
                    error={profileErrors.location?.message}
                    {...registerProfile('location')}
                  />
                  
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium mb-1">
                      Bio
                    </label>
                    <textarea
                      {...registerProfile('bio')}
                      className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none h-24 dark:bg-gray-800"
                    />
                    {profileErrors.bio?.message && (
                      <p className="mt-1 text-sm text-error">
                        {profileErrors.bio.message}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Brief description for your profile. Maximum 160 characters.
                    </p>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <Button type="submit" isLoading={isSubmitting}>
                    Save Changes
                  </Button>
                </div>
              </form>
            )}
            
            {activeTab === 'account' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-lg font-medium mb-4">Change Password</h2>
                  <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-4">
                    <Input
                      label="Current Password"
                      type="password"
                      error={passwordErrors.currentPassword?.message}
                      {...registerPassword('currentPassword')}
                    />
                    
                    <Input
                      label="New Password"
                      type="password"
                      error={passwordErrors.newPassword?.message}
                      {...registerPassword('newPassword')}
                    />
                    
                    <Input
                      label="Confirm New Password"
                      type="password"
                      error={passwordErrors.confirmPassword?.message}
                      {...registerPassword('confirmPassword')}
                    />
                    
                    <div className="flex justify-end">
                      <Button type="submit" isLoading={isSubmitting}>
                        Update Password
                      </Button>
                    </div>
                  </form>
                </div>
                
                <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-medium mb-4">Account Management</h2>
                  
                  <div className="space-y-4">
                    <Button variant="outline">
                      Download Your Data
                    </Button>
                    
                    <Button variant="danger">
                      Delete Account
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <h2 className="text-lg font-medium mb-4">Notification Preferences</h2>
                
                <div className="space-y-4">
                  {[
                    { id: 'likes', label: 'Likes', description: 'When someone likes your post' },
                    { id: 'comments', label: 'Comments', description: 'When someone comments on your post' },
                    { id: 'follows', label: 'New Followers', description: 'When someone follows you' },
                    { id: 'mentions', label: 'Mentions', description: 'When someone mentions you in a post' },
                    { id: 'messages', label: 'Direct Messages', description: 'When you receive a new message' },
                  ].map((item) => (
                    <div key={item.id} className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">{item.label}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {item.description}
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                      </label>
                    </div>
                  ))}
                </div>
                
                <div className="flex justify-end">
                  <Button>
                    Save Preferences
                  </Button>
                </div>
              </div>
            )}
            
            {activeTab === 'privacy' && (
              <div className="space-y-6">
                <h2 className="text-lg font-medium mb-4">Privacy Settings</h2>
                
                <div className="space-y-4">
                  {[
                    { id: 'profile_visibility', label: 'Profile Visibility', description: 'Who can see your profile' },
                    { id: 'post_visibility', label: 'Post Visibility', description: 'Default visibility for new posts' },
                    { id: 'message_requests', label: 'Message Requests', description: 'Who can send you message requests' },
                    { id: 'search_visibility', label: 'Search Visibility', description: 'Allow your profile to appear in search results' },
                  ].map((item) => (
                    <div key={item.id} className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">{item.label}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {item.description}
                        </p>
                      </div>
                      <select className="bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary">
                        <option>Everyone</option>
                        <option>Followers only</option>
                        <option>Nobody</option>
                      </select>
                    </div>
                  ))}
                </div>
                
                <div className="flex justify-end">
                  <Button>
                    Save Settings
                  </Button>
                </div>
              </div>
            )}
            
            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <h2 className="text-lg font-medium mb-4">Appearance Settings</h2>
                
                <div>
                  <h3 className="font-medium mb-3">Theme</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <button
                      className={`flex flex-col items-center p-4 rounded-lg border ${
                        theme === 'light'
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 dark:border-gray-700'
                      }`}
                      onClick={() => setTheme('light')}
                    >
                      <Sun size={24} className="mb-2" />
                      <span>Light</span>
                    </button>
                    
                    <button
                      className={`flex flex-col items-center p-4 rounded-lg border ${
                        theme === 'dark'
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 dark:border-gray-700'
                      }`}
                      onClick={() => setTheme('dark')}
                    >
                      <Moon size={24} className="mb-2" />
                      <span>Dark</span>
                    </button>
                    
                    <button
                      className={`flex flex-col items-center p-4 rounded-lg border ${
                        theme === 'system'
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 dark:border-gray-700'
                      }`}
                      onClick={() => setTheme('system')}
                    >
                      <Monitor size={24} className="mb-2" />
                      <span>System</span>
                    </button>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium mb-3">Font Size</h3>
                  <div className="flex items-center">
                    <span className="text-sm mr-2">A</span>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      defaultValue="3"
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                    />
                    <span className="text-lg ml-2">A</span>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <Button>
                    Save Preferences
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}