import { useI18n } from '@core/i18n/I18nContext';
import { InvoiceImport } from './InvoiceImport';
import { parseDecimal } from '@shared/utils/numbers';
import {
  EXPENSE_KINDS,
  type ExpenseKind,
  type ManualData,
  type VatRate,
} from '@modules/finances/domain/types';

/** Everything typed by hand, as text, so the fields can be edited freely. */
export interface ManualForm {
  profile: {
    workArea: string;
    homeArea: string;
    vehicleExclusive: boolean;
    healthPeople: string;
    healthDisability: boolean;
  };
  /** The modelo 130 of the earlier quarters is already filed: its totals replace them. */
  prior: { on: boolean; income: string; expenses: string; payments: string; withheld: string };
  quarters: {
    income: { r21: string; r10: string; r4: string; r0: string };
    /** Withholdings that clients applied to the invoices of the quarter. */
    withheld: string;
    expenses: { kind: ExpenseKind; amount: string; vatRate: VatRate; days: string }[];
  }[];
}

type QuarterForm = ManualForm['quarters'][number];
type ExpenseForm = QuarterForm['expenses'][number];

export const emptyManual = (): ManualForm => ({
  profile: {
    workArea: '',
    homeArea: '',
    vehicleExclusive: false,
    healthPeople: '',
    healthDisability: false,
  },
  prior: { on: false, income: '', expenses: '', payments: '', withheld: '' },
  quarters: [0, 1, 2, 3].map(() => ({
    income: { r21: '', r10: '', r4: '', r0: '' },
    withheld: '',
    expenses: [],
  })),
});

const num = (text: string): number => {
  const parsed = parseDecimal(text);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

/** The data the server takes. */
export function toManualData(form: ManualForm): ManualData {
  return {
    profile: {
      workArea: num(form.profile.workArea),
      homeArea: num(form.profile.homeArea),
      vehicleExclusive: form.profile.vehicleExclusive,
      healthPeople: Math.floor(num(form.profile.healthPeople)),
      healthDisability: form.profile.healthDisability,
    },
    quarters: form.quarters.map((q) => ({
      income: {
        r21: num(q.income.r21),
        r10: num(q.income.r10),
        r4: num(q.income.r4),
        r0: num(q.income.r0),
      },
      expenses: q.expenses.map((e) => ({
        kind: e.kind,
        amount: num(e.amount),
        vatRate: e.vatRate,
        days: Math.floor(num(e.days)),
      })),
    })) as ManualData['quarters'],
  };
}

const RATES: VatRate[] = [21, 10, 4, 0];
const INCOME_FIELDS = ['r21', 'r10', 'r4', 'r0'] as const;
const PRIOR_FIELDS = [
  ['income', 'priorIncome'],
  ['expenses', 'priorExpenses'],
  ['payments', 'priorPayments'],
  ['withheld', 'priorWithheld'],
] as const;

/** Office and home areas, people in the health insurance, exclusive vehicle, disability. */
function ProfilePanel({
  profile,
  onChange,
}: {
  profile: ManualForm['profile'];
  onChange: (patch: Partial<ManualForm['profile']>) => void;
}) {
  const { t } = useI18n();
  return (
    <section className="autonomo-panel">
      <h3>{t('app.autonomo.profile')}</h3>
      <div className="autonomo-grid">
        <label className="field">
          <span className="field-label">{t('app.autonomo.workArea')}</span>
          <input
            className="tx-input"
            inputMode="decimal"
            value={profile.workArea}
            onChange={(e) => onChange({ workArea: e.target.value })}
          />
        </label>
        <label className="field">
          <span className="field-label">{t('app.autonomo.homeArea')}</span>
          <input
            className="tx-input"
            inputMode="decimal"
            value={profile.homeArea}
            onChange={(e) => onChange({ homeArea: e.target.value })}
          />
        </label>
        <label className="field">
          <span className="field-label">{t('app.autonomo.healthPeople')}</span>
          <input
            className="tx-input"
            inputMode="numeric"
            value={profile.healthPeople}
            onChange={(e) => onChange({ healthPeople: e.target.value })}
          />
        </label>
      </div>
      <div className="autonomo-checks">
        <label className="renta-check">
          <input
            type="checkbox"
            checked={profile.vehicleExclusive}
            onChange={(e) => onChange({ vehicleExclusive: e.target.checked })}
          />
          <span>{t('app.autonomo.vehicleExclusive')}</span>
        </label>
        <label className="renta-check">
          <input
            type="checkbox"
            checked={profile.healthDisability}
            onChange={(e) => onChange({ healthDisability: e.target.checked })}
          />
          <span>{t('app.autonomo.healthDisability')}</span>
        </label>
      </div>
    </section>
  );
}

/** The totals of the modelo 130 already filed for the earlier quarters. */
function PriorPanel({
  prior,
  onChange,
}: {
  prior: ManualForm['prior'];
  onChange: (patch: Partial<ManualForm['prior']>) => void;
}) {
  const { t } = useI18n();
  return (
    <section className="autonomo-panel">
      <label className="autonomo-option">
        <input
          type="checkbox"
          checked={prior.on}
          onChange={(e) => onChange({ on: e.target.checked })}
        />
        <span>{t('app.autonomo.priorOn')}</span>
      </label>
      {prior.on && (
        <>
          <p className="section-hint">{t('app.autonomo.priorHint')}</p>
          <div className="autonomo-grid">
            {PRIOR_FIELDS.map(([field, key]) => (
              <label key={field} className="field">
                <span className="field-label">{t(`app.autonomo.${key}`)}</span>
                <input
                  className="tx-input"
                  inputMode="decimal"
                  value={prior[field]}
                  onChange={(e) => onChange({ [field]: e.target.value })}
                />
              </label>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

/** One expense: kind, amount, VAT and, for meals, the days. `id` is "quarter.line". */
function ExpenseRow({
  expense,
  id,
  onChange,
  onRemove,
}: {
  expense: ExpenseForm;
  id: string;
  onChange: (patch: Partial<ExpenseForm>) => void;
  onRemove: () => void;
}) {
  const { t } = useI18n();
  return (
    <li>
      <div className="autonomo-expense-top">
        <label className="field autonomo-expense-kind">
          <span className="field-label">{t('app.autonomo.expenseKind')}</span>
          <select
            className="tx-input"
            aria-label={`${t('app.autonomo.expenseKind')} ${id}`}
            value={expense.kind}
            onChange={(e) => onChange({ kind: e.target.value as ExpenseKind })}
          >
            {EXPENSE_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {t(`app.autonomo.kind.${kind}`)}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="btn-secondary autonomo-remove"
          aria-label={`${t('app.common.delete')} ${id}`}
          onClick={onRemove}
        >
          ✕
        </button>
      </div>
      <div className="autonomo-expense-fields">
        <label className="field">
          <span className="field-label">{t('app.autonomo.expenseAmount')}</span>
          <input
            className="tx-input"
            inputMode="decimal"
            aria-label={`${t('app.autonomo.expenseAmount')} ${id}`}
            value={expense.amount}
            onChange={(e) => onChange({ amount: e.target.value })}
          />
        </label>
        <label className="field">
          <span className="field-label">{t('app.autonomo.expenseVat')}</span>
          <select
            className="tx-input"
            aria-label={`${t('app.autonomo.expenseVat')} ${id}`}
            value={expense.vatRate}
            onChange={(e) => onChange({ vatRate: Number(e.target.value) as VatRate })}
          >
            {RATES.map((r) => (
              <option key={r} value={r}>
                {r} %
              </option>
            ))}
          </select>
        </label>
        {expense.kind === 'meals' && (
          <label className="field">
            <span className="field-label">{t('app.autonomo.days')}</span>
            <input
              className="tx-input"
              inputMode="numeric"
              aria-label={`${t('app.autonomo.days')} ${id}`}
              value={expense.days}
              onChange={(e) => onChange({ days: e.target.value })}
            />
          </label>
        )}
      </div>
    </li>
  );
}

/** Income, withholdings and expenses of one quarter (`q` counts from 0). */
function QuarterPanel({
  quarter,
  q,
  onChange,
  onCopyPrevious,
}: {
  quarter: QuarterForm;
  q: number;
  onChange: (patch: Partial<QuarterForm>) => void;
  onCopyPrevious: () => void;
}) {
  const { t } = useI18n();
  const setExpense = (e: number, patch: Partial<ExpenseForm>) =>
    onChange({ expenses: quarter.expenses.map((x, i) => (i === e ? { ...x, ...patch } : x)) });
  return (
    <section className="autonomo-panel">
      <div className="autonomo-panel-head">
        <h3>{t('app.autonomo.quarterN', { n: q + 1 })}</h3>
        {q > 0 && (
          <button type="button" className="btn-secondary" onClick={onCopyPrevious}>
            {t('app.autonomo.copyPrevious', { n: q })}
          </button>
        )}
      </div>
      <h4>{t('app.autonomo.incomeTitle')}</h4>
      <div className="autonomo-grid">
        {INCOME_FIELDS.map((field) => (
          <label key={field} className="field">
            <span className="field-label">{t(`app.autonomo.income.${field}`)}</span>
            <input
              className="tx-input"
              inputMode="decimal"
              aria-label={`${t(`app.autonomo.income.${field}`)} ${q + 1}`}
              value={quarter.income[field]}
              onChange={(e) => onChange({ income: { ...quarter.income, [field]: e.target.value } })}
            />
          </label>
        ))}
        <label className="field">
          <span className="field-label">{t('app.autonomo.withheld')}</span>
          <input
            className="tx-input"
            inputMode="decimal"
            aria-label={`${t('app.autonomo.withheld')} ${q + 1}`}
            value={quarter.withheld}
            onChange={(e) => onChange({ withheld: e.target.value })}
          />
        </label>
      </div>

      <h4>{t('app.autonomo.expensesTitle')}</h4>
      <ul className="autonomo-expenses">
        {quarter.expenses.map((expense, i) => (
          <ExpenseRow
            key={i}
            expense={expense}
            id={`${q + 1}.${i + 1}`}
            onChange={(patch) => setExpense(i, patch)}
            onRemove={() => onChange({ expenses: quarter.expenses.filter((_, j) => j !== i) })}
          />
        ))}
      </ul>
      <button
        type="button"
        className="autonomo-add"
        onClick={() =>
          onChange({
            expenses: [...quarter.expenses, { kind: 'other', amount: '', vatRate: 21, days: '' }],
          })
        }
      >
        + {t('app.autonomo.addExpense')}
      </button>
    </section>
  );
}

/** Income and expenses typed once by hand, with what each kind of expense needs to be deducted. */
export function AutonomoManual({
  form,
  onChange,
  upTo,
  year,
}: {
  form: ManualForm;
  onChange: (form: ManualForm) => void;
  upTo: number;
  year: number;
}) {
  const { t } = useI18n();
  const setProfile = (patch: Partial<ManualForm['profile']>) =>
    onChange({ ...form, profile: { ...form.profile, ...patch } });
  const setQuarter = (index: number, patch: Partial<QuarterForm>) =>
    onChange({
      ...form,
      quarters: form.quarters.map((q, i) => (i === index ? { ...q, ...patch } : q)),
    });
  const copyPrevious = (q: number) =>
    setQuarter(q, {
      income: { ...form.quarters[q - 1].income },
      withheld: form.quarters[q - 1].withheld,
      expenses: form.quarters[q - 1].expenses.map((e) => ({ ...e })),
    });

  const from = form.prior.on && upTo > 1 ? upTo - 1 : 0;
  const setPrior = (patch: Partial<ManualForm['prior']>) =>
    onChange({ ...form, prior: { ...form.prior, ...patch } });

  return (
    <div className="autonomo-manual">
      <p className="section-hint">{t('app.autonomo.manualHint')}</p>

      <InvoiceImport form={form} year={year} onChange={onChange} />

      <ProfilePanel profile={form.profile} onChange={setProfile} />

      {upTo > 1 && <PriorPanel prior={form.prior} onChange={setPrior} />}

      {form.quarters
        .slice(0, upTo)
        .map((quarter, q) =>
          q < from ? null : (
            <QuarterPanel
              key={q}
              quarter={quarter}
              q={q}
              onChange={(patch) => setQuarter(q, patch)}
              onCopyPrevious={() => copyPrevious(q)}
            />
          )
        )}
    </div>
  );
}
