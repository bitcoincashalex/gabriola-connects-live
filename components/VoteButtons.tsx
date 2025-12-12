// components/VoteButtons.tsx
// Reusable upvote/downvote component for posts and replies
// Version: 1.0.0
// Date: 2025-12-11

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/components/AuthProvider';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface VoteButtonsProps {
  itemId: string;
  itemType: 'post' | 'reply';
  initialScore: number;
  onScoreChange?: (newScore: number) => void;
}

export default function VoteButtons({ 
  itemId, 
  itemType, 
  initialScore, 
  onScoreChange 
}: VoteButtonsProps) {
  const { user } = useUser();
  const [score, setScore] = useState(initialScore);
  const [userVote, setUserVote] = useState<'upvote' | 'downvote' | null>(null);
  const [isVoting, setIsVoting] = useState(false);

  const tableName = itemType === 'post' ? 'bbs_post_votes' : 'bbs_reply_votes';
  const idColumn = itemType === 'post' ? 'post_id' : 'reply_id';

  // Fetch user's existing vote
  useEffect(() => {
    if (!user) {
      setUserVote(null);
      return;
    }

    const fetchUserVote = async () => {
      const { data } = await supabase
        .from(tableName)
        .select('vote_type')
        .eq(idColumn, itemId)
        .eq('user_id', user.id)
        .single();

      if (data) {
        setUserVote(data.vote_type as 'upvote' | 'downvote');
      } else {
        setUserVote(null);
      }
    };

    fetchUserVote();
  }, [user, itemId, tableName, idColumn]);

  const handleVote = async (voteType: 'upvote' | 'downvote') => {
    if (!user) {
      alert('Please sign in to vote');
      return;
    }

    if (isVoting) return;
    setIsVoting(true);

    try {
      // Case 1: User clicking same button (remove vote)
      if (userVote === voteType) {
        const { error } = await supabase
          .from(tableName)
          .delete()
          .eq(idColumn, itemId)
          .eq('user_id', user.id);

        if (!error) {
          setUserVote(null);
          // Score will update via trigger, but optimistically update UI
          const change = voteType === 'upvote' ? -1 : 1;
          const newScore = score + change;
          setScore(newScore);
          onScoreChange?.(newScore);
        }
      }
      // Case 2: User has existing vote (update it)
      else if (userVote) {
        const { error } = await supabase
          .from(tableName)
          .update({ vote_type: voteType, updated_at: new Date().toISOString() })
          .eq(idColumn, itemId)
          .eq('user_id', user.id);

        if (!error) {
          setUserVote(voteType);
          // Switching from upvote to downvote = -2, vice versa = +2
          const change = voteType === 'upvote' ? 2 : -2;
          const newScore = score + change;
          setScore(newScore);
          onScoreChange?.(newScore);
        }
      }
      // Case 3: No existing vote (insert new)
      else {
        const { error } = await supabase
          .from(tableName)
          .insert({
            [idColumn]: itemId,
            user_id: user.id,
            vote_type: voteType,
          });

        if (!error) {
          setUserVote(voteType);
          const change = voteType === 'upvote' ? 1 : -1;
          const newScore = score + change;
          setScore(newScore);
          onScoreChange?.(newScore);
        }
      }
    } catch (error) {
      console.error('Error voting:', error);
    } finally {
      setIsVoting(false);
    }
  };

  // Score color based on value
  const getScoreColor = () => {
    if (score > 0) return 'text-green-600';
    if (score < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className="flex flex-col items-center gap-1">
      {/* Upvote button */}
      <button
        onClick={() => handleVote('upvote')}
        disabled={isVoting}
        className={`p-1 rounded transition-all ${
          userVote === 'upvote'
            ? 'bg-green-100 text-green-600'
            : 'hover:bg-gray-100 text-gray-400 hover:text-green-600'
        } ${isVoting ? 'opacity-50 cursor-not-allowed' : ''}`}
        title="Upvote"
      >
        <ChevronUp className="w-6 h-6" />
      </button>

      {/* Score */}
      <span className={`font-bold text-lg ${getScoreColor()}`}>
        {score}
      </span>

      {/* Downvote button */}
      <button
        onClick={() => handleVote('downvote')}
        disabled={isVoting}
        className={`p-1 rounded transition-all ${
          userVote === 'downvote'
            ? 'bg-red-100 text-red-600'
            : 'hover:bg-gray-100 text-gray-400 hover:text-red-600'
        } ${isVoting ? 'opacity-50 cursor-not-allowed' : ''}`}
        title="Downvote"
      >
        <ChevronDown className="w-6 h-6" />
      </button>
    </div>
  );
}
