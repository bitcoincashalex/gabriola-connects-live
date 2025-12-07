// app/signin/page.tsx — FINAL: EVERYTHING WORKS
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [isResident, setIsResident] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const [isForgot, setIsForgot] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handlePostalChange = (value: string) => {
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const formatted = cleaned.length > 3 ? `${cleaned.slice(0,3)} ${cleaned.slice(3,6)}` : cleaned;
    setPostalCode(formatted.slice(0,7));
    setIsResident(cleaned.startsWith('V0R'));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    if (isForgot) {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      setMessage(error ? error.message : 'Check your email for reset link!');
    } else if (isSignup) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, username, postal_code: postalCode || null, is_resident: isResident },
        },
      });
      setMessage(error ? error.message : 'Check your email for confirmation link!');
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError('Invalid email or password');
      else window.location.href = '/';
    }
    setLoading(false);
  };

  const handleResend = async () => {
    setLoading(true);
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    setMessage(error ? error.message : 'Confirmation email resent!');
    setLoading(false);
  };

  if (isForgot) {
    return (
      <div className="max-w-md mx-auto mt-32 p-8 bg-white rounded-2xl shadow-xl text-center">
        <h1 className="text-3xl font-bold text-gabriola-green mb-8">Reset Password</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <input type="email" placeholder="Your email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full p-4 border rounded-lg" />
          <button type="submit" disabled={loading} className="w-full bg-gabriola-green text-white py-4 rounded-lg font-bold">
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>
        {message && <p className="mt-6 text-lg">{message}</p>}
        <button onClick={() => setIsForgot(false)} className="mt-6 text-gabriola-green underline">Back</button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-32 p-8 bg-white rounded-2xl shadow-xl">
      <h1 className="text-3xl font-bold text-center mb-8 text-gabriola-green">
        {isSignup ? 'Join Gabriola Connects' : 'Welcome Back'}
      </h1>

      {message ? (
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gabriola-green mb-6">{message}</h2>
          <button onClick={handleResend} disabled={loading} className="bg-gabriola-green text-white px-8 py-3 rounded-lg font-bold mb-4">
            {loading ? 'Sending...' : 'Resend Confirmation Email'}
          </button>
          <button onClick={() => window.location.href = '/'} className="block text-gabriola-green underline">
            Continue to Site →
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full p-4 border rounded-lg" />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full p-4 border rounded-lg" />

          {isSignup && (
            <>
              <input type="text" placeholder="Full Name" value={fullName} onChange={e => setFullName(e.target.value)} required className="w-full p-4 border rounded-lg" />
              <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value.replace(/\s/g,''))} required className="w-full p-4 border rounded-lg" />
              <div>
                <input type="text" placeholder="Postal Code" value={postalCode} onChange={e => handlePostalChange(e.target.value)} className="w-full p-4 border rounded-lg font-mono" />
                {isResident && (
                  <div className="mt-3 p-4 bg-green-50 border-2 border-green-400 rounded-lg text-green-800 font-bold text-center">
                    Welcome, Gabriola Resident!
                  </div>
                )}
              </div>
            </>
          )}

          <button type="submit" disabled={loading} className="w-full bg-gabriola-green text-white py-4 rounded-lg font-bold">
            {loading ? 'Loading...' : isSignup ? 'Create Account' : 'Sign In'}
          </button>
        </form>
      )}

      {error && <p className="text-red-600 text-center mt-4">{error}</p>}

      <div className="text-center mt-8">
        {!isSignup && (
          <button onClick={() => setIsForgot(true)} className="text-gabriola-green underline">
            Forgot password?
          </button>
        )}
        <p className="text-gray-600 mt-4">
          {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button type="button" onClick={() => setIsSignup(!isSignup)} className="text-gabriola-green font-bold underline">
            {isSignup ? 'Sign In' : 'Sign Up'}
          </button>
        </p>
      </div>
    </div>
  );
}