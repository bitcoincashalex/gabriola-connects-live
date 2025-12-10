// Path: components/ReplyItem.tsx
// Version: 2.0.0 - Limit nesting depth on mobile to prevent off-screen content
// Date: 2024-12-09

import { formatDistanceToNow } from 'date-fns';

export default function ReplyItem({ reply, depth }: { reply: any; depth: number }) {
  // Calculate indentation based on depth
  // Mobile: Cap at level 2 (32px total indentation)
  // Desktop: Allow deeper nesting
  const getIndentClass = () => {
    if (depth === 0) return '';
    if (depth === 1) return 'ml-4 pl-4 border-l-4 border-gray-200';
    // Depth 2+: Stop increasing indent on mobile, continue on desktop
    return 'ml-8 md:ml-' + Math.min(depth * 4, 16) + ' pl-4 border-l-4 border-gray-300';
  };
  
  return (
    <div className={getIndentClass()}>
      <div className="bg-white rounded-xl shadow-sm p-5 my-4">
        <div className="flex items-center gap-3 text-sm text-gray-600 mb-3">
          <span className="font-medium">{reply.display_name}</span>
          {reply.is_anonymous && <span className="text-xs bg-gray-200 px-2 py-1 rounded">Anonymous</span>}
          <span>•</span>
          <time>{formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}</time>
        </div>
        <div className="whitespace-pre-wrap text-gray-800">{reply.content}</div>

        {/* Nested replies */}
        {reply.children?.length > 0 && (
          <div className="mt-6">
            {reply.children.map((child: any) => (
              <ReplyItem key={child.id} reply={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
