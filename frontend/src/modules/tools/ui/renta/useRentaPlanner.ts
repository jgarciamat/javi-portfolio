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
  choicesOf,
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
import { useRentaAccess, type RentaMode } from '../../application/useRentaAccess';
import { CCAA_OPTIONS } from '../../data/renta';
import { loadCcaaFor, ownSnapshot, rentaRules } from '../../data/renta/ejercicios';
import { blockersOf, type RentaRules } from '../../domain/rentaRules';
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
import { draftDeductionIds, draftGaps, withGaps, type DraftGap } from '../../domain/rentaDraftGaps';
import { withDraftDeductions } from '../../domain/rentaDraftApply';
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
  rules: RentaRules,
  form: RentaForm,
  ccaa: RentaCcaa | null,
  draft: DraftState,
  review: ReviewState,
  live: Snapshot,
  savings: Record<string, DeductionSaving>
) {
  const all = useMemo(
    () => [...rules.state.deductions, ...(ccaa?.deductions ?? [])],
    [rules, ccaa]
  );
  const mentioned = useMemo(
    () =>
      draft.reading
        ? [
            ...new Set([
              ...mentionedIn(draft.reading.applied, all),
              ...draftDeductionIds(draft.reading.applied, all),
            ]),
          ]
        : [],
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

/**
 * The deductions the draft already applies that are not marked here yet, and the planner's result
 * with them added (rentaDraftGaps.ts): what they explain of the difference.
 */
function gapsOf(
  rules: RentaRules,
  reading: DraftState['reading'],
  input: RentaInput,
  form: RentaForm,
  ccaa: RentaCcaa | null
): { gaps: DraftGap[]; withGaps: number } {
  if (!reading) return { gaps: [], withGaps: 0 };
  const gaps = draftGaps(
    reading.applied,
    [...rules.state.deductions, ...(ccaa?.deductions ?? [])],
    form.choices
  );
  const choices = choicesOf({ ...form, choices: withGaps(form.choices, gaps) });
  return { gaps, withGaps: computeRenta({ ...input, choices }).result };
}

/** What each deduction saves with the data as it is, and the draft's boxes next to ours. */
function useInsights(
  rules: RentaRules,
  input: RentaInput,
  result: RentaResult,
  ccaa: RentaCcaa | null,
  form: RentaForm,
  reading: DraftState['reading']
) {
  const savings = useMemo(
    () => deductionSavings(input, [...rules.state.deductions, ...(ccaa?.deductions ?? [])], result),
    [rules, input, ccaa, result]
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
      ...gapsOf(rules, reading, input, form, ccaa),
    }),
    [rules, reading, result, input, form, ccaa]
  );
  return { savings, saved, comparison };
}

/** The result as the data is now, with the joint return compared when the person can file one. */
function useLive(
  rules: RentaRules,
  input: RentaInput,
  family: ReturnType<typeof familyOf>,
  form: RentaForm
): Snapshot {
  return useMemo(
    () => ({
      result: computeRenta(input),
      kids: descendantBreakdown(family, rules.state.minimums),
      joint:
        form.joint === 'couple' || form.joint === 'single'
          ? compareJoint(input, form.joint, partnerOf(form), {
              livesWithOtherParent: form.otherParent,
              rules: rules.joint,
            })
          : null,
    }),
    [rules, input, family, form]
  );
}

/**
 * Once a draft is read and its community's data is loaded, the deductions it already applies are
 * marked with what they give (rentaDraftApply.ts), so the planner starts from the draft's result.
 */
function useDraftDeductions({
  rules,
  form,
  set,
  draft,
  setDraft,
  ccaa,
}: {
  rules: RentaRules;
  form: RentaForm;
  set: (patch: Partial<RentaForm>) => void;
  draft: DraftState;
  setDraft: (draft: DraftState) => void;
  ccaa: RentaCcaa | null;
}) {
  useEffect(() => {
    const { reading } = draft;
    if (!draft.pending || !reading) return;
    // The community's deductions are needed to know which ones they are.
    if (reading.ccaaId && ccaa?.id !== reading.ccaaId) return;
    const all = [...rules.state.deductions, ...(ccaa?.deductions ?? [])];
    const { choices, donations } = withDraftDeductions(form, reading.applied, all);
    set(donations ? { choices, donations } : { choices });
    setDraft({ ...draft, pending: false });
  }, [rules, draft, ccaa, form, set, setDraft]);
}

/** The community's data of the year, loaded when it is chosen (null: that year has none of it). */
function useCcaa(year: number, id: string) {
  const [ccaa, setCcaa] = useState<RentaCcaa | null>(null);
  const [loadError, setLoadError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setCcaa(null);
    setLoadError(false);
    if (!id) return undefined;
    loadCcaaFor(year, id)
      .then((data) => !cancelled && setCcaa(data))
      .catch(() => !cancelled && setLoadError(true));
    return () => {
      cancelled = true;
    };
  }, [year, id]);
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
  const rules = useMemo(() => rentaRules(year), [year]);
  const { ccaa, loadError } = useCcaa(year, form.ccaaId);
  useDraftDeductions({ rules, form, set, draft, setDraft, ccaa });
  const access = useRentaAccess(mode);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(() =>
    storage.getJSON<Snapshot | null>(SNAPSHOT_KEY, null)
  );
  const [busy, setBusy] = useState(false);
  // Bumped when the data is wiped, so the draft reader forgets its pasted text and messages too.
  const [wipes, setWipes] = useState(0);

  const reduction = useMemo(() => workReductionOf(rules.state), [rules]);
  const family = useMemo(() => familyOf(form), [form]);
  const input = useMemo(
    () =>
      toInput(form, {
        state: rules.state,
        ccaa: ccaa ?? NO_CCAA,
        extras: rules.extras,
        property: rules.property,
        workReduction: reduction,
        activityTables: rules.activityTables,
      }),
    [rules, form, ccaa, reduction]
  );
  // What the return needs and the year has no official figure for: no result is shown.
  const blockers = useMemo(
    () =>
      blockersOf(rules, {
        ccaaId: form.ccaaId,
        rents: input.rental !== null,
        imputes: input.imputedValues.standard + input.imputedValues.revised > 0,
        objective: (form.activities ?? []).some(
          (a) => a.kind === 'modules' || a.kind === 'agrarian'
        ),
      }),
    [rules, form, input]
  );
  const live = useLive(rules, input, family, form);
  const { savings, saved, comparison } = useInsights(
    rules,
    input,
    live.result,
    ccaa,
    form,
    draft.reading
  );

  const { all, found, dismissed, missing, pending, marked, hints } = useDeductionHints(
    rules,
    form,
    ccaa,
    draft,
    review,
    live,
    savings
  );

  // A result saved for another year is not this year's, and a year missing figures shows none.
  const shown = blockers.length > 0 ? null : access.premium ? live : ownSnapshot(snapshot, year);
  const calculate = async () => {
    setBusy(true);
    const allowed = await access.consume();
    setBusy(false);
    if (allowed) {
      const kept = { ...live, year };
      storage.setJSON(SNAPSHOT_KEY, kept);
      setSnapshot(kept);
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
    rules,
    blockers,
    /** The community's name, also when the year has none of its data. */
    ccaaName: CCAA_OPTIONS.find((o) => o.id === form.ccaaId)?.name ?? '',
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
    // A year missing figures for this return gives no saving (rentaRules.ts, blockersOf).
    saved: blockers.length > 0 ? 0 : saved,
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
