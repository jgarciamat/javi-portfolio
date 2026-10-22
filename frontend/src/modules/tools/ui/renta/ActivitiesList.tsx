import { useI18n } from '@core/i18n/I18nContext';
import { parseDecimal } from '@shared/utils/numbers';
import type { ActivitiesResult, ActivityInput } from '../../domain/rentaActivity';
import { AUTONOMO_ACTIVITY, withoutAutonomoActivity } from '../../domain/rentaFromAutonomo';
import { ActivityBoxes } from './ActivityBoxes';
import { RemoveActivity } from './AutonomoBring';
import { Field, useMoney, type StepProps } from './shared';
import { HeldNote, useHeld } from './RentaRulesContext';

/**
 * An activity in direct estimation that may be artistic (LIRPF DA 60.ª.2, from 2025): the tick and
 * the net income of the three years before.
 */
function ArtisticQuestion({
  a,
  n,
  onChange,
}: {
  a: ActivityInput;
  n: number;
  onChange: (a: ActivityInput) => void;
}) {
  const { t } = useI18n();
  if (a.kind !== 'direct') return null;
  const previous = a.artistic?.previous ?? [];
  const k = 'tools.renta.activities.artistic';
  return (
    <div className="renta-block">
      <label className="renta-check">
        <input
          type="checkbox"
          checked={a.artistic !== undefined}
          onChange={(e) => {
            const { artistic: _, ...rest } = a;
            onChange(e.target.checked ? { ...rest, artistic: { previous: [0, 0, 0] } } : rest);
          }}
        />
        <span>{t(k)}</span>
      </label>
      {a.artistic && (
        <>
          <p className="section-hint">{t(`${k}Hint`)}</p>
          <div className="tools-form">
            {[1, 2, 3].map((ago) => (
              <Field
                key={ago}
                id={`renta-activity-${n}-previous-${ago}`}
                label={t(`${k}Previous`, { ago })}
                value={previous[ago - 1] ? String(previous[ago - 1]).replace('.', ',') : ''}
                onChange={(v) => {
                  const next = [0, 1, 2].map((i) => previous[i] ?? 0);
                  const value = parseDecimal(v);
                  next[ago - 1] = Number.isFinite(value) ? value : 0;
                  onChange({ ...a, artistic: { previous: next } });
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

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
  // Without the módulos of the year the figures of an activity by módulos would be partial.
  const held = useHeld(['modules']);
  const list = form.activities ?? [];
  if (list.length === 0 || !result) return null;
  return (
    <section className="renta-block" aria-label={t('tools.renta.activities.title')}>
      <h3>{t('tools.renta.activities.title')}</h3>
      <ul className="renta-minimum">
        {list.map((a, i) => (
          <li key={`${a.name}-${i}`}>
            <span>
              {held
                ? a.name
                : t('tools.renta.activities.line', {
                    name: a.name,
                    net: money(result.each[i].net),
                  })}
            </span>
            {a.name === AUTONOMO_ACTIVITY ? (
              <RemoveActivity onRemove={() => set(withoutAutonomoActivity(form))} />
            ) : (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => set({ activities: list.filter((_, j) => j !== i) })}
              >
                {t('tools.renta.activities.remove', { name: a.name })}
              </button>
            )}
            <ArtisticQuestion
              a={a}
              n={i + 1}
              onChange={(next) => set({ activities: list.map((x, j) => (j === i ? next : x)) })}
            />
          </li>
        ))}
      </ul>
      {held ? (
        <HeldNote parts={['modules']} />
      ) : (
        <>
          {(result.artisticReduction ?? 0) > 0 && (
            <p className="section-hint" role="status">
              {t('tools.renta.activities.artisticReduction', {
                amount: money(result.artisticReduction as number),
              })}
            </p>
          )}
          <p className="section-hint">
            {t('tools.renta.activities.total', {
              total: money(result.total),
              withheld: money(result.withheld),
              payments: money(result.payments),
            })}
          </p>
          <ActivityBoxes list={list} result={result} />
        </>
      )}
    </section>
  );
}
