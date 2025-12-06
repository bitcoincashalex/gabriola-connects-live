// lib/auth-utils.ts
import { supabase } from './supabase';
import { User, SignUpData, SignInData, UserRole } from './types';

// ──────────────────────────────────────────────────────────────
// Validation helpers
// ──────────────────────────────────────────────────────────────
export const GABRIOLA_POSTAL_CODE_PREFIX = 'V0R';

export function isGabriolaPostalCode(postalCode: string): boolean {
  return postalCode.toUpperCase().startsWith(GABRIOLA_POSTAL_CODE_PREFIX);
}

export function formatPostalCode(postalCode: string): string {
  const cleaned = postalCode.replace(/\s/g, '').toUpperCase();
  if (cleaned.length >= 6) return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)}`;
  return cleaned;
}

export function validatePostalCode(postalCode: string): boolean {
  return /^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i.test(postalCode);
}

export function validateUsername(username: string): { valid: boolean; error?: string } {
  if (username.length < 3) return { valid: false, error: 'Username must be at least 3 characters' };
  if (username.length > 20) return { valid: false, error: 'Username must be 20 characters or less' };
  if (!/^[a-zA-Z0-9_]+$/.test(username)) return { valid: false, error: 'Only letters, numbers and underscores' };
  return { valid: true };
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 8) return { valid: false, error: 'Password must be at least 8 characters' };
  if (!/[A-Z]/.test(password)) return { valid: false, error: 'Password needs an uppercase letter' };
  if (!/[a-z]/.test(password)) return { valid: false, error: 'Password needs a lowercase letter' };
  if (!/[0-9]/.test(password)) return { valid: false, error: 'Password needs a number' };
  return { valid: true };
}

// ──────────────────────────────────────────────────────────────
// Auth functions
// ──────────────────────────────────────────────────────────────
export async function signUp(data: SignUpData): Promise<{ user: User | null; error: string | null }> {
  try {
    if (!validateEmail(data.email)) return { user: null, error: 'Invalid email' };
    const u = validateUsername(data.username);
    if (!u.valid) return { user: null, error: u.error! };
    const p = validatePassword(data.password);
    if (!p.valid) return { user: null, error: p.error! };
    if (!validatePostalCode(data.postal_code)) return { user: null, error: 'Invalid postal code' };

    const { data: existing } = await supabase.from('users').select('username').eq('username', data.username).limit(1);
    if (existing && existing.length > 0) return { user: null, error: 'Username taken' };

    const pc = formatPostalCode(data.postal_code);

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: { data: { full_name: data.full_name, username: data.username, postal_code: pc } },
    });

    if (authError || !authData.user) return { user: null, error: authError?.message || 'Signup failed' };

    const { data: profile } = await supabase.from('users').select('*').eq('id', authData.user.id).single();
    if (profile) return { user: { ...profile, email: data.email }, error: null };

    const { data: newProfile } = await supabase
      .from('users')
      .insert({ id: authData.user.id, full_name: data.full_name, username: data.username, postal_code: pc })
      .select()
      .single();

    return { user: newProfile ? { ...newProfile, email: data.email } : null, error: null };
  } catch (e: any) {
    return { user: null, error: e.message || 'Unexpected error' };
  }
}

export async function signIn(data: SignInData): Promise<{ user: User | null; error: string | null }> {
  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (authError || !authData.user) return { user: null, error: authError?.message || 'Login failed' };

    const { data: profile } = await supabase.from('users').select('*').eq('id', authData.user.id).single();
    if (!profile) return { user: null, error: 'Profile not found' };
    if (profile.is_banned) {
      await supabase.auth.signOut();
      return { user: null, error: 'Your account has been banned' };
    }

    await supabase.from('users').update({ last_active_at: new Date().toISOString() }).eq('id', authData.user.id);

    return { user: { ...profile, email: authData.user.email }, error: null };
  } catch (e: any) {
    return { user: null, error: e.message || 'Unexpected error' };
  }
}

export async function signOut(): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.signOut();
  return { error: error?.message ?? null };
}

export async function getCurrentUser(): Promise<User | null> {
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return null;

  const { data: profile } = await supabase.from('users').select('*').eq('id', authUser.id).single();
  if (!profile) return null;

  return { ...profile, email: authUser.email };
}

export async function isLoggedIn(): Promise<boolean> {
  return (await getCurrentUser()) !== null;
}

// ──────────────────────────────────────────────────────────────
// Permission helpers — ALL FIXED
// ──────────────────────────────────────────────────────────────
export function canPost(user: User | null): boolean {
  return user !== null && (user.can_post ?? true) && !user.is_banned;
}
export function canComment(user: User | null): boolean {
  return user !== null && (user.can_comment ?? true) && !user.is_banned;
}
export function canRSVP(user: User | null): boolean {
  return user !== null && (user.can_rsvp ?? true) && !user.is_banned;
}
export function canCreateEvents(user: User | null): boolean {
  return user !== null && (user.can_create_events ?? true) && !user.is_banned;
}
export function canModerateEvents(user: User | null): boolean {
  return user !== null && (user.can_moderate_events ?? false) && !user.is_banned;
}
export function canEditDirectory(user: User | null): boolean {
  return user !== null && (user.can_edit_directory ?? false) && !user.is_banned;
}
export function canIssueAlerts(user: User | null): boolean {
  return user !== null && (user.can_issue_alerts ?? false) && !user.is_banned;
}

export function canIssueAlertSeverity(
  user: User | null,
  severity: 'info' | 'minor' | 'moderate' | 'major' | 'emergency'
): boolean {
  if (!user || user.is_banned || !(user.can_issue_alerts ?? false)) return false;
  const levels = { none: 0, minor: 1, moderate: 2, major: 3, emergency: 4 };
  const sev = { info: 1, minor: 1, moderate: 2, major: 3, emergency: 4 };
  return levels[user.alert_level_permission ?? 'none'] >= sev[severity];
}

export function isModerator(user: User | null): boolean {
  return user !== null && (user.role === 'moderator' || user.role === 'admin');
}
export function isAdmin(user: User | null): boolean {
  return user !== null && user.role === 'admin';
}
export function isResident(user: User | null): boolean {
  return user !== null && user.is_resident;
}

export function getUserBadge(user: User | null) {
  if (!user) return null;
  if (user.role === 'admin') return { text: 'Admin', color: 'bg-red-500', icon: 'Crown' };
  if (user.role === 'moderator') return { text: 'Mod', color: 'bg-yellow-500', icon: 'Star' };
  if (user.is_resident) return { text: 'Resident', color: 'bg-green-500', icon: 'Check' };
  return { text: 'Visitor', color: 'bg-blue-500', icon: 'Wave' };
}

export async function updateUserProfile(userId: string, updates: Partial<User>) {
  const { error } = await supabase.from('users').update(updates).eq('id', userId);
  return { success: !error, error: error?.message ?? null };
}