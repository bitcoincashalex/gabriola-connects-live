// Path: components/PostCard.tsx
// Version: 4.0.0 - Replaced likes with upvote/downvote system
// Date: 2025-12-11

'use client';

import { supabase, BBSPost } from '@/lib/supabase';
import { Calendar, Tag, User } from 'lucide-react';
import VoteButtons from '@/components/VoteButtons';

interface PostCardProps {
  post: BBSPost;
  onRefresh?: () => void;
}

export default function PostCard({ post, onRefresh }: PostCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return diffInMinutes <= 1 ? 'Just now' : `${diffInMinutes} minutes ago`;
    } else if (diffInHours < 24) {
      const hours = Math.floor(diffInHours);
      return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      'general': 'bg-blue-100 text-blue-800',
      'events': 'bg-purple-100 text-purple-800',
      'buy-sell': 'bg-green-100 text-green-800',
      'lost-found': 'bg-orange-100 text-orange-800',
      'recommendations': 'bg-pink-100 text-pink-800',
      'announcements': 'bg-red-100 text-red-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const getCategoryLabel = (category: string) => {
    const labels: { [key: string]: string } = {
      'general': 'General Discussion',
      'events': 'Community Events',
      'buy-sell': 'Buy & Sell',
      'lost-found': 'Lost & Found',
      'recommendations': 'Recommendations',
      'announcements': 'Announcements',
    };
    return labels[category] || category;
  };

  return (
    <article className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 overflow-hidden hover:border-gabriola-green/30 transition-all duration-300 hover:shadow-xl">
      <div className="p-6 flex gap-4">
        {/* Vote Buttons - Left side */}
        <div className="flex-shrink-0">
          <VoteButtons
            itemId={post.id}
            itemType="post"
            initialScore={post.vote_score || 0}
            onScoreChange={() => onRefresh?.()}
          />
        </div>

        {/* Content - Right side */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${getCategoryColor(post.category)}`}>
                <Tag className="w-3 h-3" />
                {getCategoryLabel(post.category)}
              </span>
            </div>
            
            <h3 className="text-2xl font-bold text-gray-900 mb-2 leading-tight">
              {post.title}
            </h3>
            
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <User className="w-4 h-4" />
                <span className="font-medium text-gabriola-green">
                  {post.user_name}
                </span>
              </span>
              <span className="text-gray-400">•</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {formatDate(post.created_at)}
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="prose prose-lg max-w-none">
            <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
              {post.content}
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Post ID: {post.id.slice(0, 8)}...</span>
          <span className={post.is_active ? 'text-green-600' : 'text-gray-400'}>
            {post.is_active ? '● Active' : '● Inactive'}
          </span>
        </div>
      </div>
    </article>
  );
}
