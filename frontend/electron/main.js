const { app, BrowserWindow, Menu, shell, ipcMain, Notification, safeStorage, session } = require('electron')
const path = require('path')
const fs = require('fs')
const isDev = process.env.NODE_ENV === 'development'

let mainWindow
let splashWindow

// Session management
const sessionDataPath = path.join(app.getPath('userData'), 'session.json')

function saveSessionData(data) {
  try {
    if (safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(JSON.stringify(data))
      fs.writeFileSync(sessionDataPath, encrypted)
    } else {
      // Fallback for systems without encryption
      fs.writeFileSync(sessionDataPath, JSON.stringify(data))
    }
  } catch (error) {
    console.error('Failed to save session:', error)
  }
}

function loadSessionData() {
  try {
    if (fs.existsSync(sessionDataPath)) {
      const data = fs.readFileSync(sessionDataPath)
      
      if (safeStorage.isEncryptionAvailable()) {
        const decrypted = safeStorage.decryptString(data)
        return JSON.parse(decrypted)
      } else {
        return JSON.parse(data.toString())
      }
    }
  } catch (error) {
    console.error('Failed to load session:', error)
    // Clean up corrupted session file
    try {
      fs.unlinkSync(sessionDataPath)
    } catch (e) {
      console.error('Failed to clean corrupted session:', e)
    }
  }
  return null
}

function clearSessionData() {
  try {
    if (fs.existsSync(sessionDataPath)) {
      fs.unlinkSync(sessionDataPath)
    }
  } catch (error) {
    console.error('Failed to clear session:', error)
  }
}

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    alwaysOnTop: true,
    transparent: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  splashWindow.loadFile(path.join(__dirname, 'splash.html'))
  
  splashWindow.on('closed', () => {
    splashWindow = null
  })
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false, // Don't show until ready
    icon: path.join(__dirname, 'assets/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true
    }
  })

  // Load the Next.js app
  const startUrl = isDev 
    ? 'http://localhost:3000/chat'
    : 'http://localhost:3000/chat'
  
  mainWindow.loadURL(startUrl)

  // Handle window ready
  mainWindow.once('ready-to-show', () => {
    if (splashWindow) {
      splashWindow.close()
    }
    mainWindow.show()
    
    // Load saved session data
    const sessionData = loadSessionData()
    if (sessionData) {
      mainWindow.webContents.send('restore-session', sessionData)
    }
    
    // Focus on the window
    if (isDev) {
      mainWindow.webContents.openDevTools()
    }
  })

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Open registration page in external browser
    if (url.includes('/register') || url.includes('register')) {
      shell.openExternal('http://localhost:3000/register')
      return { action: 'deny' }
    }
    
    // Open other external links in browser
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url)
      return { action: 'deny' }
    }
    
    return { action: 'allow' }
  })

  // Handle navigation
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl)
    
    // Allow navigation within the app
    if (parsedUrl.origin === 'http://localhost:3000' || parsedUrl.origin === 'file://') {
      return
    }
    
    // Block external navigation
    event.preventDefault()
    shell.openExternal(navigationUrl)
  })
}

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Chat',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('new-chat')
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Logout',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('logout')
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit()
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectall' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' },
        {
          label: 'Always on Top',
          type: 'checkbox',
          click: (menuItem) => {
            if (mainWindow) {
              mainWindow.setAlwaysOnTop(menuItem.checked)
            }
          }
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About Ripple Messenger',
          click: () => {
            require('electron').dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Ripple Messenger',
              message: 'Ripple Messenger',
              detail: 'A real-time messaging application built with Electron and Next.js'
            })
          }
        }
      ]
    }
  ]

  // macOS specific menu adjustments
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideothers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    })

    // Window menu
    template[4].submenu = [
      { role: 'close' },
      { role: 'minimize' },
      { role: 'zoom' },
      { type: 'separator' },
      { role: 'front' }
    ]
  }

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

// App event handlers
app.whenReady().then(() => {
  createSplashWindow()
  
  // Create main window after a short delay
  setTimeout(() => {
    createMainWindow()
    createMenu()
  }, 2000)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// IPC handlers for desktop features
ipcMain.handle('show-notification', async (event, options) => {
  if (Notification.isSupported()) {
    new Notification({
      title: options.title || 'Ripple Messenger',
      body: options.body || '',
      icon: path.join(__dirname, 'assets/icon.png'),
      silent: options.silent || false
    }).show()
  }
})

ipcMain.handle('get-app-version', () => {
  return app.getVersion()
})

ipcMain.handle('get-platform', () => {
  return process.platform
})

// Session management IPC handlers
ipcMain.handle('save-session', async (event, sessionData) => {
  saveSessionData(sessionData)
  return true
})

ipcMain.handle('load-session', async () => {
  return loadSessionData()
})

ipcMain.handle('clear-session', async () => {
  clearSessionData()
  return true
})

// Cookie and local storage persistence
ipcMain.handle('get-cookies', async (event, domain) => {
  const cookies = await session.defaultSession.cookies.get({ domain })
  return cookies
})

ipcMain.handle('set-cookie', async (event, cookie) => {
  await session.defaultSession.cookies.set(cookie)
  return true
})

// Handle app protocol for deep linking (optional)
app.setAsDefaultProtocolClient('ripple')