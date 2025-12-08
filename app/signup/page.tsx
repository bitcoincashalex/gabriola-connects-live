// app/signup/page.tsx
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { User, Mail, Lock, MapPin, Loader2 } from 'lucide-react';

export default function SignUpPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    // Validation
    if (!firstName.trim() || !lastName.trim()) {
      setError('Please enter your first and last name');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
      });

      if (authError) throw authError;

      if (authData.user) {
        // 2. Create user profile
        const isResident = postalCode.trim().toUpperCase().startsWith('V0R');
        
        const { error: profileError } = await supabase.from('users').insert({
          id: authData.user.id,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.toLowerCase().trim(),
          postal_code: postalCode.trim().toUpperCase() || null,
          is_resident: isResident,
          user_role: isResident ? 'resident' : 'visitor',
          created_at: new Date().toISOString(),
        });

        if (profileError) throw profileError;

        setMessage('Account created! Redirecting...');
        setTimeout(() => {
          window.location.href = '/';
        }, 1500);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create account');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gabriola-green to-gabriola-green-dark flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gabriola-green-dark mb-2">
            Join Gabriola Connects
          </h1>
          <p className="text-gray-600">Create your account</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-6 p-4 bg-green-50 border-2 border-green-200 rounded-lg text-green-700">
            {message}
          </div>
        )}

        <form onSubmit={handleSignUp} className="space-y-5">
          {/* First Name */}
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
            <input
              type="text"
              placeholder="First Name"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              required
              className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-gabriola-green focus:border-transparent transition"
            />
          </div>

          {/* Last Name */}
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
            <input
              type="text"
              placeholder="Last Name"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              required
              className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-gabriola-green focus:border-transparent transition"
            />
          </div>

          {/* Email */}
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-gabriola-green focus:border-transparent transition"
            />
          </div>

          {/* Postal Code */}
          <div className="relative">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
            <input
              type="text"
              placeholder="Postal Code (V0R 1X0)"
              value={postalCode}
              onChange={e => setPostalCode(e.target.value)}
              className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-gabriola-green focus:border-transparent transition"
            />
            <p className="text-xs text-gray-500 mt-2 ml-1">
              Gabriola residents (V0R postal codes) get full access
            </p>
          </div>

          {/* Password */}
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-gabriola-green focus:border-transparent transition"
            />
          </div>

          {/* Confirm Password */}
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
            <input
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-gabriola-green focus:border-transparent transition"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gabriola-green text-white py-4 rounded-xl font-bold text-lg hover:bg-gabriola-green-dark transition disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {loading ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                Creating Account...
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <p className="text-center text-gray-600 mt-6">
          Already have an account?{' '}
          <Link href="/signin" className="text-gabriola-green font-bold hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
