import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isNativeApp } from '@shared/utils/platform';

/** `?revisar=1` opens «Para revisar» (the payments detected in the bank notifications). */
export const REVIEW_PARAM = 'revisar';

/** `moneymanager://review` (the phone's notice of detected payments) → «Para revisar». */
export const isReviewLink = (url: string | undefined): boolean =>
  /^moneymanager:\/\/review\/?$/.test(url ?? '');

/** `moneymanager://add/expense|income` (the home-screen widget) → the new-movement form. */
export function parseAddLink(url: string | undefined): 'expense' | 'income' | null {
  const match = /^moneymanager:\/\/add\/(expense|income)\/?$/.exec(url ?? '');
  return match ? (match[1] as 'expense' | 'income') : null;
}

/** Opens the screens that the Android widget and notices ask for. Renders nothing. */
export function NativeLinks() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isNativeApp()) return;
    let stopped = false;
    let remove: (() => void) | null = null;
    const open = (url: string | undefined) => {
      const kind = parseAddLink(url);
      if (kind) navigate(`/?add=${kind}`);
      else if (isReviewLink(url)) navigate(`/?${REVIEW_PARAM}=1`);
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
