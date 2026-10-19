import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '@core/i18n/I18nContext';
import { NewReturn, UnderYear } from './renta/NewReturn';
import { DonationsFields } from './renta/DonationsFields';
import { OutOfScope, scopeOf } from './renta/Residence';
import type { ResidenceScope } from '../domain/rentaResidence';
import { storage } from '@shared/utils/storage';
import type { RentaAccess, RentaMode } from '../application/useRentaAccess';
import { rentaWorkExtras } from '../data/renta/estado-extra';
import { rentaProperty } from '../data/renta/inmuebles';
import { rentaState } from '../data/renta/state';
import { DeductionReview } from './renta/DeductionReview';
import { DeductionsStep, PendingNotice } from './renta/DeductionsStep';
import { DraftStep } from './renta/DraftStep';
import { FamilyStep } from './renta/FamilyStep';
import { GuidedInterview } from './renta/GuidedInterview';
import { IncomeStep } from './renta/IncomeStep';
import { InvestCard, InvestLink } from './renta/InvestCard';
import { ActivitiesList } from './renta/ActivitiesList';
import { Optimizer } from './renta/Optimizer';
import { PropertyStep } from './renta/PropertyStep';
import { ResultCard, type Snapshot } from './renta/ResultStep';
import type { ImportedSavings } from '../domain/rentaGains';
import type { RentaInput } from '../domain/rentaCalc';
import { Step, useMoney } from './renta/shared';
import { RentaFormPreview } from '@modules/taxforms/ui/FormPreviews';
import { useRentaPlanner } from './renta/useRentaPlanner';
import './css/Renta.css';
import { PremiumGate } from '@modules/billing/ui/PremiumGate';

/** Guided questions or the full form (expert mode): a preference of this device. */
export const VIEW_KEY = 'mm_renta_view';

/** The way to more calculations: the upgrade dialog in the app, a free account outside it. */
export function UpgradeCta({ access }: { access: RentaAccess }) {
  const { t } = useI18n();
  if (access.upgrade) {
    return (
      <button className="btn-primary" onClick={access.upgrade}>
        {t('tools.renta.goPremium')}
      </button>
    );
  }
  return (
    <p>
      <Link className="btn-primary" to="/login?mode=register">
        {t('tools.renta.createAccount')}
      </Link>
    </p>
  );
}

interface FreeGateProps {
  access: RentaAccess;
  busy: boolean;
  calculate: () => Promise<void>;
  /** In the app the free calculations are per Renta campaign; the public page has one per browser. */
  inApp: boolean;
}

/** Before the first result: the free calculation(s), or the way to Premium when they are used. */
function BeforeResult({ access, busy, calculate, inApp }: FreeGateProps) {
  const { t } = useI18n();
  const free = inApp
    ? t('tools.renta.freeCampaign', { count: access.left })
    : t('tools.renta.freeOne');
  return (
    <PremiumGate locked={access.used}>
      <p className="section-hint">
        {access.used ? t(inApp ? 'tools.renta.usedCampaign' : 'tools.renta.usedNoSnapshot') : free}
      </p>
      {access.used ? (
        <UpgradeCta access={access} />
      ) : (
        <button className="btn-primary" disabled={busy} onClick={() => void calculate()}>
          {busy ? t('tools.renta.calculating') : t('tools.renta.calculate')}
        </button>
      )}
    </PremiumGate>
  );
}

/** Under a frozen result: calculate again while free ones are left, then the way to Premium. */
function AfterFreeResult({ access, busy, calculate, inApp }: FreeGateProps) {
  const { t } = useI18n();
  if (access.left > 0) {
    return (
      <PremiumGate locked={false}>
        <p className="section-hint">{t('tools.renta.recalcLeft', { count: access.left })}</p>
        <button className="btn-primary" disabled={busy} onClick={() => void calculate()}>
          {busy ? t('tools.renta.calculating') : t('tools.renta.recalculate')}
        </button>
      </PremiumGate>
    );
  }
  return (
    <PremiumGate>
      <p className="section-hint">
        {t(inApp ? 'tools.renta.usedFreeCampaign' : 'tools.renta.usedFree')}
      </p>
      <UpgradeCta access={access} />
    </PremiumGate>
  );
}

/** The estimated result, or the way to get it. */
export function ResultSection({
  access,
  shown,
  busy,
  pending,
  calculate,
  mode,
  n,
  invest,
  imported,
  input,
  scope,
}: {
  n: number;
  /** Residence: a return filed elsewhere shows where instead of a result (rentaResidence.ts). */
  scope?: ResidenceScope;
  input?: RentaInput;
  /** What came from the investment files, for the losses of earlier years found in them. */
  imported?: ImportedSavings;
  /** «Have you invested in crypto or funds?»: the way to import them. */
  invest?: React.ReactNode;
  access: RentaAccess;
  shown: Snapshot | null;
  busy: boolean;
  pending: string[];
  calculate: () => Promise<void>;
  mode: RentaMode;
}) {
  const { t } = useI18n();
  const inApp = mode === 'account';
  return (
    <Step n={n} titleKey="tools.renta.step4" className="renta-result">
      {scope?.kind === 'out' ? (
        <OutOfScope scope={scope} />
      ) : (
        <ResultBody
          access={access}
          shown={shown}
          busy={busy}
          pending={pending}
          calculate={calculate}
          inApp={inApp}
          imported={imported}
          input={input}
          invest={invest}
          residencePending={scope?.kind === 'pending'}
        />
      )}
      <p className="plan-note">{t('tools.renta.disclaimerFull', { year: rentaState.year })}</p>
    </Step>
  );
}

/** The result, or what to do to get it. */
function ResultBody({
  access,
  shown,
  busy,
  pending,
  calculate,
  inApp,
  imported,
  input,
  invest,
  residencePending,
}: {
  access: RentaAccess;
  shown: Snapshot | null;
  busy: boolean;
  pending: string[];
  calculate: () => Promise<void>;
  inApp: boolean;
  imported?: ImportedSavings;
  input?: RentaInput;
  invest?: React.ReactNode;
  residencePending: boolean;
}) {
  const { t } = useI18n();
  const money = useMoney();
  return (
    <div aria-live="polite">
      {residencePending && (
        <p className="section-hint" role="note">
          {t('tools.renta.residence.pendingNote')}
        </p>
      )}
      {access.loading && <p className="section-hint">{t('app.common.loading')}</p>}
      {!access.loading && !shown && (
        <BeforeResult access={access} busy={busy} calculate={calculate} inApp={inApp} />
      )}
      {shown && (
        <>
          <PendingNotice pending={pending} />
          <ResultCard shown={shown} money={money} imported={imported} input={input} />
          {!access.premium && (
            <AfterFreeResult access={access} busy={busy} calculate={calculate} inApp={inApp} />
          )}
        </>
      )}
      {invest}
    </div>
  );
}

/** Guided questions or the full form: remembered on this device. */
function useExpertView(): [boolean, (on: boolean) => void] {
  const [expert, setExpert] = useState(() => storage.get(VIEW_KEY) === 'expert');
  const switchView = (on: boolean) => {
    storage.set(VIEW_KEY, on ? 'expert' : 'guided');
    setExpert(on);
  };
  return [expert, switchView];
}

/** The switch to the expert mode: both modes fill in the same form, nothing is lost on the way. */
function ViewSwitch({ expert, onChange }: { expert: boolean; onChange: (on: boolean) => void }) {
  const { t } = useI18n();
  return (
    <div className="renta-view">
      <label className="renta-check">
        <input
          type="checkbox"
          role="switch"
          checked={expert}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span>{t('tools.renta.view.expert')}</span>
      </label>
      <p className="section-hint">
        {t(expert ? 'tools.renta.view.expertHint' : 'tools.renta.view.guidedHint')}
      </p>
    </div>
  );
}

/** Step by step: your situation, your income, property, the deductions and the estimated result. */
export function RentaPlanner({
  initialIncome = '',
  mode,
  year = rentaState.year,
}: {
  initialIncome?: string;
  mode: RentaMode;
  /** The year of the return the data is saved for. */
  year?: number;
}) {
  const {
    form,
    set,
    setChoice,
    draft,
    setDraft,
    review,
    decideOn,
    recovered,
    ccaa,
    loadError,
    access,
    busy,
    wipes,
    startNew,
    family,
    input,
    live,
    savings,
    saved,
    comparison,
    all,
    found,
    dismissed,
    missing,
    pending,
    marked,
    hints,
    shown,
    calculate,
    reviewStart,
    startReview,
    accept,
  } = useRentaPlanner({ initialIncome, mode, year });
  const { t } = useI18n();
  const [expert, switchView] = useExpertView();
  const scope = scopeOf(form);

  return (
    <div className="renta-planner">
      <div className="renta-wipe">
        {recovered && (
          <p className="renta-recovered" role="status">
            {t('tools.renta.recovered')}
          </p>
        )}
        <UnderYear>
          <NewReturn
            year={year}
            hasActivity={(form.activities?.length ?? 0) > 0}
            onConfirm={startNew}
          />
        </UnderYear>
      </div>
      <ViewSwitch expert={expert} onChange={switchView} />
      <DraftStep
        key={wipes}
        form={form}
        set={set}
        missing={missing}
        marked={marked}
        access={access.draft}
        local={mode === 'local'}
        upgrade={<UpgradeCta access={access} />}
        draft={draft}
        onDraft={setDraft}
        accept={accept}
        comparison={comparison}
      />
      {expert ? (
        <>
          <FamilyStep form={form} set={set} ccaa={ccaa} loadError={loadError} />
          <IncomeStep form={form} set={set} extras={rentaWorkExtras} />
          <PropertyStep form={form} set={set} property={rentaProperty} />
        </>
      ) : (
        <GuidedInterview
          key={wipes}
          form={form}
          set={set}
          ccaa={ccaa}
          loadError={loadError}
          deductions={all}
          property={rentaProperty}
          reading={draft.reading}
          onReview={startReview}
        />
      )}
      <ActivitiesList form={form} set={set} result={live.result.activities} />
      <DeductionReview
        // A new community is a new list: the review starts again.
        key={ccaa?.id ?? ''}
        n={expert ? 4 : 2}
        ccaa={ccaa}
        deductions={all}
        candidates={found.candidates}
        outOfReach={found.outOfReach}
        dismissed={dismissed}
        review={review}
        choices={form.choices}
        savings={savings}
        markedSaving={saved}
        onDecide={decideOn}
        startSignal={reviewStart}
        invest={<InvestLink form={form} />}
      />
      <Optimizer form={form} set={set} ccaa={ccaa} found={found.candidates} savings={savings} />
      <DeductionsStep
        state={rentaState}
        ccaa={ccaa}
        loadError={loadError}
        choices={form.choices}
        family={family}
        blocked={live.result.blocked}
        hints={hints}
        savings={savings}
        markedSaving={saved}
        onChange={setChoice}
        n={expert ? 5 : 3}
        lead={
          <>
            <InvestCard form={form} set={set} input={input} />
            <h3>{t('tools.renta.donations.title')}</h3>
            <DonationsFields
              form={form}
              set={set}
              taxBase={live.result.taxBase + live.result.savingsBase}
            />
          </>
        }
      />

      <ResultSection
        access={access}
        shown={shown}
        busy={busy}
        pending={pending}
        calculate={calculate}
        mode={mode}
        n={expert ? 6 : 4}
        invest={<InvestLink form={form} />}
        imported={form.savingsDetail?.imported}
        input={input}
        scope={scope}
      />
      {shown && scope.kind !== 'out' && (
        <RentaFormPreview result={shown.result} input={input} year={year} />
      )}
    </div>
  );
}
