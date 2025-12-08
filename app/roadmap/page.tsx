// app/roadmap/page.tsx
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

async function getReadme() {
  try {
    const response = await fetch(
      'https://raw.githubusercontent.com/bitcoincashalex/gabriola-connects-live/main/README.md',
      { cache: 'no-store' } // Always fetch fresh
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch README');
    }
    
    return await response.text();
  } catch (error) {
    console.error('Error fetching README:', error);
    return null;
  }
}

export default async function RoadmapPage() {
  const readme = await getReadme();

  if (!readme) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center bg-white rounded-2xl shadow-lg p-12 max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Unable to Load Roadmap</h1>
          <p className="text-gray-600 mb-6">
            We're having trouble loading the roadmap. Please try again later.
          </p>
          <Link
            href="/"
            className="inline-block bg-gabriola-green text-white px-6 py-3 rounded-lg font-bold hover:bg-gabriola-green-dark"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-gabriola-green hover:underline mb-8 text-lg font-medium"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Home
        </Link>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="prose prose-lg max-w-none
            prose-headings:text-gabriola-green-dark
            prose-h1:text-4xl prose-h1:font-bold prose-h1:mb-4 prose-h1:text-center
            prose-h2:text-2xl prose-h2:font-bold prose-h2:mt-8 prose-h2:mb-4
            prose-h3:text-xl prose-h3:font-bold prose-h3:mt-6 prose-h3:mb-3
            prose-p:text-gray-700 prose-p:leading-relaxed
            prose-ul:my-4 prose-ul:list-disc prose-ul:pl-6
            prose-li:text-gray-700 prose-li:my-2
            prose-strong:text-gray-900 prose-strong:font-bold
            prose-a:text-gabriola-green prose-a:no-underline hover:prose-a:underline
            prose-code:bg-gray-100 prose-code:px-2 prose-code:py-1 prose-code:rounded
            prose-blockquote:border-l-4 prose-blockquote:border-gabriola-green prose-blockquote:pl-4 prose-blockquote:italic
          ">
            <ReactMarkdown>{readme}</ReactMarkdown>
          </div>
        </div>

        <div className="text-center mt-8">
          <Link
            href="/strachan"
            className="inline-block bg-gabriola-green text-white px-6 py-3 rounded-lg font-bold hover:bg-gabriola-green-dark"
          >
            About the Strachan Family →
          </Link>
        </div>
      </div>
    </div>
  );
}
