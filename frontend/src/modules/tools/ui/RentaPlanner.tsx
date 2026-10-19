import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '@core/i18n/I18nContext';
import { storage } from '@shared/utils/storage';
import {
  computeRenta,
  descendantBreakdown,
  incomeFactor,
  limitBaseFor,
  type RentaInput,
  type RentaResult,
} from '../domain/rentaCalc';
import type { RentaCcaa } from '../domain/rentaData';
import {
  emptyForm,
  familyOf,
  number,
  toInput,
  type Choice,
  type RentaForm,
} from '../domain/rentaForm';
import { workReductionOf } from '../domain/rentaWork';
import { useRentaAccess, type RentaAccess, type RentaMode } from '../application/useRentaAccess';
import { loadCcaa } from '../data/renta';
import { rentaWorkExtras } from '../data/renta/estado-extra';
import { rentaProperty } from '../data/renta/inmuebles';
import { rentaState } from '../data/renta/state';
import { mentionedIn, missingDeductions, NO_DRAFT, type DraftState } from '../domain/rentaDraft';
import { compareBoxes, ourBoxes } from '../domain/rentaCompare';
import { deductionSavings, markedSaving } from '../domain/rentaSavings';
import { DeductionsStep, PendingNotice } from './renta/DeductionsStep';
import { DraftStep } from './renta/DraftStep';
import { FamilyStep } from './renta/FamilyStep';
import { IncomeStep } from './renta/IncomeStep';
import { PropertyStep } from './renta/PropertyStep';
import { ResultCard, type Snapshot } from './renta/ResultStep';
import { Step, useMoney } from './renta/shared';
import './css/Renta.css';
import { PremiumGate } from '@modules/billing/ui/PremiumGate';

const SNAPSHOT_KEY = 'mm_renta_snapshot_v2';
const NO_CCAA: RentaCcaa = { id: '', name: '', regime: 'common', deductions: [], source: '' };

/** The way to more calculations: the upgrade dialog in the app, a free account outside it. */
function UpgradeCta({ access }: { access: RentaAccess }) {
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

/** What the draft says about the deductions: what is missing, pending an amount or already in it. */
function useDeductionHints(
  form: RentaForm,
  ccaa: RentaCcaa | null,
  draft: DraftState,
  family: ReturnType<typeof familyOf>,
  live: Snapshot
) {
  const all = useMemo(() => [...rentaState.deductions, ...(ccaa?.deductions ?? [])], [ccaa]);
  const mentioned = useMemo(
    () => (draft.reading ? mentionedIn(draft.reading.applied, all) : []),
    [all, draft]
  );
  // With the person's income some deductions cannot be claimed: asking about them would be pointless.
  const missing = useMemo(
    () =>
      draft.reading
        ? missingDeductions(
            all.filter(
              (d) =>
                !draft.dismissed.includes(d.id) &&
                !form.choices[d.id]?.on &&
                incomeFactor(d, limitBaseFor(d, live.result)) > 0
            ),
            mentioned,
            {
              childAges: family.children.map((c) => c.age),
              ascendants: form.ascendants.length,
              disability: [
                form.disability,
                ...form.children.map((c) => c.disability),
                ...form.ascendants.map((a) => a.disability),
              ].some((level) => level > 0),
              rents: draft.rents,
            }
          )
        : [],
    [all, draft, form, family, mentioned, live.result]
  );
  const pending = useMemo(
    () =>
      all
        .filter((d) => {
          const choice = form.choices[d.id];
          const needsAmount = d.kind === 'percent' || d.kind === 'special';
          return choice?.on && needsAmount && number(choice.amount) <= 0;
        })
        .map((d) => d.id),
    [all, form.choices]
  );
  const marked = Object.values(form.choices).filter((c) => c.on).length;
  const hints = useMemo(() => {
    const map: Record<string, 'inDraft' | 'missing'> = {};
    for (const id of mentioned) map[id] = 'inDraft';
    for (const d of missing) map[d.id] = 'missing';
    return map;
  }, [mentioned, missing]);

  return { missing, pending, marked, hints };
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
function ResultSection({
  access,
  shown,
  busy,
  pending,
  calculate,
  mode,
}: {
  access: RentaAccess;
  shown: Snapshot | null;
  busy: boolean;
  pending: string[];
  calculate: () => Promise<void>;
  mode: RentaMode;
}) {
  const { t } = useI18n();
  const money = useMoney();
  const inApp = mode === 'account';
  return (
    <Step n={5} titleKey="tools.renta.step4" className="renta-result">
      <div aria-live="polite">
        {access.loading && <p className="section-hint">{t('app.common.loading')}</p>}
        {!access.loading && !shown && (
          <BeforeResult access={access} busy={busy} calculate={calculate} inApp={inApp} />
        )}
        {shown && (
          <>
            <PendingNotice pending={pending} />
            <ResultCard shown={shown} money={money} />
            {!access.premium && (
              <AfterFreeResult access={access} busy={busy} calculate={calculate} inApp={inApp} />
            )}
          </>
        )}
        <p className="plan-note">{t('tools.renta.disclaimerFull', { year: rentaState.year })}</p>
      </div>
    </Step>
  );
}

/** What each deduction saves with the data as it is, and the draft's boxes next to ours. */
function useInsights(
  input: RentaInput,
  result: RentaResult,
  ccaa: RentaCcaa | null,
  form: RentaForm,
  reading: DraftState['reading']
) {
  const savings = useMemo(
    () => deductionSavings(input, [...rentaState.deductions, ...(ccaa?.deductions ?? [])], result),
    [input, ccaa, result]
  );
  const saved = useMemo(() => markedSaving(input, result), [input, result]);
  const comparison = useMemo(
    () => ({
      rows: reading
        ? compareBoxes(reading.boxes, ourBoxes(result, input), {
            disability: form.disability,
            retired: form.retired,
            mobility: form.mobility,
            socialSecurityTyped: form.socialSecurity.trim() !== '',
            nonSalary: number(form.nonSalary),
          })
        : [],
      result: result.result,
    }),
    [reading, result, input, form]
  );
  return { savings, saved, comparison };
}

/** Step by step: your situation, your income, property, the deductions and the estimated result. */
export function RentaPlanner({
  initialIncome = '',
  mode,
}: {
  initialIncome?: string;
  mode: RentaMode;
}) {
  const { t } = useI18n();
  const [form, setForm] = useState<RentaForm>(() => emptyForm(initialIncome));
  const [ccaa, setCcaa] = useState<RentaCcaa | null>(null);
  const [loadError, setLoadError] = useState(false);
  const access = useRentaAccess(mode);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(() =>
    storage.getJSON<Snapshot | null>(SNAPSHOT_KEY, null)
  );
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<DraftState>(NO_DRAFT);
  // Bumped when the data is wiped, so the draft reader forgets its pasted text and messages too.
  const [wipes, setWipes] = useState(0);
  const set = (patch: Partial<RentaForm>) => setForm((f) => ({ ...f, ...patch }));

  useEffect(() => {
    let cancelled = false;
    setCcaa(null);
    setLoadError(false);
    if (!form.ccaaId) return undefined;
    loadCcaa(form.ccaaId)
      .then((data) => !cancelled && setCcaa(data))
      .catch(() => !cancelled && setLoadError(true));
    return () => {
      cancelled = true;
    };
  }, [form.ccaaId]);

  const reduction = useMemo(() => workReductionOf(rentaState), []);
  const family = useMemo(() => familyOf(form), [form]);
  const input = useMemo(
    () =>
      toInput(form, {
        state: rentaState,
        ccaa: ccaa ?? NO_CCAA,
        extras: rentaWorkExtras,
        property: rentaProperty,
        workReduction: reduction,
      }),
    [form, ccaa, reduction]
  );
  const live: Snapshot = useMemo(
    () => ({
      result: computeRenta(input),
      kids: descendantBreakdown(family, rentaState.minimums),
    }),
    [input, family]
  );
  const { savings, saved, comparison } = useInsights(input, live.result, ccaa, form, draft.reading);

  const { missing, pending, marked, hints } = useDeductionHints(form, ccaa, draft, family, live);

  const shown = access.premium ? live : snapshot;
  const calculate = async () => {
    setBusy(true);
    const allowed = await access.consume();
    setBusy(false);
    if (allowed) {
      storage.setJSON(SNAPSHOT_KEY, live);
      setSnapshot(live);
    }
  };
  const wipe = () => {
    if (!window.confirm(t('tools.renta.wipeConfirm'))) return;
    setForm(emptyForm(''));
    setDraft(NO_DRAFT);
    setWipes((n) => n + 1);
  };
  const setChoice = (id: string, choice: Choice) =>
    setForm((f) => ({ ...f, choices: { ...f.choices, [id]: choice } }));

  return (
    <div className="renta-planner">
      <div className="renta-wipe">
        <button type="button" className="btn-secondary" onClick={wipe}>
          {t('tools.renta.wipe')}
        </button>
      </div>
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
        accept={(id) => setChoice(id, { on: true, amount: '', units: '' })}
        comparison={comparison}
      />
      <FamilyStep form={form} set={set} ccaa={ccaa} loadError={loadError} />
      <IncomeStep form={form} set={set} extras={rentaWorkExtras} />
      <PropertyStep form={form} set={set} property={rentaProperty} />
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
      />

      <ResultSection
        access={access}
        shown={shown}
        busy={busy}
        pending={pending}
        calculate={calculate}
        mode={mode}
      />
    </div>
  );
}
