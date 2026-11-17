// components/VideoEmbeds.tsx
// Plays YouTube, Vimeo and Facebook videos on the page when a link to one is in a post, a reply,
// a listing or an event description. The link stays in the text too; the player goes under it.
// Version: 1.0.0
// Date: 2026-11-17
//
// No video files are stored on Gabriola Connects: the video stays on YouTube / Vimeo / Facebook and
// plays from there. YouTube uses its privacy-enhanced player (youtube-nocookie.com). Shorts and
// Facebook reels are shown upright (9:16). Facebook videos only play if they're public on Facebook.
// At most 3 players per post, so a post full of links doesn't load a wall of videos.

'use client';

export interface VideoEmbed {
  key: string;            // for de-duplicating: "yt:abc123"
  src: string;            // iframe address
  title: string;
  upright: boolean;       // 9:16 (Shorts, reels) instead of 16:9
}

const MAX_PLAYERS = 3;

function parseVideoUrl(raw: string): VideoEmbed | null {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\.|^m\./, '').toLowerCase();
  const path = u.pathname;

  // YouTube
  let yt: string | null = null;
  let upright = false;
  if (host === 'youtu.be') yt = path.split('/')[1] || null;
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com' || host === 'music.youtube.com') {
    if (path === '/watch') yt = u.searchParams.get('v');
    else {
      const m = path.match(/^\/(shorts|live|embed)\/([^/?#]+)/);
      if (m) { yt = m[2]; upright = m[1] === 'shorts'; }
    }
  }
  if (yt && /^[A-Za-z0-9_-]{6,20}$/.test(yt)) {
    const t = u.searchParams.get('t') || u.searchParams.get('start');
    const secs = t ? parseInt(t, 10) : 0;
    return {
      key: `yt:${yt}`,
      src: `https://www.youtube-nocookie.com/embed/${yt}${secs > 0 ? `?start=${secs}` : ''}`,
      title: 'YouTube video',
      upright,
    };
  }

  // Vimeo
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const m = path.match(/(?:^|\/)(\d{5,12})(?:\/([0-9a-f]{6,20}))?/);
    if (m) {
      const hash = m[2] || u.searchParams.get('h');
      return {
        key: `vimeo:${m[1]}`,
        src: `https://player.vimeo.com/video/${m[1]}${hash ? `?h=${hash}` : ''}`,
        title: 'Vimeo video',
        upright: false,
      };
    }
  }

  // Facebook (public videos and reels only play)
  const fbVideo =
    (host === 'facebook.com' && (/\/videos\//.test(path) || path.startsWith('/watch') || path.startsWith('/reel/') || path.startsWith('/share/v/') || path.startsWith('/share/r/'))) ||
    host === 'fb.watch';
  if (fbVideo) {
    const clean = `${u.origin}${u.pathname}${path.startsWith('/watch') ? u.search : ''}`;
    const reel = path.startsWith('/reel/') || path.startsWith('/share/r/');
    return {
      key: `fb:${clean}`,
      src: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(clean)}&show_text=false`,
      title: 'Facebook video',
      upright: reel,
    };
  }
  return null;
}

/** The videos linked in a piece of text, in order, without repeats (at most 3) */
export function videoEmbedsFrom(text?: string | null): VideoEmbed[] {
  if (!text) return [];
  const out: VideoEmbed[] = [];
  const re = /https?:\/\/[^\s<>()\]"']+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) && out.length < MAX_PLAYERS) {
    const url = m[0].replace(/[.,;:!?]+$/, '');
    const v = parseVideoUrl(url);
    if (v && !out.some(o => o.key === v.key)) out.push(v);
  }
  return out;
}

export default function VideoEmbeds({ text, className = '' }: { text?: string | null; className?: string }) {
  const videos = videoEmbedsFrom(text);
  if (videos.length === 0) return null;
  return (
    <div className={`space-y-3 ${className}`} onClick={e => e.stopPropagation()}>
      {videos.map(v => (
        <div
          key={v.key}
          className={`relative w-full overflow-hidden rounded-xl bg-black ${v.upright ? 'max-w-[340px] aspect-[9/16]' : 'aspect-video'}`}
        >
          <iframe
            src={v.src}
            title={v.title}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="absolute inset-0 w-full h-full border-0"
          />
        </div>
      ))}
    </div>
  );
}
