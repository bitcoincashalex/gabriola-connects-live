// components/ReplyList.tsx
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import ReplyItem from './ReplyItem';

export default async function ReplyList({ threadId }: { threadId: string }) {
  const { data: replies } = await supabase
    .from('bbs_replies')
    .select('*')
    .eq('thread_id', threadId)
    .order('created_at');

  if (!replies?.length) {
    return <p className="text-gray-500 italic py-8 text-center">No replies yet — be the first!</p>;
  }

  // Fixed typing — this was the only error
  const map = new Map<string, any>();
  replies.forEach(r => map.set(r.id, { ...r, children: [] }));

  const tree: any[] = [];  // ← THIS LINE WAS MISSING PROPER TYPING

  replies.forEach(r => {
    if (r.parent_reply_id && map.has(r.parent_reply_id)) {
      map.get(r.parent_reply_id).children.push(map.get(r.id));
    } else {
      tree.push(map.get(r.id));
    }
  });

  return (
    <div className="space-y-6">
      {tree.map(reply => (
        <ReplyItem key={reply.id} reply={reply} depth={0} />
      ))}
    </div>
  );
}