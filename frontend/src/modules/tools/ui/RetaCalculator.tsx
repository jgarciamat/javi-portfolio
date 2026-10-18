import { useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import {
  LGSS_URL,
  RETA_BRACKETS_2026,
  RETA_LAW_URL,
  RETA_ORDER_URL,
  RETA_RATE_2026,
  RETA_RATE_PARTS_2026,
  RETA_SOURCE_DATE,
} from '../data/reta2026';
import {
  feeOf,
  monthlyNetOf,
  retaQuote,
  type RetaPerson,
  type RetaQuote,
} from '../domain/retaCalc';
import { CalculatorLayout, NumberField, SelectField, number, useMoney } from './CalculatorLayout';
import { Breakdown, CheckField, Sources, usePercent } from './calculatorParts';

type Mode = 'monthly' | 'yearly';

interface RetaForm {
  mode: Mode;
  monthly: string;
  income: string;
  expenses: string;
  person: RetaPerson;
  flatRate: boolean;
}

const START: RetaForm = {
  mode: 'monthly',
  monthly: '2000',
  income: '36000',
  expenses: '12000',
  person: 'individual',
  flatRate: false,
};

type Set = <K extends keyof RetaForm>(key: K) => (value: RetaForm[K]) => void;

function RetaFields({ form, set }: { form: RetaForm; set: Set }) {
  const { t } = useI18n();
  return (
    <div className="tools-form">
      <SelectField
        id="reta-mode"
        label={t('tools.reta.mode')}
        value={form.mode}
        onChange={(v) => set('mode')(v as Mode)}
        options={(['monthly', 'yearly'] as const).map((value) => ({
          value,
          label: t(`tools.reta.mode.${value}`),
        }))}
      />
      {form.mode === 'monthly' ? (
        <NumberField
          id="reta-monthly"
          label={t('tools.reta.monthlyNet')}
          value={form.monthly}
          onChange={set('monthly')}
          suffix="€"
        />
      ) : (
        <>
          <NumberField
            id="reta-income"
            label={t('tools.reta.income')}
            value={form.income}
            onChange={set('income')}
            suffix="€"
          />
          <NumberField
            id="reta-expenses"
            label={t('tools.reta.expenses')}
            value={form.expenses}
            onChange={set('expenses')}
            suffix="€"
          />
        </>
      )}
      <SelectField
        id="reta-person"
        label={t('tools.reta.person')}
        value={form.person}
        onChange={(v) => set('person')(v as RetaPerson)}
        options={(['individual', 'company'] as const).map((value) => ({
          value,
          label: t(`tools.reta.person.${value}`),
        }))}
      />
      <CheckField
        label={t('tools.reta.flatRate')}
        checked={form.flatRate}
        onChange={set('flatRate')}
      />
    </div>
  );
}

function RetaCards({ quote }: { quote: RetaQuote }) {
  const { t } = useI18n();
  const money = useMoney(true);
  const { bracket } = quote;
  return (
    <>
      <div className="tools-results" aria-live="polite">
        <section className="tools-result tools-result--saving">
          <h2>{t('tools.reta.fee')}</h2>
          <p className="tools-amount">{money(quote.flatFee ?? quote.feeMin)}</p>
          <p className="plan-note">
            {quote.flatFee === null
              ? t('tools.reta.feeHint', { max: money(quote.feeMax) })
              : t('tools.reta.flatHint', { fee: money(quote.feeMin) })}
          </p>
        </section>
        <section className="tools-result">
          <h2>{t('tools.reta.bracket')}</h2>
          <p className="tools-amount">
            {t(`tools.reta.bracket.${bracket.id[0]}`, { n: bracket.id.slice(1) })}
          </p>
          <p className="plan-note">
            {t('tools.reta.computable', { amount: money(quote.computable) })}
          </p>
        </section>
        <section className="tools-result">
          <h2>{t('tools.reta.bases')}</h2>
          <p className="tools-amount">
            {money(bracket.baseMin)} – {money(bracket.baseMax)}
          </p>
        </section>
      </div>
      {quote.flatRateExtension && <p className="plan-note">{t('tools.reta.extension')}</p>}
    </>
  );
}

function RetaBreakdown({ quote, monthlyNet }: { quote: RetaQuote; monthlyNet: number }) {
  const { t } = useI18n();
  const money = useMoney(true);
  const percent = usePercent();
  const parts = Object.values(RETA_RATE_PARTS_2026).map(percent).join(' + ');
  return (
    <Breakdown
      rows={[
        [t('tools.reta.row.net'), money(Math.max(0, monthlyNet))],
        [
          `${t('tools.reta.row.deduction')} (${percent(quote.deductionRate * 100)})`,
          `− ${money(quote.deduction)}`,
        ],
        [t('tools.reta.row.computable'), money(quote.computable), true],
        [t('tools.reta.row.rate'), `${parts} = ${percent(RETA_RATE_2026 * 100)}`],
        [t('tools.reta.row.feeMin'), money(quote.feeMin)],
        [t('tools.reta.row.feeMax'), money(quote.feeMax)],
      ]}
    />
  );
}

function RetaTable({ current }: { current: string }) {
  const { t } = useI18n();
  const money = useMoney(true);
  return (
    <>
      <h2>{t('tools.reta.tableTitle')}</h2>
      <div className="tools-scroll">
        <table className="pricing-table">
          <thead>
            <tr>
              <th>{t('tools.reta.bracket')}</th>
              <th>{t('tools.reta.col.income')}</th>
              <th>{t('tools.reta.col.base')}</th>
              <th>{t('tools.reta.col.fee')}</th>
            </tr>
          </thead>
          <tbody>
            {RETA_BRACKETS_2026.map((b) => (
              <tr key={b.id} className={b.id === current ? 'tools-row-current' : undefined}>
                <td>{b.id}</td>
                <td>
                  {b.to === null
                    ? t('tools.reta.over', { from: money(b.from) })
                    : t(b.toExclusive ? 'tools.reta.below' : 'tools.reta.upTo', {
                        to: money(b.to),
                      })}
                </td>
                <td>
                  {money(b.baseMin)} – {money(b.baseMax)}
                </td>
                <td>
                  {money(feeOf(b.baseMin))} – {money(feeOf(b.baseMax))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/** Monthly self-employed contribution of 2026 from the net income. */
export function RetaCalculatorPage() {
  const { t } = useI18n();
  const [form, setForm] = useState<RetaForm>(START);
  const set: Set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const monthlyNet =
    form.mode === 'monthly'
      ? number(form.monthly)
      : monthlyNetOf(number(form.income), number(form.expenses));
  const quote = retaQuote({ monthlyNet, person: form.person, flatRate: form.flatRate });
  return (
    <CalculatorLayout
      path="/calculadora-cuota-autonomos"
      titleKey="tools.reta.title"
      descriptionKey="tools.reta.description"
    >
      <RetaFields form={form} set={set} />
      <p className="plan-note">{t('tools.reta.expensesHint')}</p>
      <RetaCards quote={quote} />
      <RetaBreakdown quote={quote} monthlyNet={monthlyNet} />
      <RetaTable current={quote.bracket.id} />
      <p className="plan-note">{t('tools.reta.disclaimer')}</p>
      <Sources
        prefix="tools.reta"
        links={[RETA_ORDER_URL, LGSS_URL, RETA_LAW_URL]}
        date={RETA_SOURCE_DATE}
      />
    </CalculatorLayout>
  );
}
