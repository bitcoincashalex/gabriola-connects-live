// Path: app/privacy/page.tsx
// Version: 1.0.0 - Site privacy policy (needed for Google sign in consent screen)
// Date: 2026-10-09

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy - Gabriola Connects',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-gabriola-green hover:underline mb-8 text-lg font-medium"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Gabriola Connects
        </Link>

        <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12 space-y-6 text-gray-700 leading-relaxed">
          <h1 className="text-4xl font-bold text-gray-900">Privacy Policy</h1>
          <p className="text-sm text-gray-500">Last updated October 9, 2026</p>

          <p>
            Gabriola Connects is a free community website for Gabriola Island, built and run by me, Alex Strachan.
            There is no company behind it and nothing here is for sale, including your information. This page
            explains in plain language what the site keeps about you, why, and what you can do about it.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 pt-4">What the site keeps</h2>
          <p>
            You can read the calendar, ferry schedule, directory and alerts without an account. If you create an
            account, the site keeps your email address, your name, a username, and anything you choose to add to
            your profile such as a photo, a short bio, a postal code or a phone number. If you sign in with Google,
            Google shares your name, email address and profile photo with the site, and nothing else. The site never
            sees your Google password.
          </p>
          <p>
            When you use the site, it keeps the things you post, like forum posts and replies, events, RSVPs and
            volunteer sign ups, along with when you last signed in and were last active. Forum activity logs can
            include the IP address a post came from, which is used only to deal with spam and abuse.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 pt-4">Private messages</h2>
          <p>
            Private messages can only be seen on the site by you and the person you are messaging. I want to be
            straight with you though, as the person who runs the site I do have technical access to the database
            where messages are stored. I don't read them, and I would only ever look at one if it was reported to me
            for abuse.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 pt-4">Analytics</h2>
          <p>
            The site uses Vercel Analytics, and may use Google Analytics, to count visits and see which pages people
            use, so I know what is working and what isn&apos;t. This is used as totals, not to follow you around the
            internet, and none of it is sold or used for advertising.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 pt-4">Where your information lives</h2>
          <p>
            Accounts and content are stored with Supabase, the site is hosted by Vercel, and Google handles Google
            sign in. These services may store data outside Canada. Your information is not sold, rented or shared
            with anyone else, and the only time it would be handed over is if the law required it.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 pt-4">Your choices</h2>
          <p>
            You can see and change your profile any time from your profile page. If you want a copy of what the site
            has about you, want something corrected, or want your account deleted, email me at{' '}
            <a href="mailto:gabriolaconnects@gmail.com" className="text-gabriola-green font-semibold hover:underline">
              gabriolaconnects@gmail.com
            </a>{' '}
            and I will take care of it. If you signed in with Google you can also remove the site&apos;s access from
            your Google account settings.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 pt-4">Changes</h2>
          <p>
            If this policy changes, the new version will be posted on this page with a new date at the top.
          </p>

          <p className="pt-4">Alex</p>
        </div>
      </div>
    </div>
  );
}
