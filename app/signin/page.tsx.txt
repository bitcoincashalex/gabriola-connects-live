// Path: app/signin/page.tsx
// Version: 2.2.2 - Fixed user lookup using maybeSingle() instead of single()
// Date: 2024-12-13

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Eye, EyeOff, CheckCircle, AlertCircle, Mail, Lock, User, MapPin, Loader2 } from 'lucide-react';

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
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Weak passwords list
  const weakPasswords = [
    'password', '12345678', 'password123', 'qwerty123', 'abc12345',
    'password1', 'welcome1', 'admin123', 'letmein1', '11111111'
  ];

  const isWeakPassword = (pwd: string): boolean => {
    return weakPasswords.includes(pwd.toLowerCase());
  };

  const getPasswordStrength = (pwd: string): { text: string; color: string; icon: any } => {
    if (pwd.length < 8) {
      return { text: 'Too short - minimum 8 characters', color: 'orange', icon: AlertCircle };
    }
    if (isWeakPassword(pwd)) {
      return { text: 'Too weak - please choose a stronger password', color: 'red', icon: AlertCircle };
    }
    if (pwd.length >= 12) {
      return { text: 'Strong password', color: 'green', icon: CheckCircle };
    }
    return { text: 'Good password', color: 'green', icon: CheckCircle };
  };

  const handlePostalChange = (value: string) => {
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const formatted = cleaned.length > 3 ? `${cleaned.slice(0,3)} ${cleaned.slice(3,6)}` : cleaned;
    setPostalCode(formatted.slice(0,7));
    setIsResident(cleaned.startsWith('V0R'));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    // Validate password for signup
    if (isSignup) {
      if (password.length < 8) {
        setError('Password must be at least 8 characters long');
        setLoading(false);
        return;
      }
      if (isWeakPassword(password)) {
        setError('Password is too weak. Please avoid common passwords like "password" or "12345678".');
        setLoading(false);
        return;
      }
    }

    try {
      if (isForgot) {
        // Password reset
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        
        if (error) {
          setError(error.message);
        } else {
          setMessage('Password reset link sent! Check your email.');
        }
        setLoading(false);
        
      } else if (isSignup) {
        // Sign up
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { 
              full_name: fullName, 
              username,
              postal_code: postalCode || null,
              is_resident: isResident
            },
          },
        });
        
        if (error) {
          if (error.message.includes('already registered')) {
            setError('This email is already registered. Please sign in instead.');
          } else {
            setError(error.message);
          }
          setLoading(false);
        } else if (data.user) {
          // Set welcome flags and redirect immediately
          sessionStorage.setItem('justSignedUp', 'true');
          sessionStorage.setItem('newUserName', fullName);
          window.location.href = '/';
        }
        
      } else {
        // Sign in
        const { error } = await supabase.auth.signInWithPassword({ 
          email, 
          password 
        });
        
        if (error) {
          console.log('[Sign In] Error:', error.message);
          
          // Supabase returns "Invalid login credentials" for both wrong email AND wrong password
          // We need to check if the account actually exists
          const { data: userData, error: lookupError } = await supabase
            .from('users')
            .select('id')
            .ilike('email', email) // Case-insensitive match
            .maybeSingle(); // Returns null instead of throwing error when not found
          
          console.log('[Sign In] User lookup:', userData ? 'Found' : 'Not found', lookupError);
          
          if (userData) {
            // User exists, so it must be wrong password
            setError('Incorrect password. Please try again or use "Forgot password?" to reset it.');
          } else {
            // User doesn't exist
            setError('No account found with this email address. Please check your email or sign up.');
          }
          
          setLoading(false);
        } else {
          // Redirect immediately - AuthProvider will handle the rest
          window.location.href = '/';
        }
      }
    } catch (err: any) {
      setError('An error occurred: ' + (err?.message || 'Unknown error'));
      setLoading(false);
    }
  };

  // Password strength indicator
  const passwordStrength = isSignup && password.length > 0 ? getPasswordStrength(password) : null;

  // Forgot password view
  if (isForgot) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gabriola-sand/30 via-white to-gabriola-green/10 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gabriola-green/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-gabriola-green" />
            </div>
            <h1 className="text-3xl font-bold text-gabriola-green mb-2">Reset Password</h1>
            <p className="text-gray-600">Enter your email to receive a reset link</p>
          </div>

          {message ? (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <p className="text-lg text-green-600 mb-6">{message}</p>
              <button 
                onClick={() => setIsForgot(false)}
                className="text-gabriola-green font-semibold underline hover:no-underline"
              >
                Back to Sign In
              </button>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input 
                    type="email" 
                    placeholder="Email" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    required 
                    autoComplete="email"
                    className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-gabriola-green focus:border-transparent transition" 
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full bg-gradient-to-r from-gabriola-green to-gabriola-green-light text-white py-4 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <button 
                  onClick={() => setIsForgot(false)}
                  className="text-sm text-gabriola-green hover:underline font-medium"
                >
                  Back to Sign In
                </button>
              </div>
            </>
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-50 border-2 border-red-200 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm font-medium">{error}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Main sign in/up view
  return (
    <div className="min-h-screen bg-gradient-to-br from-gabriola-sand/30 via-white to-gabriola-green/10 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gabriola-green/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-gabriola-green" />
          </div>
          <h1 className="text-3xl font-bold text-gabriola-green mb-2">
            {isSignup ? 'Join Gabriola Connects' : 'Welcome Back'}
          </h1>
          <p className="text-gray-600">
            {isSignup ? 'Create your account to get started' : 'Sign in to your account'}
          </p>
        </div>

        {/* Success Message */}
        {message && (
          <div className="mb-6 p-4 bg-green-50 border-2 border-green-200 rounded-xl flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-green-700 text-sm font-medium">{message}</p>
          </div>
        )}

        {/* Error Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-700 text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email */}
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
              type="email" 
              placeholder="Email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
              autoComplete="email"
              className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-gabriola-green focus:border-transparent transition" 
            />
          </div>

          {/* Password */}
          <div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input 
                type={showPassword ? 'text' : 'password'} 
                placeholder={isSignup ? "Password (min 8 characters)" : "Password"}
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                required 
                minLength={isSignup ? 8 : undefined}
                autoComplete={isSignup ? "new-password" : "current-password"}
                className="w-full pl-12 pr-12 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-gabriola-green focus:border-transparent transition" 
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            
            {/* Password strength indicator */}
            {passwordStrength && (
              <div className="mt-2 flex items-center gap-2 text-sm">
                <passwordStrength.icon className={`w-4 h-4 text-${passwordStrength.color}-500`} />
                <span className={`text-${passwordStrength.color}-600`}>{passwordStrength.text}</span>
              </div>
            )}
          </div>

          {/* Signup-only fields */}
          {isSignup && (
            <>
              {/* Full Name */}
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Full Name" 
                  value={fullName} 
                  onChange={e => setFullName(e.target.value)} 
                  required 
                  autoComplete="name"
                  className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-gabriola-green focus:border-transparent transition" 
                />
              </div>

              {/* Username */}
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Username (no spaces)" 
                  value={username} 
                  onChange={e => setUsername(e.target.value.replace(/\s/g,'').toLowerCase())} 
                  required 
                  autoComplete="username"
                  className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-gabriola-green focus:border-transparent font-mono transition" 
                />
              </div>

              {/* Postal Code */}
              <div>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Postal Code (optional)" 
                    value={postalCode} 
                    onChange={e => handlePostalChange(e.target.value)} 
                    autoComplete="postal-code"
                    className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-gabriola-green focus:border-transparent font-mono transition" 
                  />
                </div>
                
                {/* Resident badge */}
                {isResident && (
                  <div className="mt-3 p-4 bg-green-50 border-2 border-green-400 rounded-xl text-green-800 font-bold text-center flex items-center justify-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                    <CheckCircle className="w-5 h-5" />
                    Welcome, Gabriola Resident! 🏝️
                  </div>
                )}
              </div>

              {/* Community Guidelines */}
              <div className="bg-gradient-to-br from-blue-50 to-gabriola-green/5 border-2 border-blue-200 rounded-xl p-5">
                <p className="font-bold text-gabriola-green mb-3 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Community Guidelines
                </p>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-gabriola-green mt-0.5">•</span>
                    <span>Be respectful and kind to fellow islanders</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gabriola-green mt-0.5">•</span>
                    <span>No spam, harassment, or hate speech</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gabriola-green mt-0.5">•</span>
                    <span>Keep discussions civil and constructive</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gabriola-green mt-0.5">•</span>
                    <span>Respect privacy - no personal attacks</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gabriola-green mt-0.5">•</span>
                    <span>Follow Canadian laws and community standards</span>
                  </li>
                </ul>
                <p className="mt-3 text-xs text-gray-600 italic">
                  By creating an account, you agree to these community guidelines.
                </p>
              </div>
            </>
          )}

          {/* Submit Button */}
          <button 
            type="submit" 
            disabled={loading || (isSignup && (password.length < 8 || isWeakPassword(password)))} 
            className="w-full bg-gradient-to-r from-gabriola-green to-gabriola-green-light text-white py-4 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
          >
            {loading 
              ? (isSignup ? 'Creating Account...' : 'Signing In...') 
              : (isSignup ? 'Create Account' : 'Sign In')
            }
          </button>
        </form>

        {/* Footer Links */}
        <div className="mt-8 space-y-4">
          {/* Forgot Password */}
          {!isSignup && (
            <div className="text-center">
              <button 
                onClick={() => setIsForgot(true)}
                className="text-sm text-gabriola-green hover:underline font-medium"
              >
                Forgot your password?
              </button>
            </div>
          )}

          {/* Toggle Sign Up/In */}
          <div className="text-center pt-4 border-t border-gray-200">
            <p className="text-gray-600 text-sm">
              {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button 
                type="button" 
                onClick={() => {
                  setIsSignup(!isSignup);
                  setError('');
                  setMessage('');
                  setPassword('');
                }} 
                className="text-gabriola-green font-bold hover:underline"
              >
                {isSignup ? 'Sign In' : 'Sign Up'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
