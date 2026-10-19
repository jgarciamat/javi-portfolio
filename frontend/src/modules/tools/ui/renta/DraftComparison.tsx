import { useI18n } from '@core/i18n/I18nContext';
import { draftResult, type CompareRow } from '../../domain/rentaCompare';
import type { DraftReading } from '../../domain/rentaDraft';
import type { Deduction } from '../../domain/rentaData';
import { verdictOf, type DraftGap, type Verdict } from '../../domain/rentaDraftGaps';
import type { Choice } from '../../domain/rentaForm';
import { rentaState } from '../../data/renta/state';
import { useMoney } from './shared';
import { InvestGuide } from './invest/InvestGuide';

/** A difference (never zero) with its sign: what the planner gives over the draft. */
const signed = (n: number, money: (n: number) => string) =>
  n > 0 ? `+${money(n)}` : `−${money(-n)}`;

/** "Your draft gives a refund of X; with your data we give Y": the whole difference in one line. */
function Summary({ draft, ours }: { draft: number; ours: number }) {
  const { t } = useI18n();
  const money = useMoney();
  const outcome = (n: number) =>
    n < 0
      ? t('tools.renta.compare.refund', { amount: money(-n) })
      : t('tools.renta.compare.pay', { amount: money(n) });
  const diff = Math.round((ours - draft) * 100) / 100;
  return (
    <p className="renta-compare-summary">
      {diff === 0
        ? t('tools.renta.compare.summarySame', { draft: outcome(draft) })
        : t('tools.renta.compare.summary', {
            draft: outcome(draft),
            ours: outcome(ours),
            diff: money(Math.abs(diff)),
          })}
    </p>
  );
}

/**
 * The verdict first, in colour: green when the result is the draft's, amber when the difference is
 * the draft's deductions not marked here yet, red only for a difference they do not explain.
 */
function VerdictLine({ verdict }: { verdict: Verdict }) {
  const { t } = useI18n();
  const money = useMoney();
  const k = (key: string) => `tools.renta.compare.verdict.${key}`;
  return (
    <div className={`renta-verdict renta-verdict--${verdict.kind}`} role="status">
      <p className="renta-verdict-title">
        <strong>{t(k(verdict.kind))}</strong>
      </p>
      {verdict.kind === 'explained' && (
        <p>{t(k('explainedWhy'), { amount: money(verdict.explained) })}</p>
      )}
      {verdict.kind === 'unexplained' && verdict.explained > 0 && (
        <p>{t(k('partlyExplained'), { amount: money(verdict.explained) })}</p>
      )}
      <details className="renta-verdict-meaning">
        <summary>{t(k('meaningTitle'))}</summary>
        <p>{t(k(`meaning.${verdict.kind}`))}</p>
      </details>
    </div>
  );
}

/** The draft's deductions missing here, each one with a button to add it with its amount. */
function Gaps({ gaps, onAdd }: { gaps: DraftGap[]; onAdd: (id: string, choice: Choice) => void }) {
  const { t } = useI18n();
  const money = useMoney();
  if (gaps.length === 0) return null;
  return (
    <ul className="renta-gaps" aria-label={t('tools.renta.compare.gaps.title')}>
      {gaps.map((g) => (
        <li key={g.label}>
          <span>
            {g.label}: <strong>{money(g.amount)}</strong>
          </span>
          {g.deduction && g.choice ? (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => onAdd((g.deduction as Deduction).id, g.choice as Choice)}
            >
              {t('tools.renta.compare.gaps.add')}
            </button>
          ) : (
            <small className="renta-field-hint">{t('tools.renta.compare.gaps.copy')}</small>
          )}
        </li>
      ))}
    </ul>
  );
}

/** The draft's boxes next to the planner's, with a likely reason for each difference. */
export function DraftComparison({
  reading,
  rows,
  result,
  gaps,
  withGaps,
  onAdd,
}: {
  reading: DraftReading;
  rows: CompareRow[];
  /** The planner's result: to pay over zero, to be refunded below. */
  result: number;
  /** The draft's deductions not marked here yet (rentaDraftGaps.ts). */
  gaps: DraftGap[];
  /** The planner's result with them added. */
  withGaps: number;
  /** Marks one of them with the amount of the draft. */
  onAdd: (id: string, choice: Choice) => void;
}) {
  const { t } = useI18n();
  const money = useMoney();
  const label = (box: string) => `${t(`tools.renta.compare.box.${box}`)} (${box})`;
  const theirs = draftResult(reading.boxes);
  const differing = rows.filter((r) => r.differs).length;

  return (
    <section className="renta-compare" aria-label={t('tools.renta.compare.title')}>
      <h3>{t('tools.renta.compare.title')}</h3>
      {reading.exercise !== null && reading.exercise !== rentaState.year && (
        <p className="renta-compare-warning" role="alert">
          {t('tools.renta.compare.otherYear', {
            exercise: reading.exercise,
            year: rentaState.year,
          })}
        </p>
      )}
      {rows.length === 0 ? (
        <p className="form-error">{t('tools.renta.compare.noBoxes')}</p>
      ) : (
        <>
          {theirs !== null && (
            <>
              <VerdictLine verdict={verdictOf(theirs, result, withGaps)} />
              <Summary draft={theirs} ours={result} />
            </>
          )}
          <Gaps gaps={gaps} onAdd={onAdd} />
          <p className="section-hint">
            {differing === 0
              ? t('tools.renta.compare.allMatch')
              : t('tools.renta.compare.differing', { count: differing })}{' '}
            {t('tools.renta.compare.live')}
          </p>
          <div className="renta-compare-scroll">
            <table className="renta-compare-table">
              <thead>
                <tr>
                  <th scope="col">{t('tools.renta.compare.boxCol')}</th>
                  <th scope="col">{t('tools.renta.compare.draftCol')}</th>
                  <th scope="col">{t('tools.renta.compare.oursCol')}</th>
                  <th scope="col">{t('tools.renta.compare.diffCol')}</th>
                </tr>
              </thead>
              {rows.map((row) => (
                <tbody key={row.box} className={row.differs ? 'renta-compare-differs' : undefined}>
                  <tr>
                    <th scope="row">{label(row.box)}</th>
                    <td data-label={t('tools.renta.compare.draftCol')}>{money(row.draft)}</td>
                    <td data-label={t('tools.renta.compare.oursCol')}>{money(row.ours)}</td>
                    <td data-label={t('tools.renta.compare.diffCol')}>
                      {row.differs ? signed(row.diff, money) : '='}
                    </td>
                  </tr>
                  {row.why && (
                    <tr className="renta-compare-why">
                      <td colSpan={4}>
                        {t(`tools.renta.compare.why.${row.why.key}`, {
                          from: row.why.from ? label(row.why.from) : '',
                        })}
                      </td>
                    </tr>
                  )}
                </tbody>
              ))}
            </table>
          </div>
        </>
      )}
      <InvestGuide />
    </section>
  );
}
