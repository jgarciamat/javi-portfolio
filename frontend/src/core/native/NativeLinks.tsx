import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isNativeApp } from '@shared/utils/platform';

/** `moneymanager://add/expense|income` (the home-screen widget) → the new-movement form. */
export function parseAddLink(url: string | undefined): 'expense' | 'income' | null {
  const match = /^moneymanager:\/\/add\/(expense|income)\/?$/.exec(url ?? '');
  return match ? (match[1] as 'expense' | 'income') : null;
}

/** Opens the screens that the Android home-screen widget asks for. Renders nothing. */
export function NativeLinks() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isNativeApp()) return;
    let stopped = false;
    let remove: (() => void) | null = null;
    const open = (url: string | undefined) => {
      const kind = parseAddLink(url);
      if (kind) navigate(`/?add=${kind}`);
    };
    void (async () => {
      const { App } = await import('@capacitor/app');
      open((await App.getLaunchUrl())?.url);
      const handle = await App.addListener('appUrlOpen', (event) => open(event.url));
      if (stopped) void handle.remove();
      else remove = () => void handle.remove();
    })();
    return () => {
      stopped = true;
      remove?.();
    };
  }, [navigate]);

  return null;
}
