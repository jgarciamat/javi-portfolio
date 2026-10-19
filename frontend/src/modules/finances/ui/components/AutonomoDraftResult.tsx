import { useState } from 'react';
import { ApiError } from '@core/api/http';
import { useApi } from '@core/context/ApiContext';
import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import { useOptionalPlan } from '@modules/billing/application/PlanContext';
import { isNativeApp } from '@shared/utils/platform';
import { shareImage } from '@shared/utils/shareImage';
import { buildAutonomoPdf, type PdfText } from '../../application/autonomoPdf';
import {
  EXPENSE_KINDS,
  type AutonomoDraft,
  type AutonomoInputs,
  type TaxBox,
} from '@modules/finances/domain/types';
import { UsedFreeGate, usageLimit } from './AutonomoLimit';
import { AutonomoExplain } from './AutonomoExplain';
import { VatFamily } from './AutonomoVatResult';
import { AutonomoFormPreviews } from '@modules/taxforms/ui/FormPreviews';
import '../css/Sections.css';
import '../css/Autonomo.css';

type Translate = ReturnType<typeof useI18n>['t'];
type Format = ReturnType<typeof useFormat>;

/** A table of the boxes of an official form (a number of people is a count, not money). */
export function Boxes({ title, boxes }: { title: string; boxes: TaxBox[] }) {
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
              <td>{/perceptores$/.test(b.label) ? b.amount : money(b.amount)}</td>
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

/** The contribution sentence, shared by the screen and the PDF. */
const retaText = (t: Translate, money: Format['money'], reta: AutonomoDraft['reta']): string =>
  t('app.autonomo.retaText', {
    net: money(reta.monthlyNet),
    bracket: reta.bracket,
    baseMin: money(reta.baseMin),
    baseMax: money(reta.baseMax),
  });

/** Every text of the PDF, in the language of the app. */
function pdfText(
  t: Translate,
  { money, date }: Pick<Format, 'money' | 'date'>,
  draft: AutonomoDraft
): PdfText {
  const kinds = Object.fromEntries(EXPENSE_KINDS.map((k) => [k, t(`app.autonomo.kind.${k}`)]));
  const notes = Object.fromEntries(
    ['supplies', 'vehicle', 'meals', 'clients', 'health', 'fines'].map((n) => [
      n,
      t(`app.autonomo.note.${n}`),
    ])
  );
  return {
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
    retaText: retaText(t, money, draft.reta),
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
}

/** Builds the PDF of the draft and shares or downloads it. */
function usePdfDownload(draft: AutonomoDraft, inputs: AutonomoInputs | null) {
  const { businessApi } = useApi();
  const { t } = useI18n();
  const { money, date } = useFormat();
  const plan = useOptionalPlan();
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  const download = async () => {
    setSaving(true);
    setFailed(false);
    try {
      // Counted first: the free plan has one PDF, and a 402 opens the plans instead.
      await businessApi.recordPdf();
      const text = pdfText(t, { money, date }, draft);
      const blob = await buildAutonomoPdf(draft, inputs, text, date);
      await shareImage(
        blob,
        `borrador-autonomo-${draft.year}-T${draft.quarter}.pdf`,
        t('app.autonomo.pdf.title'),
        // Phones and the app offer the share sheet; a computer just downloads the file.
        isNativeApp() || window.matchMedia?.('(pointer: coarse)')?.matches ? 'share' : 'download'
      );
      await plan?.refresh();
    } catch (e) {
      if (e instanceof ApiError && e.status === 402) await plan?.refresh();
      else setFailed(true);
    } finally {
      setSaving(false);
    }
  };
  return { saving, failed, download };
}

/** The three amounts: VAT, income tax and the monthly contribution. */
function SummaryTiles({ draft }: { draft: AutonomoDraft }) {
  const { t } = useI18n();
  const { money } = useFormat();
  const { vat, irpf, reta } = draft;
  return (
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
  );
}

/** The contribution, its bracket and the deadlines of the forms. */
function RetaAndDeadlines({ draft }: { draft: AutonomoDraft }) {
  const { t } = useI18n();
  const { money, date } = useFormat();
  const { reta } = draft;
  return (
    <>
      <h4>{t('app.autonomo.retaTitle')}</h4>
      <p>{retaText(t, money, reta)}</p>
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
    </>
  );
}

/** Download the PDF, or the plans once the free one is used. */
function PdfActions({ draft, inputs }: { draft: AutonomoDraft; inputs: AutonomoInputs | null }) {
  const { t } = useI18n();
  const plan = useOptionalPlan();
  const { saving, failed, download } = usePdfDownload(draft, inputs);
  const { limit, locked } = usageLimit(plan, 'autonomoPdfs');
  return (
    <>
      {locked ? (
        <UsedFreeGate
          text={t('app.autonomo.pdf.usedFree')}
          resource="autonomoPdfs"
          limit={limit as number}
        />
      ) : (
        <div className="button-row">
          <button className="btn-primary" disabled={saving} onClick={() => void download()}>
            {saving ? t('app.autonomo.pdf.preparing') : t('app.autonomo.pdf.download')}
          </button>
          <small className="section-hint">{t('app.autonomo.pdf.hint')}</small>
          {limit === 1 && <small className="section-hint">{t('app.autonomo.pdf.freeOne')}</small>}
        </div>
      )}
      {failed && <p className="form-error">{t('app.autonomo.pdf.error')}</p>}
    </>
  );
}

/** What the draft says, in words, and the boxes behind it. */
export function DraftResult({
  draft,
  inputs,
}: {
  draft: AutonomoDraft;
  inputs: AutonomoInputs | null;
}) {
  const { t } = useI18n();
  const { irpf } = draft;
  return (
    <div className="autonomo-result" aria-live="polite">
      <SummaryTiles draft={draft} />
      <AutonomoExplain draft={draft} />

      {draft.expenses && draft.expenses.length > 0 && <Deductible lines={draft.expenses} />}
      <VatFamily draft={draft} />
      {irpf.required ? (
        <Boxes title={t('app.autonomo.irpfBoxes')} boxes={irpf.boxes} />
      ) : (
        <p className="section-hint">{t('app.autonomo.irpf.notRequiredText')}</p>
      )}

      <RetaAndDeadlines draft={draft} />
      <p className="plan-note">{t('app.autonomo.disclaimer')}</p>
      <PdfActions draft={draft} inputs={inputs} />
      <AutonomoFormPreviews draft={draft} />
    </div>
  );
}
