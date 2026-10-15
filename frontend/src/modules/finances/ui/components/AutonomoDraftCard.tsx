import { useState } from 'react';
import { useApi } from '@core/context/ApiContext';
import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import { useOptionalPlan } from '@modules/billing/application/PlanContext';
import { useAction } from '@shared/hooks/useAction';
import { Icon } from '@shared/components/Icon';
import { parseDecimal } from '@shared/utils/numbers';
import { storage } from '@shared/utils/storage';
import { AutonomoManual, emptyManual, toManualData, type ManualForm } from './AutonomoManual';
import { buildAutonomoPdf, type PdfText } from '../../application/autonomoPdf';
import { shareImage } from '@shared/utils/shareImage';
import {
  EXPENSE_KINDS,
  type AutonomoDraft,
  type AutonomoInputs,
  type QuarterExtras,
  type TaxBox,
} from '@modules/finances/domain/types';
import '../css/Sections.css';
import '../css/Autonomo.css';

const SNAPSHOT_KEY = 'mm_autonomo_draft2';

/** The last draft with the data it was prepared from (to put them in the PDF). */
interface Snapshot {
  draft: AutonomoDraft;
  inputs: AutonomoInputs | null;
}
const MANUAL_KEY = 'mm_autonomo_manual2';
const QUARTERS = [1, 2, 3, 4] as const;
const THIS_YEAR = new Date().getFullYear();
const YEARS = [THIS_YEAR - 1, THIS_YEAR, THIS_YEAR + 1];

const number = (text: string): number => {
  const parsed = parseDecimal(text);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};
const quarterNow = (): 1 | 2 | 3 | 4 =>
  (Math.floor(new Date().getMonth() / 3) + 1) as 1 | 2 | 3 | 4;

/** A table of the boxes of an official form. */
function Boxes({ title, boxes }: { title: string; boxes: TaxBox[] }) {
  const { t } = useI18n();
  const { money } = useFormat();
  return (
    <div className="autonomo-boxes">
      <h4>{title}</h4>
      <table>
        <thead>
          <tr>
            <th>{t('app.autonomo.box')}</th>
            <th>{t('app.autonomo.concept')}</th>
            <th>{t('app.autonomo.amount')}</th>
          </tr>
        </thead>
        <tbody>
          {boxes.map((b) => (
            <tr key={`${b.box}-${b.label}`}>
              <td>{b.box}</td>
              <td>{b.label}</td>
              <td>{b.label.startsWith('Tipo') ? `${b.amount} %` : money(b.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** What the expenses typed by hand let the person deduct, kind by kind. */
function Deductible({ lines }: { lines: NonNullable<AutonomoDraft['expenses']> }) {
  const { t } = useI18n();
  const { money } = useFormat();
  const total = (pick: (l: (typeof lines)[number]) => number) =>
    lines.reduce((sum, l) => sum + pick(l), 0);
  return (
    <div className="autonomo-boxes">
      <h4>{t('app.autonomo.deductibleTitle')}</h4>
      <table>
        <thead>
          <tr>
            <th>{t('app.autonomo.expenseKind')}</th>
            <th>{t('app.autonomo.paid')}</th>
            <th>{t('app.autonomo.deductibleIrpf')}</th>
            <th>{t('app.autonomo.deductibleVat')}</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={i}>
              <td>
                {t(`app.autonomo.kind.${l.kind}`)}
                {l.note && (
                  <small className="autonomo-note">{t(`app.autonomo.note.${l.note}`)}</small>
                )}
              </td>
              <td>{money(l.amount)}</td>
              <td>{money(l.deductible)}</td>
              <td>{money(l.vatDeductible)}</td>
            </tr>
          ))}
          <tr className="autonomo-total">
            <td>{t('app.autonomo.total')}</td>
            <td>{money(total((l) => l.amount))}</td>
            <td>{money(total((l) => l.deductible))}</td>
            <td>{money(total((l) => l.vatDeductible))}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/** What the draft says, in words, and the boxes behind it. */
function DraftResult({ draft, inputs }: { draft: AutonomoDraft; inputs: AutonomoInputs | null }) {
  const { t } = useI18n();
  const { money, date } = useFormat();
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  const download = async () => {
    setSaving(true);
    setFailed(false);
    try {
      const kinds = Object.fromEntries(EXPENSE_KINDS.map((k) => [k, t(`app.autonomo.kind.${k}`)]));
      const notes = Object.fromEntries(
        ['supplies', 'vehicle', 'meals', 'clients', 'health', 'fines'].map((n) => [
          n,
          t(`app.autonomo.note.${n}`),
        ])
      );
      const text: PdfText = {
        title: t('app.autonomo.pdf.title'),
        subtitle: t('app.autonomo.draftOf', { year: draft.year, n: draft.quarter }),
        generated: t('app.autonomo.pdf.generated', { date: date(new Date().toISOString()) }),
        data: t('app.autonomo.pdf.data'),
        quarter: t('app.autonomo.quarter'),
        income: t('app.autonomo.incomeTitle'),
        withheld: t('app.autonomo.withheld'),
        other: t('app.autonomo.extras'),
        box: t('app.autonomo.box'),
        concept: t('app.autonomo.concept'),
        amount: t('app.autonomo.amount'),
        vatAccrued: t('app.autonomo.accrued'),
        vatDeductible: t('app.autonomo.deductible'),
        vatSettlement: t('app.autonomo.settlement'),
        irpf: t('app.autonomo.irpfBoxes'),
        irpfNotRequired: t('app.autonomo.irpf.notRequiredText'),
        expenses: t('app.autonomo.deductibleTitle'),
        paid: t('app.autonomo.paid'),
        deductibleIrpf: t('app.autonomo.deductibleIrpf'),
        deductibleVat: t('app.autonomo.deductibleVat'),
        total: t('app.autonomo.total'),
        reta: t('app.autonomo.retaTitle'),
        retaText: t('app.autonomo.retaText', {
          net: money(draft.reta.monthlyNet),
          bracket: draft.reta.bracket,
          baseMin: money(draft.reta.baseMin),
          baseMax: money(draft.reta.baseMax),
        }),
        deadlines: t('app.autonomo.deadlines'),
        disclaimer: t('app.autonomo.disclaimer'),
        summary: [
          {
            model: t('app.autonomo.model', { model: '303' }),
            text: t(`app.autonomo.vat.${draft.vat.result}`),
            amount: money(Math.abs(draft.vat.amountDue)),
          },
          {
            model: t('app.autonomo.model', { model: '130' }),
            text: t(`app.autonomo.irpf.${draft.irpf.result}`),
            amount: money(Math.abs(draft.irpf.amountDue)),
          },
          {
            model: t('app.autonomo.retaTitle'),
            text: t('app.autonomo.perMonth'),
            amount: `${money(draft.reta.feeMin)} – ${money(draft.reta.feeMax)}`,
          },
        ],
        kinds,
        notes,
        incomeLabels: {
          r21: t('app.autonomo.income.r21'),
          r10: t('app.autonomo.income.r10'),
          r4: t('app.autonomo.income.r4'),
          r0: t('app.autonomo.income.r0'),
        },
        prior: t('app.autonomo.pdf.prior', {
          income: '{income}',
          expenses: '{expenses}',
          payments: '{payments}',
          withheld: '{withheld}',
        }),
        flags: {
          hardToJustify: t('app.autonomo.pdf.hardToJustify'),
          exempt: t('app.autonomo.pdf.exempt'),
          priorNet: t('app.autonomo.priorNet'),
          toOffset: t('app.autonomo.toOffset'),
        },
      };
      const blob = await buildAutonomoPdf(draft, inputs, text, date);
      await shareImage(
        blob,
        `borrador-autonomo-${draft.year}-T${draft.quarter}.pdf`,
        t('app.autonomo.pdf.title')
      );
    } catch {
      setFailed(true);
    } finally {
      setSaving(false);
    }
  };
  const { vat, irpf, reta } = draft;
  return (
    <div className="autonomo-result" aria-live="polite">
      <div className="autonomo-summary">
        <div className={`autonomo-tile autonomo-tile--${vat.result}`}>
          <small>{t('app.autonomo.model', { model: '303' })}</small>
          <strong>{money(Math.abs(vat.amountDue))}</strong>
          <span>{t(`app.autonomo.vat.${vat.result}`)}</span>
        </div>
        <div className={`autonomo-tile autonomo-tile--${irpf.result}`}>
          <small>{t('app.autonomo.model', { model: '130' })}</small>
          <strong>{money(Math.abs(irpf.amountDue))}</strong>
          <span>{t(`app.autonomo.irpf.${irpf.result}`)}</span>
        </div>
        <div className="autonomo-tile">
          <small>{t('app.autonomo.retaTitle')}</small>
          <strong>
            {money(reta.feeMin)} – {money(reta.feeMax)}
          </strong>
          <span>{t('app.autonomo.perMonth')}</span>
        </div>
      </div>

      {draft.expenses && draft.expenses.length > 0 && <Deductible lines={draft.expenses} />}
      <Boxes title={t('app.autonomo.accrued')} boxes={vat.accrued} />
      <Boxes title={t('app.autonomo.deductible')} boxes={vat.deductible} />
      <Boxes title={t('app.autonomo.settlement')} boxes={vat.settlement} />
      {irpf.required ? (
        <Boxes title={t('app.autonomo.irpfBoxes')} boxes={irpf.boxes} />
      ) : (
        <p className="section-hint">{t('app.autonomo.irpf.notRequiredText')}</p>
      )}

      <h4>{t('app.autonomo.retaTitle')}</h4>
      <p>
        {t('app.autonomo.retaText', {
          net: money(reta.monthlyNet),
          bracket: reta.bracket,
          baseMin: money(reta.baseMin),
          baseMax: money(reta.baseMax),
        })}
      </p>
      <p className="section-hint">{t('app.autonomo.retaNote', { rate: reta.rate * 100 })}</p>

      <h4>{t('app.autonomo.deadlines')}</h4>
      <ul className="autonomo-deadlines">
        {draft.deadlines.map((d) => (
          <li key={d.model}>
            <strong>{t('app.autonomo.model', { model: d.model })}</strong> {d.label}
            <span>{date(d.date)}</span>
          </li>
        ))}
      </ul>
      <p className="plan-note">{t('app.autonomo.disclaimer')}</p>
      <div className="button-row">
        <button className="btn-primary" disabled={saving} onClick={() => void download()}>
          {saving ? t('app.autonomo.pdf.preparing') : t('app.autonomo.pdf.download')}
        </button>
        <small className="section-hint">{t('app.autonomo.pdf.hint')}</small>
      </div>
      {failed && <p className="form-error">{t('app.autonomo.pdf.error')}</p>}
    </div>
  );
}

/** Self-employed: the draft of the quarterly VAT and income tax forms, and the contribution. */
export function AutonomoDraftCard() {
  const { businessApi } = useApi();
  const { t } = useI18n();
  const plan = useOptionalPlan();
  const action = useAction();
  const [year, setYear] = useState(THIS_YEAR);
  const [quarter, setQuarter] = useState<1 | 2 | 3 | 4>(quarterNow);
  const [hardToJustify, setHardToJustify] = useState(false);
  const [exempt, setExempt] = useState(false);
  const [priorNet, setPriorNet] = useState('');
  const [toOffset, setToOffset] = useState('');
  const [manual, setManual] = useState<ManualForm>(() => ({
    ...emptyManual(),
    ...storage.getJSON<Partial<ManualForm>>(MANUAL_KEY, {}),
  }));
  const changeManual = (next: ManualForm) => {
    storage.setJSON(MANUAL_KEY, next);
    setManual(next);
  };
  const [snapshot, setSnapshot] = useState<Snapshot | null>(() =>
    storage.getJSON<Snapshot | null>(SNAPSHOT_KEY, null)
  );

  const limit = plan?.overview?.limits.resources.autonomoDrafts;
  const used = plan?.overview?.usage.autonomoDrafts ?? 0;
  const locked = limit !== null && limit !== undefined && used >= limit;
  const prepare = () =>
    action.run(async () => {
      const manualData = toManualData(manual);
      const inputs: AutonomoInputs = {
        quarters: manual.quarters.map(
          (q): QuarterExtras => ({
            withheld: number(q.withheld),
            socialSecurity: 0,
            vatNotDeductible: 0,
          })
        ) as AutonomoInputs['quarters'],
        hardToJustify,
        priorYearNet: priorNet.trim() === '' ? null : parseDecimal(priorNet),
        exempt130: exempt,
        vatToOffset: number(toOffset),
        manual: manualData,
        prior:
          manual.prior.on && quarter > 1
            ? {
                income: number(manual.prior.income),
                expenses: number(manual.prior.expenses),
                previousPayments: number(manual.prior.payments),
                withheld: number(manual.prior.withheld),
              }
            : null,
      };
      const result = await businessApi.draft(year, quarter, inputs);
      const next: Snapshot = { draft: result, inputs };
      storage.setJSON(SNAPSHOT_KEY, next);
      setSnapshot(next);
      await plan?.refresh();
    });

  return (
    <div className="card autonomo-card">
      <h2 className="section-title">
        <Icon name="receipt" /> {t('app.autonomo.title')}
      </h2>
      <p className="section-hint">{t('app.autonomo.hint')}</p>
      {action.error && <p className="form-error">{action.error}</p>}

      <div className="form-grid">
        <label className="field">
          <span className="field-label">{t('app.autonomo.year')}</span>
          <select
            className="tx-input"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">{t('app.autonomo.quarter')}</span>
          <select
            className="tx-input"
            value={quarter}
            onChange={(e) => setQuarter(Number(e.target.value) as 1 | 2 | 3 | 4)}
          >
            {QUARTERS.map((q) => (
              <option key={q} value={q}>
                {t('app.autonomo.quarterN', { n: q })}
              </option>
            ))}
          </select>
        </label>
      </div>

      <AutonomoManual form={manual} onChange={changeManual} upTo={quarter} />

      <section className="autonomo-panel autonomo-extras">
        <h3>{t('app.autonomo.extras')}</h3>
        <div className="autonomo-options">
          <label className="autonomo-option">
            <input
              type="checkbox"
              checked={hardToJustify}
              onChange={(e) => setHardToJustify(e.target.checked)}
            />
            <span>{t('app.autonomo.hardToJustify')}</span>
          </label>
          <label className="autonomo-option">
            <input type="checkbox" checked={exempt} onChange={(e) => setExempt(e.target.checked)} />
            <span>{t('app.autonomo.exempt')}</span>
          </label>
        </div>
        <div className="autonomo-grid autonomo-grid--top">
          <label className="field">
            <span className="field-label">{t('app.autonomo.priorNet')}</span>
            <input
              className="tx-input"
              inputMode="decimal"
              value={priorNet}
              onChange={(e) => setPriorNet(e.target.value)}
            />
            <small className="autonomo-hint">{t('app.autonomo.priorNetHint')}</small>
          </label>
          <label className="field">
            <span className="field-label">{t('app.autonomo.toOffset')}</span>
            <input
              className="tx-input"
              inputMode="decimal"
              value={toOffset}
              onChange={(e) => setToOffset(e.target.value)}
            />
            <small className="autonomo-hint">{t('app.autonomo.toOffsetHint')}</small>
          </label>
        </div>
      </section>

      {locked ? (
        <div className="renta-gate">
          <p className="section-hint">{t('app.autonomo.usedFree')}</p>
          <button
            className="btn-primary"
            onClick={() =>
              plan?.openUpgrade({
                kind: 'limit',
                resource: 'autonomoDrafts',
                limit: limit as number,
              })
            }
          >
            {t('app.autonomo.goPremium')}
          </button>
        </div>
      ) : (
        <div className="button-row">
          <button className="btn-primary" disabled={action.pending} onClick={() => void prepare()}>
            {action.pending ? t('app.autonomo.preparing') : t('app.autonomo.prepare')}
          </button>
          {limit === 1 && <small className="section-hint">{t('app.autonomo.freeOne')}</small>}
        </div>
      )}

      {snapshot && (
        <>
          <h3 className="subsection-title">
            {t('app.autonomo.draftOf', { year: snapshot.draft.year, n: snapshot.draft.quarter })}
          </h3>
          <DraftResult draft={snapshot.draft} inputs={snapshot.inputs} />
        </>
      )}
    </div>
  );
}
