import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { appTabOf, appTarget } from '@shared/utils/appLinks';

/**
 * A link of a guide read on the public site. What the app does better is reached through the app:
 * straight to its section for people who are signed in, through the login page for the rest.
 */
export function PublicGuideLink({
  to,
  authenticated,
  className,
  children,
}: {
  to: string;
  authenticated: boolean;
  className?: string;
  children: ReactNode;
}) {
  const tab = appTabOf(to);
  return (
    <Link className={className} to={tab ? appTarget(tab, authenticated) : to}>
      {children}
    </Link>
  );
}

/**
 * A link of a guide read inside the app: other guides open in place and the sections of the app open
 * as such; any other address is a normal link.
 */
export function AppGuideLink({
  to,
  className,
  onGuide,
  onTab,
  children,
}: {
  to: string;
  className?: string;
  onGuide: (slug: string) => void;
  onTab: (tab: string) => void;
  children: ReactNode;
}) {
  const tab = appTabOf(to);
  const guide = /^\/guias\/(.+)$/.exec(to)?.[1];
  if (!tab && !guide) {
    return (
      <Link className={className} to={to}>
        {children}
      </Link>
    );
  }
  return (
    <button
      type="button"
      className={`guide-link ${className ?? ''}`.trim()}
      onClick={() => (tab ? onTab(tab) : onGuide(guide as string))}
    >
      {children}
    </button>
  );
}
