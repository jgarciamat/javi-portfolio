import { useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import type { ActivitiesResult, ActivityInput } from '../../domain/rentaActivity';
import { activityBoxes } from '../../domain/rentaActivityBoxes';
import { useMoney } from './shared';

/**
 * What to write in each box of the economic activities of the modelo 100, box by box, with a
 * button to copy each amount (as Renta WEB takes it: «1234,56»).
 */
export function ActivityBoxes({
  list,
  result,
}: {
  list: ActivityInput[];
  result: ActivitiesResult;
}) {
  const { t } = useI18n();
  const money = useMoney();
  const [copied, setCopied] = useState<string | null>(null);
  const copy = (key: string, value: number) => {
    navigator.clipboard.writeText(value.toFixed(2).replace('.', ',')).then(
      () => setCopied(key),
      () => setCopied(`!${key}`)
    );
  };
  return (
    <details className="renta-group renta-activity-boxes" open>
      <summary>{t('tools.renta.activities.boxes')}</summary>
      <p className="section-hint">{t('tools.renta.activities.boxesHint')}</p>
      {activityBoxes(list, result).map((group, g) => (
        <div key={group.name ?? '-'}>
          <h4>{group.name ?? t('tools.renta.activities.totals')}</h4>
          <ul className="wiz-boxes">
            {group.boxes.map((b) => {
              const key = `${g}-${b.box}`;
              return (
                <li key={key}>
                  <span>
                    <span className="wiz-box-n">{b.box}</span> {b.label}
                  </span>
                  <strong>{money(b.amount)}</strong>
                  <button
                    type="button"
                    className="btn-secondary"
                    aria-label={t('tools.renta.activities.copyBox', { box: b.box })}
                    onClick={() => copy(key, b.amount)}
                  >
                    {copied === key ? t('tools.renta.activities.copied') : t('wizard.renta.copy')}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      {copied?.startsWith('!') && (
        <p className="form-error" role="status">
          {t('wizard.renta.copyFailed')}
        </p>
      )}
    </details>
  );
}
