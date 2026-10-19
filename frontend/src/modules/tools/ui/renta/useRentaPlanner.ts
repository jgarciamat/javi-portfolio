import { useEffect, useMemo, useRef, useState } from 'react';
import { storage } from '@shared/utils/storage';
import {
  computeRenta,
  descendantBreakdown,
  type RentaInput,
  type RentaResult,
} from '../../domain/rentaCalc';
import type { RentaCcaa } from '../../domain/rentaData';
import {
  emptyForm,
  familyOf,
  number,
  partnerOf,
  toInput,
  type Choice,
  type RentaForm,
} from '../../domain/rentaForm';
import { workReductionOf } from '../../domain/rentaWork';
import { compareJoint } from '../../domain/rentaJoint';
import { rentaJoint } from '../../data/renta/conjunta';
import { useRentaAccess, type RentaMode } from '../../application/useRentaAccess';
import { loadCcaa } from '../../data/renta';
import { rentaWorkExtras } from '../../data/renta/estado-extra';
import { rentaProperty } from '../../data/renta/inmuebles';
import { rentaState } from '../../data/renta/state';
import { mentionedIn, NO_DRAFT, type DraftState } from '../../domain/rentaDraft';
import {
  decide,
  NO_REVIEW,
  reviewOf,
  situationOf,
  type Decision,
  type ReviewState,
} from '../../domain/rentaReview';
import type { DeductionSaving } from '../../domain/rentaSavings';
import { compareBoxes, ourBoxes } from '../../domain/rentaCompare';
import { deductionSavings, markedSaving } from '../../domain/rentaSavings';
import { clearProgress, loadProgress, saveProgress } from '../../application/rentaProgress';
import { forgetMappings } from '../../application/investImport';
import type { Snapshot } from './ResultStep';

const SNAPSHOT_KEY = 'mm_renta_snapshot_v2';
const NO_CCAA: RentaCcaa = { id: '', name: '', regime: 'common', deductions: [], source: '' };

/**
 * The deductions that could apply with what the person said (and what the draft has): the ones to
 * go through, the ones the income leaves out, and the ones pending an amount.
 */
function useDeductionHints(
  form: RentaForm,
  ccaa: RentaCcaa | null,
  draft: DraftState,
  review: ReviewState,
  live: Snapshot,
  savings: Record<string, DeductionSaving>
) {
  const all = useMemo(() => [...rentaState.deductions, ...(ccaa?.deductions ?? [])], [ccaa]);
  const mentioned = useMemo(
    () => (draft.reading ? mentionedIn(draft.reading.applied, all) : []),
    [all, draft]
  );
  // The draft's "it does not apply" and the review's are the same: nothing is asked twice.
  const dismissed = useMemo(
    () => [...new Set([...draft.dismissed, ...review.dismissed])],
    [draft.dismissed, review.dismissed]
  );
  const found = useMemo(
    () =>
      reviewOf(all, situationOf(form, draft), {
        result: live.result,
        savings,
        choices: form.choices,
        mentioned,
      }),
    [all, form, draft, live.result, savings, mentioned]
  );
  const missing = useMemo(
    () => found.candidates.filter((d) => !dismissed.includes(d.id)),
    [found, dismissed]
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

  return { all, found, dismissed, missing, pending, marked, hints };
}

/** The data saved for this year, if any: another year's data is not mixed with this one. */
function restoredFor(year: number) {
  const saved = loadProgress();
  return saved && saved.year === year ? saved : null;
}

/** The form and the draft: saved on the device as they change, and recovered on the way back. */
function useSavedPlanner(year: number, initialIncome: string) {
  const [restored] = useState(() => restoredFor(year));
  const [form, setForm] = useState<RentaForm>(() => restored?.form ?? emptyForm(initialIncome));
  const [draft, setDraftState] = useState<DraftState>(() => restored?.draft ?? NO_DRAFT);
  const [review, setReviewState] = useState<ReviewState>(() => restored?.review ?? NO_REVIEW);
  const [recovered, setRecovered] = useState(restored !== null);
  // Only what the person changes is saved: an untouched planner keeps the income of the year.
  const dirty = useRef(restored !== null);

  useEffect(() => {
    if (dirty.current) saveProgress({ year, form, draft, review });
  }, [year, form, draft, review]);

  const set = (patch: Partial<RentaForm>) => {
    dirty.current = true;
    setForm((f) => ({ ...f, ...patch }));
  };
  const setChoice = (id: string, choice: Choice) => {
    dirty.current = true;
    setForm((f) => ({ ...f, choices: { ...f.choices, [id]: choice } }));
  };
  const setDraft = (next: DraftState) => {
    dirty.current = true;
    setDraftState(next);
  };
  /** A decision of the review: "it applies" marks it (with its amount), the rest are kept apart. */
  const decideOn = (id: string, decision: Decision, choice?: Choice) => {
    dirty.current = true;
    setReviewState((r) => decide(r, id, decision));
    // The review's lists hold the decision from now on: the draft's list forgets it.
    setDraftState((d) => ({ ...d, dismissed: d.dismissed.filter((x) => x !== id) }));
    setForm((f) => {
      const current = f.choices[id];
      if (choice) return { ...f, choices: { ...f.choices, [id]: choice } };
      if (!current?.on) return f;
      return { ...f, choices: { ...f.choices, [id]: { ...current, on: false } } };
    });
  };
  const reset = () => {
    dirty.current = false;
    // Only this year's data: what is saved for another year is left alone.
    if (loadProgress()?.year === year) clearProgress();
    setForm(emptyForm(''));
    setDraftState(NO_DRAFT);
    setReviewState(NO_REVIEW);
    setRecovered(false);
  };
  return { form, set, setChoice, draft, setDraft, review, decideOn, recovered, reset };
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

/** The result as the data is now, with the joint return compared when the person can file one. */
function useLive(
  input: RentaInput,
  family: ReturnType<typeof familyOf>,
  form: RentaForm
): Snapshot {
  return useMemo(
    () => ({
      result: computeRenta(input),
      kids: descendantBreakdown(family, rentaState.minimums),
      joint:
        form.joint === 'couple' || form.joint === 'single'
          ? compareJoint(input, form.joint, partnerOf(form), {
              livesWithOtherParent: form.otherParent,
              rules: rentaJoint,
            })
          : null,
    }),
    [input, family, form]
  );
}

/** The community's data, loaded when it is chosen. */
function useCcaa(id: string) {
  const [ccaa, setCcaa] = useState<RentaCcaa | null>(null);
  const [loadError, setLoadError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setCcaa(null);
    setLoadError(false);
    if (!id) return undefined;
    loadCcaa(id)
      .then((data) => !cancelled && setCcaa(data))
      .catch(() => !cancelled && setLoadError(true));
    return () => {
      cancelled = true;
    };
  }, [id]);
  return { ccaa, loadError };
}

/**
 * Everything the planner works with, the same in the assistant and in the expert screen: the form
 * (saved on the device), the community, the free calculations, the live result and its insights.
 */
export function useRentaPlanner({
  initialIncome,
  mode,
  year,
}: {
  initialIncome: string;
  mode: RentaMode;
  year: number;
}) {
  const { form, set, setChoice, draft, setDraft, review, decideOn, recovered, reset } =
    useSavedPlanner(year, initialIncome);
  // Bumped from the guided summary: the review of the deductions starts.
  const [reviewStart, setReviewStart] = useState(0);
  const { ccaa, loadError } = useCcaa(form.ccaaId);
  const access = useRentaAccess(mode);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(() =>
    storage.getJSON<Snapshot | null>(SNAPSHOT_KEY, null)
  );
  const [busy, setBusy] = useState(false);
  // Bumped when the data is wiped, so the draft reader forgets its pasted text and messages too.
  const [wipes, setWipes] = useState(0);

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
  const live = useLive(input, family, form);
  const { savings, saved, comparison } = useInsights(input, live.result, ccaa, form, draft.reading);

  const { all, found, dismissed, missing, pending, marked, hints } = useDeductionHints(
    form,
    ccaa,
    draft,
    review,
    live,
    savings
  );

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
  const wipeNow = () => {
    reset();
    setWipes((n) => n + 1);
  };
  /**
   * «Start a new return»: this year's answers, data, draft, investments (with the column mappings
   * confirmed), properties and results are wiped. The activity brought from Autónomos is kept
   * unless `alsoActivity` (Autónomos' own data is never touched here).
   */
  const startNew = (alsoActivity: boolean) => {
    const activities = form.activities;
    wipeNow();
    storage.set(SNAPSHOT_KEY, null);
    setSnapshot(null);
    forgetMappings();
    if (!alsoActivity && activities?.length) set({ activities });
  };

  return {
    form,
    set,
    setChoice,
    draft,
    setDraft,
    review,
    decideOn,
    recovered,
    reset,
    ccaa,
    loadError,
    access,
    busy,
    wipes,
    wipeNow,
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
    startReview: () => setReviewStart((n) => n + 1),
    /** «It applies» from the draft's questions: marked, its amount to fill in. */
    accept: (id: string) => setChoice(id, { on: true, amount: '', units: '' }),
  };
}

export type RentaPlannerState = ReturnType<typeof useRentaPlanner>;
