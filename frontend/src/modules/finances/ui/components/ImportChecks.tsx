import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import type { ImportCheck } from '../../domain/importChecks';
import type { ImportedInvoice } from '../../domain/invoiceLedger';

/** Invoices listed under a warning; the rest are a click away in the review. */
const SHOWN = 4;

/** «Before you calculate»: what the imported invoices may have wrong, each with a way to fix it. */
export function ImportChecks({
  checks,
  invoices,
  onInvoice,
  onQuarter,
}: {
  checks: ImportCheck[];
  invoices: ImportedInvoice[];
  /** Opens an invoice in the review (null: the review itself). */
  onInvoice: (id: string | null) => void;
  /** Goes to the panel of a quarter. */
  onQuarter: (quarter: number) => void;
}) {
  const { t } = useI18n();
  const { money, date } = useFormat();
  if (checks.length === 0) return null;
  const byId = new Map(invoices.map((i) => [i.id, i]));
  return (
    <section
      className="autonomo-panel autonomo-checks-panel"
      id="autonomo-checks"
      aria-labelledby="autonomo-checks-title"
    >
      <h3 id="autonomo-checks-title" tabIndex={-1}>
        {t('app.autonomo.checks.title')}
      </h3>
      <p className="section-hint">{t('app.autonomo.checks.hint')}</p>
      <ul className="autonomo-checks-list">
        {checks.map((c, n) => {
          const values = {
            ...c.values,
            ...(typeof c.values.date === 'string' ? { date: date(c.values.date) } : {}),
            ...Object.fromEntries(Object.entries(c.amounts).map(([k, v]) => [k, money(v)])),
          };
          const listed = c.invoices.slice(0, SHOWN);
          return (
            <li key={`${c.code}-${n}`} className={`autonomo-check autonomo-check--${c.level}`}>
              <p>
                <strong className="autonomo-check-level">
                  {t(`app.autonomo.checks.level.${c.level}`)}
                </strong>{' '}
                {t(`app.autonomo.checks.${c.code}`, values)}
              </p>
              <div className="autonomo-check-actions">
                {listed.map((id) => {
                  const i = byId.get(id) as ImportedInvoice;
                  return (
                    <button
                      key={id}
                      type="button"
                      className="btn-secondary"
                      onClick={() => onInvoice(id)}
                    >
                      {t('app.autonomo.checks.open', {
                        invoice: `${date(i.date)} · ${
                          i.concept || t('app.autonomo.review.noName')
                        } · ${money(i.total)}`,
                      })}
                    </button>
                  );
                })}
                {c.invoices.length > SHOWN && (
                  <button type="button" className="btn-secondary" onClick={() => onInvoice(null)}>
                    {t('app.autonomo.checks.more', { n: c.invoices.length - SHOWN })}
                  </button>
                )}
                {c.quarter !== null && (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => onQuarter(c.quarter as number)}
                  >
                    {t('app.autonomo.checks.goQuarter', { n: c.quarter })}
                  </button>
                )}
                {c.invoices.length === 0 && c.quarter === null && (
                  <button type="button" className="btn-secondary" onClick={() => onInvoice(null)}>
                    {t('app.autonomo.checks.review')}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
