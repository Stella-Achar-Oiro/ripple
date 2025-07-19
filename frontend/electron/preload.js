const { contextBridge, ipcRenderer } = require('electron')

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Notification methods
  showNotification: (options) => ipcRenderer.invoke('show-notification', options),
  
  // App info methods
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  
  // Session management
  saveSession: (sessionData) => ipcRenderer.invoke('save-session', sessionData),
  loadSession: () => ipcRenderer.invoke('load-session'),
  clearSession: () => ipcRenderer.invoke('clear-session'),
  
  // Cookie management
  getCookies: (domain) => ipcRenderer.invoke('get-cookies', domain),
  setCookie: (cookie) => ipcRenderer.invoke('set-cookie', cookie),
  
  // Event listeners for menu actions
  onNewChat: (callback) => {
    const subscription = (event, ...args) => callback(...args)
    ipcRenderer.on('new-chat', subscription)
    return () => ipcRenderer.removeListener('new-chat', subscription)
  },
  
  onLogout: (callback) => {
    const subscription = (event, ...args) => callback(...args)
    ipcRenderer.on('logout', subscription)
    return () => ipcRenderer.removeListener('logout', subscription)
  },
  
  // Session restoration
  onRestoreSession: (callback) => {
    const subscription = (event, sessionData) => callback(sessionData)
    ipcRenderer.on('restore-session', subscription)
    return () => ipcRenderer.removeListener('restore-session', subscription)
  },
  
  // Remove listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel)
  }
})

// DOM ready event
document.addEventListener('DOMContentLoaded', () => {
  // Add desktop-specific styles or behavior
  document.body.classList.add('electron-app')
  
  // Add keyboard shortcuts
  document.addEventListener('keydown', (event) => {
    // Ctrl/Cmd + N for new chat
    if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
      event.preventDefault()
      // This will be handled by the React app
      window.dispatchEvent(new CustomEvent('electron-new-chat'))
    }
    
    // Ctrl/Cmd + F for search
    if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
      event.preventDefault()
      window.dispatchEvent(new CustomEvent('electron-search'))
    }
  })
})