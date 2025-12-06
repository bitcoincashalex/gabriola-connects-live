// app/community/thread/[id]/page.tsx
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import ReplyForm from '@/components/ReplyForm';
import ReplyList from '@/components/ReplyList';

async function getThread(id: string) {
  const { data, error } = await supabase
    .from('bbs_posts')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return data;
}

export default async function ThreadPage({ params }: { params: { id: string } }) {
  const thread = await getThread(params.id);
  if (!thread) notFound();

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Back link */}
      <Link href="/community" className="text-gabriola-green hover:underline mb-8 inline-block text-lg">
        ← Back to Forum
      </Link>

      {/* Main Thread */}
      <article className="bg-white rounded-2xl shadow-lg p-8 mb-10">
        {thread.pin_order > 0 && (
          <span className="inline-block bg-yellow-500 text-white px-3 py-1 rounded-full text-xs font-bold mb-4">
            PINNED
          </span>
        )}

        <h1 className="text-4xl font-bold text-gray-900 mb-4">{thread.title}</h1>

        <div className="flex items-center gap-4 text-gray-600 mb-6 text-sm">
          <span className="font-medium">{thread.display_name}</span>
          {thread.is_anonymous && <span className="bg-gray-200 px-2 py-1 rounded text-xs">Anonymous</span>}
          <span>•</span>
          <time>{format(new Date(thread.created_at), 'PPP p')}</time>
          <span className="bg-gray-100 px-3 py-1 rounded-full text-xs">
            {thread.category.replace(/-/g, ' ')}
          </span>
        </div>

        {/* External Link */}
        {thread.external_url && (
          <a
            href={thread.external_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block mb-6 text-blue-600 underline hover:text-blue-800"
          >
            🔗 {thread.external_url}
          </a>
        )}

        {/* Content */}
        <div className="prose prose-lg max-w-none mb-8 whitespace-pre-wrap">
          {thread.content}
        </div>

        {/* File Attachments */}
        {thread.file_urls?.length > 0 && (
          <div className="mt-8 p-6 bg-gray-50 rounded-xl">
            <h3 className="font-bold text-lg mb-4">Attachments ({thread.file_urls.length})</h3>
            <div className="space-y-3">
              {thread.file_urls.map((url: string) => {
                const name = decodeURIComponent(url.split('/').pop()?.split('?')[0] || 'file');
                return (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 bg-white rounded-lg hover:bg-gray-100 border"
                  >
                    📎 <span className="font-medium truncate max-w-md">{name}</span>
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </article>

      {/* Replies Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Replies ({thread.reply_count || 0})</h2>
        <ReplyList threadId={params.id} />
      </section>

      {/* Reply Form */}
      <ReplyForm threadId={params.id} />
    </div>
  );
}