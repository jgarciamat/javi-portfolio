import { useState } from 'react';
import { useApi } from '@core/context/ApiContext';
import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import { Icon } from '@shared/components/Icon';
import { useAction } from '@shared/hooks/useAction';
import { useResource } from '@shared/hooks/useResource';
import type { DetectedSubscription } from '@modules/finances/domain/types';

/** A detected charge as an automatic movement, from the month of its next charge. */
const asRule = (s: DetectedSubscription) => ({
  description: s.description,
  amount: s.amount,
  type: 'EXPENSE' as const,
  category: s.categoryName ?? 'Otros',
  startYear: Number(s.nextDate.slice(0, 4)),
  startMonth: Number(s.nextDate.slice(5, 7)),
  frequency: s.cadence,
});

/** Adds every listed charge as an automatic movement, and says how many were added. */
function AddAsRules({ items }: { items: DetectedSubscription[] }) {
  const { t } = useI18n();
  const { recurringApi } = useApi();
  const action = useAction(t('app.firstResult.error'));
  const [added, setAdded] = useState(0);

  const addAll = () =>
    action.run(async () => {
      // Those already added are not sent again when trying a second time.
      for (const s of items.slice(added)) {
        await recurringApi.create(asRule(s));
        setAdded((n) => n + 1);
      }
    });

  return (
    <>
      {added < items.length && (
        <>
          <p className="section-hint">{t('app.firstResult.hint')}</p>
          <button
            type="button"
            className="btn-primary"
            disabled={action.pending}
            aria-busy={action.pending}
            onClick={() => void addAll()}
          >
            {action.pending ? t('app.firstResult.adding') : t('app.firstResult.add')}
          </button>
        </>
      )}
      {added > 0 && (
        <p className="section-success" role="status">
          <Icon name="checkCircle" /> {t('app.firstResult.added', { count: added })}
        </p>
      )}
      {action.error && (
        <p className="form-error" role="alert">
          {action.error}
        </p>
      )}
    </>
  );
}

/** «When will you reach your goal?», only for someone with goals. */
function GoalLink({ onOpen }: { onOpen: () => void }) {
  const { t } = useI18n();
  const { goalApi } = useApi();
  const { data } = useResource(() => goalApi.getAll(), [goalApi]);
  if (!data || data.length === 0) return null;
  return (
    <button type="button" className="leak-link" onClick={onOpen}>
      <Icon name="flag" /> {t('app.firstResult.goal')}
    </button>
  );
}

/**
 * The first thing an import shows: the fixed charges and subscriptions found among the movements
 * (those that are not an automatic movement yet), to add them as automatic movements in one go.
 * Only facts: what repeats and what it costs, no promises.
 */
export function FirstResult({ onOpenGoals }: { onOpenGoals?: () => void }) {
  const { t } = useI18n();
  const { money } = useFormat();
  const { insightsApi } = useApi();
  const { data } = useResource(() => insightsApi.subscriptions(), [insightsApi]);

  if (!data || data.count === 0) return null;
  const fixed = data.fixed ?? data.subscriptions.filter((s) => s.essential).length;
  const count = (key: string, n: number) => t(n === 1 ? `${key}One` : key, { count: n });

  return (
    <section className="first-result" aria-labelledby="first-result-title">
      <h3 id="first-result-title" className="first-result-title">
        <Icon name="repeat" /> {t('app.firstResult.title')}
      </h3>
      <p>
        {t('app.firstResult.found', {
          fixed: count('app.firstResult.fixed', fixed),
          subscriptions: count('app.firstResult.subscriptions', data.count - fixed),
        })}
      </p>
      <ul className="first-result-list">
        {data.subscriptions.map((s) => (
          <li key={s.key}>
            <span>{s.description}</span>
            <strong>
              {money(s.amount)} {t(`app.firstResult.cadence.${s.cadence}`)}
            </strong>
          </li>
        ))}
      </ul>
      {data.locked && (
        <p className="plan-note">
          {t('app.firstResult.locked', { shown: data.subscriptions.length, count: data.count })}
        </p>
      )}
      <AddAsRules items={data.subscriptions} />
      {onOpenGoals && <GoalLink onOpen={onOpenGoals} />}
    </section>
  );
}
