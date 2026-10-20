/** Emoji avatars offered in the profile: calm animals and nature symbols. */
export const AVATAR_CHOICES = [
  '🦊',
  '🐻',
  '🐼',
  '🐨',
  '🦁',
  '🐯',
  '🦉',
  '🐧',
  '🐢',
  '🐬',
  '🌿',
  '🌻',
  '🌊',
  '⛰️',
  '🌙',
  '⭐',
];

/** Shown while the user has not picked one (or had an uploaded picture, no longer shown). */
export const DEFAULT_AVATAR = '👤';

/**
 * The choices for a user: an avatar saved before that is no longer offered stays first, so
 * it still shows as the selected one.
 */
export function avatarChoices(current: string | null | undefined): string[] {
  return current && !AVATAR_CHOICES.includes(current)
    ? [current, ...AVATAR_CHOICES]
    : AVATAR_CHOICES;
}
