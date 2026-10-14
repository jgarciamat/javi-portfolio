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
import type {
  AutonomoDraft,
  AutonomoInputs,
  QuarterExtras,
  TaxBox,
} from '@modules/finances/domain/types';
import '../css/Sections.css';
import '../css/Autonomo.css';

const SNAPSHOT_KEY = 'mm_autonomo_draft';
const MANUAL_KEY = 'mm_autonomo_manual';
const QUARTERS = [1, 2, 3, 4] as const;
const THIS_YEAR = new Date().getFullYear();
const YEARS = [THIS_YEAR - 1, THIS_YEAR, THIS_YEAR + 1];

interface ExtrasForm {
  withheld: string;
  socialSecurity: string;
  vatNotDeductible: string;
}

const emptyExtras = (): ExtrasForm => ({ withheld: '', socialSecurity: '', vatNotDeductible: '' });
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
function DraftResult({ draft }: { draft: AutonomoDraft }) {
  const { t } = useI18n();
  const { money, date } = useFormat();
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
  const [extras, setExtras] = useState<ExtrasForm[]>(() => QUARTERS.map(emptyExtras));
  const [hardToJustify, setHardToJustify] = useState(false);
  const [exempt, setExempt] = useState(false);
  const [priorNet, setPriorNet] = useState('');
  const [toOffset, setToOffset] = useState('');
  const [source, setSource] = useState<'movements' | 'manual'>('movements');
  const [manual, setManual] = useState<ManualForm>(() =>
    storage.getJSON<ManualForm>(MANUAL_KEY, emptyManual())
  );
  const changeManual = (next: ManualForm) => {
    storage.setJSON(MANUAL_KEY, next);
    setManual(next);
  };
  const [draft, setDraft] = useState<AutonomoDraft | null>(() =>
    storage.getJSON<AutonomoDraft | null>(SNAPSHOT_KEY, null)
  );

  const limit = plan?.overview?.limits.resources.autonomoDrafts;
  const used = plan?.overview?.usage.autonomoDrafts ?? 0;
  const locked = limit !== null && limit !== undefined && used >= limit;
  const setExtra = (q: number, key: keyof ExtrasForm, value: string) =>
    setExtras((all) => all.map((e, i) => (i === q ? { ...e, [key]: value } : e)));

  const prepare = () =>
    action.run(async () => {
      const inputs: AutonomoInputs = {
        quarters: extras.map(
          (e): QuarterExtras => ({
            withheld: number(e.withheld),
            socialSecurity: number(e.socialSecurity),
            vatNotDeductible: number(e.vatNotDeductible),
          })
        ) as AutonomoInputs['quarters'],
        hardToJustify,
        priorYearNet: priorNet.trim() === '' ? null : parseDecimal(priorNet),
        exempt130: exempt,
        vatToOffset: number(toOffset),
        manual: source === 'manual' ? toManualData(manual) : null,
      };
      const result = await businessApi.draft(year, quarter, inputs);
      storage.setJSON(SNAPSHOT_KEY, result);
      setDraft(result);
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

      <fieldset className="autonomo-source">
        <legend>{t('app.autonomo.source')}</legend>
        <label className="renta-check">
          <input
            type="radio"
            name="autonomo-source"
            checked={source === 'movements'}
            onChange={() => setSource('movements')}
          />
          <span>{t('app.autonomo.sourceMovements')}</span>
        </label>
        <label className="renta-check">
          <input
            type="radio"
            name="autonomo-source"
            checked={source === 'manual'}
            onChange={() => setSource('manual')}
          />
          <span>{t('app.autonomo.sourceManual')}</span>
        </label>
      </fieldset>
      {source === 'manual' && (
        <AutonomoManual form={manual} onChange={changeManual} upTo={quarter} />
      )}

      <section className="autonomo-extras">
        <h3 className="subsection-title">{t('app.autonomo.extras')}</h3>
        <p className="section-hint">{t('app.autonomo.extrasHint')}</p>
        {QUARTERS.filter((q) => q <= quarter).map((q) => (
          <fieldset key={q} className="autonomo-quarter">
            <legend>{t('app.autonomo.quarterN', { n: q })}</legend>
            <label className="field">
              <span className="field-label">{t('app.autonomo.withheld')}</span>
              <input
                className="tx-input"
                inputMode="decimal"
                aria-label={`${t('app.autonomo.withheld')} ${q}`}
                value={extras[q - 1].withheld}
                onChange={(e) => setExtra(q - 1, 'withheld', e.target.value)}
              />
            </label>
            <label className="field">
              <span className="field-label">{t('app.autonomo.socialSecurity')}</span>
              <input
                className="tx-input"
                inputMode="decimal"
                aria-label={`${t('app.autonomo.socialSecurity')} ${q}`}
                value={extras[q - 1].socialSecurity}
                onChange={(e) => setExtra(q - 1, 'socialSecurity', e.target.value)}
              />
            </label>
            <label className="field">
              <span className="field-label">{t('app.autonomo.vatNotDeductible')}</span>
              <input
                className="tx-input"
                inputMode="decimal"
                aria-label={`${t('app.autonomo.vatNotDeductible')} ${q}`}
                value={extras[q - 1].vatNotDeductible}
                onChange={(e) => setExtra(q - 1, 'vatNotDeductible', e.target.value)}
              />
            </label>
          </fieldset>
        ))}
        <label className="renta-check">
          <input
            type="checkbox"
            checked={hardToJustify}
            onChange={(e) => setHardToJustify(e.target.checked)}
          />
          <span>{t('app.autonomo.hardToJustify')}</span>
        </label>
        <label className="renta-check">
          <input type="checkbox" checked={exempt} onChange={(e) => setExempt(e.target.checked)} />
          <span>{t('app.autonomo.exempt')}</span>
        </label>
        <div className="form-grid">
          <label className="field">
            <span className="field-label">{t('app.autonomo.priorNet')}</span>
            <input
              className="tx-input"
              inputMode="decimal"
              value={priorNet}
              onChange={(e) => setPriorNet(e.target.value)}
            />
            <small className="renta-field-hint">{t('app.autonomo.priorNetHint')}</small>
          </label>
          <label className="field">
            <span className="field-label">{t('app.autonomo.toOffset')}</span>
            <input
              className="tx-input"
              inputMode="decimal"
              value={toOffset}
              onChange={(e) => setToOffset(e.target.value)}
            />
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

      {draft && (
        <>
          <h3 className="subsection-title">
            {t('app.autonomo.draftOf', { year: draft.year, n: draft.quarter })}
          </h3>
          <DraftResult draft={draft} />
        </>
      )}
    </div>
  );
}
