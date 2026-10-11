import { useEffect, useState } from 'react';
import { useApi } from '@core/context/ApiContext';
import { useI18n } from '@core/i18n/I18nContext';
import { useOptionalSettings } from '@core/settings/SettingsContext';
import { errorMessage } from '@shared/utils/errors';
import { parseDecimal } from '@shared/utils/numbers';
import type { Currency } from '@modules/finances/domain/types';
import type { UseTransactionFormReturn } from '../../application/hooks/useTransactionForm';

const CURRENCIES: Currency[] = ['EUR', 'USD', 'GBP', 'MXN', 'ARS', 'COP', 'CLP', 'CHF'];

/**
 * Enter a movement made in another currency: the day's reference rate converts it to the
 * user's currency and the original amount stays in the notes.
 */
export function CurrencyConverter({ form }: { form: UseTransactionFormReturn }) {
  const { ratesApi } = useApi();
  const { t } = useI18n();
  const base = useOptionalSettings()?.settings?.currency ?? 'EUR';
  const others = CURRENCIES.filter((c) => c !== base);
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState<Currency | null>(null);
  // The settings may arrive after the first render: never offer the user's own currency.
  const currency = chosen && chosen !== base ? chosen : others[0];
  const [original, setOriginal] = useState('');
  const [rate, setRate] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let current = true;
    setError(null);
    ratesApi
      .get(currency, base)
      .then((r) => current && setRate(String(Math.round(r.rate * 10000) / 10000)))
      .catch((e: unknown) => current && setError(errorMessage(e, t('app.currency.noRate'))));
    return () => {
      current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, currency, base, ratesApi]);

  const amount = parseDecimal(original);
  const factor = parseDecimal(rate);
  const ready = amount > 0 && factor > 0;

  const convert = () => {
    form.setAmount(String(Math.round(amount * factor * 100) / 100));
    const line = `${original.trim()} ${currency} (1 ${currency} = ${rate.trim()} ${base})`;
    form.setNotes(form.fields.notes ? `${form.fields.notes} · ${line}` : line);
    setOpen(false);
    setOriginal('');
  };

  if (!open) {
    return (
      <button
        type="button"
        className="btn-secondary tx-currency-toggle"
        onClick={() => setOpen(true)}
      >
        💱 {t('app.currency.other')}
      </button>
    );
  }
  return (
    <fieldset className="tx-currency">
      <legend>{t('app.currency.other')}</legend>
      <select
        className="tx-input"
        value={currency}
        aria-label={t('app.currency.which')}
        onChange={(e) => setChosen(e.target.value as Currency)}
      >
        {others.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <input
        className="tx-input"
        inputMode="decimal"
        placeholder={t('app.currency.original')}
        aria-label={t('app.currency.original')}
        value={original}
        onChange={(e) => setOriginal(e.target.value)}
      />
      <input
        className="tx-input"
        inputMode="decimal"
        placeholder={t('app.currency.rate', { from: currency, to: base })}
        aria-label={t('app.currency.rate', { from: currency, to: base })}
        value={rate}
        onChange={(e) => setRate(e.target.value)}
      />
      {error && <p className="form-error">{error}</p>}
      <div className="button-row">
        <button type="button" className="btn-secondary" disabled={!ready} onClick={convert}>
          {t('app.currency.convert', { to: base })}
        </button>
        <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>
          {t('app.common.cancel')}
        </button>
      </div>
    </fieldset>
  );
}
