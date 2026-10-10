// next.config.js
// Version: 1.3.0
// Updated: 2026-10-10 - imapflow and mailparser run as normal Node packages (notices email reader)
// Previous: 1.2.0
// Updated: 2026-10-10 - Exposes package.json version as NEXT_PUBLIC_APP_VERSION and the Vercel
//                       commit (first 7 characters) as NEXT_PUBLIC_BUILD_ID, shown in front page footer
// Previous: 1.1.0 - Removed unused images block (no next/image usage; closes /_next/image endpoint)
/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: require('./package.json').version,
    // Set automatically by Vercel on every deploy; empty when building locally
    NEXT_PUBLIC_BUILD_ID: (process.env.VERCEL_GIT_COMMIT_SHA || '').slice(0, 7),
  },

  output: 'standalone',   // ← THIS IS THE CRITICAL LINE (forces SSR, fixes your error)

  experimental: {
    serverComponentsExternalPackages: ['@supabase/supabase-js', 'imapflow', 'mailparser'],
  },
}

module.exports = nextConfig
