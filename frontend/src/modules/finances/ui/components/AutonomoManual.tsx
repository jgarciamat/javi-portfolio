import { useState, type ReactNode } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { isClosedQuarter } from '@modules/finances/domain/closedQuarter';
import { todayDateOnly } from '@shared/utils/format';
import { AutonomoImport } from './AutonomoImport';
import { ClosedQuarterNotice } from './AutonomoClosedQuarter';
import { InvoiceReview, type ReviewFocus } from './InvoiceReview';
import { StepSection } from './AutonomoSteps';
import { emptyWithholdings, type WithholdingForm } from './withholdingForm';
import { WithholdingsForm } from './AutonomoWithholdings';
import { QuarterVatPanel } from './AutonomoVatQuarter';
import { toQuarterVat, vatOfForm, type VatExtras, type VatForm } from './vatForm';
import type { ImportedInvoice } from '@modules/finances/domain/invoiceLedger';
import { parseDecimal } from '@shared/utils/numbers';
import type { ActivityForm } from './activityForm';
import {
  EXPENSE_KINDS,
  PURCHASE_OPS,
  DEDUCTION_USES,
  type DeductionUse,
  type ExpenseKind,
  type ManualData,
  type PurchaseOp,
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
    expenses: {
      kind: ExpenseKind;
      amount: string;
      vatRate: VatRate;
      days: string;
      /** What the purchase is for VAT (absent: domestic), investment good, use for the prorrata. */
      op?: PurchaseOp;
      investment?: boolean;
      use?: DeductionUse;
    }[];
    /** The VAT of the quarter beyond the invoices with VAT (older data has none). */
    vat?: VatForm;
  }[];
  /** The invoices imported from the books: the quarters they bring are worked out from them. */
  invoices: ImportedInvoice[];
  /** The figures of the last modelo 130 imported, to check them against the invoices. */
  model130: Model130Figures | null;
  /** Employees, professionals and rent of each quarter, for the modelos 111 and 115 (older data has none). */
  withholdings?: WithholdingForm[];
  /** Results (box 71) of the modelos 303 imported, by quarter: the 390 is reconciled with them. */
  filed303?: (number | null)[];
  /**
   * Box 07 of each modelo 130 as filed, typed (older data has none; box 19 is `activity.paid130`).
   * Box 05 of the next quarters takes it instead of the one worked out again.
   */
  filed130?: string[];
  /** Assets, grants and the other annual figures of the activity (older data has none). */
  activity?: ActivityForm;
}

/** Accumulated income and expenses (boxes 01 and 02) of a filed modelo 130. */
export interface Model130Figures {
  year: number;
  quarter: 1 | 2 | 3;
  income: number;
  expenses: number;
}

/** The options of the draft typed outside the quarters. */
export interface Extras {
  hardToJustify: boolean;
  exempt: boolean;
  priorNet: string;
  /** VAT left to offset at the start of the year (box 110 of the first quarter). */
  toOffset: string;
  /** The VAT of the year: prorrata, investment goods, refund… (older data has none). */
  vat?: VatExtras;
}

export const NO_EXTRAS: Extras = {
  hardToJustify: false,
  exempt: false,
  priorNet: '',
  toOffset: '',
};

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
  invoices: [],
  model130: null,
  withholdings: emptyWithholdings(),
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
    quarters: form.quarters.map((q) => {
      const vat = toQuarterVat(q.vat);
      return {
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
          ...(e.op && e.op !== 'domestic' ? { op: e.op } : {}),
          ...(e.investment ? { investment: true } : {}),
          ...(e.use && e.use !== 'common' ? { use: e.use } : {}),
        })),
        ...(vat ? { vat } : {}),
      };
    }) as ManualData['quarters'],
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
export function ProfilePanel({
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
export function PriorPanel({
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
  special,
  onChange,
  onRemove,
}: {
  expense: ExpenseForm;
  id: string;
  /** The special prorrata is on: each purchase says what it is used for. */
  special: boolean;
  onChange: (patch: Partial<ExpenseForm>) => void;
  onRemove: () => void;
}) {
  const { t } = useI18n();
  // Without Spanish VAT on the invoice, the amount to type is its base.
  const amountLabel =
    expense.op && expense.op !== 'domestic'
      ? t('app.autonomo.vatOp.base')
      : t('app.autonomo.expenseAmount');
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
          <span className="field-label">{amountLabel}</span>
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
        <label className="field">
          <span className="field-label">{t('app.autonomo.vatOp.label')}</span>
          <select
            className="tx-input"
            aria-label={`${t('app.autonomo.vatOp.label')} ${id}`}
            value={expense.op ?? 'domestic'}
            onChange={(e) => onChange({ op: e.target.value as PurchaseOp })}
          >
            {PURCHASE_OPS.map((op) => (
              <option key={op} value={op}>
                {t(`app.autonomo.vatOp.purchase.${op}`)}
              </option>
            ))}
          </select>
        </label>
        {special && (
          <label className="field">
            <span className="field-label">{t('app.autonomo.vatUse.label')}</span>
            <select
              className="tx-input"
              aria-label={`${t('app.autonomo.vatUse.label')} ${id}`}
              value={expense.use ?? 'common'}
              onChange={(e) => onChange({ use: e.target.value as DeductionUse })}
            >
              {DEDUCTION_USES.map((use) => (
                <option key={use} value={use}>
                  {t(`app.autonomo.vatUse.${use}`)}
                </option>
              ))}
            </select>
          </label>
        )}
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
      <label className="renta-check autonomo-investment">
        <input
          type="checkbox"
          aria-label={`${t('app.autonomo.vatOp.investment')} ${id}`}
          checked={Boolean(expense.investment)}
          onChange={(e) => onChange({ investment: e.target.checked })}
        />
        <span>{t('app.autonomo.vatOp.investment')}</span>
      </label>
      {expense.investment && (
        <small className="autonomo-hint">{t('app.autonomo.vatOp.investmentHint')}</small>
      )}
    </li>
  );
}

/** Box 07 of the 130 filed for a quarter is typed (box 71 of the 303 also comes from imports). */
const hasFiled = (form: ManualForm, q: number): boolean => (form.filed130?.[q] ?? '').trim() !== '';

/** Income, withholdings and expenses of one quarter (`q` counts from 0). */
function QuarterPanel({
  quarter,
  q,
  vatExtras,
  year,
  onChange: change,
  onCopyPrevious: copy,
  closed,
}: {
  quarter: QuarterForm;
  q: number;
  /** The VAT of the year: special prorrata and cash accounting show more fields. */
  vatExtras: VatExtras | undefined;
  year: number;
  onChange: (patch: Partial<QuarterForm>) => void;
  onCopyPrevious: () => void;
  /** Its filing period is over: the whole form, to keep what was filed (null: still open). */
  closed: { form: ManualForm; onChange: (form: ManualForm) => void } | null;
}) {
  const { t } = useI18n();
  // The notice comes once the person changes the quarter here (an import is not a change), or when
  // what was filed is already typed.
  const [edited, setEdited] = useState(false);
  const onChange = (patch: Partial<QuarterForm>) => {
    setEdited(true);
    change(patch);
  };
  const onCopyPrevious = () => {
    setEdited(true);
    copy();
  };
  const notice = closed !== null && (edited || hasFiled(closed.form, q));
  const setExpense = (e: number, patch: Partial<ExpenseForm>) =>
    onChange({ expenses: quarter.expenses.map((x, i) => (i === e ? { ...x, ...patch } : x)) });
  return (
    <section className="autonomo-panel" id={`autonomo-quarter-${q + 1}`}>
      <div className="autonomo-panel-head">
        <h3 tabIndex={-1}>{t('app.autonomo.quarterN', { n: q + 1 })}</h3>
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
            special={Boolean(vatExtras?.special)}
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
      <QuarterVatPanel
        q={q}
        year={year}
        vat={vatOfForm(quarter.vat)}
        cashBasis={Boolean(vatExtras?.cashBasis)}
        onChange={(vat) => onChange({ vat })}
      />
      {notice && <ClosedQuarterNotice q={q} form={closed.form} onChange={closed.onChange} />}
    </section>
  );
}

/** The first quarter on screen (from 0): only the last one when the filed modelo 130 is on. */
export const firstQuarterShown = (form: ManualForm, upTo: number): number =>
  form.prior.on && upTo > 1 ? upTo - 1 : 0;

/**
 * The quarters up to the one of the draft (only that one when the filed modelo 130 is on): income,
 * withholdings, expenses and VAT, each with a way to copy the one before.
 */
export function QuarterPanels({
  form,
  onChange,
  upTo,
  year,
  vatExtras,
  only,
}: {
  form: ManualForm;
  onChange: (form: ManualForm) => void;
  upTo: number;
  year: number;
  vatExtras?: VatExtras;
  /** Only this quarter (1 to 4): the assistant shows one per screen. */
  only?: number;
}) {
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
  const from = firstQuarterShown(form, upTo);
  const today = todayDateOnly();
  return (
    <>
      {form.quarters
        .slice(0, upTo)
        .map((quarter, q) =>
          q < from || (only !== undefined && q !== only - 1) ? null : (
            <QuarterPanel
              key={q}
              quarter={quarter}
              q={q}
              vatExtras={vatExtras}
              year={year}
              onChange={(patch) => setQuarter(q, patch)}
              onCopyPrevious={() => copyPrevious(q)}
              closed={
                isClosedQuarter(year, (q + 1) as 1 | 2 | 3 | 4, today) ? { form, onChange } : null
              }
            />
          )
        )}
    </>
  );
}

/**
 * Steps 1 and 2 of the screen: bringing the data in (the import, the person's situation and the
 * filed modelo 130) and reviewing it (the imported invoices, the warnings, the quarters typed by
 * hand or worked out from the invoices, and the other options).
 */
export function AutonomoManual({
  form,
  onChange,
  upTo,
  year,
  years,
  onPeriod,
  focus = null,
  checks = null,
  extras = null,
  vatExtras,
  onShow,
  onCarry,
}: {
  form: ManualForm;
  onChange: (form: ManualForm) => void;
  upTo: number;
  year: number;
  years: readonly number[];
  onPeriod: (year: number, quarter: 1 | 2 | 3 | 4) => void;
  /** An imported invoice to show in the review (a warning asked for it). */
  focus?: ReviewFocus | null;
  /** «Before you calculate», between the invoices and the quarters. */
  checks?: ReactNode;
  /** The other options of the draft, after the quarters. */
  extras?: ReactNode;
  /** The VAT of the year, which decides some fields of the quarters. */
  vatExtras?: VatExtras;
  /** Opens an imported invoice in the review (from the result of its file). */
  onShow?: (id: string) => void;
  /** What the 390 of last year hands to this one. */
  onCarry?: (carry: { toOffset: string; provisional: string | null }) => void;
}) {
  const { t } = useI18n();
  const setProfile = (patch: Partial<ManualForm['profile']>) =>
    onChange({ ...form, profile: { ...form.profile, ...patch } });
  const setPrior = (patch: Partial<ManualForm['prior']>) =>
    onChange({ ...form, prior: { ...form.prior, ...patch } });

  return (
    <>
      <StepSection step="bring">
        <AutonomoImport
          form={form}
          year={year}
          years={years}
          onChange={onChange}
          onPeriod={onPeriod}
          onShow={onShow}
          onCarry={onCarry}
        />
        <ProfilePanel profile={form.profile} onChange={setProfile} />
        {upTo > 1 && <PriorPanel prior={form.prior} onChange={setPrior} />}
      </StepSection>

      <StepSection step="review">
        <InvoiceReview form={form} onChange={onChange} focus={focus} />
        {checks}
        <p className="section-hint">{t('app.autonomo.manualHint')}</p>
        <QuarterPanels
          form={form}
          onChange={onChange}
          upTo={upTo}
          year={year}
          vatExtras={vatExtras}
        />
        <WithholdingsForm form={form} onChange={onChange} year={year} upTo={upTo} />
        {extras}
      </StepSection>
    </>
  );
}
