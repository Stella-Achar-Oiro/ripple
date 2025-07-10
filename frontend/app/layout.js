import './globals.css'
import { AuthProvider } from '../contexts/AuthContext'
import { NotificationProvider } from '../contexts/NotificationContext'
import { GroupChatNotificationProvider } from '../contexts/GroupChatNotificationContext'
import { WebSocketProvider } from '../contexts/WebSocketContext'

export const metadata = {
  title: 'Ripple - Social Network',
  description: 'Connect with your world',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
        />
      </head>
      <body>
        <AuthProvider>
          <NotificationProvider>
            <GroupChatNotificationProvider>
              <WebSocketProvider>
                {children}
              </WebSocketProvider>
            </GroupChatNotificationProvider>
          </NotificationProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
