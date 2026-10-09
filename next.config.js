// next.config.js
// Version: 1.1.0
// Updated: 2026-10-09 - Removed unused images block (no next/image usage; closes /_next/image endpoint)
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',   // ← THIS IS THE CRITICAL LINE (forces SSR, fixes your error)

  experimental: {
    serverComponentsExternalPackages: ['@supabase/supabase-js'],
  },
}

module.exports = nextConfig
