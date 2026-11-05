// lib/adminUsers.ts
// Change another member's account settings through the server (/api/admin/users/[id]).
// The database only lets members change their own row, so admin pages can't do it from the
// browser; the server checks the admin's rights, makes the change and records it in the Audit Log.
// Version: 1.0.0
// Date: 2026-11-05

import { supabase } from '@/lib/supabase';

/** Returns null when saved, or an error message. */
export async function adminUpdateUser(userId: string, fields: Record<string, any>): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return 'You are signed out. Sign in again and retry.';

  try {
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(fields),
    });
    if (res.ok) return null;
    const body = await res.json().catch(() => ({}));
    return body.error || `Save failed (${res.status})`;
  } catch (e: any) {
    return e?.message || 'Network error';
  }
}

/** Same change for several members. Returns the error messages (empty when all saved). */
export async function adminUpdateUsers(userIds: string[], fields: Record<string, any>): Promise<string[]> {
  const results = await Promise.all(userIds.map(id => adminUpdateUser(id, fields)));
  return results.filter((r): r is string => r !== null);
}
