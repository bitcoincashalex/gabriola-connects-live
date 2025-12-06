// app/layout.tsx — FINAL: Header + Footer + No Banner
import Header from '@/components/Header';
import Footer from '@/components/Footer';
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
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />  {/* ← FOOTER IS BACK */}
      </body>
    </html>
  );
}