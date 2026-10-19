import { useState } from 'react';
import { useApi } from '@core/context/ApiContext';
import { useI18n } from '@core/i18n/I18nContext';
import { recordPositiveMoment } from '@core/review/review';
import { useOptionalPlan } from '@modules/billing/application/PlanContext';
import { useAction } from '@shared/hooks/useAction';
import { storage } from '@shared/utils/storage';
import { useWizardProgress } from '@modules/wizard/application/useWizard';
import {
  NO_EXTRAS,
  emptyManual,
  toManualData,
  type Extras,
  type ManualForm,
} from './AutonomoManual';
import { vatExtrasOf } from './vatForm';
import { buildInputs } from './autonomoInputs';
import { EXTRAS_KEY, MANUAL_KEY, openingPeriod } from './autonomoForRenta';
import { toSaved, useAutonomoCloud } from './autonomoSync';
import { KIND_PREFERENCES_KEY } from './importForm';
import type { KindPreferences } from '../../domain/invoiceLedger';
import type { ReviewFocus } from './InvoiceReview';
import { checkImport } from '../../domain/importChecks';
import { quarterDraftAccess } from './AutonomoLimit';
import { AUTONOMO_STEPS, AUTONOMO_WIZARD_KEY } from '../../domain/autonomoWizard';
import type { AutonomoDraft, AutonomoInputs } from '@modules/finances/domain/types';

const SNAPSHOT_KEY = 'mm_autonomo_draft2';

/** The last draft with the data it was prepared from (to put them in the PDF). */
export interface Snapshot {
  draft: AutonomoDraft;
  inputs: AutonomoInputs | null;
}
export const QUARTERS = [1, 2, 3, 4] as const;
const THIS_YEAR = new Date().getFullYear();
export const YEARS = [THIS_YEAR - 1, THIS_YEAR, THIS_YEAR + 1];

export type Quarter = 1 | 2 | 3 | 4;

/** What the 390 of last year hands to this one: the VAT to offset and the provisional prorrata. */
export const withCarry = (
  extras: Extras,
  carry: { toOffset: string; provisional: string | null }
): Extras => ({
  ...extras,
  toOffset: carry.toOffset,
  vat: {
    ...vatExtrasOf(extras.vat),
    ...(carry.provisional !== null ? { provisional: carry.provisional } : {}),
  },
});

/** An invoice in the review (null: the review itself), from a warning or from an imported file. */
export const nextFocus =
  (id: string | null) =>
  (f: ReviewFocus | null): ReviewFocus => ({ id, n: (f?.n ?? 0) + 1 });

/** Today as `YYYY-MM-DD` in the person's time zone. */
const today = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
};

/** What to look at in the imported invoices before preparing the draft of a quarter. */
const checksFor = (manual: ManualForm, extras: Extras, year: number, quarter: Quarter) =>
  checkImport({
    invoices: manual.invoices,
    manual: toManualData(manual),
    year,
    today: today(),
    // With the filed modelo 130 on, only the quarter of the draft is on screen.
    from: manual.prior.on && quarter > 1 ? quarter : 1,
    upTo: quarter,
    model130: manual.model130,
    hardToJustify: extras.hardToJustify,
  });

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

/** The other options, kept on the device too (and in the account with the rest). */
function useStoredExtras() {
  const [extras, setExtras] = useState<Extras>(() => ({
    ...NO_EXTRAS,
    ...storage.getJSON<Partial<Extras>>(EXTRAS_KEY, {}),
  }));
  const changeExtras = (next: Extras) => {
    storage.setJSON(EXTRAS_KEY, next);
    setExtras(next);
  };
  return [extras, changeExtras] as const;
}

/**
 * Everything the self-employed screen works with, the same in the assistant and in the screen with
 * everything together: the form and its options (on the device and, when turned on, in the
 * account), the period, the warnings, the draft prepared and the progress of the assistant.
 */
export function useAutonomoDraft() {
  const { businessApi } = useApi();
  const { t } = useI18n();
  const plan = useOptionalPlan();
  const action = useAction();
  const [extras, setExtras] = useStoredExtras();
  // Bumped when the data is wiped, so the import panels forget their messages too.
  const [wipes, setWipes] = useState(0);
  const [manual, changeManual] = useStoredManual();
  // The quarter just ended while it can be filed (the 3T until 20 October, the 4T of last year until
  // 30 January), else the current one; or the year of the invoices and its last quarter with them.
  const [opening] = useState(() => openingPeriod(manual, YEARS, new Date()));
  const [year, setYear] = useState(opening.year);
  const [quarter, setQuarter] = useState<Quarter>(opening.quarter);
  const [focus, setFocus] = useState<ReviewFocus | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(() =>
    storage.getJSON<Snapshot | null>(SNAPSHOT_KEY, null)
  );

  const wizard = useWizardProgress(AUTONOMO_WIZARD_KEY, AUTONOMO_STEPS);
  const kinds = storage.getJSON<KindPreferences>(KIND_PREFERENCES_KEY, {});
  const cloud = useAutonomoCloud(toSaved(manual, extras, kinds, wizard.progress), (data) => {
    storage.setJSON(KIND_PREFERENCES_KEY, data.kinds);
    changeManual(data.manual);
    setExtras(data.extras);
    // An older copy has no progress: the device keeps its own.
    if (data.wizard) wizard.replace(data.wizard);
  });

  const hasManual = JSON.stringify(manual) !== JSON.stringify(emptyManual());
  const hasData = hasManual || JSON.stringify(extras) !== JSON.stringify(NO_EXTRAS);
  /** Everything typed goes (and the account copy, when there is one). */
  const wipeNow = () => {
    changeManual(emptyManual());
    setExtras(NO_EXTRAS);
    setWipes((n) => n + 1);
    wizard.restart();
    void cloud.wipe(toSaved(emptyManual(), NO_EXTRAS, kinds));
  };
  const wipe = () => {
    if (window.confirm(t(cloud.on ? 'app.autonomo.wipeConfirmCloud' : 'app.autonomo.wipeConfirm')))
      wipeNow();
  };

  const checks = checksFor(manual, extras, year, quarter);
  const { limit, locked, otherQuarter } = quarterDraftAccess(plan, year, quarter);
  const prepare = () =>
    action.run(async () => {
      const inputs = buildInputs(manual, extras, year, quarter);
      const result = await businessApi.draft(year, quarter, inputs);
      const next: Snapshot = { draft: result, inputs };
      storage.setJSON(SNAPSHOT_KEY, next);
      setSnapshot(next);
      recordPositiveMoment();
      await plan?.refresh();
    });

  return {
    year,
    setYear,
    /** The year and quarter a PDF is about. */
    setPeriod: (y: number, q: Quarter) => {
      setYear(y);
      setQuarter(q);
    },
    /** Opens an imported invoice in the review. */
    showInvoice: (id: string | null) => setFocus(nextFocus(id)),
    /** What the 390 of last year hands to this one. */
    carry: (c: { toOffset: string; provisional: string | null }) => setExtras(withCarry(extras, c)),
    setActivity: (activity: ManualForm['activity']) => changeManual({ ...manual, activity }),
    quarter,
    setQuarter,
    extras,
    setExtras,
    wipes,
    manual,
    changeManual,
    focus,
    setFocus,
    snapshot,
    cloud,
    wizard,
    hasManual,
    hasData,
    wipe,
    wipeNow,
    checks,
    access: { limit, locked, otherQuarter },
    prepare,
    action,
  };
}

export type AutonomoState = ReturnType<typeof useAutonomoDraft>;
