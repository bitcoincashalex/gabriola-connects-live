// components/PostBody.tsx
// Shows a forum post's text with formatting: **bold**, ## headings, - lists and [links](url).
// Plain posts look the same as before: line breaks are kept and bare web addresses become links.
// Raw HTML in a post is never run (react-markdown ignores it by default).
// Version: 1.0.0
// Date: 2026-10-11

'use client';

import ReactMarkdown from 'react-markdown';

// Keep single line breaks (people type posts like messages), and make bare URLs clickable
function prepare(text: string): string {
  return (text || '')
    .replace(/\r\n/g, '\n')
    // bare http(s) addresses not already inside a [text](url) link or <url>
    .replace(/(^|[\s(])(https?:\/\/[^\s<>()\]]+[^\s<>()\].,;:!?'"])/g, '$1<$2>')
    // a single line break becomes a hard break; blank lines still separate paragraphs
    .replace(/([^\n])\n(?!\n)/g, '$1  \n');
}

export default function PostBody({ text, className = '' }: { text: string; className?: string }) {
  return (
    <div className={className}>
      <ReactMarkdown
        components={{
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gabriola-green underline hover:text-gabriola-green-dark break-words"
              onClick={(e) => e.stopPropagation()}
            >
              {children}
            </a>
          ),
          p: ({ children }) => <p className="mb-4 last:mb-0">{children}</p>,
          h1: ({ children }) => <h2 className="text-2xl font-bold text-gabriola-green-dark mt-6 mb-3">{children}</h2>,
          h2: ({ children }) => <h2 className="text-xl font-bold text-gabriola-green-dark mt-6 mb-2">{children}</h2>,
          h3: ({ children }) => <h3 className="text-lg font-bold text-gabriola-green-dark mt-5 mb-2">{children}</h3>,
          ul: ({ children }) => <ul className="list-disc pl-6 mb-4 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-6 mb-4 space-y-1">{children}</ol>,
          strong: ({ children }) => <strong className="font-semibold text-[#1F2A24]">{children}</strong>,
          hr: () => <hr className="my-6 border-[#E3DCCF]" />,
          blockquote: ({ children }) => <blockquote className="border-l-4 border-[#E3DCCF] pl-4 italic my-4">{children}</blockquote>,
          img: () => null, // images are added through the post's image gallery, not inside the text
        }}
      >
        {prepare(text)}
      </ReactMarkdown>
    </div>
  );
}
