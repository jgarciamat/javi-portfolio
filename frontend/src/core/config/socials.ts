import { YOUTUBE_CHANNEL_URL } from '@modules/guides/domain/videos';

export type SocialNetwork = 'instagram' | 'tiktok' | 'youtube';

export interface SocialLink {
  network: SocialNetwork;
  /** Brand name, shown as is in every language. */
  label: string;
  url: string;
}

/** Our profiles, in the order they are shown. */
export const SOCIAL_LINKS: SocialLink[] = [
  { network: 'instagram', label: 'Instagram', url: 'https://www.instagram.com/finanverso.app/' },
  // The handle will change to Finanverso after 15 Nov 2026: update it here then.
  { network: 'tiktok', label: 'TikTok', url: 'https://www.tiktok.com/@money.manager00' },
  { network: 'youtube', label: 'YouTube', url: YOUTUBE_CHANNEL_URL },
];
