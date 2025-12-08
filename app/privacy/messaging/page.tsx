// app/privacy/messaging/page.tsx
import Link from 'next/link';
import { ArrowLeft, Shield, Lock, Eye, UserCheck } from 'lucide-react';

export default function MessagingPrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Link 
          href="/messages" 
          className="inline-flex items-center gap-2 text-gabriola-green hover:underline mb-8 text-lg font-medium"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Messages
        </Link>

        <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12">
          <div className="flex items-center gap-3 mb-8">
            <Shield className="w-12 h-12 text-gabriola-green" />
            <h1 className="text-4xl font-bold text-gray-900">Your Messages Are Private</h1>
          </div>

          <div className="prose prose-lg max-w-none">
            <p className="text-xl text-gray-700 mb-8">
              Your private messages are just that — <strong>private</strong>. Only you and the person you're messaging can read them. Here's how:
            </p>

            {/* Row-Level Security */}
            <div className="bg-blue-50 rounded-xl p-6 mb-8 border-2 border-blue-200">
              <div className="flex items-start gap-4">
                <Lock className="w-8 h-8 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mt-0 mb-3">Row-Level Security (RLS)</h2>
                  <p className="text-gray-700 mb-0">
                    Our database uses "Row-Level Security" — a technical term that means <strong>the database itself enforces who can see what.</strong> Think of it like this:
                  </p>
                  <ul className="mt-3 text-gray-700">
                    <li>Each message has a lock on it</li>
                    <li>Only the sender and receiver have the key</li>
                    <li>Even our administrators can't read your messages without your key</li>
                    <li>The database automatically checks permissions before showing any data</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Encryption */}
            <div className="bg-green-50 rounded-xl p-6 mb-8 border-2 border-green-200">
              <div className="flex items-start gap-4">
                <Shield className="w-8 h-8 text-green-600 flex-shrink-0 mt-1" />
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mt-0 mb-3">Industry-Standard Encryption</h2>
                  <ul className="text-gray-700 mb-0">
                    <li><strong>In transit:</strong> Your messages are encrypted (HTTPS/TLS) as they travel across the internet — the same security your bank uses</li>
                    <li><strong>At rest:</strong> All data is encrypted in our database — even if someone physically stole the server, they couldn't read the data</li>
                    <li><strong>No backdoors:</strong> We don't have a master key to read your messages</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Your Control */}
            <div className="bg-purple-50 rounded-xl p-6 mb-8 border-2 border-purple-200">
              <div className="flex items-start gap-4">
                <UserCheck className="w-8 h-8 text-purple-600 flex-shrink-0 mt-1" />
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mt-0 mb-3">Your Control</h2>
                  <p className="text-gray-700">You decide who can message you:</p>
                  <ul className="text-gray-700 mb-0">
                    <li><strong>Everyone</strong> — Any member can send you messages (default)</li>
                    <li><strong>Connections Only</strong> — Only people you've messaged before</li>
                    <li><strong>Nobody</strong> — Turn off messages completely</li>
                    <li><strong>Block Users</strong> — Block specific people permanently</li>
                  </ul>
                  <Link 
                    href="/messages/settings" 
                    className="inline-block mt-4 bg-gabriola-green text-white px-6 py-3 rounded-lg font-bold hover:bg-gabriola-green-dark"
                  >
                    Manage Privacy Settings
                  </Link>
                </div>
              </div>
            </div>

            {/* What About Admins */}
            <div className="bg-yellow-50 rounded-xl p-6 mb-8 border-2 border-yellow-200">
              <div className="flex items-start gap-4">
                <Eye className="w-8 h-8 text-yellow-600 flex-shrink-0 mt-1" />
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mt-0 mb-3">What About Admins?</h2>
                  <p className="text-gray-700 mb-3">
                    Administrators <strong>cannot read your private messages.</strong> They can only see:
                  </p>
                  <ul className="text-gray-700 mb-0">
                    <li>Public forum posts (that's what "public" means!)</li>
                    <li>Reports of abuse (if someone reports a message)</li>
                    <li>System logs (connection times, not message content)</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Transparency */}
            <div className="border-t-2 border-gray-200 pt-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Transparency</h2>
              <p className="text-gray-700">Unlike big tech companies:</p>
              <div className="grid md:grid-cols-2 gap-4 mt-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">✅</span>
                  <span className="text-gray-700">Your data stays in Canada (via Supabase)</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-2xl">✅</span>
                  <span className="text-gray-700">No selling your data to advertisers</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-2xl">✅</span>
                  <span className="text-gray-700">No AI training on your messages</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-2xl">✅</span>
                  <span className="text-gray-700">Open about how security works</span>
                </div>
              </div>
            </div>

            <div className="mt-12 p-6 bg-gray-100 rounded-lg text-center">
              <p className="text-gray-600 mb-4">
                <strong>Questions?</strong> Contact an administrator or post in the Community Discussion forum.
              </p>
              <p className="text-sm text-gray-500">Last updated: December 2025</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
