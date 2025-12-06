// components/ThreadCard.tsx — FINAL WITH ADMIN DELETE & PIN
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, Pin, Trash2, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/components/AuthProvider';

export default function ThreadCard({ 
  thread, 
  currentUser, 
  onRefresh 
}: { 
  thread: any; 
  currentUser: any; 
  onRefresh: () => void;
}) {
  const { user } = useUser();
  const isAdmin = user?.role === 'admin';
  const isPinned = thread.global_pinned === true;

  const handlePin = async () => {
  const { error } = await supabase
    .from('bbs_posts')
    .update({ pinned: !thread.pinned })
    .eq('id', thread.id);

  if (!error) onRefresh();
};


  // SOFT DELETE – hides post instead of destroying it
  const handleDelete = async () => {
    if (!confirm('Hide this thread from public view?\n(Admins can restore it later from "Deleted Items")')) return;

    const { error } = await supabase
      .from('bbs_posts')
      .update({
        deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: user?.id,
      })
      .eq('id', thread.id);

    if (error) {
      console.error('Failed to hide thread:', error);
      alert('Something went wrong: ' + error.message);
    } else {
      onRefresh(); // instantly removes it from the list
    }
  };

  return (
  
    <div className="relative group">
      {/* Admin Controls — appear on hover */}
      {isAdmin && (
        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition z-10">
          <button
            onClick={handlePin}
            className={`p-2 rounded-full shadow-lg ${isPinned ? 'bg-yellow-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
            title={isPinned ? 'Unpin' : 'Pin to top'}
          >
            <Pin className="w-5 h-5" />
          </button>

          <button
            onClick={handleDelete}
            className="p-2 bg-red-600 text-white rounded-full shadow-lg hover:bg-red-700"
            title="Delete thread"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Thread Card */}
      <Link href={`/community/thread/${thread.id}`} className="block">
        <div className={`bg-white rounded-2xl shadow hover:shadow-lg transition p-6 border-2 ${
          isPinned ? 'border-yellow-400' : 'border-transparent'
        }`}>
          {isPinned && (
            <div className="flex items-center gap-2 text-yellow-600 font-bold text-sm mb-2">
              <Pin className="w-4 h-4" />
              PINNED
            </div>
          )}

          <h3 className="text-2xl font-bold text-gabriola-green-dark mb-3">
            {thread.title}
          </h3>
{user && (
  <button
    onClick={async () => {
      await supabase
        .from('thread_subscriptions')
        .upsert({ thread_id: thread.id, user_id: user.id });
      alert('Subscribed! You’ll get notified on new replies.');
    }}
    className="text-sm text-gabriola-green hover:underline"
  >
    Subscribe to replies
  </button>
)}
          <div className="flex items-center gap-4 text-gray-600 mb-4">
            <span className="font-medium">{thread.display_name}</span>
            <span>•</span>
            <span>{formatDistanceToNow(new Date(thread.created_at), { addSuffix: true })}</span>
          </div>

          <div className="flex items-center gap-6 text-sm">
            <span className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              {thread.reply_count || 0} replies
            </span>
            <span className="px-3 py-1 bg-gray-100 rounded-full">
              {thread.category.replace(/-/g, ' ')}
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}