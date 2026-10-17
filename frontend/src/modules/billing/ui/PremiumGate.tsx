import type { ReactNode } from 'react';
import { Icon } from '@shared/components/Icon';
import './css/Billing.css';

/**
 * The inline box shown where a free account has used its free try (or is about to): the hint and
 * the button go inside. `locked` adds the lock and the Premium chip; leave it off for the free try.
 */
export function PremiumGate({
  children,
  locked = true,
}: {
  children: ReactNode;
  locked?: boolean;
}) {
  return (
    <div className={locked ? 'renta-gate renta-gate--locked' : 'renta-gate'}>
      {locked && (
        <span className="renta-gate-badge" aria-hidden="true">
          <Icon name="lock" size={16} />
          <span className="premium-chip">Premium</span>
        </span>
      )}
      {children}
    </div>
  );
}
