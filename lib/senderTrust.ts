// lib/senderTrust.ts
// Decides whether a notice email really comes from a trusted organization
// Version: 1.0.0
// Date: 2026-10-10
//
// Anyone can type any "From" address, so the From line alone proves nothing.
// We rely on the Authentication-Results header that Hostinger's mail server
// adds when the email arrives: a DMARC or DKIM "pass" for the sender's domain
// means the organization's own mail system really signed it.

// Organizations whose verified emails may publish alerts automatically.
// Add more in Vercel with NOTICE_TRUSTED_DOMAINS (comma separated), e.g. "islandhealth.ca,drivebc.ca"
const DEFAULT_TRUSTED = [
  'bcferries.com',
  'rdn.bc.ca',
  'bchydro.com',
  'soundernews.com',
  'voyent-alert.com',
  'gov.bc.ca',
  'drivebc.ca',
  'islandhealth.ca',
];

export function trustedDomains(): string[] {
  const extra = (process.env.NOTICE_TRUSTED_DOMAINS || '')
    .split(',').map(d => d.trim().toLowerCase()).filter(Boolean);
  return [...DEFAULT_TRUSTED, ...extra];
}

function domainOf(address: string): string {
  const m = address.toLowerCase().match(/@([a-z0-9.-]+)/);
  return m ? m[1] : '';
}

// "e.bcferries.com" belongs to "bcferries.com"
function belongsTo(domain: string, root: string): boolean {
  return domain === root || domain.endsWith('.' + root);
}

export interface TrustResult {
  trusted: boolean;
  fromDomain: string;
  summary: string; // short explanation stored for the admin page
}

export function checkSender(fromAddress: string, authResultsHeaders: string[]): TrustResult {
  const fromDomain = domainOf(fromAddress);
  const roots = trustedDomains();
  const root = roots.find(r => belongsTo(fromDomain, r));

  if (!root) {
    return { trusted: false, fromDomain, summary: `Sender ${fromDomain || 'unknown'} is not on the trusted list` };
  }

  // Use only the first (top) Authentication-Results header: that one is added by
  // our own mail server. Lower ones could have been written by the sender.
  const ar = (authResultsHeaders[0] || '').toLowerCase().replace(/\s+/g, ' ');
  if (!ar) {
    return { trusted: false, fromDomain, summary: 'No Authentication-Results header, cannot verify sender' };
  }

  const dmarcPass = /dmarc=pass[^;]*header\.from=([a-z0-9.-]+)/.exec(ar);
  if (dmarcPass && belongsTo(dmarcPass[1], root)) {
    return { trusted: true, fromDomain, summary: `Verified: DMARC pass for ${dmarcPass[1]}` };
  }

  const dkimRe = /dkim=pass[^;]*?header\.(?:d|i)=@?([a-z0-9.-]+)/g;
  let m: RegExpExecArray | null;
  while ((m = dkimRe.exec(ar))) {
    if (belongsTo(m[1], root)) {
      return { trusted: true, fromDomain, summary: `Verified: DKIM signature from ${m[1]}` };
    }
  }

  return { trusted: false, fromDomain, summary: `From ${fromDomain} but signature did not verify (${ar.slice(0, 160)})` };
}
