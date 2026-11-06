import { useEffect, useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { captureSupported } from '@core/capture/notificationCapture';
import { Icon } from '@shared/components/Icon';
import { useFinances } from '../../application/FinancesContext';
import { useReviewTray, type ReviewToast } from '../../application/hooks/useReviewTray';
import type { DetectedPayment } from '../../domain/bankNotifications';
import { recentCategories } from '../../domain/quickEntry';
import { ReviewCard } from './ReviewCard';
import { bringIntoView } from './bringIntoView';
import '../css/Sections.css';

export { UNDO_MS } from '../../application/hooks/useReviewTray';
export { SWIPE_PX } from './ReviewCard';

/** How many wait, how to go through them and, on the free plan, how many it can still add. */
function TrayIntro({
  count,
  remaining,
  limit,
}: {
  count: number;
  remaining: number | null;
  limit: number | null | undefined;
}) {
  const { t } = useI18n();
  if (count === 0) return null;
  return (
    <>
      <p className="section-hint">
        {count === 1 ? t('app.review.hint.one') : t('app.review.hint', { count })}
      </p>
      {remaining !== null && (
        <p className={remaining === 0 ? 'form-error' : 'section-hint'}>
          {remaining === 0
            ? t('app.review.noneLeft', { limit: limit as number })
            : t('app.review.left', { count: remaining, limit: limit as number })}
        </p>
      )}
    </>
  );
}

/** «Añadido: Mercadona. Deshacer», for a few seconds (a live region, also for screen readers). */
function TrayToast({ toast }: { toast: ReviewToast | null }) {
  const { t } = useI18n();
  return (
    <div className="review-toast" role="status">
      {toast && (
        <>
          <span>{toast.message}</span>
          <button className="btn-secondary review-btn" onClick={toast.undo}>
            {t('app.review.undo')}
          </button>
        </>
      )}
    </div>
  );
}

/**
 * «Para revisar»: the payments found in the bank notifications, already filled in. Add, discard or
 * change the category of each one with a swipe or a button; «Deshacer» stays a few seconds. When
 * the same shop goes to the same category twice in a row by hand, a rule learns it. Free on every
 * plan; the free plan adds 15 detected payments a month (the rest wait here).
 */
export function ReviewTray({
  focus = false,
  onFocused,
}: {
  focus?: boolean;
  onFocused?: () => void;
}) {
  const { t } = useI18n();
  const f = useFinances();
  const tray = useReviewTray();
  const [picking, setPicking] = useState<string | null>(null);
  const { visible } = tray;
  const names = f.categories.map((c) => c.name);

  useEffect(() => {
    if (!focus) return;
    bringIntoView('review-tray', ['.review-card']);
    onFocused?.();
  }, [focus, onFocused]);

  /** Any action closes the category list. */
  const closing =
    <A extends unknown[]>(action: (...args: A) => void) =>
    (...args: A) => {
      setPicking(null);
      action(...args);
    };
  const discard = closing((items: DetectedPayment[]) => tray.discard(items));

  if (!captureSupported() || (visible.length === 0 && !tray.toast)) return null;

  return (
    <section id="review-tray" className="card review-tray" aria-label={t('app.review.title')}>
      <h2 className="section-title">
        <Icon name="bell" /> {t('app.review.title')}
        {visible.length > 0 && <span className="review-count">{visible.length}</span>}
      </h2>
      <TrayIntro count={visible.length} remaining={tray.remaining} limit={tray.limit} />
      <p id="review-keys" className="sr-only">
        {t('app.review.keys')}
      </p>
      {tray.error && <p className="form-error">{tray.error}</p>}
      <ul className="review-list">
        {visible.map((item) => (
          <ReviewCard
            key={item.id}
            item={item}
            category={tray.categoryOf(item)}
            suggestion={tray.suggestions[item.id]}
            picking={picking === item.id}
            recent={recentCategories(f.transactions, item.type).filter((c) => names.includes(c))}
            categories={names}
            onAdd={closing(() => tray.addOne(item))}
            onDiscard={() => discard([item])}
            onPick={() => setPicking((p) => (p === item.id ? null : item.id))}
            onChoose={closing((category: string) => tray.choose(item, category))}
          />
        ))}
      </ul>
      {visible.length > 1 && (
        <div className="button-row">
          <button className="btn-secondary review-btn" onClick={closing(tray.addAll)}>
            {t('app.review.addAll')}
          </button>
          <button className="btn-secondary review-btn" onClick={() => discard(visible)}>
            {t('app.review.discardAll')}
          </button>
        </div>
      )}
      <TrayToast toast={tray.toast} />
    </section>
  );
}
