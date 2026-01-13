// Path: app/community-hub/page.tsx
// Version: 1.1.0 - Activated Volunteer Opportunities module
// Date: 2025-01-13

import { MessageSquare, AlertCircle, Map, Newspaper, Heart } from 'lucide-react';
import Link from 'next/link';
import Footer from '@/components/Footer';

export default function CommunityHubPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 bg-gradient-to-b from-gabriola-green/10 to-white">
        <div className="max-w-5xl mx-auto px-4 py-12">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-gabriola-green mb-4">
              Community Hub
            </h1>
            <p className="text-xl text-gray-600">
              Your gateway to Gabriola Island resources
            </p>
          </div>

          {/* Community Options Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {/* Forum - Active */}
            <Link
              href="/community"
              className="block bg-white border-2 border-gabriola-green rounded-2xl p-8 hover:shadow-xl transition-all hover:scale-105 group"
            >
              <div className="flex items-start gap-4">
                <div className="p-4 bg-gabriola-green/10 rounded-xl group-hover:bg-gabriola-green/20 transition">
                  <MessageSquare className="w-10 h-10 text-gabriola-green" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    Forum
                  </h3>
                  <p className="text-gray-600">
                    Connect with your community, ask questions, share information
                  </p>
                </div>
              </div>
            </Link>

            {/* Emergency Contacts - Active */}
            <Link
              href="/emergency"
              className="block bg-white border-2 border-red-500 rounded-2xl p-8 hover:shadow-xl transition-all hover:scale-105 group"
            >
              <div className="flex items-start gap-4">
                <div className="p-4 bg-red-50 rounded-xl group-hover:bg-red-100 transition">
                  <AlertCircle className="w-10 h-10 text-red-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    Emergency Contacts
                  </h3>
                  <p className="text-gray-600">
                    Important phone numbers for Gabriola Island emergencies
                  </p>
                </div>
              </div>
            </Link>

            {/* Volunteer Opportunities - NOW ACTIVE! */}
            <Link
              href="/volunteer"
              className="block bg-white border-2 border-green-500 rounded-2xl p-8 hover:shadow-xl transition-all hover:scale-105 group md:col-span-2"
            >
              <div className="flex items-start gap-4 max-w-2xl">
                <div className="p-4 bg-green-50 rounded-xl group-hover:bg-green-100 transition">
                  <Heart className="w-10 h-10 text-green-500" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-2xl font-bold text-gray-900">
                      Volunteer Opportunities
                    </h3>
                    <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                      NEW!
                    </span>
                  </div>
                  <p className="text-gray-600">
                    Help out in your community and make a difference
                  </p>
                </div>
              </div>
            </Link>

            {/* Island Map - Coming Soon */}
            <div className="bg-gray-50 border-2 border-gray-200 rounded-2xl p-8 opacity-60 cursor-not-allowed">
              <div className="flex items-start gap-4">
                <div className="p-4 bg-gray-200 rounded-xl">
                  <Map className="w-10 h-10 text-gray-500" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-2xl font-bold text-gray-700">
                      Island Map
                    </h3>
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">
                      Coming Soon
                    </span>
                  </div>
                  <p className="text-gray-500">
                    Explore Gabriola Island with an interactive map
                  </p>
                </div>
              </div>
            </div>

            {/* Island News - Coming Soon */}
            <div className="bg-gray-50 border-2 border-gray-200 rounded-2xl p-8 opacity-60 cursor-not-allowed">
              <div className="flex items-start gap-4">
                <div className="p-4 bg-gray-200 rounded-xl">
                  <Newspaper className="w-10 h-10 text-gray-500" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-2xl font-bold text-gray-700">
                      Island News
                    </h3>
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">
                      Coming Soon
                    </span>
                  </div>
                  <p className="text-gray-500">
                    Stay updated with community announcements and local news
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Info */}
          <div className="text-center bg-blue-50 rounded-xl p-6">
            <p className="text-gray-700">
              More community features coming soon! Have a suggestion?{' '}
              <Link href="/community" className="text-gabriola-green font-semibold hover:underline">
                Let us know in the forum
              </Link>
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
