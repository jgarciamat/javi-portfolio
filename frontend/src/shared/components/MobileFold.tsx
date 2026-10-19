import type { ReactNode } from 'react';
import { useMediaQuery } from '@shared/hooks/useMediaQuery';
import './css/MobileFold.css';

/** The width under which the screen is a phone (the same as the assistant's layout). */
export const PHONE = '(max-width: 719px)';

/**
 * On a phone, what comes before the main task folded under a line that opens it (so the question
 * is the first thing on screen); on a wider screen, shown as it is.
 */
export function MobileFold({ summary, children }: { summary: string; children: ReactNode }) {
  const phone = useMediaQuery(PHONE);
  if (!phone) return <>{children}</>;
  return (
    <details className="mobile-fold">
      <summary>{summary}</summary>
      {children}
    </details>
  );
}
