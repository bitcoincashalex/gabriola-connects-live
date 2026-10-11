// components/ShareButton.tsx
// Share a page: opens the phone's share sheet (Facebook, text, email...) where available,
// otherwise copies the link and says "Link copied"
// Version: 1.0.0
// Date: 2026-10-11

'use client';

import { useState } from 'react';
import { Share2, Check } from 'lucide-react';

interface ShareButtonProps {
  url: string;          // full address, e.g. https://www.gabriolaconnects.ca/community/thread/...
  title: string;
  label?: boolean;      // show the word "Share" next to the icon
  className?: string;
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Older browsers: copy through a hidden text box
    try {
      const box = document.createElement('textarea');
      box.value = text;
      box.setAttribute('readonly', '');
      box.style.position = 'fixed';
      box.style.opacity = '0';
      document.body.appendChild(box);
      box.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(box);
      return ok;
    } catch {
      return false;
    }
  }
}

export default function ShareButton({ url, title, label = true, className = '' }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      try {
        await (navigator as any).share({ title, url });
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') return; // they closed the share sheet
      }
    }
    if (await copyText(url)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      aria-label={copied ? 'Link copied' : `Share "${title}"`}
      title={copied ? 'Link copied' : 'Share'}
      className={`inline-flex items-center justify-center gap-1.5 min-h-[36px] px-2.5 rounded-lg font-semibold transition-colors ${
        copied ? 'text-gabriola-green bg-[#E6EFE8]' : 'text-[#5B6660] hover:text-gabriola-green hover:bg-[#E6EFE8]'
      } ${className}`}
    >
      {copied ? <Check className="w-4 h-4" aria-hidden="true" /> : <Share2 className="w-4 h-4" aria-hidden="true" />}
      {label && <span>{copied ? 'Link copied' : 'Share'}</span>}
    </button>
  );
}
