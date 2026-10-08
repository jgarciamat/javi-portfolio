/** Emoji avatars offered in the profile. */
export const PRESET_AVATARS = [
  '🧑',
  '👩',
  '👨',
  '🧔',
  '👩‍🦰',
  '👩‍🦱',
  '👩‍🦳',
  '👩‍🦲',
  '🧑‍💼',
  '👩‍💼',
  '🧑‍🎨',
  '👩‍🎨',
  '🧑‍🚀',
  '🦊',
  '🐼',
  '🐨',
  '🦁',
  '🐯',
  '🐸',
  '🦄',
  '🐙',
  '🤖',
  '👾',
  '🎃',
];

/** SVG data URL that draws an emoji, stored like an uploaded picture. */
export function emojiAvatar(emoji: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><text y="50" x="8" font-size="48">${emoji}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const AVATAR_MAX_BYTES = 2_000_000;
