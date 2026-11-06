import { useEffect, useRef, useState } from 'react';
import { useApi } from '@core/context/ApiContext';
import { useI18n } from '@core/i18n/I18nContext';
import { useOptionalPlan } from '@modules/billing/application/PlanContext';
import { useFinances } from '../FinancesContext';
import { learningEnabled, loadStreak, saveStreak } from '../capturedPayments';
import type { DetectedPayment } from '../../domain/bankNotifications';
import { merchantKey, nextStreak } from '../../domain/reviewLearning';
import { useCapturedPayments } from './useCapturedPayments';

/** How long «Deshacer» stays: an added payment is only sent when it is over. */
export const UNDO_MS = 5000;
/** The shortest text a rule can have (the server's minimum). */
const PATTERN_MIN = 3;

export interface ReviewToast {
  message: string;
  undo: () => void;
}

interface Job {
  item: DetectedPayment;
  category?: string;
  timer: number;
}

/**
 * What «Para revisar» does: adds (after a few seconds of «Deshacer»), discards (and puts back),
 * keeps the category chosen for each payment, counts what the free plan has left this month and
 * learns a rule when the same shop goes to the same category twice in a row.
 */
export function useReviewTray() {
  const { t } = useI18n();
  const { categoryRuleApi } = useApi();
  const f = useFinances();
  const plan = useOptionalPlan();
  const captured = useCapturedPayments();
  const { pending, suggestions, add, ignore, restore } = captured;
  const [adding, setAdding] = useState<string[]>([]);
  const [chosen, setChosen] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<ReviewToast | null>(null);
  const job = useRef<Job | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  const visible = pending.filter((p) => !adding.includes(p.id));
  const limit = plan?.overview?.limits.resources.captures;
  const used = plan?.overview?.usage.captures ?? 0;
  const remaining =
    limit === null || limit === undefined ? null : Math.max(0, limit - used - adding.length);
  const categoryOf = (item: DetectedPayment): string | undefined =>
    chosen[item.id] ?? (suggestions[item.id]?.category || undefined);

  const hideToast = () => {
    window.clearTimeout(toastTimer.current);
    setToast(null);
  };
  const show = (message: string, undo: () => void) => {
    window.clearTimeout(toastTimer.current);
    setToast({
      message,
      undo: () => {
        hideToast();
        undo();
      },
    });
    toastTimer.current = window.setTimeout(() => setToast(null), UNDO_MS);
  };

  /** The rule learnt from two confirmations in a row; its «Deshacer» removes it. */
  const learn = async (item: DetectedPayment, category: string | undefined) => {
    const shop = merchantKey(item.description);
    if (!learningEnabled() || !category || !shop) return;
    const { streak, learn: now } = nextStreak(loadStreak(shop), category, suggestions[item.id]);
    saveStreak(shop, streak);
    const target = f.categories.find((c) => c.name === category);
    if (!now || !target) return;
    try {
      const { pattern } = await categoryRuleApi.suggest(item.description);
      if (pattern.length < PATTERN_MIN) return;
      const rule = await categoryRuleApi.add(pattern, target.id);
      show(t('app.review.learnt', { name: item.description, category }), () => {
        void categoryRuleApi.remove(rule.id).catch(() => undefined);
      });
    } catch {
      /* a rule is only a help: the payment is already added */
    }
  };

  const commit = async (next: Omit<Job, 'timer'>) => {
    const done = await add([next.item], next.category ? { [next.item.id]: next.category } : {});
    setAdding((list) => list.filter((id) => id !== next.item.id));
    if (done) await learn(next.item, next.category);
  };

  /** Sends the payment waiting for its «Deshacer» now (another action, or leaving the screen). */
  const flush = () => {
    const current = job.current;
    if (!current) return;
    window.clearTimeout(current.timer);
    job.current = null;
    void commit(current);
  };
  const flushRef = useRef(flush);
  flushRef.current = flush;
  useEffect(
    () => () => {
      window.clearTimeout(toastTimer.current);
      flushRef.current();
    },
    []
  );

  const upgrade = () =>
    plan?.openUpgrade({ kind: 'limit', resource: 'captures', limit: limit as number });

  const addOne = (item: DetectedPayment) => {
    if (remaining === 0) return upgrade();
    flush();
    setAdding((list) => [...list, item.id]);
    job.current = { item, category: categoryOf(item), timer: window.setTimeout(flush, UNDO_MS) };
    show(t('app.review.added', { name: item.description }), () => {
      if (job.current?.item.id === item.id) {
        window.clearTimeout(job.current.timer);
        job.current = null;
      }
      setAdding((list) => list.filter((id) => id !== item.id));
    });
  };

  const discard = (items: DetectedPayment[]) => {
    flush();
    const places = items.map((item) => ({ item, index: pending.indexOf(item) }));
    ignore(items);
    const message =
      items.length === 1
        ? t('app.review.discarded', { name: items[0].description })
        : t('app.review.discardedAll', { count: items.length });
    show(message, () => places.forEach(({ item, index }) => restore(item, index)));
  };

  /** Adds everything waiting, as many as the free plan has left this month. */
  const addAll = () => {
    flush();
    const count = remaining === null ? visible.length : Math.min(remaining, visible.length);
    if (count > 0) void add(visible.slice(0, count), chosen);
    if (count < visible.length) upgrade();
  };

  const choose = (item: DetectedPayment, category: string) =>
    setChosen((c) => ({ ...c, [item.id]: category }));

  return {
    visible,
    suggestions,
    error: captured.error,
    toast,
    limit,
    remaining,
    categoryOf,
    choose,
    addOne,
    discard,
    addAll,
  };
}
