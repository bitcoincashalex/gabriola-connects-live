'use client';

import { useState } from 'react';
import { X, Mail, Lock, User as UserIcon, MapPin, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { 
  signUp, 
  signIn, 
  validateEmail, 
  validateUsername, 
  validatePassword,
  validatePostalCode,
  isGabriolaPostalCode,
  formatPostalCode
} from '@/lib/auth-utils';
import { User as UserType, SignUpData, SignInData } from '@/lib/types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserType) => void;
  initialMode?: 'signin' | 'signup';
}

export default function AuthModal({ isOpen, onClose, onSuccess, initialMode = 'signin' }: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResidentWelcome, setShowResidentWelcome] = useState(false);
  
  // Sign in form
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  
  // Sign up form
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [postalCode, setPostalCode] = useState('');
  
  // Validation states
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [postalCodeError, setPostalCodeError] = useState<string | null>(null);

  if (!isOpen) return null;

  const resetForm = () => {
    setSignInEmail('');
    setSignInPassword('');
    setSignUpEmail('');
    setSignUpPassword('');
    setSignUpConfirmPassword('');
    setFullName('');
    setUsername('');
    setPostalCode('');
    setError(null);
    setEmailError(null);
    setPasswordError(null);
    setUsernameError(null);
    setPostalCodeError(null);
    setShowResidentWelcome(false);
    setShowSignInPassword(false);
    setShowSignUpPassword(false);
    setShowConfirmPassword(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Validate
    if (!validateEmail(signInEmail)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    const data: SignInData = {
      email: signInEmail,
      password: signInPassword,
    };

    const { user, error: signInError } = await signIn(data);

    if (signInError) {
      setError(signInError);
      setLoading(false);
      return;
    }

    if (user) {
      resetForm();
      onSuccess(user);
    }

    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setEmailError(null);
    setPasswordError(null);
    setUsernameError(null);
    setPostalCodeError(null);
    setLoading(true);

    // Validate all fields
    let hasError = false;

    if (!validateEmail(signUpEmail)) {
      setEmailError('Please enter a valid email address');
      hasError = true;
    }

    const passwordValidation = validatePassword(signUpPassword);
    if (!passwordValidation.valid) {
      setPasswordError(passwordValidation.error!);
      hasError = true;
    }

    if (signUpPassword !== signUpConfirmPassword) {
      setPasswordError('Passwords do not match');
      hasError = true;
    }

    if (!fullName.trim()) {
      setError('Please enter your full name');
      hasError = true;
    }

    const usernameValidation = validateUsername(username);
    if (!usernameValidation.valid) {
      setUsernameError(usernameValidation.error!);
      hasError = true;
    }

    if (!validatePostalCode(postalCode)) {
      setPostalCodeError('Please enter a valid postal code (e.g., V0R 1X0)');
      hasError = true;
    }

    if (hasError) {
      setLoading(false);
      return;
    }

    const data: SignUpData = {
      email: signUpEmail,
      password: signUpPassword,
      full_name: fullName,
      username: username,
      postal_code: postalCode,
    };

    const { user, error: signUpError } = await signUp(data);

    if (signUpError) {
      setError(signUpError);
      setLoading(false);
      return;
    }

    if (user) {
      // Show welcome message based on residency
      if (user.is_resident) {
        setShowResidentWelcome(true);
        setTimeout(() => {
          resetForm();
          onSuccess(user);
        }, 3000);
      } else {
        resetForm();
        onSuccess(user);
      }
    }

    setLoading(false);
  };

  const handlePostalCodeChange = (value: string) => {
    setPostalCode(value);
    setPostalCodeError(null);
    
    // Show resident welcome preview when typing V0R
    const cleaned = value.replace(/\s/g, '').toUpperCase();
    if (cleaned.startsWith('V0R') && cleaned.length >= 3) {
      setShowResidentWelcome(true);
    } else {
      setShowResidentWelcome(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-gabriola-green to-gabriola-green-light text-white p-6 rounded-t-2xl z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">
              {mode === 'signin' ? 'Sign In' : 'Create Account'}
            </h2>
            <button
              onClick={handleClose}
              className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full"
              disabled={loading}
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <p className="text-white/90 text-sm mt-2">
            {mode === 'signin' 
              ? 'Welcome back to Gabriola Connects' 
              : 'Join the Gabriola community'}
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Resident Welcome Message */}
          {showResidentWelcome && mode === 'signup' && (
            <div className="mb-6 bg-green-50 border-2 border-green-500 rounded-xl p-4 animate-fadeIn">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-green-600 flex-shrink-0" />
                <div>
                  <h3 className="text-green-900 font-bold text-lg">Welcome Gabriola Resident! 🌲</h3>
                  <p className="text-green-700 text-sm mt-1">
                    You'll receive a verified resident badge on all your posts!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-50 border-2 border-red-500 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Sign In Form */}
          {mode === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gabriola-green focus:border-transparent transition-all"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showSignInPassword ? 'text' : 'password'}
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-12 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gabriola-green focus:border-transparent transition-all"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignInPassword(!showSignInPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    disabled={loading}
                  >
                    {showSignInPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-gabriola-green to-gabriola-green-light text-white py-3.5 px-6 rounded-xl font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setMode('signup');
                  }}
                  className="text-gabriola-green hover:underline text-sm font-medium"
                  disabled={loading}
                >
                  Don't have an account? Sign up
                </button>
              </div>
            </form>
          )}

          {/* Sign Up Form */}
          {mode === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-4">
              {/* Policy Notice */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-blue-900 font-semibold text-sm mb-2">📝 Registration Policy:</p>
                <ul className="text-blue-800 text-xs space-y-1 ml-4 list-disc">
                  <li>Your real identity is recorded for accountability</li>
                  <li>Harassment or slander will result in bans</li>
                  <li>Moderators can see real identities</li>
                </ul>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Smith"
                    className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gabriola-green focus:border-transparent transition-all"
                    required
                    disabled={loading}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Your real name (private, only visible to moderators)
                </p>
              </div>

              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-mono">@</span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      setUsernameError(null);
                    }}
                    placeholder="johndoe"
                    className={`w-full pl-9 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-gabriola-green focus:border-transparent transition-all ${
                      usernameError ? 'border-red-500' : 'border-gray-300'
                    }`}
                    required
                    disabled={loading}
                  />
                </div>
                {usernameError && (
                  <p className="text-xs text-red-600 mt-1">{usernameError}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  3-20 characters, letters, numbers, and underscores only
                </p>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={signUpEmail}
                    onChange={(e) => {
                      setSignUpEmail(e.target.value);
                      setEmailError(null);
                    }}
                    placeholder="john@example.com"
                    className={`w-full pl-11 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-gabriola-green focus:border-transparent transition-all ${
                      emailError ? 'border-red-500' : 'border-gray-300'
                    }`}
                    required
                    disabled={loading}
                  />
                </div>
                {emailError && (
                  <p className="text-xs text-red-600 mt-1">{emailError}</p>
                )}
              </div>

              {/* Postal Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Postal Code <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={postalCode}
                    onChange={(e) => handlePostalCodeChange(e.target.value)}
                    placeholder="V0R 1X0"
                    className={`w-full pl-11 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-gabriola-green focus:border-transparent transition-all uppercase ${
                      postalCodeError ? 'border-red-500' : 'border-gray-300'
                    }`}
                    required
                    disabled={loading}
                    maxLength={7}
                  />
                </div>
                {postalCodeError && (
                  <p className="text-xs text-red-600 mt-1">{postalCodeError}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  V0R postal codes get verified resident status
                </p>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showSignUpPassword ? 'text' : 'password'}
                    value={signUpPassword}
                    onChange={(e) => {
                      setSignUpPassword(e.target.value);
                      setPasswordError(null);
                    }}
                    placeholder="••••••••"
                    className={`w-full pl-11 pr-12 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-gabriola-green focus:border-transparent transition-all ${
                      passwordError ? 'border-red-500' : 'border-gray-300'
                    }`}
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    disabled={loading}
                  >
                    {showSignUpPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {passwordError && (
                  <p className="text-xs text-red-600 mt-1">{passwordError}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Min 8 chars, 1 uppercase, 1 lowercase, 1 number
                </p>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={signUpConfirmPassword}
                    onChange={(e) => {
                      setSignUpConfirmPassword(e.target.value);
                      setPasswordError(null);
                    }}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-12 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gabriola-green focus:border-transparent transition-all"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    disabled={loading}
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-gabriola-green to-gabriola-green-light text-white py-3.5 px-6 rounded-xl font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none"
              >
                {loading ? 'Creating account...' : 'Create Account'}
              </button>

              <p className="text-xs text-gray-500 text-center">
                By signing up, you agree to follow community guidelines
              </p>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setMode('signin');
                  }}
                  className="text-gabriola-green hover:underline text-sm font-medium"
                  disabled={loading}
                >
                  Already have an account? Sign in
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
