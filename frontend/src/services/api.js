// frontend/src/services/api.js
const API_URL = 'http://localhost:8080/api';

// Helper function for API requests
const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_URL}${endpoint}`;
  
  // Default headers
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  // Include credentials for cookies
  const config = {
    ...options,
    headers,
    credentials: 'include',
  };
  
  try {
    const response = await fetch(url, config);
    
    // Handle unauthorized errors
    if (response.status === 401) {
      // Redirect to login if unauthorized
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new Error('Unauthorized');
    }
    
    // Handle other errors
    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Something went wrong');
    }
    
    // Parse JSON response
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`API Request Error: ${endpoint}`, error);
    throw error;
  }
};

// Authentication API
export const authAPI = {
  // Login
  login: async (email, password) => {
    return apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },
  
  // Register
  register: async (userData) => {
    return apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },
  
  // Logout
  logout: async () => {
    return apiRequest('/auth/logout', {
      method: 'POST',
    });
  },
  
  // Get current user
  getCurrentUser: async () => {
    return apiRequest('/auth/me');
  },
};

// Posts API
export const postsAPI = {
  // Create post
  createPost: async (postData) => {
    // Use FormData for file uploads
    const formData = new FormData();
    
    if (postData.content) {
      formData.append('content', postData.content);
    }
    
    if (postData.privacy) {
      formData.append('privacy', postData.privacy);
    }
    
    if (postData.image) {
      formData.append('image', postData.image);
    }
    
    // If privacy is private and we have specific users to share with
    if (postData.privacy === 'private' && postData.sharedWith) {
      formData.append('sharedWith', JSON.stringify(postData.sharedWith));
    }
    
    return fetch(`${API_URL}/posts`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    }).then(response => {
      if (!response.ok) {
        throw new Error('Failed to create post');
      }
      return response.json();
    });
  },
  
  // Get feed
  getFeed: async (limit = 10, offset = 0) => {
    return apiRequest(`/posts/feed?limit=${limit}&offset=${offset}`);
  },
  
  // Get user posts
  getUserPosts: async (userId, limit = 10, offset = 0) => {
    return apiRequest(`/users/${userId}/posts?limit=${limit}&offset=${offset}`);
  },
  
  // Get post
  getPost: async (postId) => {
    return apiRequest(`/posts/${postId}`);
  },
  
  // Update post
  updatePost: async (postId, postData) => {
    // Use FormData for file uploads
    const formData = new FormData();
    
    if (postData.content) {
      formData.append('content', postData.content);
    }
    
    if (postData.privacy) {
      formData.append('privacy', postData.privacy);
    }
    
    if (postData.image) {
      formData.append('image', postData.image);
    }
    
    return fetch(`${API_URL}/posts/${postId}`, {
      method: 'PUT',
      credentials: 'include',
      body: formData,
    }).then(response => {
      if (!response.ok) {
        throw new Error('Failed to update post');
      }
      return response.json();
    });
  },
  
  // Delete post
  deletePost: async (postId) => {
    return apiRequest(`/posts/${postId}`, {
      method: 'DELETE',
    });
  },
  
  // Like post
  likePost: async (postId) => {
    return apiRequest(`/posts/${postId}/like`, {
      method: 'POST',
    });
  },
  
  // Unlike post
  unlikePost: async (postId) => {
    return apiRequest(`/posts/${postId}/unlike`, {
      method: 'POST',
    });
  },
  
  // Get comments
  getComments: async (postId) => {
    return apiRequest(`/posts/${postId}/comments`);
  },
  
  // Create comment
  createComment: async (postId, commentData) => {
    // Use FormData for file uploads
    const formData = new FormData();
    
    if (commentData.content) {
      formData.append('content', commentData.content);
    }
    
    if (commentData.image) {
      formData.append('image', commentData.image);
    }
    
    return fetch(`${API_URL}/posts/${postId}/comments`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    }).then(response => {
      if (!response.ok) {
        throw new Error('Failed to create comment');
      }
      return response.json();
    });
  },
  
  // Update comment
  updateComment: async (commentId, commentData) => {
    // Use FormData for file uploads
    const formData = new FormData();
    
    if (commentData.content) {
      formData.append('content', commentData.content);
    }
    
    if (commentData.image) {
      formData.append('image', commentData.image);
    }
    
    return fetch(`${API_URL}/comments/${commentId}`, {
      method: 'PUT',
      credentials: 'include',
      body: formData,
    }).then(response => {
      if (!response.ok) {
        throw new Error('Failed to update comment');
      }
      return response.json();
    });
  },
  
  // Delete comment
  deleteComment: async (commentId) => {
    return apiRequest(`/comments/${commentId}`, {
      method: 'DELETE',
    });
  },
};

// Profile API
export const profileAPI = {
  // Get profile
  getProfile: async (userId) => {
    return apiRequest(`/users/${userId}`);
  },
  
  // Update profile
  updateProfile: async (profileData) => {
    // Use FormData for file uploads
    const formData = new FormData();
    
    Object.entries(profileData).forEach(([key, value]) => {
      if (key !== 'avatar' && key !== 'coverPhoto') {
        formData.append(key, value);
      }
    });
    
    if (profileData.avatar) {
      formData.append('avatar', profileData.avatar);
    }
    
    if (profileData.coverPhoto) {
      formData.append('coverPhoto', profileData.coverPhoto);
    }
    
    return fetch(`${API_URL}/users/me`, {
      method: 'PUT',
      credentials: 'include',
      body: formData,
    }).then(response => {
      if (!response.ok) {
        throw new Error('Failed to update profile');
      }
      return response.json();
    });
  },
  
  // Toggle profile public status
  togglePublicStatus: async () => {
    return apiRequest('/users/me/public', {
      method: 'PUT',
    });
  },
  
  // Get followers
  getFollowers: async (userId, limit = 10, offset = 0) => {
    return apiRequest(`/users/${userId}/followers?limit=${limit}&offset=${offset}`);
  },
  
  // Get following
  getFollowing: async (userId, limit = 10, offset = 0) => {
    return apiRequest(`/users/${userId}/following?limit=${limit}&offset=${offset}`);
  },
  
  // Follow user
  followUser: async (userId) => {
    return apiRequest(`/users/${userId}/follow`, {
      method: 'POST',
    });
  },
  
  // Unfollow user
  unfollowUser: async (userId) => {
    return apiRequest(`/users/${userId}/unfollow`, {
      method: 'POST',
    });
  },
};

export default {
  auth: authAPI,
  posts: postsAPI,
  profile: profileAPI,
};