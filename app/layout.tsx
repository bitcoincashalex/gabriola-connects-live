// app/layout.tsx
// v4.5.0 - Added LoadingTimeout safety net for infinite loading
// Date: 2024-12-24
import Header from '@/components/Header';
import { AuthProvider } from '@/components/AuthProvider';
import LoadingTimeout from '@/components/LoadingTimeout';
import { Analytics } from '@vercel/analytics/react';
import GoogleAnalytics from '@/components/GoogleAnalytics';
import './globals.css';

export const metadata = {
  title: 'Gabriola Connects',
  description: 'Your Island Community Hub - Events, Forum, Directory, Ferry, and Alerts for Gabriola Island, BC',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Gabriola Connects'
  }
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: '#2d5f3f'
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get Google Analytics ID from environment variable
  const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  return (
    <html lang="en">
      <head>
        {/* PWA Meta Tags */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#2d5f3f" />
        
        {/* iOS PWA Support */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Gabriola" />
        <link rel="apple-touch-icon" href="/icons/icon-180x180.png" />
        
        {/* Android/Chrome PWA Support */}
        <meta name="mobile-web-app-capable" content="yes" />
        
        {/* Windows PWA Support */}
        <meta name="msapplication-TileColor" content="#2d5f3f" />
        <meta name="msapplication-TileImage" content="/icons/icon-144x144.png" />
      </head>
      <body className="min-h-screen flex flex-col bg-gray-50">
        {/* Google Analytics - only loads if ID is set */}
        {GA_MEASUREMENT_ID && <GoogleAnalytics measurementId={GA_MEASUREMENT_ID} />}
        
        <AuthProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <LoadingTimeout />
        </AuthProvider>
        
        {/* Vercel Analytics */}
        <Analytics />
      </body>
    </html>
  );
}
