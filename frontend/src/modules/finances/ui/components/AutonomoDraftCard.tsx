import { useState } from 'react';
import { useApi } from '@core/context/ApiContext';
import { useI18n } from '@core/i18n/I18nContext';
import { recordPositiveMoment } from '@core/review/review';
import { useOptionalPlan } from '@modules/billing/application/PlanContext';
import { useAction } from '@shared/hooks/useAction';
import { Icon } from '@shared/components/Icon';
import { parseDecimal } from '@shared/utils/numbers';
import { storage } from '@shared/utils/storage';
import { HowToFile } from '@modules/guides/ui/HaciendaGuides';
import { AutonomoManual, emptyManual, toManualData, type ManualForm } from './AutonomoManual';
import { DraftResult } from './AutonomoDraftResult';
import { PremiumGate } from '@modules/billing/ui/PremiumGate';
import { UsedFreeGate, quarterDraftAccess } from './AutonomoLimit';
import type { AutonomoDraft, AutonomoInputs, QuarterExtras } from '@modules/finances/domain/types';
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

type Quarter = 1 | 2 | 3 | 4;

const number = (text: string): number => {
  const parsed = parseDecimal(text);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};
const quarterNow = (): Quarter => (Math.floor(new Date().getMonth() / 3) + 1) as Quarter;

/** The options typed outside the manual form. */
interface Extras {
  hardToJustify: boolean;
  exempt: boolean;
  priorNet: string;
  toOffset: string;
}

/** What the server takes to prepare the draft of a quarter. */
function buildInputs(manual: ManualForm, extras: Extras, quarter: Quarter): AutonomoInputs {
  return {
    quarters: manual.quarters.map(
      (q): QuarterExtras => ({
        withheld: number(q.withheld),
        socialSecurity: 0,
        vatNotDeductible: 0,
      })
    ) as AutonomoInputs['quarters'],
    hardToJustify: extras.hardToJustify,
    priorYearNet: extras.priorNet.trim() === '' ? null : parseDecimal(extras.priorNet),
    exempt130: extras.exempt,
    vatToOffset: number(extras.toOffset),
    manual: toManualData(manual),
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
}

/** The year and the quarter of the draft. */
function PeriodPicker({
  year,
  quarter,
  onYear,
  onQuarter,
}: {
  year: number;
  quarter: Quarter;
  onYear: (year: number) => void;
  onQuarter: (quarter: Quarter) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="form-grid">
      <label className="field">
        <span className="field-label">{t('app.autonomo.year')}</span>
        <select className="tx-input" value={year} onChange={(e) => onYear(Number(e.target.value))}>
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
          onChange={(e) => onQuarter(Number(e.target.value) as Quarter)}
        >
          {QUARTERS.map((q) => (
            <option key={q} value={q}>
              {t('app.autonomo.quarterN', { n: q })}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

/** Hard-to-justify expenses, the 130 exemption, last year's net and the VAT to offset. */
function ExtrasPanel({
  extras,
  onChange,
}: {
  extras: Extras;
  onChange: (patch: Partial<Extras>) => void;
}) {
  const { t } = useI18n();
  return (
    <section className="autonomo-panel autonomo-extras">
      <h3>{t('app.autonomo.extras')}</h3>
      <div className="autonomo-options">
        <label className="autonomo-option">
          <input
            type="checkbox"
            checked={extras.hardToJustify}
            onChange={(e) => onChange({ hardToJustify: e.target.checked })}
          />
          <span>{t('app.autonomo.hardToJustify')}</span>
        </label>
        <label className="autonomo-option">
          <input
            type="checkbox"
            checked={extras.exempt}
            onChange={(e) => onChange({ exempt: e.target.checked })}
          />
          <span>{t('app.autonomo.exempt')}</span>
        </label>
      </div>
      <div className="autonomo-grid autonomo-grid--top">
        <label className="field">
          <span className="field-label">{t('app.autonomo.priorNet')}</span>
          <input
            className="tx-input"
            inputMode="decimal"
            value={extras.priorNet}
            onChange={(e) => onChange({ priorNet: e.target.value })}
          />
          <small className="autonomo-hint">{t('app.autonomo.priorNetHint')}</small>
        </label>
        <label className="field">
          <span className="field-label">{t('app.autonomo.toOffset')}</span>
          <input
            className="tx-input"
            inputMode="decimal"
            value={extras.toOffset}
            onChange={(e) => onChange({ toOffset: e.target.value })}
          />
          <small className="autonomo-hint">{t('app.autonomo.toOffsetHint')}</small>
        </label>
      </div>
    </section>
  );
}

/** The manual form, kept on the device between visits. */
function useStoredManual() {
  const [manual, setManual] = useState<ManualForm>(() => ({
    ...emptyManual(),
    ...storage.getJSON<Partial<ManualForm>>(MANUAL_KEY, {}),
  }));
  const changeManual = (next: ManualForm) => {
    storage.setJSON(MANUAL_KEY, next);
    setManual(next);
  };
  return [manual, changeManual] as const;
}

/**
 * Self-employed: the draft of the quarterly VAT and income tax forms, and the contribution.
 * `onHowToFile` opens the step-by-step guide to file a form on the Agencia Tributaria website.
 */
export function AutonomoDraftCard({ onHowToFile }: { onHowToFile?: (slug: string) => void }) {
  const { businessApi } = useApi();
  const { t } = useI18n();
  const plan = useOptionalPlan();
  const action = useAction();
  const [year, setYear] = useState(THIS_YEAR);
  const [quarter, setQuarter] = useState<Quarter>(quarterNow);
  const [extras, setExtras] = useState<Extras>({
    hardToJustify: false,
    exempt: false,
    priorNet: '',
    toOffset: '',
  });
  const [manual, changeManual] = useStoredManual();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(() =>
    storage.getJSON<Snapshot | null>(SNAPSHOT_KEY, null)
  );

  const { limit, locked, otherQuarter } = quarterDraftAccess(plan, year, quarter);
  const prepare = () =>
    action.run(async () => {
      const inputs = buildInputs(manual, extras, quarter);
      const result = await businessApi.draft(year, quarter, inputs);
      const next: Snapshot = { draft: result, inputs };
      storage.setJSON(SNAPSHOT_KEY, next);
      setSnapshot(next);
      recordPositiveMoment();
      await plan?.refresh();
    });

  return (
    <div className="card autonomo-card">
      <h2 className="section-title">
        <Icon name="receipt" /> {t('app.autonomo.title')}
      </h2>
      <p className="section-hint">{t('app.autonomo.hint')}</p>
      {action.error && <p className="form-error">{action.error}</p>}

      <PeriodPicker year={year} quarter={quarter} onYear={setYear} onQuarter={setQuarter} />

      <AutonomoManual form={manual} onChange={changeManual} upTo={quarter} year={year} />

      <ExtrasPanel
        extras={extras}
        onChange={(patch) => setExtras((current) => ({ ...current, ...patch }))}
      />

      {otherQuarter ? (
        <PremiumGate>
          <p className="section-hint">{t('app.autonomo.otherQuarterLocked')}</p>
          <button
            className="btn-primary"
            onClick={() =>
              plan!.openUpgrade({ kind: 'limit', resource: 'autonomoDrafts', limit: 1 })
            }
          >
            {t('app.autonomo.goPremium')}
          </button>
        </PremiumGate>
      ) : locked ? (
        <UsedFreeGate
          text={t('app.autonomo.usedFree')}
          resource="autonomoDrafts"
          limit={limit as number}
        />
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
      {onHowToFile && <HowToFile slugs={['modelo-303', 'modelo-130']} onOpen={onHowToFile} />}
    </div>
  );
}
