import { useState } from 'react';
import { useApi } from '@core/context/ApiContext';
import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import { Icon } from '@shared/components/Icon';
import { useAction } from '@shared/hooks/useAction';
import { useResource } from '@shared/hooks/useResource';
import type {
  Category,
  DetectedSubscription,
  ImportRowResult,
} from '@modules/finances/domain/types';
import { importHighlights } from '@modules/finances/domain/importHighlights';

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
function AddAsRules({
  items,
  onAdded,
}: {
  items: DetectedSubscription[];
  /** The rules may add this month's movements: the month and the accounts are read again. */
  onAdded?: () => void;
}) {
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
      onAdded?.();
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
 * The category where most of the imported expenses went, and a monthly limit for it in line with
 * what is already spent there, set with one tap.
 */
function BudgetSuggestion({
  rows,
  categories,
  onOpenBudgets,
}: {
  rows: ImportRowResult[];
  categories: Category[];
  onOpenBudgets?: () => void;
}) {
  const { t, tCategory } = useI18n();
  const { money, percent } = useFormat();
  const { budgetApi } = useApi();
  const action = useAction(t('app.firstResult.budgetError'));
  const [saved, setSaved] = useState(false);
  const { top } = importHighlights(rows);
  if (!top) return null;
  const category = categories.find((c) => c.name === top.category);
  const vars = { category: tCategory(top.category), amount: money(top.monthlyLimit) };

  const save = () =>
    action.run(async () => {
      await budgetApi.set((category as NonNullable<typeof category>).id, top.monthlyLimit);
      setSaved(true);
    });

  return (
    <section className="first-result" aria-labelledby="first-result-top">
      <h3 id="first-result-top" className="first-result-title">
        <Icon name="target" /> {t('app.firstResult.topTitle')}
      </h3>
      <p>
        {t('app.firstResult.top', {
          category: tCategory(top.category),
          share: percent(top.share * 100, 0),
          amount: money(top.amount),
        })}
      </p>
      {saved ? (
        <p className="section-success" role="status">
          <Icon name="checkCircle" /> {t('app.firstResult.budgetSaved', vars)}
        </p>
      ) : (
        category && (
          <>
            <p className="section-hint">{t('app.firstResult.budgetHint', vars)}</p>
            <button
              type="button"
              className="btn-primary"
              disabled={action.pending}
              aria-busy={action.pending}
              onClick={() => void save()}
            >
              {t('app.firstResult.budget', vars)}
            </button>
          </>
        )
      )}
      {onOpenBudgets && (
        <button type="button" className="leak-link" onClick={onOpenBudgets}>
          <Icon name="target" /> {t('app.firstResult.seeBudgets')}
        </button>
      )}
      {action.error && (
        <p className="form-error" role="alert">
          {action.error}
        </p>
      )}
    </section>
  );
}

/**
 * The first thing an import shows: where most of the money went (with a limit to set for it) and
 * the fixed charges and subscriptions found among the movements (those that are not an automatic
 * movement yet), to add them as automatic movements in one go.
 * Only facts: what repeats and what it costs, no promises.
 */
export function FirstResult({
  onOpenGoals,
  rows = [],
  categories = [],
  onOpenBudgets,
  onRulesAdded,
}: {
  onOpenGoals?: () => void;
  /** Called once the charges are automatic operations (they may add movements to the month). */
  onRulesAdded?: () => void;
  /** The rows of the import (its preview): where the money went. */
  rows?: ImportRowResult[];
  /** The person's categories: a limit is offered for one of them. */
  categories?: Category[];
  onOpenBudgets?: () => void;
}) {
  return (
    <>
      <BudgetSuggestion rows={rows} categories={categories} onOpenBudgets={onOpenBudgets} />
      <RepeatedCharges onOpenGoals={onOpenGoals} onRulesAdded={onRulesAdded} />
    </>
  );
}

/** The fixed charges and subscriptions found, to add as automatic movements. */
function RepeatedCharges({
  onOpenGoals,
  onRulesAdded,
}: {
  onOpenGoals?: () => void;
  onRulesAdded?: () => void;
}) {
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
      <AddAsRules items={data.subscriptions} onAdded={onRulesAdded} />
      {onOpenGoals && <GoalLink onOpen={onOpenGoals} />}
    </section>
  );
}
