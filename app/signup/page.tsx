// Path: app/signup/page.tsx
// Version: 3.0.0 - Redirect to unified signin/signup page
// Date: 2025-12-18
// Purpose: Redirect /signup to /signin?mode=signup for unified form management

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function SignUpRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to signin page with signup mode
    router.replace('/signin?mode=signup');
  }, [router]);

  // Show a brief loading state while redirecting
  return (
    <div className="min-h-screen bg-gradient-to-br from-gabriola-green to-green-700 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-white animate-spin mx-auto mb-4" />
        <p className="text-white text-lg">Taking you to sign up...</p>
      </div>
    </div>
  );
}
