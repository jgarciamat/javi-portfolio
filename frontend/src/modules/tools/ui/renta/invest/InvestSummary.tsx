import { useI18n } from '@core/i18n/I18nContext';
import type { SavingsBreakdown, ImportedSavings } from '../../../domain/rentaGains';
import {
  ledgerOf,
  type ImportSummary,
  type InvestType,
  type RentaEffect,
} from '../../../domain/invest/summary';
import { useMoney } from '../shared';

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
}: {
  summary: ImportSummary;
  year: number;
  effect: RentaEffect | null;
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
      <WhatHappened />
    </section>
  );
}

/** In the result: the investments of the year, the interest and dividends, and the losses. */
export function InvestInResult({
  breakdown,
  imported,
  year,
}: {
  breakdown: SavingsBreakdown;
  imported?: ImportedSavings;
  year: number;
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
      <WhatHappened />
    </section>
  );
}
