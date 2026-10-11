// Path: components/BBS.tsx
// Version: 6.1.0 - "Island News" and "Discussions" buttons at the start of the topic row
// Previous: 6.0.1 - Topic rows no longer show a scrollbar on computers
// Earlier: 6.0.0 - Forum redesign for phones: smaller title, one-line guest notice, topics in one
//                  row that scrolls sideways (sub-topics open in a second row), compact post list.
//                  Signed-in member line kept, without the large text. No emoji.
// Earlier: 5.1.1 - New post (+) button moved up so it sits above the fixed bottom menu
// Earlier: 5.1.0 - Added auto-scroll to thread list on category/search selection
// Date: 2026-10-10

'use client';

import { useState, useEffect, useRef } from 'react';
import { useUser } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';
import CreateThread from './CreateThread';
import ThreadList from './ThreadList';
import ForumSearchBar from './ForumSearchBar';
import { Plus, AlertCircle, Ban, ChevronDown, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { NEWS_FILTER, DISCUSSIONS_FILTER } from '@/lib/forum';

export default function BBS() {
  const { user } = useUser();
  const [categories, setCategories] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [openParent, setOpenParent] = useState<string | null>(null); // top-level topic whose sub-topics are showing
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResultCount, setSearchResultCount] = useState<number | undefined>(undefined);
  const [isSearching, setIsSearching] = useState(false);

  // Ref for auto-scrolling to thread list
  const threadListRef = useRef<HTMLDivElement>(null);

  // Fetch categories from database
  useEffect(() => {
    fetchCategories();
  }, []);

  // Auto-scroll to thread list when category or search changes
  useEffect(() => {
    if (activeCategory !== 'all' || searchQuery) {
      // Small delay to let ThreadList render first
      setTimeout(() => {
        threadListRef.current?.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        });
      }, 100);
    }
  }, [activeCategory, searchQuery]);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('bbs_categories')
      .select('*')
      .eq('is_active', true)
      .eq('is_archived', false)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching categories:', error);
      return;
    }

    setCategories(data || []);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setIsSearching(true);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResultCount(undefined);
    setIsSearching(false);
  };

  const handleSearchResults = (count: number) => {
    setSearchResultCount(count);
    setIsSearching(false);
  };

  // Track anonymous users (allow them to browse but not post)
  const isAnonymous = !user;

  // COMPLETE BAN CHECK - Block entire forum access (only for logged-in users)
  if (user && user.is_banned) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Ban className="w-12 h-12 text-red-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            Forum Access Restricted
          </h1>
          <p className="text-gray-600 mb-6 text-lg">
            You have been banned from the Gabriola Connects community forum.
          </p>
          {(user as any).banned_reason && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-800">
                <strong>Reason:</strong> {(user as any).banned_reason}
              </p>
            </div>
          )}
          <p className="text-gray-500 text-sm mb-2">
            You can still access Events, Directory, Alerts, and other parts of Gabriola Connects.
          </p>
          <p className="text-gray-500 text-sm mb-8">
            If you believe this is an error, please contact a site administrator.
          </p>
          <Link
            href="/"
            className="inline-block bg-gabriola-green text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-gabriola-green-dark transition"
          >
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  // Build role badges in priority order (only for logged-in users)
  const roles = [];
  const u = user as any;
  
  if (user) {
    if (u.is_super_admin) {
      roles.push({ label: 'Super Admin', color: 'bg-red-700' });
    }
    
    if (u.admin_forum && !u.is_super_admin) {
      roles.push({ label: 'Forum Admin', color: 'bg-red-600' });
    }
    
    if (u.forum_moderator && !u.admin_forum && !u.is_super_admin) {
      roles.push({ label: 'Moderator', color: 'bg-purple-600' });
    }
    
    if (u.is_fire) roles.push({ label: 'Fire Dept', color: 'bg-orange-600' });
    if (u.is_police) roles.push({ label: 'RCMP', color: 'bg-blue-700' });
    if (u.is_medic) roles.push({ label: 'Medic', color: 'bg-red-700' });
    if (u.is_coast_guard) roles.push({ label: 'Coast Guard', color: 'bg-blue-800' });
    
    if (u.is_resident) roles.push({ label: 'Resident', color: 'bg-green-600' });
    
    if (u.forum_read_only) {
      roles.push({ label: 'Read Only', color: 'bg-yellow-500' });
    }
  }

  const canCreatePost = user && !u.is_banned && !u.forum_read_only && u.can_post;

  const handlePostCreated = () => {
    setShowCreateModal(false);
    setRefreshKey(prev => prev + 1);
  };

  // Group categories by parent
  const topLevelCategories = categories.filter(cat => !cat.parent_id);
  const getChildren = (parentId: string) => categories.filter(cat => cat.parent_id === parentId);

  // A topic with sub-topics opens a second row; one without sub-topics is selected
  const handleCategoryClick = (category: any) => {
    const children = getChildren(category.id);
    if (children.length > 0) {
      setOpenParent(openParent === category.slug ? null : category.slug);
    } else {
      setOpenParent(null);
      setActiveCategory(category.slug);
    }
  };

  const categoryNames: Record<string, string> = Object.fromEntries(categories.map(c => [c.slug, c.name]));
  const openParentCat = topLevelCategories.find(c => c.slug === openParent);
  const openChildren = openParentCat ? getChildren(openParentCat.id) : [];
  const parentOfActive = categories.find(c => c.slug === activeCategory)?.parent_id;

  const chip = (selected: boolean) =>
    `flex-shrink-0 flex items-center gap-1 px-4 min-h-[40px] rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
      selected ? 'bg-gabriola-green text-white' : 'bg-white border border-[#CFC6B4] text-[#1F2A24] hover:border-gabriola-green'
    }`;

  return (
    <div className="min-h-screen bg-[#F6F2EA] text-[#1F2A24]">
      <div className="bg-white border-b border-[#E3DCCF]">
        <div className="max-w-5xl mx-auto px-4 pt-4 pb-3 space-y-3">
          <div>
            <h1 className="font-display text-[26px] md:text-3xl font-bold text-gabriola-green-dark leading-tight">Community Forum</h1>
            <p className="text-sm md:text-base text-[#5B6660]">Real conversations. Real neighbours. Real Gabriola.</p>
          </div>

          {isAnonymous ? (
            <div className="flex items-center justify-between gap-3 bg-[#E6EFE8] rounded-xl px-3 py-2.5">
              <p className="text-sm text-gabriola-green-dark">Browsing as a guest. Sign in to post or reply.</p>
              <Link
                href="/signup"
                className="flex-shrink-0 flex items-center min-h-[40px] px-3.5 rounded-lg bg-gabriola-green text-white text-sm font-semibold hover:bg-gabriola-green-dark transition-colors whitespace-nowrap"
              >
                Sign Up Free
              </Link>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2 text-sm text-[#5B6660]">
                <span>Signed in as</span>
                <span className="font-semibold text-gabriola-green-dark">{user.full_name || user.email}</span>
                {roles.map(role => (
                  <span key={role.label} className={`${role.color} text-white px-2 py-0.5 rounded-full text-xs font-bold`}>
                    {role.label}
                  </span>
                ))}
              </div>
              {u.forum_read_only && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">
                    <strong>Notice:</strong> Your account is in read-only mode. You can view posts but cannot create new ones or reply.
                  </p>
                </div>
              )}
            </>
          )}

          <ForumSearchBar
            onSearch={handleSearch}
            onClear={handleClearSearch}
            resultCount={searchResultCount}
            isSearching={isSearching}
          />

          {/* Topics: one row that scrolls sideways */}
          <div className="-mx-4 px-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Forum topics">
            <button onClick={() => { setActiveCategory('all'); setOpenParent(null); }} className={chip(activeCategory === 'all')}>
              All Posts
            </button>
            <button onClick={() => { setActiveCategory(NEWS_FILTER); setOpenParent(null); }} className={chip(activeCategory === NEWS_FILTER)}>
              Island News
            </button>
            <button onClick={() => { setActiveCategory(DISCUSSIONS_FILTER); setOpenParent(null); }} className={chip(activeCategory === DISCUSSIONS_FILTER)}>
              Discussions
            </button>
            {topLevelCategories.map(category => {
              const hasChildren = getChildren(category.id).length > 0;
              const selected = activeCategory === category.slug || parentOfActive === category.id || openParent === category.slug;
              return (
                <button
                  key={category.slug}
                  onClick={() => handleCategoryClick(category)}
                  aria-expanded={hasChildren ? openParent === category.slug : undefined}
                  className={chip(selected)}
                >
                  {category.name}
                  {hasChildren && (openParent === category.slug ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />)}
                </button>
              );
            })}
          </div>

          {/* Sub-topics of the open topic */}
          {openChildren.length > 0 && (
            <div className="-mx-4 px-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {openChildren.map(child => (
                <button key={child.slug} onClick={() => setActiveCategory(child.slug)} className={chip(activeCategory === child.slug)}>
                  {child.name}
                </button>
              ))}
            </div>
          )}

          {canCreatePost && (
            <button
              onClick={() => setShowCreateModal(true)}
              aria-label="New post"
              className="fixed bottom-24 right-6 bg-gabriola-green text-white w-16 h-16 rounded-full shadow-2xl flex items-center justify-center hover:bg-gabriola-green-dark transition z-50"
            >
              <Plus className="w-8 h-8" />
            </button>
          )}
        </div>
      </div>

      <div ref={threadListRef} className="max-w-5xl mx-auto px-4 py-4 scroll-mt-24">
        <ThreadList 
          key={refreshKey} 
          category={activeCategory} 
          currentUser={user || null}
          searchQuery={searchQuery}
          onSearchResults={handleSearchResults}
          categoryNames={categoryNames}
        />
      </div>

      {showCreateModal && canCreatePost && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8 shadow-2xl" onClick={e => e.stopPropagation()}>
            <CreateThread 
              currentUser={user} 
              defaultCategoryId={
                activeCategory === 'all' 
                  ? undefined 
                  : categories.find(cat => cat.slug === activeCategory)?.id
              }
              onSuccess={handlePostCreated} 
            />
            <button 
              onClick={() => setShowCreateModal(false)} 
              className="mt-6 w-full py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
