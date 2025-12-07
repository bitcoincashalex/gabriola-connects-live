// app/layout.tsx — FINAL, WORKING 100%
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { AuthProvider } from '@/components/AuthProvider';
import './globals.css';

export const metadata = {
  title: 'Gabriola Connects',
  description: 'Your Island Community Hub',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-gray-50">
        <AuthProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}