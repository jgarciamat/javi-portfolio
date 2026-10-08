import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { useI18n } from '@core/i18n/I18nContext';
import type { CheckoutKind, PlanCatalog } from '../domain/types';
import { formatPrice, yearlySavingPct } from './pricing';
import { errorMessage } from '@shared/utils/errors';

interface PlanOptionsProps {
  catalog: PlanCatalog;
  onChoose: (kind: CheckoutKind) => Promise<void>;
  /** Already paying: no checkout buttons. */
  disabled?: boolean;
}

/** Monthly / yearly / founder buttons that start the checkout. */
export function PlanOptions({ catalog, onChoose, disabled }: PlanOptionsProps) {
  const { t, locale } = useI18n();
  const [busy, setBusy] = useState<CheckoutKind | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Store rules: digital purchases inside the Android/iOS app must use the store.
  if (Capacitor.isNativePlatform()) {
    return <p className="plan-note">{t('billing.nativeNote')}</p>;
  }
  if (!catalog.paymentsEnabled) {
    return <p className="plan-note">{t('billing.paymentsDisabled')}</p>;
  }

  const choose = async (kind: CheckoutKind) => {
    setBusy(kind);
    setError(null);
    try {
      await onChoose(kind);
    } catch (e) {
      setError(errorMessage(e, t('billing.checkoutError')));
      setBusy(null);
    }
  };
  const price = (n: number) => formatPrice(n, locale);

  return (
    <div className="plan-options">
      <button
        className="plan-option plan-option--featured"
        onClick={() => choose('yearly')}
        disabled={disabled || !!busy}
      >
        <span className="plan-option-badge">
          {t('billing.save', { pct: yearlySavingPct(catalog.prices) })}
        </span>
        <strong>{t('billing.yearly')}</strong>
        <span className="plan-option-price">
          {price(catalog.prices.yearly)}
          <small>{t('billing.perYear')}</small>
        </span>
        <small>{t('billing.yearlyEquivalent', { price: price(catalog.prices.yearly / 12) })}</small>
      </button>
      <button
        className="plan-option"
        onClick={() => choose('monthly')}
        disabled={disabled || !!busy}
      >
        <strong>{t('billing.monthly')}</strong>
        <span className="plan-option-price">
          {price(catalog.prices.monthly)}
          <small>{t('billing.perMonth')}</small>
        </span>
        <small>{t('billing.cancelAnytime')}</small>
      </button>
      {catalog.lifetime.available && (
        <button
          className="plan-option"
          onClick={() => choose('lifetime')}
          disabled={disabled || !!busy}
        >
          <strong>{t('billing.lifetime')}</strong>
          <span className="plan-option-price">
            {price(catalog.prices.lifetime)}
            <small>{t('billing.once')}</small>
          </span>
          <small>{t('billing.founderLeft', { count: catalog.lifetime.remaining })}</small>
        </button>
      )}
      {busy && <p className="plan-note">{t('billing.redirecting')}</p>}
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
