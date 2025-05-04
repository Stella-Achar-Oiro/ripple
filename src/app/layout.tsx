import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';
import ThemeProvider from '@/components/ThemeProvider';
import AuthInitializer from '@/components/AuthInitializer';

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
      <body className={inter.className}>
        <ThemeProvider>
          <AuthInitializer>
            <Header />
            {children}
          </AuthInitializer>
        </ThemeProvider>
      </body>
    </html>
  );
}