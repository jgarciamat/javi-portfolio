import { FunnelDimensions } from '@domain/ports/services';

/** What the browser says about where this page load came from (raw, untrusted). */
export interface RawOrigin {
  utm_source?: string;
  utm_campaign?: string;
  utm_content?: string;
  /** Host of the page that linked here. */
  ref?: string;
  /** Sent from the Android app. */
  app?: boolean;
}

export const DIRECT = '(direct)';
export const APP = '(app)';
export const UNKNOWN = '(unknown)';
export const OTHER = '(other)';

/** Labels: lowercase letters, digits, dot, dash and underscore; never a free text. */
function label(value: string | undefined, max: number): string {
  return (value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
    .slice(0, max);
}

/** Known sites, by the end of their host name, grouped under one name. */
const KNOWN_SITES: [RegExp, string][] = [
  [/(^|\.)google\.[a-z.]+$/, 'google'],
  [/(^|\.)bing\.com$/, 'bing'],
  [/(^|\.)duckduckgo\.com$/, 'duckduckgo'],
  [/(^|\.)(yahoo\.com|search\.yahoo\.[a-z.]+)$/, 'yahoo'],
  [/(^|\.)ecosia\.org$/, 'ecosia'],
  [/(^|\.)(youtube\.com|youtu\.be)$/, 'youtube'],
  [/(^|\.)tiktok\.com$/, 'tiktok'],
  [/(^|\.)instagram\.com$/, 'instagram'],
  [/(^|\.)(facebook\.com|fb\.com|fb\.me)$/, 'facebook'],
  [/(^|\.)(twitter\.com|x\.com|t\.co)$/, 'x'],
  [/(^|\.)(linkedin\.com|lnkd\.in)$/, 'linkedin'],
  [/(^|\.)reddit\.com$/, 'reddit'],
  [/(^|\.)(whatsapp\.com|wa\.me)$/, 'whatsapp'],
  [/(^|\.)(telegram\.org|t\.me)$/, 'telegram'],
  [/(^|\.)chatgpt\.com$|(^|\.)openai\.com$/, 'chatgpt'],
  [/(^|\.)perplexity\.ai$/, 'perplexity'],
];

/** One name per site: `www.google.es` → `google`; unknown sites keep their host (no `www.`). */
export function referrerSource(ref: string | undefined, ownHosts: readonly string[]): string {
  const host = label(ref, 253).replace(/^www\./, '');
  if (!host) return DIRECT;
  if (ownHosts.some((own) => host === own.replace(/^www\./, ''))) return DIRECT;
  if (host === 'localhost' || /^[\d.]+$/.test(host)) return DIRECT;
  return KNOWN_SITES.find(([pattern]) => pattern.test(host))?.[1] ?? host.slice(0, 40);
}

/**
 * The origin of a visit, normalised on the server: the campaign (`utm_source`) wins; otherwise
 * the site that linked here, grouped (`google`, `tiktok`…); otherwise `(direct)`, or `(app)`
 * inside the Android app. The raw values are never stored.
 */
export function normalizeOrigin(
  raw: RawOrigin | undefined,
  ownHosts: readonly string[]
): Required<Pick<FunnelDimensions, 'source' | 'campaign'>> {
  const utm = label(raw?.utm_source, 40);
  const fallback = raw?.app ? APP : referrerSource(raw?.ref, ownHosts);
  const source = utm || fallback;
  const campaign = label(raw?.utm_campaign, 40);
  const content = label(raw?.utm_content, 40);
  return { source, campaign: content ? `${campaign}/${content}` : campaign };
}
