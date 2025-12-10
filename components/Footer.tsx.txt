// components/Footer.tsx
// v1.3 - Dec 8, 2025 - Simplified to two lines, matches production design

import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-gabriola-green-dark text-white py-4 text-center text-xs">
      <div className="max-w-7xl mx-auto px-6">
        <p className="mb-2">
          Open source • Free to use with attribution • MIT license
        </p>
        <p className="opacity-80">
          <Link href="https://github.com/bitcoincashalex/gabriola-connects-live" target="_blank" className="hover:underline">
            GitHub
          </Link>{' '}
          •{' '}
          <Link href="/roadmap" className="hover:underline">
            Roadmap
          </Link>{' '}
          •{' '}
          <Link href="/strachan" className="hover:underline">
            About
          </Link>
        </p>
      </div>
    </footer>
  );
}
