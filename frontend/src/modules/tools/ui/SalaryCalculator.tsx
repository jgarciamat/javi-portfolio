import { useEffect, useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { CCAA_OPTIONS, loadCcaa } from '../data/renta';
import {
  EMPLOYEE_RATES_2026,
  PAYROLL_ORDER_URL,
  PAYROLL_SOURCE_DATE,
  SMI_DEDUCTION_URL,
  WITHHOLDING_ALGORITHM_URL,
  type FamilySituation,
} from '../data/payroll2026';
import type { RentaCcaa } from '../domain/rentaData';
import type { Disability } from '../domain/rentaCalc';
import {
  netSalary,
  rentaEstimate,
  type ContractType,
  type NetSalary,
  type SalaryInput,
} from '../domain/salaryCalc';
import { CalculatorLayout, NumberField, SelectField, number, useMoney } from './CalculatorLayout';
import { Breakdown, CheckField, Sources, rowsOf, usePercent } from './calculatorParts';

interface SalaryForm {
  gross: string;
  payments: string;
  age: string;
  situation: string;
  children: string;
  under3: string;
  shared: boolean;
  disability: string;
  contract: ContractType;
  ccaa: string;
}

const START: SalaryForm = {
  gross: '30000',
  payments: '14',
  age: '35',
  situation: '3',
  children: '0',
  under3: '0',
  shared: false,
  disability: '0',
  contract: 'indefinite',
  ccaa: '',
};

const inputOf = (f: SalaryForm): SalaryInput => ({
  gross: number(f.gross),
  payments: f.payments === '12' ? 12 : 14,
  age: number(f.age),
  situation: Number(f.situation) as FamilySituation,
  children: number(f.children),
  under3: number(f.under3),
  sharedChildren: f.shared,
  disability: Number(f.disability) as Disability,
  contract: f.contract,
});

type Set = <K extends keyof SalaryForm>(key: K) => (value: SalaryForm[K]) => void;

function SalaryFields({ form, set }: { form: SalaryForm; set: Set }) {
  const { t } = useI18n();
  const options = (keys: readonly string[], prefix: string) =>
    keys.map((value) => ({ value, label: t(`${prefix}.${value}`) }));
  return (
    <div className="tools-form">
      <NumberField
        id="salary-gross"
        label={t('tools.salary.gross')}
        value={form.gross}
        onChange={set('gross')}
        suffix="€"
      />
      <SelectField
        id="salary-payments"
        label={t('tools.salary.payments')}
        value={form.payments}
        onChange={set('payments')}
        options={[
          { value: '14', label: t('tools.salary.payments14') },
          { value: '12', label: t('tools.salary.payments12') },
        ]}
      />
      <NumberField
        id="salary-age"
        label={t('tools.salary.age')}
        value={form.age}
        onChange={set('age')}
      />
      <SelectField
        id="salary-contract"
        label={t('tools.salary.contract')}
        value={form.contract}
        onChange={(v) => set('contract')(v as ContractType)}
        options={options(['indefinite', 'temporary', 'short'], 'tools.salary.contract')}
      />
      <SelectField
        id="salary-situation"
        label={t('tools.salary.situation')}
        value={form.situation}
        onChange={set('situation')}
        options={options(['3', '2', '1'], 'tools.salary.situation')}
      />
      <NumberField
        id="salary-children"
        label={t('tools.salary.children')}
        value={form.children}
        onChange={set('children')}
      />
      <NumberField
        id="salary-under3"
        label={t('tools.salary.under3')}
        value={form.under3}
        onChange={set('under3')}
      />
      <SelectField
        id="salary-disability"
        label={t('tools.salary.disability')}
        value={form.disability}
        onChange={set('disability')}
        options={options(['0', '33', '65'], 'tools.renta.disability')}
      />
      <SelectField
        id="salary-ccaa"
        label={t('tools.salary.ccaa')}
        value={form.ccaa}
        onChange={set('ccaa')}
        options={[
          { value: '', label: t('tools.renta.chooseCcaa') },
          ...CCAA_OPTIONS.map((c) => ({ value: c.id, label: c.name })),
        ]}
      />
      <CheckField label={t('tools.salary.shared')} checked={form.shared} onChange={set('shared')} />
    </div>
  );
}

function SalaryCards({ result }: { result: NetSalary }) {
  const { t } = useI18n();
  const money = useMoney(true);
  const percent = usePercent();
  const { socialSecurity: ss, withholding: irpf } = result;
  return (
    <>
      <div className="tools-results" aria-live="polite">
        <section className="tools-result tools-result--saving">
          <h2>{t('tools.salary.monthly')}</h2>
          <p className="tools-amount">{money(result.regularPayment)}</p>
          <p className="plan-note">
            {result.extraPayment === null
              ? t('tools.salary.monthlyHint12')
              : t('tools.salary.monthlyHint14', { extra: money(result.extraPayment) })}
          </p>
        </section>
        <section className="tools-result">
          <h2>{t('tools.salary.yearly')}</h2>
          <p className="tools-amount">{money(result.yearlyNet)}</p>
        </section>
        <section className="tools-result">
          <h2>{t('tools.salary.irpf')}</h2>
          <p className="tools-amount">{percent(irpf.rate)}</p>
          <p className="plan-note">{money(irpf.amount)}</p>
        </section>
        <section className="tools-result">
          <h2>{t('tools.salary.ss')}</h2>
          <p className="tools-amount">{money(ss.total)}</p>
        </section>
      </div>
      {irpf.exempt && (
        <p className="plan-note">
          {t('tools.salary.note.exempt', { limit: money(irpf.exemptLimit) })}
        </p>
      )}
      {irpf.capped && <p className="plan-note">{t('tools.salary.note.capped')}</p>}
      {irpf.minimumRate && <p className="plan-note">{t('tools.salary.note.minimumRate')}</p>}
      {ss.solidarity > 0 && <p className="plan-note">{t('tools.salary.note.solidarity')}</p>}
    </>
  );
}

function SalaryBreakdown({ result }: { result: NetSalary }) {
  const { t } = useI18n();
  const money = useMoney(true);
  const percent = usePercent();
  const { socialSecurity: ss, withholding: irpf } = result;
  const r = EMPLOYEE_RATES_2026;
  const minus = (n: number) => `− ${money(n)}`;
  return (
    <>
      <h2>{t('tools.salary.ssTitle')}</h2>
      <Breakdown
        rows={rowsOf(
          [t('tools.salary.row.base'), money(ss.monthlyBase)],
          [`${t('tools.salary.row.common')} (${percent(r.common)})`, money(ss.common)],
          [
            `${t('tools.salary.row.unemployment')} (${percent(ss.unemploymentRate)})`,
            money(ss.unemployment),
          ],
          [`${t('tools.salary.row.training')} (${percent(r.training)})`, money(ss.training)],
          [`${t('tools.salary.row.mei')} (${percent(r.mei)})`, money(ss.mei)],
          ss.solidarity > 0 && [t('tools.salary.row.solidarity'), money(ss.solidarity)],
          [t('tools.salary.row.ssTotal'), money(ss.total), true]
        )}
      />
      <h2>{t('tools.salary.irpfTitle')}</h2>
      <Breakdown
        rows={rowsOf(
          [t('tools.salary.row.netIncome'), money(irpf.netIncome)],
          [t('tools.salary.row.otherExpenses'), minus(irpf.otherExpenses)],
          [t('tools.salary.row.workReduction'), minus(irpf.workReduction)],
          irpf.childrenReduction > 0 && [
            t('tools.salary.row.childrenReduction'),
            minus(irpf.childrenReduction),
          ],
          [t('tools.salary.row.base2'), money(irpf.base)],
          [t('tools.salary.row.minimum'), money(irpf.minimum.total)],
          [t('tools.salary.row.quota'), money(irpf.quota)],
          [t('tools.salary.row.rate'), percent(irpf.rate)],
          [t('tools.salary.row.withheld'), money(irpf.amount), true]
        )}
      />
    </>
  );
}

/** The data of the chosen community, loaded on demand (null while loading or with none chosen). */
function useCcaa(id: string): { ccaa: RentaCcaa | null; failed: boolean } {
  const [state, setState] = useState<{ id: string; ccaa: RentaCcaa | null; failed: boolean }>({
    id: '',
    ccaa: null,
    failed: false,
  });
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    loadCcaa(id)
      .then((ccaa) => !cancelled && setState({ id, ccaa, failed: false }))
      .catch(() => !cancelled && setState({ id, ccaa: null, failed: true }));
    return () => {
      cancelled = true;
    };
  }, [id]);
  return state.id === id ? state : { ccaa: null, failed: false };
}

function RentaBox({ result, ccaaId }: { result: NetSalary; ccaaId: string }) {
  const { t } = useI18n();
  const money = useMoney(true);
  const { ccaa, failed } = useCcaa(ccaaId);
  const message = (key: string) => <p className="plan-note">{t(`tools.salary.renta.${key}`)}</p>;
  let body;
  if (!ccaaId) body = message('choose');
  else if (failed) body = message('error');
  else if (!ccaa) body = message('loading');
  else if (ccaa.regime === 'foral') body = message('foral');
  else {
    const e = rentaEstimate(result, ccaa);
    body = (
      <>
        <Breakdown
          rows={rowsOf(
            [t('tools.salary.renta.base'), money(e.base)],
            [t('tools.salary.renta.state'), money(e.stateQuota)],
            [t('tools.salary.renta.regional', { name: ccaa.name }), money(e.regionalQuota)],
            e.smiDeduction > 0 && [t('tools.salary.renta.smi'), `− ${money(e.smiDeduction)}`],
            [t('tools.salary.renta.quota'), money(e.quota), true],
            [t('tools.salary.row.withheld'), money(result.withholding.amount)]
          )}
        />
        <p className="tools-amount">
          {e.difference >= 0
            ? t('tools.salary.renta.refund', { amount: money(e.difference) })
            : t('tools.salary.renta.pay', { amount: money(-e.difference) })}
        </p>
        {message('note')}
      </>
    );
  }
  return (
    <section className="tools-result">
      <h2>{t('tools.salary.rentaTitle')}</h2>
      {body}
    </section>
  );
}

/** Gross yearly salary → net per payment and per year, with Social Security and income tax. */
export function SalaryCalculatorPage() {
  const { t } = useI18n();
  const [form, setForm] = useState<SalaryForm>(START);
  const set: Set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const result = netSalary(inputOf(form));
  return (
    <CalculatorLayout
      path="/calculadora-sueldo-neto"
      titleKey="tools.salary.title"
      descriptionKey="tools.salary.description"
    >
      <SalaryFields form={form} set={set} />
      <SalaryCards result={result} />
      <SalaryBreakdown result={result} />
      <RentaBox result={result} ccaaId={form.ccaa} />
      <p className="plan-note">{t('tools.salary.disclaimer')}</p>
      <Sources
        prefix="tools.salary"
        links={[PAYROLL_ORDER_URL, WITHHOLDING_ALGORITHM_URL, SMI_DEDUCTION_URL]}
        date={PAYROLL_SOURCE_DATE}
      />
    </CalculatorLayout>
  );
}
