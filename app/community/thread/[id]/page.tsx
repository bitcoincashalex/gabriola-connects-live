// app/community/thread/[id]/page.tsx
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { format } from 'date-fns';
import ReplyForm from '@/components/ReplyForm';
import ReplyList from '@/components/ReplyList';

async function getThread(id: string) {
  const { data, error } = await supabase
    .from('bbs_posts')
    .select('*')
    .eq('id', id)
    .eq('is_active', true)
    .single();

  if (error || !data) return null;
  return data;
}

export default async function ThreadPage({ params }: { params: { id: string } }) {
  const thread = await getThread(params.id);
  if (!thread) notFound();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Back link */}
        <Link 
          href="/community" 
          className="text-gabriola-green hover:underline mb-8 inline-flex items-center gap-2 text-lg font-medium"
        >
          ← Back to Forum
        </Link>

        {/* Main Thread */}
        <article className="bg-white rounded-2xl shadow-lg p-8 mb-10">
          {/* Pinned Badge */}
          {thread.global_pinned && (
            <span className="inline-block bg-yellow-500 text-white px-3 py-1 rounded-full text-xs font-bold mb-4">
              📌 PINNED
            </span>
          )}

          {/* Title */}
          <h1 className="text-4xl font-bold text-gray-900 mb-4">{thread.title}</h1>

          {/* Meta Info */}
          <div className="flex flex-wrap items-center gap-3 text-gray-600 mb-6 text-sm">
            <span className="font-medium text-gabriola-green">{thread.display_name || 'Anonymous'}</span>
            {thread.is_anonymous && (
              <span className="bg-gray-200 px-2 py-1 rounded text-xs">🕶️ Anonymous</span>
            )}
            <span>•</span>
            <time>{format(new Date(thread.created_at), 'PPP p')}</time>
            <span>•</span>
            <span className="bg-gabriola-green/10 text-gabriola-green px-3 py-1 rounded-full text-xs font-medium">
              {thread.category.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
            </span>
          </div>

          {/* External Link */}
          {thread.link_url && (
            <a
              href={thread.link_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-600 hover:bg-blue-100 transition"
            >
              🔗 <span className="font-medium">{thread.link_url}</span>
            </a>
          )}

          {/* Image */}
          {thread.image_url && (
            <div className="mb-6">
              <img 
                src={thread.image_url} 
                alt="Post attachment" 
                className="max-w-full h-auto rounded-lg border-2 border-gray-200"
                style={{ maxHeight: '600px' }}
              />
            </div>
          )}

          {/* Content Body */}
          <div className="prose prose-lg max-w-none mb-8 whitespace-pre-wrap text-gray-700 leading-relaxed">
            {thread.body}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 text-sm text-gray-500 pt-6 border-t">
            <span>👁️ {thread.view_count || 0} views</span>
            <span>💬 {thread.reply_count || 0} replies</span>
            <span>❤️ {thread.like_count || 0} likes</span>
          </div>
        </article>

        {/* Replies Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Replies ({thread.reply_count || 0})
          </h2>
          <ReplyList threadId={params.id} />
        </section>

        {/* Reply Form */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <ReplyForm threadId={params.id} />
        </div>
      </div>
    </div>
  );
}
