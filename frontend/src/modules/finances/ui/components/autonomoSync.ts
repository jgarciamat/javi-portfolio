import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import { useApi } from '@core/context/ApiContext';
import { errorCode } from '@core/api/http';
import { storage } from '@shared/utils/storage';
import type { AutonomoCloudCopy, ExpenseKind } from '@modules/finances/domain/types';
import { missingOf, reviewOf, type KindPreferences } from '../../domain/invoiceLedger';
import { NO_EXTRAS, emptyManual, type Extras, type ManualForm } from './AutonomoManual';
import { withholdingsOf } from './withholdingForm';
import { activityOf, isEmptyActivity, type ActivityForm } from './activityForm';
import { NO_VAT_EXTRAS, isEmptyVat, vatExtrasOf, vatOfForm } from './vatForm';

/**
 * «Save in my account too»: the self-employed form copied to the account, encrypted on the server,
 * when the person turns it on (off by default). The device keeps its own copy as before; the account
 * one is there in case the browser is cleared or another device is used.
 *
 * Each save says which version of the account copy it is based on. When both copies changed since
 * they were last in sync, the person chooses which one to keep, and the other one is kept on the
 * device (`mm_autonomo_previous`) so nothing is lost.
 */

/** Everything the account keeps: the form, the other options and the kinds chosen per supplier. */
export interface AutonomoSaved {
  manual: ManualForm;
  extras: Extras;
  kinds: KindPreferences;
}

/** Wait after the last change before saving. */
export const SAVE_DELAY = 1500;
/** «Saved a moment ago» for this long, then the time. */
export const MOMENT = 60_000;
export const CLOUD_KEY = 'mm_autonomo_cloud';
export const PREVIOUS_KEY = 'mm_autonomo_previous';

/** What the device remembers about the account copy. */
interface CloudState {
  on: boolean;
  /** The version of the account copy this device last read or wrote. */
  version: number | null;
  /** A hash of the form when it was last the same as the account copy. */
  synced: string | null;
  /** When the account copy was saved. */
  savedAt: string | null;
  /** When the form last changed on this device. */
  changedAt: string | null;
  /** The account copy should go (wiped while offline): done before anything else. */
  pendingDelete: boolean;
}

const INITIAL: CloudState = {
  on: false,
  version: null,
  synced: null,
  savedAt: null,
  changedAt: null,
  pendingDelete: false,
};

export type CloudStatus =
  | 'off'
  | 'checking'
  | 'saving'
  | 'saved'
  | 'offline'
  | 'error'
  | 'unavailable'
  | 'tooLarge'
  | 'conflict'
  | 'deleteFailed';

export interface CloudConflict {
  local: AutonomoSaved;
  remote: AutonomoSaved;
  version: number;
  localAt: string | null;
  remoteAt: string;
}

/** The copy that was not chosen in a conflict (or swapped out), kept on the device. */
export interface PreviousCopy {
  data: AutonomoSaved;
  at: string;
}

/** A short, stable hash (FNV-1a) of the form: enough to know whether it changed. */
export function hashOf(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `${(h >>> 0).toString(36)}.${text.length}`;
}

type Partialish<T> = { [K in keyof T]?: T[K] extends object ? Partialish<T[K]> : T[K] };

/**
 * The form with exactly the fields the account takes, always in the same order, so two copies
 * with the same content are the same text. Missing parts (older data) take their empty value.
 */
export function toSaved(
  manual: Partialish<ManualForm>,
  extras: Partialish<Extras>,
  kinds: KindPreferences
): AutonomoSaved {
  const empty = emptyManual();
  const profile = { ...empty.profile, ...manual.profile };
  const prior = { ...empty.prior, ...manual.prior };
  const quarters = (manual.quarters ?? empty.quarters) as ManualForm['quarters'];
  const model130 = manual.model130 as ManualForm['model130'] | undefined;
  const options = { ...NO_EXTRAS, ...extras };
  return {
    manual: {
      profile: {
        workArea: profile.workArea,
        homeArea: profile.homeArea,
        vehicleExclusive: profile.vehicleExclusive,
        healthPeople: profile.healthPeople,
        healthDisability: profile.healthDisability,
      },
      prior: {
        on: prior.on,
        income: prior.income,
        expenses: prior.expenses,
        payments: prior.payments,
        withheld: prior.withheld,
      },
      quarters: quarters.map((q) => ({
        income: { r21: q.income.r21, r10: q.income.r10, r4: q.income.r4, r0: q.income.r0 },
        withheld: q.withheld,
        expenses: q.expenses.map((e) => ({
          kind: e.kind,
          amount: e.amount,
          vatRate: e.vatRate,
          days: e.days,
          // The VAT of the purchase, only when it is not the plain domestic case.
          ...(e.op && e.op !== 'domestic' ? { op: e.op } : {}),
          ...(e.investment ? { investment: true } : {}),
          ...(e.use && e.use !== 'common' ? { use: e.use } : {}),
        })),
        ...(isEmptyVat(q.vat) ? {} : { vat: vatOfForm(q.vat) }),
      })),
      invoices: ((manual.invoices ?? []) as ManualForm['invoices']).map((i) => ({
        id: i.id,
        book: i.book,
        kind: i.kind,
        excluded: i.excluded,
        date: i.date,
        quarter: i.quarter,
        base: i.base,
        vatRate: i.vatRate,
        vat: i.vat,
        total: i.total,
        withheld: i.withheld,
        concept: i.concept,
        period: i.period ?? null,
        // The withholding of a received invoice and its corrections (modelos 111 and 115).
        ...(i.retention !== undefined ? { retention: i.retention } : {}),
        ...(i.nif ? { nif: i.nif } : {}),
        ...(i.retentionFix !== undefined ? { retentionFix: i.retentionFix } : {}),
        ...(i.withholding ? { withholding: i.withholding } : {}),
        ...vatOfInvoice(i),
        // Read from a PDF: what is still to check (only on those, so the others stay as they were).
        ...(i.source === 'pdf'
          ? { source: i.source, review: [...reviewOf(i)], missing: [...missingOf(i)] }
          : {}),
      })),
      model130: model130
        ? {
            year: model130.year,
            quarter: model130.quarter,
            income: model130.income,
            expenses: model130.expenses,
          }
        : null,
      withholdings: withholdingsOf(manual as Pick<ManualForm, 'withholdings'>),
      ...(manual.filed303?.some((f) => f !== null)
        ? { filed303: [0, 1, 2, 3].map((i) => manual.filed303?.[i] ?? null) }
        : {}),
      // The activity of the year (assets, grants…), only when something was typed.
      ...(isEmptyActivity(manual.activity as ActivityForm | undefined)
        ? {}
        : { activity: activityOf(manual.activity as ActivityForm) }),
    },
    extras: {
      hardToJustify: options.hardToJustify,
      exempt: options.exempt,
      priorNet: options.priorNet,
      toOffset: options.toOffset,
      ...(JSON.stringify(vatExtrasOf(options.vat)) === JSON.stringify(NO_VAT_EXTRAS)
        ? {}
        : { vat: vatExtrasOf(options.vat) }),
    },
    kinds: Object.fromEntries(
      Object.keys(kinds)
        .sort()
        .map((k) => [k, kinds[k] as ExpenseKind])
    ),
  };
}

/** What an invoice is for VAT, only when the book or the reading said something (older data: none). */
function vatOfInvoice(i: ManualForm['invoices'][number]): Partial<ManualForm['invoices'][number]> {
  const flags = (['investment', 'cash', 'rateGuessed', 'opFix'] as const).filter((f) => i[f]);
  return {
    ...(i.op && i.op !== 'domestic' ? { op: i.op } : {}),
    ...(i.vatId ? { vatId: i.vatId } : {}),
    ...(i.key349 ? { key349: i.key349 } : {}),
    ...Object.fromEntries(flags.map((f) => [f, true])),
  };
}

/** The account copy as the form takes it. */
const fromRemote = (data: unknown): AutonomoSaved => {
  const d = data as Partial<AutonomoSaved>;
  return toSaved(d.manual ?? {}, d.extras ?? {}, d.kinds ?? {});
};

const EMPTY = JSON.stringify(toSaved(emptyManual(), NO_EXTRAS, {}).manual);
const EMPTY_EXTRAS = JSON.stringify(NO_EXTRAS);
/** Nothing typed or imported (the kinds remembered per supplier do not count). */
export const isEmpty = (saved: AutonomoSaved) =>
  JSON.stringify(saved.manual) === EMPTY && JSON.stringify(saved.extras) === EMPTY_EXTRAS;

/** What a failed request means for the person. */
function failure(error: unknown): CloudStatus {
  switch (errorCode(error)) {
    case 'NETWORK_ERROR':
      return 'offline';
    case 'AUTONOMO_SYNC_UNAVAILABLE':
      return 'unavailable';
    case 'AUTONOMO_DATA_TOO_LARGE':
    case 'PAYLOAD_TOO_LARGE':
      return 'tooLarge';
    default:
      return 'error';
  }
}

/** What to do once both copies are known. */
export type Decision =
  | { kind: 'same' }
  | { kind: 'push'; base: number | null }
  | { kind: 'take'; data: AutonomoSaved }
  | { kind: 'ask'; data: AutonomoSaved };

/**
 * The account copy against the device's: the same; only one of them changed since the last sync
 * (that one wins); or both changed (the person is asked). An empty device takes the account's
 * (a wipe deletes the account copy itself, so it never gets here with one).
 */
export function decide(
  remote: AutonomoCloudCopy | null,
  local: AutonomoSaved,
  known: Pick<CloudState, 'version' | 'synced'>
): Decision {
  const text = JSON.stringify(local);
  // Nothing usable in the account: this device's copy goes there.
  if (remote === null) return isEmpty(local) ? { kind: 'same' } : { kind: 'push', base: null };
  if (remote.unreadable) return { kind: 'push', base: remote.version };
  const data = fromRemote(remote.data);
  if (JSON.stringify(data) === text) return { kind: 'same' };
  // An empty form never replaces a full copy (its data was cleared from this browser).
  if (isEmpty(local)) return { kind: 'take', data };
  if (remote.version === known.version) return { kind: 'push', base: remote.version };
  const unchangedHere = known.version !== null && known.synced === hashOf(text);
  return unchangedHere ? { kind: 'take', data } : { kind: 'ask', data };
}

interface Current {
  state: CloudState;
  status: CloudStatus;
  saved: AutonomoSaved;
  json: string;
  apply: (data: AutonomoSaved) => void;
}

interface SyncDeps {
  api: ReturnType<typeof useApi>['businessApi'];
  current: MutableRefObject<Current>;
  /** A request is on its way: the debounced save waits for it. */
  busy: MutableRefObject<boolean>;
  /** The form that failed to save: tried again only once it changes. */
  failed: MutableRefObject<string | null>;
  /** The form as last seen, to tell a change by the person from a copy put in by `take`. */
  seen: MutableRefObject<string>;
  setState: (patch: Partial<CloudState>) => void;
  setStatus: (status: CloudStatus) => void;
  setConflict: (conflict: CloudConflict | null) => void;
}

/** The requests: save, compare and take the account copy. */
function syncWith(d: SyncDeps) {
  const take = (data: AutonomoSaved, version: number, updatedAt: string) => {
    const text = JSON.stringify(data);
    d.seen.current = text;
    d.current.current.apply(data);
    d.setState({ version, synced: hashOf(text), savedAt: updatedAt, changedAt: null });
    d.setStatus('saved');
  };

  const push = async (base: number | null): Promise<void> => {
    const { saved: sent, json: text } = d.current.current;
    d.busy.current = true;
    d.setStatus('saving');
    try {
      const result = await d.api.saveData(sent, base);
      d.failed.current = null;
      d.setState({ version: result.version, synced: hashOf(text), savedAt: result.updatedAt });
      d.setStatus('saved');
    } catch (e) {
      // Another device saved first: look at what is there now.
      if (errorCode(e) === 'AUTONOMO_DATA_CONFLICT') return await check();
      d.failed.current = text;
      d.setStatus(failure(e));
    } finally {
      d.busy.current = false;
    }
  };

  const check = async (): Promise<void> => {
    d.busy.current = true;
    d.setStatus('checking');
    try {
      if (d.current.current.state.pendingDelete) {
        await d.api.deleteData();
        d.setState({ pendingDelete: false, version: null });
      }
      const remote = await d.api.data();
      const { saved: local, json: text, state: known } = d.current.current;
      const decision = decide(remote, local, known);
      if (decision.kind === 'push') return await push(decision.base);
      const copy = remote as AutonomoCloudCopy;
      if (decision.kind === 'same') {
        d.setState({
          version: remote && copy.version,
          synced: hashOf(text),
          savedAt: remote && copy.updatedAt,
        });
        d.setStatus('saved');
      } else if (decision.kind === 'take') {
        take(decision.data, copy.version, copy.updatedAt);
      } else {
        d.setConflict({
          local,
          remote: decision.data,
          version: copy.version,
          localAt: known.changedAt,
          remoteAt: copy.updatedAt,
        });
        d.setStatus('conflict');
      }
    } catch (e) {
      d.setStatus(failure(e));
    } finally {
      d.busy.current = false;
    }
  };

  return { take, push, check };
}

/** What the person can do: turn it on or off, wipe, choose a copy, get the other one back. */
function actionsFor(
  d: SyncDeps,
  sync: ReturnType<typeof syncWith>,
  conflict: CloudConflict | null,
  previous: PreviousCopy | null,
  keepPrevious: (data: AutonomoSaved | null) => void
) {
  const deleteRemote = async (): Promise<unknown> => {
    d.busy.current = true;
    try {
      await d.api.deleteData();
      return null;
    } catch (e) {
      return e;
    } finally {
      d.busy.current = false;
    }
  };
  return {
    turnOn() {
      d.setState({ on: true });
      void sync.check();
    },
    /** `remove`: the account copy goes too. Stays on when it cannot be deleted. */
    async turnOff(remove: boolean) {
      if (remove && (await deleteRemote()) !== null) {
        d.setStatus('deleteFailed');
        return;
      }
      d.setState(
        remove ? { on: false, version: null, synced: null, savedAt: null } : { on: false }
      );
      d.setConflict(null);
      d.setStatus('off');
    },
    /**
     * After «Delete the current data» (`empty`: the form as it is left): the account copy goes
     * too, now or once back online.
     */
    async wipe(empty: AutonomoSaved) {
      keepPrevious(null);
      if (!d.current.current.state.on) return;
      d.setConflict(null);
      // From now on the empty form is what is in sync: it is not sent.
      d.setState({ version: null, synced: hashOf(JSON.stringify(empty)), savedAt: null });
      const error = await deleteRemote();
      d.setState({ pendingDelete: error !== null });
      d.setStatus(error === null ? 'saved' : failure(error) === 'offline' ? 'offline' : 'error');
    },
    /** Keeps one copy; the other one stays on the device in case it was the good one. */
    resolve(keep: 'local' | 'remote') {
      const c = conflict as CloudConflict;
      d.setConflict(null);
      keepPrevious(keep === 'remote' ? c.local : c.remote);
      if (keep === 'remote') {
        sync.take(c.remote, c.version, c.remoteAt);
      } else {
        d.setState({ version: c.version });
        void sync.push(c.version);
      }
    },
    /** Swaps the form for the copy kept aside (which keeps the current one). */
    restorePrevious() {
      const kept = previous as PreviousCopy;
      keepPrevious(d.current.current.saved);
      d.current.current.apply(kept.data);
    },
    dismissPrevious() {
      keepPrevious(null);
    },
    /** Tries again after an error. */
    retry() {
      d.failed.current = null;
      void sync.check();
    },
  };
}

/** The effects: note changes, check on opening, save after a pause, retry online, flush on leaving. */
function useSyncEffects(
  d: SyncDeps,
  sync: ReturnType<typeof syncWith>,
  state: CloudState,
  status: CloudStatus
) {
  const { json } = d.current.current;
  // A change by the person: remember when (shown if both copies differ).
  useEffect(() => {
    if (json === d.seen.current) return;
    d.seen.current = json;
    d.setState({ changedAt: new Date().toISOString() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [json]);

  // Opening the screen with the copy on: see what the account has.
  useEffect(() => {
    if (d.current.current.state.on) void sync.check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save a moment after the last change.
  useEffect(() => {
    if (!state.on || hashOf(json) === state.synced || d.failed.current === json) return;
    if (!SAVING.includes(status)) return;
    const timer = setTimeout(() => {
      if (!d.busy.current) void sync.push(d.current.current.state.version);
    }, SAVE_DELAY);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [json, state.on, state.synced, status]);

  // Back online: try again.
  useEffect(() => {
    if (!state.on) return;
    const back = () => {
      if (d.current.current.status === 'offline') void sync.check();
    };
    window.addEventListener('online', back);
    return () => window.removeEventListener('online', back);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.on]);

  // Leaving the screen with a change still waiting: save it now.
  useEffect(
    () => () => {
      const { state: known, json: text, saved: last } = d.current.current;
      if (known.on && !d.busy.current && hashOf(text) !== known.synced) {
        d.api.saveData(last, known.version).catch(() => undefined);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
}

/** Statuses in which a change is saved after the pause. */
const SAVING: CloudStatus[] = ['saved', 'saving', 'offline', 'error', 'tooLarge'];

/** Re-renders when «a moment ago» should turn into the time of the save. */
function useMomentTick(status: CloudStatus, savedAt: string | null) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (status !== 'saved' || !savedAt) return;
    const left = MOMENT - (Date.now() - new Date(savedAt).getTime());
    if (left <= 0) return;
    const timer = setTimeout(() => setTick((n) => n + 1), left);
    return () => clearTimeout(timer);
  }, [status, savedAt]);
}

/**
 * Keeps the account copy in step with `saved` while it is on. `apply` puts a copy (from the account,
 * or the one kept after a conflict) in the form.
 */
export function useAutonomoCloud(saved: AutonomoSaved, apply: (data: AutonomoSaved) => void) {
  const { businessApi } = useApi();
  const [state, setRawState] = useState<CloudState>(() => ({
    ...INITIAL,
    ...storage.getJSON<Partial<CloudState>>(CLOUD_KEY, {}),
  }));
  const [status, setRawStatus] = useState<CloudStatus>(state.on ? 'checking' : 'off');
  const [conflict, setConflict] = useState<CloudConflict | null>(null);
  const [previous, setPrevious] = useState<PreviousCopy | null>(() =>
    storage.getJSON<PreviousCopy | null>(PREVIOUS_KEY, null)
  );
  const json = JSON.stringify(saved);
  const current = useRef<Current>({ state, status, saved, json, apply });
  current.current = { ...current.current, saved, json, apply };
  const busy = useRef(false);
  const failed = useRef<string | null>(null);
  const seen = useRef(json);

  const deps: SyncDeps = {
    api: businessApi,
    current,
    busy,
    failed,
    seen,
    setState: (patch) => {
      const next = { ...current.current.state, ...patch };
      current.current.state = next;
      storage.setJSON(CLOUD_KEY, next);
      setRawState(next);
    },
    setStatus: (next) => {
      current.current.status = next;
      setRawStatus(next);
    },
    setConflict,
  };
  const keepPrevious = (data: AutonomoSaved | null) => {
    const copy = data && { data, at: new Date().toISOString() };
    if (copy) storage.setJSON(PREVIOUS_KEY, copy);
    else storage.set(PREVIOUS_KEY, null);
    setPrevious(copy);
  };
  const sync = syncWith(deps);
  useSyncEffects(deps, sync, state, status);
  useMomentTick(status, state.savedAt);

  return {
    on: state.on,
    status,
    savedAt: state.savedAt,
    conflict,
    previous,
    ...actionsFor(deps, sync, conflict, previous, keepPrevious),
  };
}

export type AutonomoCloud = ReturnType<typeof useAutonomoCloud>;
