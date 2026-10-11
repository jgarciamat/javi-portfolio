import { storage } from '@shared/utils/storage';

/** The look of the app: follow the device, or always light or dark. Kept on this device. */
export type ThemeChoice = 'system' | 'light' | 'dark';

const KEY = 'mm_theme';
export const THEME_CHOICES: ThemeChoice[] = ['system', 'light', 'dark'];

/** The colour of the browser bar and the Android status bar for each look. */
const BAR_COLOR = { light: '#ffffff', dark: '#0f172a' } as const;

export function loadTheme(): ThemeChoice {
  const stored = storage.get(KEY);
  return THEME_CHOICES.includes(stored as ThemeChoice) ? (stored as ThemeChoice) : 'system';
}

export function resolveTheme(choice: ThemeChoice, prefersLight: boolean): 'light' | 'dark' {
  if (choice === 'system') return prefersLight ? 'light' : 'dark';
  return choice;
}

/** Puts the look on the page: `data-theme` on <html> and the browser bar colour. */
export function applyTheme(choice: ThemeChoice): void {
  const light = window.matchMedia('(prefers-color-scheme: light)').matches;
  const theme = resolveTheme(choice, light);
  document.documentElement.setAttribute('data-theme', theme);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', BAR_COLOR[theme]);
}

export function saveTheme(choice: ThemeChoice): void {
  storage.set(KEY, choice === 'system' ? null : choice);
  applyTheme(choice);
}

/** Applies the saved look and follows the device while the choice is "system". */
export function startTheme(): () => void {
  applyTheme(loadTheme());
  const media = window.matchMedia('(prefers-color-scheme: light)');
  const onChange = () => {
    if (loadTheme() === 'system') applyTheme('system');
  };
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}
