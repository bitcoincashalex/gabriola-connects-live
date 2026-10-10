// next.config.js
// Version: 1.2.0
// Updated: 2026-10-10 - Exposes package.json version as NEXT_PUBLIC_APP_VERSION (shown in front page footer)
// Previous: 1.1.0 - Removed unused images block (no next/image usage; closes /_next/image endpoint)
/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: require('./package.json').version,
  },

  output: 'standalone',   // ← THIS IS THE CRITICAL LINE (forces SSR, fixes your error)

  experimental: {
    serverComponentsExternalPackages: ['@supabase/supabase-js'],
  },
}

module.exports = nextConfig
