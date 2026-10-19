import { useI18n } from '@core/i18n/I18nContext';
import { guideSteps } from '../../../domain/invest/guide';
import type { LedgerResult } from '../../../domain/invest/ledger';
import type { DeclarationRow } from '../../../domain/invest/report';

/** «Cómo declarar esto»: step by step, in plain words, with the official source of each step. */
export function InvestGuide({
  ledger = null,
  rows = [],
  open = false,
}: {
  ledger?: LedgerResult | null;
  rows?: DeclarationRow[];
  open?: boolean;
}) {
  const { t } = useI18n();
  const steps = guideSteps(ledger, rows);
  return (
    <details className="renta-group invest-guide" open={open}>
      <summary>{t('tools.invest.guide.title')}</summary>
      <p className="section-hint">{t('tools.invest.guide.intro')}</p>
      <ol className="invest-steps">
        {steps.map((step) => (
          <li key={step.id}>
            <h4>{t(`tools.invest.guide.${step.id}.title`)}</h4>
            <p>{t(`tools.invest.guide.${step.id}.body`, step.params)}</p>
            {step.unconfirmed && (
              <p className="renta-badge">{t('tools.invest.guide.unconfirmed')}</p>
            )}
            {step.sources.length > 0 && (
              <p className="tools-sources">
                {t('tools.invest.guide.source')}{' '}
                {step.sources.map((s, i) => (
                  <span key={s.url}>
                    {i > 0 && ' · '}
                    <a href={s.url} target="_blank" rel="noopener noreferrer">
                      {s.label}
                    </a>
                  </span>
                ))}
              </p>
            )}
          </li>
        ))}
      </ol>
    </details>
  );
}
