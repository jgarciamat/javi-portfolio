import { useI18n } from '@core/i18n/I18nContext';
import type { RentaResult } from '../../domain/rentaCalc';
import { disabilityLimitsOf } from '../../domain/rentaDisability';
import { number } from '../../domain/rentaForm';
import { useRentaRules } from './RentaRulesContext';
import { Field, useMoney, type StepProps } from './shared';

const k = (key: string) => `tools.renta.plans.${key}`;

/** The years whose excess can still be used, the oldest first (art. 52.2: five). */
const yearsBefore = (year: number, span: number) =>
  Array.from({ length: span }, (_, i) => year - span + i);

/**
 * What did not fit in the plans of the five years before, year by year: the oldest are used first
 * and the one of five years ago is in its last year. A total saved before the years were asked
 * stays as it was, and is used first.
 */
export function ExcessByYear({ form, set }: StepProps) {
  const { t } = useI18n();
  const rules = useRentaRules();
  const span = rules.state.baseReductions.excessYears;
  const years = yearsBefore(rules.year, span);
  const typed = form.pensionExcessYears ?? {};
  const update = (year: number, part: 'plans' | 'dependency', value: string) =>
    set({ pensionExcessYears: { ...typed, [year]: { ...typed[year], [part]: value } } });
  const legacy = number(form.pensionExcess) > 0 || number(form.dependencyExcess) > 0;
  return (
    <fieldset className="renta-block">
      <legend>{t(k('excessTitle'))}</legend>
      <p className="section-hint">{t(k('excessHint'), { first: years[0] })}</p>
      <div className="tools-form">
        {years.map((year) => (
          <div key={year} className="renta-excess-year">
            <Field
              id={`renta-excess-plans-${year}`}
              label={t(k('excessPlans'), { year })}
              value={typed[year]?.plans ?? ''}
              onChange={(v) => update(year, 'plans', v)}
            />
            <Field
              id={`renta-excess-dependency-${year}`}
              label={t(k('excessDependency'), { year })}
              value={typed[year]?.dependency ?? ''}
              onChange={(v) => update(year, 'dependency', v)}
            />
          </div>
        ))}
        {legacy && (
          <>
            <Field
              id="renta-pension-excess"
              label={t('tools.renta.pensionExcess')}
              hint={t(k('legacyHint'))}
              value={form.pensionExcess ?? ''}
              onChange={(v) => set({ pensionExcess: v })}
            />
            <Field
              id="renta-dependency-excess"
              label={t('tools.renta.dependencyExcess')}
              value={form.dependencyExcess ?? ''}
              onChange={(v) => set({ dependencyExcess: v })}
            />
          </>
        )}
      </div>
    </fieldset>
  );
}

/**
 * Plans and protected patrimony of a person with a disability (LIRPF arts. 53 and 54): the person's
 * own plan (with a disability), the plan of a relative and the patrimony of a relative, with what
 * the others put in, which shares the limits.
 */
export function DisabilityPlans({ form, set }: StepProps) {
  const { t } = useI18n();
  const rules = useRentaRules();
  const rel = form.relativePlan ?? {};
  const pat = form.patrimony ?? {};
  const pending = pat.pending ?? {};
  // The excess of the patrimony of the four years before (art. 54.2).
  const years = yearsBefore(
    rules.year,
    disabilityLimitsOf(rules.state.baseReductions).patrimonyYears
  );
  return (
    <fieldset className="renta-block">
      <legend>{t(k('disabilityTitle'))}</legend>
      <p className="section-hint">{t(k('disabilityHint'))}</p>
      <div className="tools-form">
        {form.disability >= 33 && (
          <Field
            id="renta-disabled-own-plan"
            label={t(k('ownPlan'))}
            hint={t(k('ownPlanHint'))}
            value={form.disabledOwnPlan ?? ''}
            onChange={(v) => set({ disabledOwnPlan: v })}
          />
        )}
        <Field
          id="renta-relative-plan"
          label={t(k('relativePlan'))}
          hint={t(k('relativePlanHint'))}
          value={rel.mine ?? ''}
          onChange={(v) => set({ relativePlan: { ...rel, mine: v } })}
        />
        <Field
          id="renta-relative-plan-theirs"
          label={t(k('relativeTheirs'))}
          value={rel.theirs ?? ''}
          onChange={(v) => set({ relativePlan: { ...rel, theirs: v } })}
        />
        <Field
          id="renta-relative-plan-others"
          label={t(k('relativeOthers'))}
          hint={t(k('othersHint'))}
          value={rel.others ?? ''}
          onChange={(v) => set({ relativePlan: { ...rel, others: v } })}
        />
        <Field
          id="renta-patrimony"
          label={t(k('patrimony'))}
          hint={t(k('patrimonyHint'))}
          value={pat.mine ?? ''}
          onChange={(v) => set({ patrimony: { ...pat, mine: v } })}
        />
        <Field
          id="renta-patrimony-others"
          label={t(k('patrimonyOthers'))}
          hint={t(k('othersHint'))}
          value={pat.others ?? ''}
          onChange={(v) => set({ patrimony: { ...pat, others: v } })}
        />
        {years.map((year) => (
          <Field
            key={year}
            id={`renta-patrimony-pending-${year}`}
            label={t(k('patrimonyPending'), { year })}
            value={pending[year] ?? ''}
            onChange={(v) => set({ patrimony: { ...pat, pending: { ...pending, [year]: v } } })}
          />
        ))}
      </div>
    </fieldset>
  );
}

/** Below the result: what is left of each excess, until when it can be used, and what is lost. */
export function ExcessExpiry({ result }: { result: RentaResult }) {
  const { t } = useI18n();
  const money = useMoney();
  const rules = useRentaRules();
  const years = result.pensionExcessYears;
  const disability = result.disability;
  const lines: string[] = [];
  for (const x of years?.left ?? []) {
    const amount = money(x.plans + x.dependency);
    lines.push(
      x.year === null
        ? t(k('leftNoYear'), { amount })
        : t(k('left'), { amount, year: x.year, last: x.lastYear as number })
    );
  }
  const lost = (years?.lost.plans ?? 0) + (years?.lost.dependency ?? 0);
  // Only the excess of five years ago can be in its last year.
  const oldest = rules.year - rules.state.baseReductions.excessYears;
  if (lost > 0) lines.push(t(k('lost'), { amount: money(lost), year: oldest }));
  for (const x of disability?.patrimonyLeft ?? []) {
    lines.push(t(k('patrimonyLeft'), { amount: money(x.amount), year: x.year, last: x.lastYear }));
  }
  if ((disability?.patrimonyLost ?? 0) > 0)
    lines.push(t(k('patrimonyLost'), { amount: money(disability?.patrimonyLost as number) }));
  if ((disability?.plansNext ?? 0) > 0)
    lines.push(t(k('disabilityNext'), { amount: money(disability?.plansNext as number) }));
  if (lines.length === 0) return null;
  return (
    <ul className="renta-minimum renta-excess-expiry" aria-label={t(k('expiryTitle'))}>
      {lines.map((line) => (
        <li key={line}>{line}</li>
      ))}
    </ul>
  );
}
