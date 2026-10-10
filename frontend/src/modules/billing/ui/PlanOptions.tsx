import { useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { playBillingAvailable } from '@core/billing/playStore';
import { isNativeApp } from '@shared/utils/platform';
import type { CheckoutConsent, CheckoutKind, PlanCatalog } from '../domain/types';
import { formatPrice, yearlySavingPct } from './pricing';
import { errorMessage } from '@shared/utils/errors';

interface PlanOptionsProps {
  catalog: PlanCatalog;
  onChoose: (kind: CheckoutKind, consent: CheckoutConsent) => Promise<void>;
  /** Already paying: no checkout buttons. */
  disabled?: boolean;
  /** Days of trial left (nothing is charged until they end). */
  trialDaysLeft: number;
}

interface CheckoutOptionsProps extends PlanOptionsProps {
  /** The web asks for the terms and the immediate start; Google Play has its own purchase sheet. */
  consentRequired: boolean;
}

interface PlanChoice {
  kind: CheckoutKind;
  featured?: boolean;
  badge?: string;
  price: string;
  per: string;
  note: string;
}

/** The plans on sale, the yearly one first (the best value). */
function useChoices(catalog: PlanCatalog): PlanChoice[] {
  const { t, locale } = useI18n();
  const price = (n: number) => formatPrice(n, locale);
  const choices: PlanChoice[] = [
    {
      kind: 'yearly',
      featured: true,
      badge: t('billing.save', { pct: yearlySavingPct(catalog.prices) }),
      price: price(catalog.prices.yearly),
      per: t('billing.perYear'),
      note: t('billing.yearlyEquivalent', { price: price(catalog.prices.yearly / 12) }),
    },
    {
      kind: 'monthly',
      price: price(catalog.prices.monthly),
      per: t('billing.perMonth'),
      note: t('billing.cancelAnytime'),
    },
  ];
  if (catalog.lifetime.available) {
    choices.push({
      kind: 'lifetime',
      price: price(catalog.prices.lifetime),
      per: t('billing.once'),
      note: t('billing.founderLeft', { count: catalog.lifetime.remaining }),
    });
  }
  return choices;
}

/**
 * Accepting the terms and asking Premium to start at once (which gives up the
 * 14-day right of withdrawal): two explicit ticks, as consumer law expects.
 */
function ConsentBoxes({
  consent,
  onChange,
  disabled,
}: {
  consent: CheckoutConsent;
  onChange: (consent: CheckoutConsent) => void;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  return (
    <>
      <label className="plan-terms">
        <input
          type="checkbox"
          checked={consent.acceptTerms}
          onChange={(e) => onChange({ ...consent, acceptTerms: e.target.checked })}
          disabled={disabled}
        />
        <span>
          {t('billing.acceptTerms')} (
          <a href="/terms" target="_blank" rel="noopener">
            {t('billing.readTerms')}
          </a>
          )
        </span>
      </label>
      <label className="plan-terms">
        <input
          type="checkbox"
          checked={consent.waiveWithdrawal}
          onChange={(e) => onChange({ ...consent, waiveWithdrawal: e.target.checked })}
          disabled={disabled}
        />
        <span>{t('billing.immediateStart')}</span>
      </label>
    </>
  );
}

/** Plan buttons; they stay disabled until both consents are given. */
function CheckoutOptions({
  catalog,
  onChoose,
  disabled,
  trialDaysLeft,
  consentRequired,
}: CheckoutOptionsProps) {
  const { t } = useI18n();
  const choices = useChoices(catalog);
  const [busy, setBusy] = useState<CheckoutKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [consent, setConsent] = useState<CheckoutConsent>({
    acceptTerms: false,
    waiveWithdrawal: false,
  });
  const accepted = !consentRequired || (consent.acceptTerms && consent.waiveWithdrawal);

  const choose = async (kind: CheckoutKind) => {
    setBusy(kind);
    setError(null);
    try {
      await onChoose(kind, consent);
      // The web leaves for the payment page; the store sheet comes back here.
      if (!consentRequired) setBusy(null);
    } catch (e) {
      setError(errorMessage(e, t('billing.checkoutError')));
      setBusy(null);
    }
  };

  return (
    <div className="plan-options">
      {consentRequired && (
        <ConsentBoxes consent={consent} onChange={setConsent} disabled={disabled} />
      )}
      {choices.map((c) => (
        <button
          key={c.kind}
          className={`plan-option${c.featured ? ' plan-option--featured' : ''}`}
          onClick={() => choose(c.kind)}
          disabled={disabled || !!busy || !accepted}
        >
          {c.badge && <span className="plan-option-badge">{c.badge}</span>}
          <strong>{t(`billing.${c.kind}`)}</strong>
          <span className="plan-option-price">
            {c.price}
            <small>{c.per}</small>
          </span>
          <small>{c.note}</small>
        </button>
      ))}
      {!accepted && !disabled && <p className="plan-note">{t('billing.acceptTermsFirst')}</p>}
      {trialDaysLeft > 0 && (
        <p className="plan-note">{t('billing.trialKeeps', { days: trialDaysLeft })}</p>
      )}
      {busy && <p className="plan-note">{t('billing.redirecting')}</p>}
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}

/** Monthly / yearly / founder plans, where Premium can be bought. */
export function PlanOptions(props: PlanOptionsProps) {
  const { t } = useI18n();
  // Store rules: the app sells Premium only through Google Play, never pointing to the web.
  if (playBillingAvailable()) return <CheckoutOptions {...props} consentRequired={false} />;
  if (isNativeApp()) return <p className="plan-note">{t('billing.nativeNote')}</p>;
  if (!props.catalog.paymentsEnabled) {
    return <p className="plan-note">{t('billing.paymentsDisabled')}</p>;
  }
  return <CheckoutOptions {...props} consentRequired />;
}
