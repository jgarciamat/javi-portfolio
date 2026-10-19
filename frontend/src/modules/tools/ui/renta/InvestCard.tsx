import { useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { Icon } from '@shared/components/Icon';
import { scrollBehavior } from '@shared/utils/motion';
import { rentaState } from '../../data/renta/state';
import { emptySavingsDetail, fifo, type ImportedSavings } from '../../domain/rentaGains';
import { choose } from '../../domain/rentaGuide';
import { withoutFile } from '../../domain/invest/sources';
import { InvestImport } from './invest/InvestImport';
import { useMoney, type StepProps } from './shared';

export const INVEST_CARD_ID = 'renta-invest';

/** What was imported, in a few numbers: the files, the operations and the result of each year. */
export function importedSummary(imported: ImportedSavings) {
  const operations = imported.assets.reduce((n, a) => n + a.buys.length + a.sells.length, 0);
  const byYear = new Map<string, number>();
  for (const asset of imported.assets) {
    for (const sale of fifo(asset)) {
      const year = sale.date.slice(0, 4);
      byYear.set(year, (byYear.get(year) ?? 0) + sale.gain);
    }
  }
  const years = [...byYear.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([year, gain]) => ({ year, gain: Math.round(gain * 100) / 100 }));
  return { files: imported.files, assets: imported.assets.length, operations, years };
}

/**
 * «My investments (crypto, funds, shares)»: a card of its own, with the big button and the drop
 * area in view (no box to tick first), and what was imported in a few numbers once it is there.
 */
export function InvestCard({ form, set }: StepProps) {
  const { t } = useI18n();
  const money = useMoney();
  const detail = form.savingsDetail;
  const imported = detail?.imported;
  const [open, setOpen] = useState(!imported);
  const [cantSplit, setCantSplit] = useState(false);
  /** Takes one file out of what is in the Renta: the rest is worked out again. */
  const removeFile = (file: string) => {
    if (!imported || !window.confirm(t('tools.invest.removeFromRenta', { file }))) return;
    const next = withoutFile(imported, file);
    if (next === 'unknown') {
      setCantSplit(true);
      return;
    }
    set({ savingsDetail: { ...emptySavingsDetail(), ...detail, imported: next ?? undefined } });
  };
  const k = 'tools.renta.investCard';
  const summary = imported ? importedSummary(imported) : null;
  return (
    <section
      id={INVEST_CARD_ID}
      className="renta-invest-card"
      aria-labelledby={`${INVEST_CARD_ID}-title`}
      tabIndex={-1}
    >
      <h3 id={`${INVEST_CARD_ID}-title`}>
        <Icon name="trend" /> {t(`${k}.title`)}
      </h3>
      <p className="section-hint">{t(`${k}.hint`)}</p>
      {summary && (
        <div className="renta-invest-summary" role="status">
          <p>
            <strong>
              {t(`${k}.imported`, {
                files: summary.files.join(', '),
                operations: summary.operations,
                assets: summary.assets,
              })}
            </strong>
          </p>
          <ul className="invest-files">
            {summary.files.map((file) => (
              <li key={file}>
                <span>{file}</span>{' '}
                <button
                  type="button"
                  className="btn-secondary"
                  aria-label={t('tools.invest.removeFileOf', { file })}
                  onClick={() => removeFile(file)}
                >
                  <Icon name="trash" /> {t('tools.invest.removeFile')}
                </button>
              </li>
            ))}
          </ul>
          {cantSplit && <p className="form-error">{t('tools.invest.cantSplit')}</p>}
          {summary.years.length > 0 && (
            <ul className="renta-minimum">
              {summary.years.map((y) => (
                <li key={y.year}>
                  <span>{t(`${k}.${y.gain < 0 ? 'lossYear' : 'gainYear'}`, { year: y.year })}</span>
                  <strong>{money(Math.abs(y.gain))}</strong>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            className="btn-secondary"
            onClick={() =>
              set({ savingsDetail: { ...emptySavingsDetail(), ...detail, imported: undefined } })
            }
          >
            {t('tools.invest.remove')}
          </button>
        </div>
      )}
      {!open && (
        <button
          type="button"
          className="btn-primary renta-invest-open"
          onClick={() => setOpen(true)}
        >
          {t(`${k}.again`)}
        </button>
      )}
      {open && (
        <InvestImport
          year={rentaState.year}
          onApply={(next) =>
            set({
              ...choose(form, 'savings', 'yes'),
              savingsDetail: { ...(detail ?? emptySavingsDetail()), imported: next ?? undefined },
            })
          }
        />
      )}
    </section>
  );
}

/** «Have you invested in crypto or funds? Import your files»: a way to the card from elsewhere. */
export function InvestLink({ form, onGo }: { form: StepProps['form']; onGo?: () => void }) {
  const { t } = useI18n();
  if (form.savingsDetail?.imported) return null;
  const go =
    onGo ??
    (() => {
      const card = document.getElementById(INVEST_CARD_ID) as HTMLElement;
      card.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
      card.focus({ preventScroll: true });
    });
  return (
    <p className="renta-invest-link">
      <Icon name="trend" /> {t('tools.renta.investCard.link')}{' '}
      <button type="button" className="btn-secondary" onClick={go}>
        {t('tools.renta.investCard.linkButton')}
      </button>
    </p>
  );
}
