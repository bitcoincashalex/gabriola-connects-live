// components/ThreadClient.tsx   ← new file
'use client';

import { useState } from 'react';
import ReplyList from './ReplyList';
import ReplyForm from './ReplyForm';

export default function ThreadClient({ threadId, initialThread }: { threadId: string; initialThread: any }) {
  const isMod = initialThread.profiles?.is_moderator;

  return (
    <>
      {/* Mod reveal */}
      {isMod && (
        <div className="bg-red-50 border border-red-300 rounded-lg p-4 mb-8 text-sm">
          <strong>Moderator view:</strong> Real name = {initialThread.profiles.real_name}
        </div>
      )}

      {/* Replies + reply form */}
      <ReplyList threadId={threadId} />
      <div className="mt-12">
        <ReplyForm threadId={threadId} />
      </div>
    </>
  );
}