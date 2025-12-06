// next.config.js  ←  FINAL VERSION THAT FIXES VERCEL DEPLOY
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',   // ← THIS IS THE CRITICAL LINE (forces SSR, fixes your error)
  
  images: {
    domains: ['gabriolaevents.ca', 'artsgabriola.com', 'hellogabriola.com'],
  },

  experimental: {
    serverComponentsExternalPackages: ['@supabase/supabase-js'],
  },
}

module.exports = nextConfig