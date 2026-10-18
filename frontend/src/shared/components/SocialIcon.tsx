import { useId } from 'react';
import type { SocialNetwork } from '@core/config/socials';

const INSTAGRAM_STOPS = [
  ['0%', '#feda75'],
  ['30%', '#fa7e1e'],
  ['55%', '#d62976'],
  ['80%', '#962fbf'],
  ['100%', '#4f5bd5'],
] as const;

const NOTE =
  'M15 3c.4 2.6 2.1 4.3 5 4.6v3.3a8.6 8.6 0 0 1-5-1.6V15a6 6 0 1 1-6-6v3.3a2.7 2.7 0 1 0 2.7 2.7V3z';

/** The glyph of each network in its own colours: Instagram's gradient, TikTok's cyan and red, YouTube's red. */
export function SocialIcon({ network, size }: { network: SocialNetwork; size: number }) {
  const gradient = useId();
  const common = {
    xmlns: 'http://www.w3.org/2000/svg',
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    'aria-hidden': true,
    focusable: 'false',
    className: `social-icon social-icon--${network}`,
  } as const;

  if (network === 'instagram') {
    return (
      <svg
        {...common}
        fill="none"
        strokeWidth={2}
        strokeLinecap="round"
        stroke={`url(#${gradient})`}
      >
        <defs>
          <linearGradient id={gradient} x1="0" y1="1" x2="1" y2="0">
            {INSTAGRAM_STOPS.map(([offset, color]) => (
              <stop key={offset} offset={offset} stopColor={color} />
            ))}
          </linearGradient>
        </defs>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="0.6" fill={`url(#${gradient})`} />
      </svg>
    );
  }
  if (network === 'tiktok') {
    return (
      <svg {...common} fill="none" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
        <path d={NOTE} stroke="#25f4ee" transform="translate(-0.9 -0.9)" />
        <path d={NOTE} stroke="#fe2c55" transform="translate(0.9 0.9)" />
        <path d={NOTE} stroke="currentColor" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <rect x="2" y="5" width="20" height="14" rx="4.5" fill="#ff0000" />
      <path d="m10 9 5 3-5 3z" fill="#fff" />
    </svg>
  );
}
