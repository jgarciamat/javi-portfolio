import { useEffect } from 'react';
import { localizedPath } from '@core/i18n/localeUrl';

/**
 * Title, description and canonical URL of a public page (search engines render the app). On an
 * English address (`/en/…`) the canonical URL is the English one, unless the page only exists in
 * Spanish (`localized: false`, the guides).
 */
export function usePageMeta(
  title: string,
  description: string,
  path: string,
  localized = true
): void {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;

    const tag = (selector: string, create: () => HTMLElement): HTMLElement => {
      const found = document.head.querySelector<HTMLElement>(selector);
      if (found) return found;
      const created = create();
      document.head.appendChild(created);
      return created;
    };
    const meta = tag('meta[name="description"]', () => {
      const el = document.createElement('meta');
      el.setAttribute('name', 'description');
      return el;
    });
    const link = tag('link[rel="canonical"]', () => {
      const el = document.createElement('link');
      el.setAttribute('rel', 'canonical');
      return el;
    });
    const previousDescription = meta.getAttribute('content');
    const previousHref = link.getAttribute('href');
    meta.setAttribute('content', description);
    link.setAttribute(
      'href',
      `${window.location.origin}${localized ? localizedPath(path, window.location.pathname) : path}`
    );

    return () => {
      document.title = previousTitle;
      const restore = (el: HTMLElement, attr: string, value: string | null) =>
        value === null ? el.removeAttribute(attr) : el.setAttribute(attr, value);
      restore(meta, 'content', previousDescription);
      restore(link, 'href', previousHref);
    };
  }, [title, description, path, localized]);
}
