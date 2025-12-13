// Path: components/CommunityModal.tsx
// Version: 1.0.0 - Community Hub modal with Forum, Emergency, and coming soon features
// Date: 2024-12-13

'use client';

import { X, MessageSquare, AlertCircle, Map, Newspaper, Heart } from 'lucide-react';
import Link from 'next/link';

interface CommunityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CommunityModal({ isOpen, onClose }: CommunityModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gabriola-green text-white p-6 rounded-t-2xl flex items-center justify-between z-10">
          <div>
            <h2 className="text-3xl font-bold">Community Hub</h2>
            <p className="text-white/90 mt-1">Your gateway to Gabriola resources</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Forum - Active */}
            <Link
              href="/community"
              onClick={onClose}
              className="block bg-white border-2 border-gabriola-green rounded-xl p-6 hover:shadow-lg transition-all hover:border-gabriola-green-dark group"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-gabriola-green/10 rounded-lg group-hover:bg-gabriola-green/20 transition">
                  <MessageSquare className="w-8 h-8 text-gabriola-green" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">
                    Forum & Discussions
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
              onClick={onClose}
              className="block bg-white border-2 border-red-500 rounded-xl p-6 hover:shadow-lg transition-all hover:border-red-600 group"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-red-50 rounded-lg group-hover:bg-red-100 transition">
                  <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">
                    Emergency Contacts
                  </h3>
                  <p className="text-gray-600">
                    Important phone numbers for Gabriola Island emergencies
                  </p>
                </div>
              </div>
            </Link>

            {/* Island Map - Coming Soon */}
            <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-6 opacity-60 cursor-not-allowed">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-gray-200 rounded-lg">
                  <Map className="w-8 h-8 text-gray-500" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-xl font-bold text-gray-700">
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
            <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-6 opacity-60 cursor-not-allowed">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-gray-200 rounded-lg">
                  <Newspaper className="w-8 h-8 text-gray-500" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-xl font-bold text-gray-700">
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

            {/* Volunteer Opportunities - Coming Soon */}
            <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-6 opacity-60 cursor-not-allowed">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-gray-200 rounded-lg">
                  <Heart className="w-8 h-8 text-gray-500" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-xl font-bold text-gray-700">
                      Volunteer Opportunities
                    </h3>
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">
                      Coming Soon
                    </span>
                  </div>
                  <p className="text-gray-500">
                    Help out in your community and make a difference
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 bg-gray-50 rounded-b-2xl border-t">
            <p className="text-sm text-gray-600 text-center">
              More community features coming soon! Have a suggestion?{' '}
              <Link href="/community" className="text-gabriola-green font-semibold hover:underline">
                Let us know in the forum
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
