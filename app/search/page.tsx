// app/search/page.tsx
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const query = (searchParams.q || '').trim();
  let results: any[] = [];

  if (query.length >= 2) {
    const { data } = await supabase.rpc('search_all', { query });
    results = data || [];
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <h1 className="text-5xl font-bold text-gabriola-green text-center mb-12">
        Search Gabriola Connects
      </h1>

      <form className="mb-12">
        <input
          name="q"
          type="text"
          placeholder="Search forum, events, businesses, people..."
          defaultValue={query}
          autoFocus
          className="w-full p-5 border-2 border-gabriola-green/30 rounded-xl text-lg focus:outline-none focus:border-gabriola-green"
        />
      </form>

      {query.length < 2 ? (
        <p className="text-center text-gray-600 py-20 text-xl">Type at least 2 characters</p>
      ) : results.length === 0 ? (
        <p className="text-center text-gray-600 py-20 text-xl">No results for “{query}”</p>
      ) : (
        <div className="space-y-6">
          {results.map(r => (
            <Link
              key={`${r.type}-${r.id}`}
              href={r.url + (r.type === 'thread' ? `/${r.id}` : '')}
              className="block p-6 bg-white rounded-xl shadow hover:shadow-xl transition border"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="px-3 py-1 bg-gabriola-green/10 text-gabriola-green text-xs rounded-full font-medium">
                  {r.type}
                </span>
                <h3 className="text-xl font-bold text-gabriola-green-dark">{r.title}</h3>
              </div>
              {r.content && <p className="text-gray-700 line-clamp-2">{r.content}</p>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}