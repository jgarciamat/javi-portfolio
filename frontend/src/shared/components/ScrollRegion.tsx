import type { ReactNode } from 'react';

interface ScrollRegionProps {
  /** Names the region for screen readers (usually the table's title). */
  label: string;
  className: string;
  children: ReactNode;
}

/** A box that scrolls sideways: Tab reaches it so the keyboard can scroll it with the arrows. */
export function ScrollRegion({ label, className, children }: ScrollRegionProps) {
  return (
    <div className={className} tabIndex={0} role="region" aria-label={label}>
      {children}
    </div>
  );
}
