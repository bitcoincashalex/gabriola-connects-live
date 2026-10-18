// lib/anonymousItems.ts
// Version: 1.0.0 - Which anonymous posts/replies belong to the signed in person
// Date: 2026-10-18
//
// Anonymous posts and replies are saved with no account id (see
// sql/2026-10-18-anonymous-posts.sql), so the page can't tell "this one is mine" by comparing
// user_id any more. The database answers that instead (my_anonymous_items), and only ever
// about the person asking. The answer is shared by every card on the page (one request,
// not one per card) and refreshed after the person posts something anonymously.

'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type AnonymousItemType = 'post' | 'reply';

let keysFor: string | null = null;     // whose items cachedKeys holds
let cachedKeys: Set<string> = new Set();
let fresh = false;                     // false after refreshMyAnonymousItems() until reloaded
let lastUserId: string | null = null;
let pending: Promise<Set<string>> | null = null;
const listeners = new Set<() => void>();

const keyOf = (type: AnonymousItemType, id: string) => `${type}:${id}`;

function notify() {
  listeners.forEach((fn) => fn());
}

async function load(userId: string): Promise<Set<string>> {
  lastUserId = userId;
  if (keysFor === userId && fresh) return cachedKeys;
  if (pending) return pending;
  pending = (async () => {
    const { data, error } = await supabase.rpc('my_anonymous_items');
    pending = null;
    if (lastUserId !== userId) return new Set<string>();   // signed out or switched account meanwhile
    const keys = new Set<string>();
    if (!error && Array.isArray(data)) {
      data.forEach((row: { item_type: AnonymousItemType; item_id: string }) => keys.add(keyOf(row.item_type, row.item_id)));
    } else if (error) {
      console.error('[anonymousItems] could not load:', error.message);
    }
    keysFor = userId;
    cachedKeys = keys;
    fresh = true;
    notify();
    return keys;
  })();
  return pending;
}

// Call after posting anonymously, so the new item shows its delete button and My Posts entry
export function refreshMyAnonymousItems() {
  fresh = false;
  pending = null;
  if (lastUserId) load(lastUserId);
}

// Ids of the signed in person's anonymous items of one type (for My Posts)
export async function getMyAnonymousIds(userId: string, type: AnonymousItemType): Promise<string[]> {
  const keys = await load(userId);
  const prefix = `${type}:`;
  return Array.from(keys).filter((k) => k.startsWith(prefix)).map((k) => k.slice(prefix.length));
}

// isMine('post', id) - true only for the signed in person's own anonymous items
export function useMyAnonymousItems(userId?: string | null) {
  const [, setVersion] = useState(0);

  useEffect(() => {
    const onChange = () => setVersion((v) => v + 1);
    listeners.add(onChange);
    if (userId) load(userId);
    return () => {
      listeners.delete(onChange);
    };
  }, [userId]);

  // Only ever answers from this person's own list (kept while a refresh loads)
  const isMine = (type: AnonymousItemType, id?: string | null) =>
    !!userId && !!id && keysFor === userId && cachedKeys.has(keyOf(type, id));

  return { isMine };
}
