import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import ThemeProvider from '@/components/ThemeProvider';
import AuthInitializer from '@/components/AuthInitializer';
import SidebarLayout from '@/components/SidebarLayout';
import { ToastProvider } from '@/components/ToastContainer';
import Script from 'next/script';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Ripple - Connect with others',
  description: 'A modern social network application',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        {/* Add a script to help with hydration issues */}
        <Script id="handle-hydration-error" strategy="beforeInteractive">
          {`
            (function() {
              // Remove any unexpected elements that might cause hydration errors
              window.addEventListener('load', function() {
                setTimeout(function() {
                  const unexpectedElements = document.querySelectorAll('[id^="loom-companion"], [ext-id]');
                  unexpectedElements.forEach(function(el) {
                    if (el && el.parentNode) {
                      el.parentNode.removeChild(el);
                    }
                  });
                }, 0);
              });
            })();
          `}
        </Script>
        
        <ThemeProvider>
          <ToastProvider>
            <AuthInitializer>
              <SidebarLayout>
                {children}
              </SidebarLayout>
            </AuthInitializer>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}