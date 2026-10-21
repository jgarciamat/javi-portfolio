import { useI18n } from '@core/i18n/I18nContext';
import type { DeductionLine, RentaInput, RentaResult } from '../../domain/rentaCalc';
import { descendantBreakdown } from '../../domain/rentaCalc';
import type { JointComparison } from '../../domain/rentaJoint';
import { JointTable } from './JointResult';
import { InvestInResult } from './invest/InvestSummary';
import { useRentaRules } from './RentaRulesContext';
import type { ImportedSavings } from '../../domain/rentaGains';
import { Icon } from '@shared/components/Icon';
import { scrollBehavior } from '@shared/utils/motion';
import { ResultAmount, resultLabel, resultTone } from './shared';
import { hasRentaWebCopy, RENTA_WEB_RESULT_ID } from './invest/RentaWebPanel';
import { ledgerOf } from '../../domain/invest/summary';

export interface Snapshot {
  result: RentaResult;
  kids: ReturnType<typeof descendantBreakdown>;
  /** Individual against joint, when the person can file with a family unit. */
  joint?: JointComparison | null;
  /** The year of the return it was worked out for (missing: saved before 2026-10, so 2025). */
  year?: number;
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

/** One line of the result, only when it has something. */
function Line({ show, label, value }: { show: boolean; label: string; value: string }) {
  if (!show) return null;
  return (
    <>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </>
  );
}

/**
 * The pay as Renta WEB shows it before the net: box 0003 (dinerarias), 0012 (total), 0013 (social
 * security) and 0019 (other expenses). A result saved before these fields existed skips them.
 */
function WorkLines({ result, money }: { result: RentaResult; money: (n: number) => string }) {
  const { t } = useI18n();
  if (typeof result.workPay !== 'number' || result.workGross <= 0) return null;
  const line = (key: string) => t(`tools.renta.line.${key}`);
  return (
    <>
      <Line show label={line('pay0003')} value={money(result.workPay)} />
      <Line show label={line('pay0012')} value={money(result.workGross)} />
      <Line show label={line('pay0013')} value={minus(result.workSocialSecurity, money)} />
      <Line show label={line('pay0019')} value={minus(result.otherExpenses, money)} />
    </>
  );
}

/** What the pension plans leave for the next five years (a result saved before has none). */
const excessOf = (r: RentaResult) =>
  (r.pensionExcessNext?.plans ?? 0) + (r.pensionExcessNext?.dependency ?? 0);

/** The lines of the calculation, from the net income to the withholdings. */
function ResultLines({ result, money }: { result: RentaResult; money: (n: number) => string }) {
  const { t } = useI18n();
  const line = (key: string) => t(`tools.renta.line.${key}`);
  return (
    <dl className="renta-lines">
      <WorkLines result={result} money={money} />
      <Line show label={line('netIncome')} value={money(result.netIncome)} />
      <Line show={result.rentalNet !== 0} label={line('rental')} value={money(result.rentalNet)} />
      <Line
        show={result.activities !== null}
        label={line('activities')}
        value={money(result.activities?.total ?? 0)}
      />
      <Line
        show={result.imputedIncome > 0}
        label={line('imputed')}
        value={money(result.imputedIncome)}
      />
      <Line
        show
        label={line('reductions')}
        value={minus(
          result.workReduction + result.pensionReduction + result.otherReductions,
          money
        )}
      />
      <Line show label={line('base')} value={money(result.taxBase)} />
      <Line
        show={excessOf(result) > 0}
        label={line('pensionExcessNext')}
        value={money(excessOf(result))}
      />
      <Line
        show={result.savingsBase > 0}
        label={line('savingsBase')}
        value={money(result.savingsBase)}
      />
      <Line show label={line('minimum')} value={money(result.minimum.total)} />
      <Line show label={line('stateQuota')} value={money(result.stateQuota)} />
      <Line show label={line('regionalQuota')} value={money(result.regionalQuota)} />
      <Line
        show
        label={line('deductions')}
        value={minus(result.stateDeductions + result.regionalDeductions + result.refundable, money)}
      />
      <Line show label={line('netQuota')} value={money(result.netQuota)} />
      <Line show label={line('withheld')} value={minus(result.withheld, money)} />
      <Line
        show={result.advanceReceived > 0}
        label={line('advanceReceived')}
        value={`+${money(result.advanceReceived)}`}
      />
    </dl>
  );
}

/** The estimated result: how much to pay or get back, line by line, and what the family minimum saves. */
export function ResultCard({
  shown,
  money,
  imported,
  input,
}: {
  shown: Snapshot;
  money: (n: number) => string;
  imported?: ImportedSavings;
  input?: RentaInput;
}) {
  const { t } = useI18n();
  const { year } = useRentaRules();
  const { result, kids } = shown;
  // What to copy of the investments is further down, in the panel of InvestInResult.
  const toCopy = !!result.savingsDetail && !!imported && hasRentaWebCopy(ledgerOf(imported));
  return (
    <>
      <p className={`renta-total renta-total--${resultTone(result.result)}`}>
        {t(resultLabel(result.result))}: <ResultAmount result={result.result} money={money} />
      </p>
      {toCopy && (
        <p className="renta-invest-link">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              const panel = document.getElementById(RENTA_WEB_RESULT_ID) as HTMLElement;
              panel.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
              panel.focus({ preventScroll: true });
            }}
          >
            <Icon name="clipboard" /> {t('tools.invest.web.resultLink')}
          </button>
        </p>
      )}
      {result.blocked.length > 0 && (
        <p className="form-error" role="alert">
          {t('tools.renta.blockedSummary', { count: result.blocked.length })}
        </p>
      )}
      <ResultLines result={result} money={money} />
      {result.savingsDetail && (
        <InvestInResult
          breakdown={result.savingsDetail}
          imported={imported}
          year={year}
          input={input}
        />
      )}
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
