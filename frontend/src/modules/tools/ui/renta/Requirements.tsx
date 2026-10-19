import { useI18n } from '@core/i18n/I18nContext';
import type { Family } from '../../domain/rentaCalc';
import type { Deduction } from '../../domain/rentaData';
import type { Choice } from '../../domain/rentaForm';
import { checkDeduction, type Check } from '../../domain/rentaRequirements';
import { RadioOptions } from './shared';

const k = (key: string) => `tools.renta.req.${key}`;

/** A requirement the return already knows, in words: «You are 35 or younger». */
function knownLabel(t: ReturnType<typeof useI18n>['t'], c: Exclude<Check, { kind: 'ask' }>) {
  switch (c.kind) {
    case 'maxAge':
    case 'minAge':
    case 'childUnder':
      return t(k(c.kind), { age: c.age });
    case 'children':
      return t(k('children'), { count: c.min });
    case 'disability':
      return t(k('disability'), { min: c.min });
  }
}

/**
 * The requirements of a marked deduction: what the return knows, checked; the rest, asked yes or
 * no. Not met: it is left out; not answered: it waits. Where it goes in the modelo 100, too.
 */
export function Requirements({
  deduction,
  choice,
  family,
  onChange,
}: {
  deduction: Deduction;
  choice: Choice;
  family: Family;
  onChange: (choice: Choice) => void;
}) {
  const { t } = useI18n();
  const checks = deduction.checks ?? [];
  if (checks.length === 0 && !deduction.box) return null;
  const status = checkDeduction(checks, family, choice.checks);
  return (
    <div className="renta-req">
      {checks.length > 0 && <p className="renta-question">{t(k('title'))}</p>}
      <ul className="renta-req-list">
        {checks.map((c) =>
          c.kind === 'ask' ? (
            <li key={c.id}>
              <span>{c.q}</span>
              <RadioOptions
                name={`renta-req-${deduction.id}-${c.id}`}
                options={['yes', 'no'].map((value) => ({ value, label: t(k(value)) }))}
                value={choice.checks?.[c.id] ?? null}
                onChange={(v) =>
                  onChange({ ...choice, checks: { ...choice.checks, [c.id]: v as 'yes' | 'no' } })
                }
              />
            </li>
          ) : (
            <li key={c.kind}>{knownLabel(t, c)}</li>
          )
        )}
      </ul>
      {status.status === 'fail' && (
        <p className="form-error" role="alert">
          {t(k('fail'))}
        </p>
      )}
      {status.status === 'missing' && (
        <p className="section-hint" role="status">
          {t(k('missing'), { count: status.missing.length })}
        </p>
      )}
      {deduction.box && (
        <small className="renta-field-hint">{t(k('box'), { box: deduction.box })}</small>
      )}
    </div>
  );
}
