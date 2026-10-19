import { useI18n } from '@core/i18n/I18nContext';
import type { ActivitiesResult } from '../../domain/rentaActivity';
import { ActivityBoxes } from './ActivityBoxes';
import { useMoney, type StepProps } from './shared';

/**
 * The economic activities of the return (brought from the self-employed screen or the case bank):
 * what each one gives and the reductions of art. 32, with a way to take one out.
 */
export function ActivitiesList({
  form,
  set,
  result,
}: StepProps & { result: ActivitiesResult | null }) {
  const { t } = useI18n();
  const money = useMoney();
  const list = form.activities ?? [];
  if (list.length === 0 || !result) return null;
  return (
    <section className="renta-block" aria-label={t('tools.renta.activities.title')}>
      <h3>{t('tools.renta.activities.title')}</h3>
      <ul className="renta-minimum">
        {list.map((a, i) => (
          <li key={`${a.name}-${i}`}>
            <span>
              {t('tools.renta.activities.line', { name: a.name, net: money(result.each[i].net) })}
            </span>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => set({ activities: list.filter((_, j) => j !== i) })}
            >
              {t('tools.renta.activities.remove', { name: a.name })}
            </button>
          </li>
        ))}
      </ul>
      <p className="section-hint">
        {t('tools.renta.activities.total', {
          total: money(result.total),
          withheld: money(result.withheld),
          payments: money(result.payments),
        })}
      </p>
      <ActivityBoxes list={list} result={result} />
    </section>
  );
}
