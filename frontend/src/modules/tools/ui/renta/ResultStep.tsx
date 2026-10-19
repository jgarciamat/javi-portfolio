import { useI18n } from '@core/i18n/I18nContext';
import type { DeductionLine, RentaResult } from '../../domain/rentaCalc';
import { descendantBreakdown } from '../../domain/rentaCalc';
import type { JointComparison } from '../../domain/rentaJoint';
import { JointTable } from './JointResult';

export interface Snapshot {
  result: RentaResult;
  kids: ReturnType<typeof descendantBreakdown>;
  /** Individual against joint, when the person can file with a family unit. */
  joint?: JointComparison | null;
}

/** An amount that is taken off, shown with a minus sign unless it is zero. */
const minus = (n: number, money: (n: number) => string) => (n > 0 ? `−${money(n)}` : money(0));

const CHILD_AID =
  /hij|maternidad|guarder|nacimiento|adopci|natalidad|descend|infantil|numerosa|menor/i;

/** Everything that helps for children, in three clearly different layers that add up but never repeat. */
function ChildAids({ shown, money }: { shown: Snapshot; money: (n: number) => string }) {
  const { t } = useI18n();
  const { result, kids } = shown;
  if (kids.length === 0) return null;
  const lines: DeductionLine[] = result.lines.filter(
    (l) => l.group === 'family' && CHILD_AID.test(`${l.id} ${l.title}`)
  );
  const bySide = (scope: DeductionLine['scope']) => lines.filter((l) => l.scope === scope);
  const minimum = kids.reduce((sum, k) => sum + k.amount, 0);
  const total = result.minimumSavings.descendants + lines.reduce((s, l) => s + l.amount, 0);
  return (
    <section className="renta-block renta-child-aids">
      <h3>{t('tools.renta.childAids')}</h3>
      <p className="section-hint">{t('tools.renta.childAidsHint')}</p>
      <ol>
        <li>
          <strong>{t('tools.renta.childAids.minimum')}</strong>{' '}
          {t('tools.renta.childAids.minimumValue', {
            amount: money(minimum),
            saves: money(result.minimumSavings.descendants),
          })}
        </li>
        <li>
          <strong>{t('tools.renta.childAids.state')}</strong>
          {bySide('state').length === 0 ? (
            <small> {t('tools.renta.childAids.none')}</small>
          ) : (
            <ul>
              {bySide('state').map((l) => (
                <li key={l.id}>
                  {l.title}: <strong>{money(l.amount)}</strong>
                </li>
              ))}
            </ul>
          )}
        </li>
        <li>
          <strong>{t('tools.renta.childAids.regional')}</strong>
          {bySide('regional').length === 0 ? (
            <small> {t('tools.renta.childAids.none')}</small>
          ) : (
            <ul>
              {bySide('regional').map((l) => (
                <li key={l.id}>
                  {l.title}: <strong>{money(l.amount)}</strong>
                </li>
              ))}
            </ul>
          )}
        </li>
      </ol>
      <p className="renta-gives">
        {t('tools.renta.childAids.total')} <strong>{money(total)}</strong>
      </p>
    </section>
  );
}

/** The estimated result: how much to pay or get back, line by line, and what the family minimum saves. */
export function ResultCard({ shown, money }: { shown: Snapshot; money: (n: number) => string }) {
  const { t } = useI18n();
  const { result, kids } = shown;
  const toPay = result.result >= 0;
  return (
    <>
      <p className={`renta-total ${toPay ? 'renta-total--pay' : 'renta-total--refund'}`}>
        {toPay ? t('tools.renta.toPay') : t('tools.renta.refund')}:{' '}
        <strong>{money(Math.abs(result.result))}</strong>
      </p>
      {result.blocked.length > 0 && (
        <p className="form-error" role="alert">
          {t('tools.renta.blockedSummary', { count: result.blocked.length })}
        </p>
      )}
      <dl className="renta-lines">
        <dt>{t('tools.renta.line.netIncome')}</dt>
        <dd>{money(result.netIncome)}</dd>
        {result.rentalNet !== 0 && (
          <>
            <dt>{t('tools.renta.line.rental')}</dt>
            <dd>{money(result.rentalNet)}</dd>
          </>
        )}
        {result.imputedIncome > 0 && (
          <>
            <dt>{t('tools.renta.line.imputed')}</dt>
            <dd>{money(result.imputedIncome)}</dd>
          </>
        )}
        <dt>{t('tools.renta.line.reductions')}</dt>
        <dd>
          {minus(result.workReduction + result.pensionReduction + result.otherReductions, money)}
        </dd>
        <dt>{t('tools.renta.line.base')}</dt>
        <dd>{money(result.taxBase)}</dd>
        {result.savingsBase > 0 && (
          <>
            <dt>{t('tools.renta.line.savingsBase')}</dt>
            <dd>{money(result.savingsBase)}</dd>
          </>
        )}
        <dt>{t('tools.renta.line.minimum')}</dt>
        <dd>{money(result.minimum.total)}</dd>
        <dt>{t('tools.renta.line.stateQuota')}</dt>
        <dd>{money(result.stateQuota)}</dd>
        <dt>{t('tools.renta.line.regionalQuota')}</dt>
        <dd>{money(result.regionalQuota)}</dd>
        <dt>{t('tools.renta.line.deductions')}</dt>
        <dd>
          {minus(result.stateDeductions + result.regionalDeductions + result.refundable, money)}
        </dd>
        <dt>{t('tools.renta.line.netQuota')}</dt>
        <dd>{money(result.netQuota)}</dd>
        <dt>{t('tools.renta.line.withheld')}</dt>
        <dd>{minus(result.withheld, money)}</dd>
        {result.advanceReceived > 0 && (
          <>
            <dt>{t('tools.renta.line.advanceReceived')}</dt>
            <dd>+{money(result.advanceReceived)}</dd>
          </>
        )}
      </dl>
      <ChildAids shown={shown} money={money} />
      {shown.joint && <JointTable joint={shown.joint} money={money} />}
      {result.lines.length > 0 && (
        <>
          <h3>{t('tools.renta.yourDeductions')}</h3>
          <ul className="renta-minimum">
            {result.lines.map((l) => (
              <li key={`${l.scope}-${l.id}`}>
                <span>
                  {l.title}
                  {/* A State deduction with a regional half shows each part on its own line. */}
                  {result.lines.filter((o) => o.id === l.id).length > 1 &&
                    ` (${t(`tools.renta.part.${l.scope}`)})`}
                </span>
                <strong>{money(l.amount)}</strong>
              </li>
            ))}
          </ul>
        </>
      )}
      <h3>{t('tools.renta.minimumTitle')}</h3>
      <p className="section-hint">{t('tools.renta.minimumHint')}</p>
      <ul className="renta-minimum">
        {result.minimum.items.map((item) => (
          <li key={item.key}>
            <span>{t(`tools.renta.minimum.${item.key}`)}</span>
            <span>
              {money(item.amount)} · {t('tools.renta.saves')}{' '}
              <strong>{money(result.minimumSavings[item.key])}</strong>
            </span>
          </li>
        ))}
        {kids.map((kid, i) => (
          <li key={`kid-${i}`} className="renta-kid">
            <span>{t('tools.renta.kidLine', { n: i + 1, age: kid.age })}</span>
            <span>{money(kid.amount)}</span>
          </li>
        ))}
      </ul>
    </>
  );
}
