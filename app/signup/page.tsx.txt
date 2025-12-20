// app/signup/page.tsx
// v2.0 - Dec 8, 2025 - Separated first/last name fields, improved validation
// v1.0 - Nov 2025 - Initial signup page with single full name field

'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, Mail, Lock, Eye, EyeOff, ArrowLeft, MapPin } from 'lucide-react';

export default function SignUpPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Basic validation
    if (!firstName.trim() || !lastName.trim()) {
      setError('Please enter both first and last name');
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      setLoading(false);
      return;
    }

    try {
      // Combine first and last name
      const fullName = `${firstName.trim()} ${lastName.trim()}`;

      // Check if postal code is V0R (Gabriola Island resident)
      const isResident = postalCode.toUpperCase().startsWith('V0R');

      // Step 1: Sign up with Supabase Auth
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            full_name: fullName,
          },
        },
      });

      if (signUpError) throw signUpError;

      if (!authData.user) {
        throw new Error('Failed to create user account');
      }

      // Step 2: Create user profile in users table
      const { error: profileError } = await supabase.from('users').insert({
        id: authData.user.id,
        email: email.toLowerCase(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        full_name: fullName,
        postal_code: postalCode.trim() || null,
        is_resident: isResident,
        user_role: isResident ? 'resident' : 'visitor',
        profile_visibility: 'public',
        show_in_directory: isResident, // Residents default to visible in directory
      });

      if (profileError) throw profileError;

      // Success! Redirect to home
      router.push('/');
    } catch (err: any) {
      console.error('Signup error:', err);
      setError(err.message || 'Failed to create account. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gabriola-green to-green-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back Button */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-white hover:text-green-100 mb-6 transition"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Home
        </Link>

        {/* Sign Up Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gabriola-green rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Account</h1>
            <p className="text-gray-600">Join the Gabriola community</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              ⚠️ {error}
            </div>
          )}

          {/* Sign Up Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* First Name */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                First Name *
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="First name"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  required
                  className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-gabriola-green focus:border-transparent transition"
                />
              </div>
            </div>

            {/* Last Name */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                Last Name *
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Last name"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  required
                  className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-gabriola-green focus:border-transparent transition"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-gabriola-green focus:border-transparent transition"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full pl-12 pr-12 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-gabriola-green focus:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="mt-2 text-sm text-gray-500">Must be at least 8 characters</p>
            </div>

            {/* Postal Code (Optional) */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                Postal Code (Optional)
              </label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="V0R 1X0"
                  value={postalCode}
                  onChange={e => setPostalCode(e.target.value.toUpperCase())}
                  className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-gabriola-green focus:border-transparent transition"
                />
              </div>
              <p className="mt-2 text-sm text-gray-500">
                💡 V0R postal codes are verified as Gabriola Island residents
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gabriola-green text-white py-4 rounded-xl font-bold text-lg hover:bg-gabriola-green-dark transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          {/* Sign In Link */}
          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Already have an account?{' '}
              <Link href="/signin" className="text-gabriola-green font-bold hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        {/* Privacy Notice */}
        <div className="mt-6 text-center text-sm text-white">
          By creating an account, you agree to our{' '}
          <Link href="/terms" className="underline hover:text-green-100">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="underline hover:text-green-100">
            Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );
}
