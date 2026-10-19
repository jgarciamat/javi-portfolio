import { useI18n } from '@core/i18n/I18nContext';
import type { RentaResult } from '../../domain/rentaCalc';
import type { JointComparison } from '../../domain/rentaJoint';
import { resultTone } from './shared';

type Row = { key: string; of: (r: RentaResult) => number };

/** The lines of each return that explain the difference, and what is left to pay or refund. */
const ROWS: Row[] = [
  { key: 'base', of: (r) => r.taxBase + r.savingsBase },
  { key: 'minimum', of: (r) => r.minimum.total },
  { key: 'quota', of: (r) => r.stateQuota + r.regionalQuota },
  { key: 'netQuota', of: (r) => r.netQuota },
  { key: 'withheld', of: (r) => r.withheld },
  { key: 'result', of: (r) => r.result },
];

/** Two individual returns against the joint one, with what each choice costs and a recommendation. */
export function JointTable({
  joint,
  money,
}: {
  joint: JointComparison;
  money: (n: number) => string;
}) {
  const { t } = useI18n();
  const couple = joint.partner !== null;
  const columns: { key: string; label: string; value: (row: Row) => number }[] = [
    { key: 'you', label: t('tools.renta.joint.col.you'), value: (row) => row.of(joint.you) },
    ...(joint.partner
      ? [
          {
            key: 'partner',
            label: t('tools.renta.joint.col.partner'),
            value: (row: Row) => row.of(joint.partner as RentaResult),
          },
          {
            key: 'sum',
            label: t('tools.renta.joint.col.sum'),
            value: (row: Row) => row.of(joint.you) + row.of(joint.partner as RentaResult),
          },
        ]
      : []),
    { key: 'joint', label: t('tools.renta.joint.col.joint'), value: (row) => row.of(joint.joint) },
  ];
  const amount = money(Math.abs(joint.saving));
  // All the children with one parent only matters when it would give less than half each.
  const toOne =
    joint.childrenToOne && joint.childrenToOne.individual < joint.individual
      ? joint.childrenToOne
      : null;

  return (
    <section className="renta-block renta-joint" aria-labelledby="renta-joint-title">
      <h3 id="renta-joint-title">{t('tools.renta.joint.compareTitle')}</h3>
      <p className="renta-joint-verdict" role="status">
        <strong>{t(`tools.renta.joint.best.${joint.best}`, { amount })}</strong>
      </p>
      <div className="renta-compare-scroll">
        <table className="renta-compare-table">
          <thead>
            <tr>
              <th scope="col">{t('tools.renta.joint.col.concept')}</th>
              {columns.map((c) => (
                <th key={c.key} scope="col">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.key}>
                <th scope="row">{t(`tools.renta.joint.row.${row.key}`)}</th>
                {columns.map((c) => (
                  <td
                    key={c.key}
                    data-label={c.label}
                    className={
                      // The result in its colour: red to pay (positive), green refunded (negative).
                      row.key === 'result'
                        ? `renta-amount renta-amount--${resultTone(c.value(row))}`
                        : undefined
                    }
                  >
                    {money(c.value(row))}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="section-hint">{t('tools.renta.joint.sign')}</p>
      <ul className="renta-notes">
        <li>
          {t(couple ? 'tools.renta.joint.note.couple' : 'tools.renta.joint.note.single', {
            amount: money(joint.joint.jointReduction),
          })}
        </li>
        {toOne && (
          <li>
            {t('tools.renta.joint.note.childrenToOne', {
              who: t(`tools.renta.joint.to.${toOne.to}`),
              amount: money(toOne.individual),
            })}
          </li>
        )}
        {joint.oneGeneralExpense !== null && joint.oneGeneralExpense !== joint.joint.result && (
          <li>
            {t('tools.renta.joint.note.oneGeneral', {
              amount: money(joint.oneGeneralExpense - joint.joint.result),
            })}
          </li>
        )}
        {joint.lowPayLeftOut > 0 && (
          <li>{t('tools.renta.joint.note.lowPay', { amount: money(joint.lowPayLeftOut) })}</li>
        )}
        <li>{t('tools.renta.joint.note.assumptions')}</li>
      </ul>
      <p className="renta-compare-warning" role="note">
        {t('tools.renta.joint.warning')}
      </p>
    </section>
  );
}
