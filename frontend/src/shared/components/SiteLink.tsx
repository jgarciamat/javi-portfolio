import type { ComponentProps } from 'react';
import { Link } from 'react-router-dom';
import { localeFromPath } from '@core/i18n/localeUrl';

/** The guides exist only in Spanish: `/en/guias…` does not exist and redirects to `/guias…`. */
const SPANISH_ONLY = /^\/guias(\/|$)/;

/**
 * A router link that, on the English pages (`/en` base), points straight to the Spanish address of
 * a page that has no English version, so the link never goes through the `/en/guias` redirect.
 */
export function SiteLink({ to, children, ...rest }: ComponentProps<typeof Link> & { to: string }) {
  if (localeFromPath(window.location.pathname) && SPANISH_ONLY.test(to)) {
    const { replace: _replace, state: _state, ...anchor } = rest as Record<string, unknown>;
    return (
      <a href={to} {...(anchor as ComponentProps<'a'>)}>
        {children}
      </a>
    );
  }
  return (
    <Link to={to} {...rest}>
      {children}
    </Link>
  );
}
