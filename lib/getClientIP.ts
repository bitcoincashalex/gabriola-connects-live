// lib/getClientIP.ts
// Helper to get client IP address from request headers

export function getClientIP(request?: Request): string {
  if (typeof window !== 'undefined') {
    // Client-side: can't get real IP, use placeholder
    return '0.0.0.0';
  }

  if (!request) return '0.0.0.0';

  // Check common headers (Vercel, Cloudflare, etc.)
  const headers = request.headers;
  
  const ip = 
    headers.get('x-real-ip') ||
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('cf-connecting-ip') ||
    headers.get('x-vercel-forwarded-for') ||
    '0.0.0.0';

  return ip;
}

// Client-side version using API route
export async function trackView(postId: string, type: 'post' | 'reply' = 'post') {
  try {
    await fetch('/api/track-view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId, type }),
    });
  } catch (err) {
    console.error('Failed to track view:', err);
  }
}
