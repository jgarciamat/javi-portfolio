import { useI18n } from '@core/i18n/I18nContext';
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
  quarters: {
    income: { r21: string; r10: string; r4: string; r0: string };
    /** Withholdings that clients applied to the invoices of the quarter. */
    withheld: string;
    expenses: { kind: ExpenseKind; amount: string; vatRate: VatRate; days: string }[];
  }[];
}

export const emptyManual = (): ManualForm => ({
  profile: {
    workArea: '',
    homeArea: '',
    vehicleExclusive: false,
    healthPeople: '',
    healthDisability: false,
  },
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

/** Income and expenses typed once by hand, with what each kind of expense needs to be deducted. */
export function AutonomoManual({
  form,
  onChange,
  upTo,
}: {
  form: ManualForm;
  onChange: (form: ManualForm) => void;
  upTo: number;
}) {
  const { t } = useI18n();
  const setProfile = (patch: Partial<ManualForm['profile']>) =>
    onChange({ ...form, profile: { ...form.profile, ...patch } });
  const setQuarter = (index: number, patch: Partial<ManualForm['quarters'][number]>) =>
    onChange({
      ...form,
      quarters: form.quarters.map((q, i) => (i === index ? { ...q, ...patch } : q)),
    });
  const setExpense = (
    q: number,
    e: number,
    patch: Partial<ManualForm['quarters'][number]['expenses'][number]>
  ) =>
    setQuarter(q, {
      expenses: form.quarters[q].expenses.map((x, i) => (i === e ? { ...x, ...patch } : x)),
    });

  return (
    <div className="autonomo-manual">
      <p className="section-hint">{t('app.autonomo.manualHint')}</p>

      <section className="autonomo-panel">
        <h3>{t('app.autonomo.profile')}</h3>
        <div className="autonomo-grid">
          <label className="field">
            <span className="field-label">{t('app.autonomo.workArea')}</span>
            <input
              className="tx-input"
              inputMode="decimal"
              value={form.profile.workArea}
              onChange={(e) => setProfile({ workArea: e.target.value })}
            />
          </label>
          <label className="field">
            <span className="field-label">{t('app.autonomo.homeArea')}</span>
            <input
              className="tx-input"
              inputMode="decimal"
              value={form.profile.homeArea}
              onChange={(e) => setProfile({ homeArea: e.target.value })}
            />
          </label>
          <label className="field">
            <span className="field-label">{t('app.autonomo.healthPeople')}</span>
            <input
              className="tx-input"
              inputMode="numeric"
              value={form.profile.healthPeople}
              onChange={(e) => setProfile({ healthPeople: e.target.value })}
            />
          </label>
        </div>
        <div className="autonomo-checks">
          <label className="renta-check">
            <input
              type="checkbox"
              checked={form.profile.vehicleExclusive}
              onChange={(e) => setProfile({ vehicleExclusive: e.target.checked })}
            />
            <span>{t('app.autonomo.vehicleExclusive')}</span>
          </label>
          <label className="renta-check">
            <input
              type="checkbox"
              checked={form.profile.healthDisability}
              onChange={(e) => setProfile({ healthDisability: e.target.checked })}
            />
            <span>{t('app.autonomo.healthDisability')}</span>
          </label>
        </div>
      </section>

      {form.quarters.slice(0, upTo).map((quarter, q) => (
        <section key={q} className="autonomo-panel">
          <h3>{t('app.autonomo.quarterN', { n: q + 1 })}</h3>
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
                  onChange={(e) =>
                    setQuarter(q, { income: { ...quarter.income, [field]: e.target.value } })
                  }
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
                onChange={(e) => setQuarter(q, { withheld: e.target.value })}
              />
            </label>
          </div>

          <h4>{t('app.autonomo.expensesTitle')}</h4>
          <ul className="autonomo-expenses">
            {quarter.expenses.map((expense, i) => (
              <li key={i}>
                <div className="autonomo-expense-top">
                  <label className="field autonomo-expense-kind">
                    <span className="field-label">{t('app.autonomo.expenseKind')}</span>
                    <select
                      className="tx-input"
                      aria-label={`${t('app.autonomo.expenseKind')} ${q + 1}.${i + 1}`}
                      value={expense.kind}
                      onChange={(e) => setExpense(q, i, { kind: e.target.value as ExpenseKind })}
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
                    aria-label={`${t('app.common.delete')} ${q + 1}.${i + 1}`}
                    onClick={() =>
                      setQuarter(q, { expenses: quarter.expenses.filter((_, j) => j !== i) })
                    }
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
                      aria-label={`${t('app.autonomo.expenseAmount')} ${q + 1}.${i + 1}`}
                      value={expense.amount}
                      onChange={(e) => setExpense(q, i, { amount: e.target.value })}
                    />
                  </label>
                  <label className="field">
                    <span className="field-label">{t('app.autonomo.expenseVat')}</span>
                    <select
                      className="tx-input"
                      aria-label={`${t('app.autonomo.expenseVat')} ${q + 1}.${i + 1}`}
                      value={expense.vatRate}
                      onChange={(e) =>
                        setExpense(q, i, { vatRate: Number(e.target.value) as VatRate })
                      }
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
                        aria-label={`${t('app.autonomo.days')} ${q + 1}.${i + 1}`}
                        value={expense.days}
                        onChange={(e) => setExpense(q, i, { days: e.target.value })}
                      />
                    </label>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="autonomo-add"
            onClick={() =>
              setQuarter(q, {
                expenses: [
                  ...quarter.expenses,
                  { kind: 'other', amount: '', vatRate: 21, days: '' },
                ],
              })
            }
          >
            + {t('app.autonomo.addExpense')}
          </button>
        </section>
      ))}
    </div>
  );
}
