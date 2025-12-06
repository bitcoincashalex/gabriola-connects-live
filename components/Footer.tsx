// components/Footer.tsx — FINAL WITH CORRECT GITHUB URL
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-gabriola-green-dark text-white py-12 mt-auto">
      <div className="max-w-7xl mx-auto px-6 text-center">
        <p className="text-lg mb-4">
          Gabriola Connects is <strong>100% open source</strong> and <strong>free for everyone</strong> to use, copy, modify, and improve.
        </p>
        <p className="text-sm opacity-90 mb-6">
          Built with love for Gabriola Island — no ads, no tracking, no paywalls.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm">
          <Link 
            href="https://github.com/bitcoincashalex/gabriola-connects" 
            target="_blank" 
            className="hover:underline flex items-center gap-2"
          >
            View Source on GitHub
          </Link>
          <span className="hidden sm:inline">•</span>
          <span>
            Licensed under <strong>MIT</strong> — free to reuse with attribution
          </span>
          <span className="hidden sm:inline">•</span>
          <Link href="/strachan" className="hover:underline">
            About This Project
          </Link>
        </div>
        <p className="text-xs mt-8 opacity-70">
          © {new Date().getFullYear()} Gabriola Connects — Open Source Community Hub
        </p>
      </div>
    </footer>
  );
}