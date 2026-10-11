// lib/forum.ts
// Forum helpers: which posts are Island News (posted by the Gabriola Connects account), and the special topic filters
// Version: 1.0.1
// Date: 2026-10-11

// The Gabriola Connects account (formerly named Claude) that posts Island News summaries and sends forum reply notices
export const NEWS_AUTHOR_ID = '713881fc-2506-490c-8d72-4c6205bd1093';

// Special filters in the forum's topic row (not real topics in the database)
export const NEWS_FILTER = 'island-news';
export const DISCUSSIONS_FILTER = 'discussions';

export function isNewsPost(post: { user_id?: string | null } | null | undefined): boolean {
  return !!post && post.user_id === NEWS_AUTHOR_ID;
}
