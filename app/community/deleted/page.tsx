// app/community/deleted/page.tsx
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { redirect } from 'next/navigation';

async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/signin');

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  return { user, profile };
}

export default async function DeletedItemsPage() {
  const { user, profile } = await getCurrentUser();

  if (profile?.role !== 'admin') {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center">
        <p className="text-xl text-gray-600">Admin access only.</p>
        <Link href="/community" className="text-gabriola-green underline">← Back to Forum</Link>
      </div>
    );
  }

  const { data: deleted } = await supabase
    .from('bbs_deleted_posts')
    .select('*')
    .order('deleted_at', { ascending: false });

  const restoreThread = async (originalId: string) => {
    'use server';
    const { data: thread } = await supabase
      .from('bbs_deleted_posts')
      .select('data')
      .eq('original_id', originalId)
      .single();

    if (thread?.data) {
      await supabase.from('bbs_posts').insert(thread.data);
      await supabase.from('bbs_deleted_posts').delete().eq('original_id', originalId);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold text-gabriola-green mb-8">Deleted Items</h1>
      <Link href="/community" className="text-gabriola-green hover:underline mb-8 inline-block">
        ← Back to Forum
      </Link>

      {deleted?.length === 0 ? (
        <p className="text-center py-20 text-gray-600">Trash is empty — nice work!</p>
      ) : (
        <div className="space-y-6">
          {deleted!.map(item => (
            <div key={item.id} className="bg-red-50 border border-red-200 rounded-xl p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-xl font-bold">{item.data.title}</h3>
                  <p className="text-sm text-gray-600">
                    by {item.data.display_name} • deleted {new Date(item.deleted_at).toLocaleDateString()}
                  </p>
                  <p className="mt-3 text-gray-800 whitespace-pre-wrap">{item.data.content}</p>
                </div>
                <form action={restoreThread.bind(null, item.original_id)}>
                  <button className="ml-6 bg-green-600 text-white px-5 py-2 rounded-lg font-bold hover:bg-green-700">
                    Restore
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}