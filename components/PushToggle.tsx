// components/PushToggle.tsx
// "Phone & Browser Notifications" on Edit Profile. Turns alert push notifications on or off for
// THIS phone or computer (each device is turned on separately), and can send a test.
// Version: 1.0.0
// Date: 2026-10-23
// Needs sql/2026-10-23-push-notifications.sql, public/sw.js v2.1.0, and the Vercel variable
// NEXT_PUBLIC_VAPID_PUBLIC_KEY.
'use client';

import { useEffect, useState } from 'react';
import { Smartphone, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type State = 'checking' | 'not_set_up' | 'unsupported' | 'iphone_install' | 'blocked' | 'off' | 'on';

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

function keyBytes(base64: string): Uint8Array {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(padded);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function isIphone(): boolean {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
}

function isInstalled(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
}

async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  const existing = await navigator.serviceWorker.getRegistration();
  if (existing) return existing;
  try {
    return await navigator.serviceWorker.register('/sw.js');
  } catch {
    return null;
  }
}

async function saveSubscription(sub: PushSubscription) {
  const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  const { error } = await supabase.rpc('save_push_subscription', {
    p_endpoint: json.endpoint || sub.endpoint,
    p_p256dh: json.keys?.p256dh || '',
    p_auth: json.keys?.auth || '',
    p_user_agent: navigator.userAgent,
  });
  if (error) throw error;
}

export default function PushToggle() {
  const [state, setState] = useState<State>('checking');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    (async () => {
      if (!PUBLIC_KEY) return setState('not_set_up');
      const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
      if (!supported) return setState(isIphone() && !isInstalled() ? 'iphone_install' : 'unsupported');
      if (Notification.permission === 'denied') return setState('blocked');
      const reg = await getRegistration();
      if (!reg) return setState('unsupported');
      const sub = await reg.pushManager.getSubscription();
      if (sub && Notification.permission === 'granted') {
        // Make sure this device is filed under whoever is signed in now
        try { await saveSubscription(sub); } catch (e) { console.error('[PushToggle] resave:', e); }
        setState('on');
      } else {
        setState('off');
      }
    })();
  }, []);

  const turnOn = async () => {
    setBusy(true);
    setNote('');
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState(permission === 'denied' ? 'blocked' : 'off');
        return;
      }
      const reg = await getRegistration();
      if (!reg) throw new Error('no service worker');
      await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ||
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(PUBLIC_KEY) as BufferSource }));
      await saveSubscription(sub);
      setState('on');
      setNote('Turned on for this device.');
    } catch (e) {
      console.error('[PushToggle] turn on:', e);
      setNote('Sorry, that didn\'t work on this device. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const turnOff = async () => {
    setBusy(true);
    setNote('');
    try {
      const reg = await getRegistration();
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (sub) {
        await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
        await sub.unsubscribe();
      }
      setState('off');
      setNote('Turned off for this device.');
    } catch (e) {
      console.error('[PushToggle] turn off:', e);
      setNote('Sorry, that didn\'t work. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const sendTest = async () => {
    setBusy(true);
    setNote('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/push/test', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token || ''}` },
      });
      const json = await res.json().catch(() => ({}));
      setNote(res.ok && json.sent > 0
        ? `Test sent to ${json.sent} device${json.sent === 1 ? '' : 's'}. It should appear in a few seconds.`
        : 'The test didn\'t go through. Try turning notifications off and on again.');
    } catch {
      setNote('The test didn\'t go through. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const message: Record<State, string> = {
    checking: 'Checking this device...',
    not_set_up: 'Not set up on the site yet.',
    unsupported: 'This browser can\'t show notifications. Try Chrome, Edge, Firefox or Safari.',
    iphone_install: 'On iPhone and iPad: tap Share, then "Add to Home Screen", open Gabriola Connects from that icon, and turn this on there.',
    blocked: 'Notifications are blocked for this site in your browser settings. Allow them there, then come back here.',
    off: 'Off for this device. Alerts pop up on your phone or computer, even when the site is closed.',
    on: 'On for this device. Turn it on separately on each phone or computer you use.',
  };

  return (
    <div className="flex items-start gap-3 p-4 border-2 rounded-lg">
      <Smartphone className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <div className="font-bold text-gray-900">Phone &amp; Browser Notifications</div>
        <p className="text-sm text-gray-600 mt-1" role="status">{message[state]}</p>
        {(state === 'off' || state === 'on') && (
          <div className="flex flex-wrap gap-2 mt-3">
            {state === 'off' ? (
              <button type="button" onClick={turnOn} disabled={busy}
                className="inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-lg bg-gabriola-green text-white text-sm font-semibold hover:bg-gabriola-green-dark disabled:opacity-60">
                {busy && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                Turn on for this device
              </button>
            ) : (
              <>
                <button type="button" onClick={sendTest} disabled={busy}
                  className="inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-lg bg-gabriola-green text-white text-sm font-semibold hover:bg-gabriola-green-dark disabled:opacity-60">
                  {busy && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                  Send me a test
                </button>
                <button type="button" onClick={turnOff} disabled={busy}
                  className="min-h-[44px] px-4 rounded-lg border-2 border-gray-300 text-sm font-semibold hover:border-gray-400 disabled:opacity-60">
                  Turn off
                </button>
              </>
            )}
          </div>
        )}
        {note && <p className="text-sm font-semibold text-gray-800 mt-2">{note}</p>}
        <p className="text-xs text-gray-500 mt-2">Uses the alert levels you choose below. Changes here save right away.</p>
      </div>
    </div>
  );
}
