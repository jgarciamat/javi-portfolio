import {
  THEME_CHOICES,
  applyTheme,
  loadTheme,
  resolveTheme,
  saveTheme,
  startTheme,
} from '@core/theme/theme';

type Listener = () => void;

/** jsdom has no matchMedia: a tiny one whose answer and change events the tests control. */
function mockMedia(initialLight: boolean) {
  let light = initialLight;
  const listeners = new Set<Listener>();
  window.matchMedia = jest.fn().mockImplementation(() => ({
    get matches() {
      return light;
    },
    addEventListener: (_: string, l: Listener) => listeners.add(l),
    removeEventListener: (_: string, l: Listener) => listeners.delete(l),
  }));
  return {
    set(next: boolean) {
      light = next;
      listeners.forEach((l) => l());
    },
    listeners,
  };
}

const theme = () => document.documentElement.getAttribute('data-theme');
const bar = () => document.querySelector('meta[name="theme-color"]')?.getAttribute('content');

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  document.head.innerHTML = '<meta name="theme-color" content="#0f172a" />';
});

describe('theme', () => {
  it('defaults to the system and ignores nonsense in storage', () => {
    expect(loadTheme()).toBe('system');
    localStorage.setItem('mm_theme', 'purple');
    expect(loadTheme()).toBe('system');
    localStorage.setItem('mm_theme', 'light');
    expect(loadTheme()).toBe('light');
    expect(THEME_CHOICES).toEqual(['system', 'light', 'dark']);
  });

  it('resolves the system choice with what the device prefers', () => {
    expect(resolveTheme('system', true)).toBe('light');
    expect(resolveTheme('system', false)).toBe('dark');
    expect(resolveTheme('dark', true)).toBe('dark');
    expect(resolveTheme('light', false)).toBe('light');
  });

  it('puts the look on the page and on the browser bar', () => {
    mockMedia(false);
    applyTheme('light');
    expect(theme()).toBe('light');
    expect(bar()).toBe('#ffffff');
    applyTheme('dark');
    expect(theme()).toBe('dark');
    expect(bar()).toBe('#0f172a');
    applyTheme('system');
    expect(theme()).toBe('dark');
  });

  it('works on a page without the theme-color tag', () => {
    mockMedia(true);
    document.head.innerHTML = '';
    applyTheme('system');
    expect(theme()).toBe('light');
  });

  it('remembers the choice, except "system", which is the default', () => {
    mockMedia(false);
    saveTheme('light');
    expect(localStorage.getItem('mm_theme')).toBe('light');
    expect(theme()).toBe('light');
    saveTheme('system');
    expect(localStorage.getItem('mm_theme')).toBeNull();
    expect(theme()).toBe('dark');
  });

  it('follows the device only while the choice is "system"', () => {
    const media = mockMedia(false);
    const stop = startTheme();
    expect(theme()).toBe('dark');
    media.set(true);
    expect(theme()).toBe('light');
    saveTheme('dark');
    media.set(false);
    media.set(true);
    expect(theme()).toBe('dark');
    stop();
    expect(media.listeners.size).toBe(0);
  });
});
