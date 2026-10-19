import { useI18n } from '@core/i18n/I18nContext';
import { draftResult, type CompareRow } from '../../domain/rentaCompare';
import type { DraftReading } from '../../domain/rentaDraft';
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
    <p className="renta-compare-summary" role="status">
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

/** The draft's boxes next to the planner's, with a likely reason for each difference. */
export function DraftComparison({
  reading,
  rows,
  result,
}: {
  reading: DraftReading;
  rows: CompareRow[];
  /** The planner's result: to pay over zero, to be refunded below. */
  result: number;
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
          {theirs !== null && <Summary draft={theirs} ours={result} />}
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
