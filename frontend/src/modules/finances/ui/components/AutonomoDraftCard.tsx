import { useRef } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { useOptionalPlan } from '@modules/billing/application/PlanContext';
import { Icon } from '@shared/components/Icon';
import { useHeaderOffset } from '@shared/hooks/useHeaderOffset';
import { HowToFile } from '@modules/guides/ui/HaciendaGuides';
import { AutonomoManual, type Extras } from './AutonomoManual';
import { DraftResult } from './AutonomoDraftResult';
import { ImportChecks } from './ImportChecks';
import { bringIntoView } from './bringIntoView';
import { StepBar, StepSection, goToStep, useCurrentStep, type Step } from './AutonomoSteps';
import { AutonomoSummary, summarize } from './AutonomoSummary';
import { AutonomoCloudPanel } from './AutonomoCloud';
import { WithholdingsPanel } from './AutonomoWithholdings';
import { AnnualPanel } from './AutonomoAnnual';
import { VatYearPanel } from './AutonomoVatYear';
import { annualOf } from './autonomoInputs';
import { invoiceYears } from './autonomoForRenta';
import { PrepareRenta } from '@modules/tools/ui/renta/PrepareRenta';
import { ActivityPanel, ActivitySummaryPanel } from './AutonomoActivity';
import { vatExtrasOf } from './vatForm';
import { ModulesResult } from './AutonomoModules';
import { inModules } from './activityForm';
import { PremiumGate } from '@modules/billing/ui/PremiumGate';
import { UsedFreeGate, quarterDraftAccess } from './AutonomoLimit';
import { QUARTERS, YEARS, useAutonomoDraft, type Quarter } from './useAutonomoDraft';
import '../css/Sections.css';
import '../css/Autonomo.css';

/** The year and the quarter of the draft. */
export function PeriodPicker({
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
    <div className="form-grid" id="autonomo-period">
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
export function ExtrasPanel({
  extras,
  quarter,
  onChange,
}: {
  extras: Extras;
  quarter: Quarter;
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
      <VatYearPanel value={extras.vat} quarter={quarter} onChange={(vat) => onChange({ vat })} />
    </section>
  );
}

/** Prepare the draft, or the plans when the free plan cannot prepare this one. */
export function PrepareGate({
  access: { limit, locked, otherQuarter },
  pending,
  onPrepare,
}: {
  access: ReturnType<typeof quarterDraftAccess>;
  pending: boolean;
  onPrepare: () => void;
}) {
  const { t } = useI18n();
  const plan = useOptionalPlan();
  if (otherQuarter) {
    return (
      <PremiumGate>
        <p className="section-hint">{t('app.autonomo.otherQuarterLocked')}</p>
        <button
          className="btn-primary"
          onClick={() => plan!.openUpgrade({ kind: 'limit', resource: 'autonomoDrafts', limit: 1 })}
        >
          {t('app.autonomo.goPremium')}
        </button>
      </PremiumGate>
    );
  }
  if (locked) {
    return (
      <UsedFreeGate
        text={t('app.autonomo.usedFree')}
        resource="autonomoDrafts"
        limit={limit as number}
      />
    );
  }
  return (
    <div className="button-row">
      <button className="btn-primary" disabled={pending} onClick={onPrepare}>
        {pending ? t('app.autonomo.preparing') : t('app.autonomo.prepare')}
      </button>
      {limit === 1 && <small className="section-hint">{t('app.autonomo.freeOne')}</small>}
    </div>
  );
}

/**
 * Self-employed: the draft of the quarterly VAT and income tax forms, and the contribution.
 * `onHowToFile` opens the step-by-step guide to file a form on the Agencia Tributaria website.
 */
export function AutonomoDraftCard({
  onHowToFile,
  onOpenRenta,
}: {
  onHowToFile?: (slug: string) => void;
  /** Opens the Renta, once «Preparar mi declaración de la renta» has taken the year there. */
  onOpenRenta?: () => void;
}) {
  const { t } = useI18n();
  const s = useAutonomoDraft();
  const { year, setYear, quarter, setQuarter, extras, setExtras, wipes, manual, changeManual } = s;
  const { focus, setFocus, snapshot, cloud, hasManual, hasData, wipe, checks, action, prepare } = s;
  const { limit, locked, otherQuarter } = s.access;

  const root = useRef<HTMLDivElement>(null);
  // The summary stays right under the header of the app.
  useHeaderOffset(root, '--autonomo-top');
  const [step, setStep] = useCurrentStep();
  const go = (to: Step) => {
    setStep(to);
    goToStep(to);
  };
  const toQuarter = (q: number) => bringIntoView(`autonomo-quarter-${q}`, ['h3']);

  return (
    <div className="card autonomo-card" ref={root}>
      <h2 className="section-title">
        <Icon name="receipt" /> {t('app.autonomo.title')}
      </h2>
      <p className="section-hint">{t('app.autonomo.hint')}</p>

      <AutonomoSummary
        year={year}
        quarter={quarter}
        summary={summarize(manual, quarter, checks, !hasData, year)}
        onPeriod={() => {
          setStep('result');
          bringIntoView('autonomo-period', ['select']);
        }}
        onQuarter={toQuarter}
        onChecks={() => bringIntoView('autonomo-checks', ['h3'])}
      />
      <StepBar current={step} done={{ bring: hasManual, result: snapshot !== null }} onGo={go} />

      <AutonomoCloudPanel
        cloud={cloud}
        wipe={
          hasData && (
            <button type="button" className="btn-secondary" onClick={wipe}>
              {t('app.autonomo.wipe')}
            </button>
          )
        }
      />

      <AutonomoManual
        key={wipes}
        form={manual}
        onChange={changeManual}
        upTo={quarter}
        year={year}
        years={YEARS}
        onPeriod={s.setPeriod}
        focus={focus}
        onShow={s.showInvoice}
        checks={
          <ImportChecks
            checks={checks}
            invoices={manual.invoices}
            onInvoice={s.showInvoice}
            onQuarter={toQuarter}
          />
        }
        extras={
          <>
            <ActivityPanel
              value={manual.activity}
              year={year}
              reagp={vatExtrasOf(extras.vat).regime === 'reagp'}
              simplifiedVat={vatExtrasOf(extras.vat).regime === 'simplified'}
              onChange={s.setActivity}
            />
            <ExtrasPanel
              extras={extras}
              quarter={quarter}
              onChange={(patch) => setExtras({ ...extras, ...patch })}
            />
          </>
        }
        vatExtras={extras.vat}
        onCarry={s.carry}
      />

      <StepSection step="result">
        <PeriodPicker year={year} quarter={quarter} onYear={setYear} onQuarter={setQuarter} />
        {inModules(manual) ? (
          // Non-farming modules: the 131 (and the 303 of the simplified regime) on the device.
          <ModulesResult manual={manual} extras={extras} year={year} quarter={quarter} />
        ) : (
          <>
            {action.error && <p className="form-error">{action.error}</p>}
            <PrepareGate
              access={{ limit, locked, otherQuarter }}
              pending={action.pending}
              onPrepare={() => void prepare()}
            />
            {snapshot && (
              <>
                <h3 className="subsection-title">
                  {t('app.autonomo.draftOf', {
                    year: snapshot.draft.year,
                    n: snapshot.draft.quarter,
                  })}
                </h3>
                <DraftResult draft={snapshot.draft} inputs={snapshot.inputs} />
              </>
            )}
          </>
        )}
        <WithholdingsPanel form={manual} year={year} quarter={quarter} onFocus={setFocus} />
        <AnnualPanel form={manual} year={year} />
        {hasManual && <ActivitySummaryPanel annual={annualOf(manual, extras, year)} />}
        {hasManual && (
          <PrepareRenta
            annual={annualOf(manual, extras, year)}
            onOpen={onOpenRenta}
            years={invoiceYears(manual)}
            onYear={setYear}
          />
        )}
        {onHowToFile && (
          <HowToFile
            slugs={inModules(manual) ? ['modelo-303'] : ['modelo-303', 'modelo-130']}
            onOpen={onHowToFile}
          />
        )}
      </StepSection>
    </div>
  );
}
