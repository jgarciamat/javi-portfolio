import { useI18n } from '@core/i18n/I18nContext';
import type { SavingsBreakdown, ImportedSavings } from '../../../domain/rentaGains';
import {
  ledgerOf,
  type ImportSummary,
  type InvestType,
  type RentaEffect,
} from '../../../domain/invest/summary';
import { lossesToRecover, recoverOptions, type RecoverYear } from '../../../domain/invest/recover';
import type { RentaInput } from '../../../domain/rentaCalc';
import type { PendingBalance } from '../../../domain/rentaGains';
import { useMoney } from '../shared';
import { RENTA_WEB_RESULT_ID, RentaWebPanel } from './RentaWebPanel';

const LGT = 'https://www.boe.es/buscar/act.php?id=BOE-A-2003-23186';
const LIRPF = 'https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764';
const date = (iso: string) => iso.split('-').reverse().join('/');
/** Today on this device, as YYYY-MM-DD. */
export const today = () => new Date().toISOString().slice(0, 10);

/**
 * «¿Puedo recuperar ese dinero?»: for each year with losses, until which Renta it can be offset,
 * until when its own Renta can be corrected, and what each way could give.
 */
export function RecoverPanel({ list }: { list: RecoverYear[] }) {
  const { t } = useI18n();
  const money = useMoney();
  const k = 'tools.invest.recover';
  if (list.length === 0) return null;
  return (
    <section className="renta-block invest-recover" aria-labelledby="invest-recover-title">
      <h4 id="invest-recover-title">{t(`${k}.title`)}</h4>
      {list.map((r) => (
        <div key={r.year} className="invest-recover-year">
          <p>
            <strong>{t(`${k}.year`, { year: r.year, amount: money(r.loss) })}</strong>
          </p>
          <p>
            {r.offsettable
              ? t(`${k}.offset`, { until: r.offsetUntil, filed: r.offsetUntil + 1 })
              : t(`${k}.offsetGone`, { until: r.offsetUntil })}
            {r.offsettable &&
              r.now !== null &&
              ` ${t(r.now > 0 ? `${k}.now` : `${k}.nowNothing`, { amount: money(r.now) })}`}
          </p>
          {r.correctable ? (
            <>
              <p>
                {t(r.correctBy === 'rectificativa' ? `${k}.correct` : `${k}.correctOld`, {
                  year: r.year,
                  date: date(r.correctUntil),
                  amount: money(r.correctUpTo),
                })}
              </p>
              <p className="section-hint">{t(`${k}.notFiled`, { year: r.year })}</p>
            </>
          ) : (
            <p className="invest-loss-note">
              {t(`${k}.gone`, { year: r.year, date: date(r.correctUntil) })}
            </p>
          )}
        </div>
      ))}
      <p className="section-hint">{t(`${k}.nobody`)}</p>
      <p className="tools-sources">
        {t('tools.invest.guide.source')}{' '}
        <a href={LIRPF} target="_blank" rel="noopener noreferrer">
          {t(`${k}.lirpf`)}
        </a>{' '}
        ·{' '}
        <a href={LGT} target="_blank" rel="noopener noreferrer">
          {t(`${k}.lgt`)}
        </a>
      </p>
    </section>
  );
}

const TYPES: InvestType[] = ['crypto', 'sharesEtf', 'funds', 'derivatives', 'other', 'income'];
const tone = (n: number) => (n < 0 ? 'invest-loss' : n > 0 ? 'invest-gain' : undefined);

/** «Qué ha pasado con tu informe»: investments give gains and losses, not deductions. */
export function WhatHappened() {
  const { t } = useI18n();
  return (
    <div className="renta-block invest-what">
      <h4>{t('tools.invest.sum.whatTitle')}</h4>
      <p>{t('tools.invest.sum.what')}</p>
    </div>
  );
}

/** Losses of earlier years found in the files: they only help if they were declared then. */
function EarlierLosses({ years }: { years: { year: number; result: number }[] }) {
  const { t } = useI18n();
  const money = useMoney();
  if (years.length === 0) return null;
  return (
    <p className="section-hint">
      {t('tools.invest.sum.earlier', {
        list: years.map((y) => `${y.year}: ${money(-y.result)}`).join(', '),
      })}
    </p>
  );
}

/** A loss of this year in plain words: no tax, not off the pay, usable four more years. */
function LossNote({ amount, year }: { amount: number; year: number }) {
  const { t } = useI18n();
  const money = useMoney();
  return (
    <p className="invest-loss-note">
      {t('tools.invest.sum.loss', { amount: money(amount), until: year + 4 })}
    </p>
  );
}

/**
 * The summary at the end of the import: the result of each year (this Renta's first, the others
 * small), by kind, and what it means for the Renta when the engine can work it out.
 */
export function InvestSummary({
  summary,
  year,
  effect,
  recover = [],
  onPending,
}: {
  summary: ImportSummary;
  year: number;
  effect: RentaEffect | null;
  /** «¿Puedo recuperar ese dinero?» for the losses of earlier years. */
  recover?: RecoverYear[];
  /** Takes the losses of earlier years still in time to the planner's pending balances. */
  onPending?: (losses: PendingBalance[]) => void;
}) {
  const { t } = useI18n();
  const money = useMoney();
  const k = 'tools.invest.sum';
  const current = summary.years.find((y) => y.current) as ImportSummary['years'][number];
  const others = summary.years.filter((y) => !y.current);
  return (
    <section className="renta-block invest-summary" aria-labelledby="invest-summary-title">
      <h3 id="invest-summary-title">{t(`${k}.title`)}</h3>
      <p className={`invest-year-total ${tone(current.result) ?? ''}`}>
        {t(`${k}.thisYear`, { year })}: <strong>{money(current.result)}</strong>
      </p>
      <ul className="renta-minimum">
        {TYPES.filter((type) => summary.byType[type] !== 0).map((type) => (
          <li key={type}>
            <span>{t(`${k}.type.${type}`)}</span>
            <strong className={tone(summary.byType[type])}>{money(summary.byType[type])}</strong>
          </li>
        ))}
      </ul>
      {others.length > 0 && (
        <ul className="invest-other-years">
          {others.map((y) => (
            <li key={y.year}>
              <small>
                {y.year}: <span className={tone(y.result)}>{money(y.result)}</span> ·{' '}
                {t(`${k}.otherYear`)}
              </small>
            </li>
          ))}
        </ul>
      )}
      {current.result < 0 && <LossNote amount={-current.result} year={year} />}
      <EarlierLosses years={others.filter((y) => y.year < year && y.result < 0)} />
      {effect && (
        <>
          <h4>{t(`${k}.inRenta`)}</h4>
          <ul className="renta-minimum">
            <li>
              <span>{t(`${k}.base`)}</span>
              <strong>{money(effect.savingsBase)}</strong>
            </li>
            <li>
              <span>{t(`${k}.tax`)}</span>
              <strong>{money(effect.tax)}</strong>
            </li>
            <li>
              <span>
                {t(
                  effect.result > 0 ? `${k}.worse` : effect.result < 0 ? `${k}.better` : `${k}.same`
                )}
              </span>
              <strong className={tone(-effect.result)}>{money(Math.abs(effect.result))}</strong>
            </li>
            {effect.pendingUsed > 0 && (
              <li>
                <span>{t(`${k}.pendingUsed`)}</span>
                <strong>{money(effect.pendingUsed)}</strong>
              </li>
            )}
          </ul>
          {effect.carry.map((c) => (
            <p key={c.year} className="section-hint">
              {t(`${k}.carry`, { amount: money(c.amount), year: c.year, until: c.until })}
            </p>
          ))}
        </>
      )}
      {onPending && recover.some((r) => r.offsettable) && (
        <button
          type="button"
          className="btn-secondary"
          onClick={() =>
            onPending(
              recover.filter((r) => r.offsettable).map((r) => ({ year: r.year, amount: r.loss }))
            )
          }
        >
          {t(`${k}.toPending`)}
        </button>
      )}
      <RecoverPanel list={recover} />
      <WhatHappened />
    </section>
  );
}

/** In the result: the investments of the year, the interest and dividends, and the losses. */
export function InvestInResult({
  breakdown,
  imported,
  year,
  input,
}: {
  breakdown: SavingsBreakdown;
  imported?: ImportedSavings;
  year: number;
  /** The data of the return, to work out what the losses of earlier years can still give. */
  input?: RentaInput;
}) {
  const { t } = useI18n();
  const money = useMoney();
  const k = 'tools.invest.sum';
  const gains = breakdown.boxes['0424'] - breakdown.boxes['0425'];
  const ledger = imported ? ledgerOf(imported) : null;
  const earlier = ledger
    ? Object.entries(ledger.years)
        .map(([y, r]) => ({ year: Number(y), result: r.savings + r.general }))
        .filter((y) => y.year < year && y.result < 0)
    : [];
  return (
    <section className="renta-block invest-in-result">
      <h3>{t(`${k}.resultTitle`)}</h3>
      <ul className="renta-minimum">
        <li>
          <span>{t(`${k}.gains`)}</span>
          <strong className={tone(gains)}>{money(gains)}</strong>
        </li>
        <li>
          <span>{t(`${k}.income`)}</span>
          <strong>{money(breakdown.boxes['0041'])}</strong>
        </li>
      </ul>
      {gains < 0 && <LossNote amount={-gains} year={year} />}
      <EarlierLosses years={earlier} />
      <RecoverPanel
        list={recoverOptions(
          lossesToRecover(earlier, input?.savingsDetail?.pending.gains ?? [], year),
          input ?? null,
          today()
        )}
      />
      {ledger && <RentaWebPanel ledger={ledger} id={RENTA_WEB_RESULT_ID} />}
      <WhatHappened />
    </section>
  );
}
