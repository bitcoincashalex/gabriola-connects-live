// components/LinkifyText.tsx
// Version: 1.0.0 - Auto-linkify URLs in text content
// Date: 2025-12-21

'use client';

interface Props {
  children: string;
  className?: string;
}

export default function LinkifyText({ children, className = '' }: Props) {
  // URL regex pattern - matches http(s):// URLs
  const urlPattern = /(https?:\/\/[^\s]+)/g;
  
  const linkifyText = (text: string) => {
    const parts = text.split(urlPattern);
    
    return parts.map((part, index) => {
      // Check if this part is a URL
      if (part.match(urlPattern)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline break-all"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <span className={className}>
      {linkifyText(children)}
    </span>
  );
}
