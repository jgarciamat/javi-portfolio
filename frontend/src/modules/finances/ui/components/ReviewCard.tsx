import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import { Icon } from '@shared/components/Icon';
import type { ReviewSuggestion } from '../../application/hooks/useCapturedPayments';
import type { DetectedPayment } from '../../domain/bankNotifications';

/** How far a card has to be dragged to count as a swipe (px). */
export const SWIPE_PX = 80;

/** A sideways drag with the finger or the mouse: right past the threshold adds, left discards. */
function useSwipe(onAdd: () => void, onDiscard: () => void) {
  const start = useRef<number | null>(null);
  const [dx, setDx] = useState(0);
  const reset = () => {
    start.current = null;
    setDx(0);
  };
  const handlers = {
    onPointerDown: (e: PointerEvent<HTMLLIElement>) => {
      if ((e.target as HTMLElement).closest('button, select')) return;
      start.current = e.clientX;
      e.currentTarget.setPointerCapture?.(e.pointerId);
    },
    onPointerMove: (e: PointerEvent<HTMLLIElement>) => {
      if (start.current !== null) setDx(e.clientX - start.current);
    },
    onPointerUp: () => {
      const moved = start.current === null ? 0 : dx;
      reset();
      if (moved >= SWIPE_PX) onAdd();
      else if (moved <= -SWIPE_PX) onDiscard();
    },
    onPointerCancel: reset,
  };
  return { dx, handlers };
}

/** The arrows on the focused card: right or Enter adds, left or Delete discards. */
const keysFor = (onAdd: () => void, onDiscard: () => void) => (e: KeyboardEvent<HTMLLIElement>) => {
  if (e.target !== e.currentTarget) return;
  if (e.key === 'ArrowRight' || e.key === 'Enter') onAdd();
  else if (['ArrowLeft', 'Delete', 'Backspace'].includes(e.key)) onDiscard();
  else return;
  e.preventDefault();
};

interface PickerProps {
  name: string;
  category: string | undefined;
  recent: string[];
  categories: string[];
  onChoose: (category: string) => void;
}

/** Another category: the last ones used (big buttons) or any of them. */
function CategoryPicker({ name, category, recent, categories, onChoose }: PickerProps) {
  const { t } = useI18n();
  return (
    <div className="review-picker" role="group" aria-label={t('app.review.changeOne', { name })}>
      {recent.length > 0 && (
        <>
          <p className="section-hint">{t('app.review.recent')}</p>
          <div className="review-chips">
            {recent.map((c) => (
              <button
                key={c}
                className="btn-secondary review-btn"
                aria-pressed={c === category}
                onClick={() => onChoose(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </>
      )}
      <label className="review-more">
        <span>{t('app.review.more')}</span>
        <select value="" onChange={(e) => onChoose(e.target.value)}>
          <option value="" disabled>
            {t('app.review.choose')}
          </option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

interface CardProps {
  item: DetectedPayment;
  category: string | undefined;
  suggestion: ReviewSuggestion | undefined;
  picking: boolean;
  recent: string[];
  categories: string[];
  onAdd: () => void;
  onDiscard: () => void;
  onPick: () => void;
  onChoose: (category: string) => void;
}

/**
 * One payment of «Para revisar»: drag it right to add it, left to discard it. The big buttons do
 * the same (also for a screen reader), and so do the arrows on the focused card.
 */
export function ReviewCard({ item, category, suggestion, picking, ...props }: CardProps) {
  const { t } = useI18n();
  const { money, date } = useFormat();
  const { onAdd, onDiscard, onPick } = props;
  const { dx, handlers } = useSwipe(onAdd, onDiscard);
  const name = item.description;
  const income = item.type === 'INCOME';
  const amount = `${income ? '+' : '−'}${money(item.amount)}`;
  const categoryText = category ?? t('app.review.categoryAuto');
  const swipe =
    dx >= SWIPE_PX ? ' review-card--add' : dx <= -SWIPE_PX ? ' review-card--discard' : '';

  return (
    <li
      className={`review-card${swipe}`}
      tabIndex={0}
      aria-label={t('app.review.card', {
        name,
        amount,
        date: date(item.date),
        category: categoryText,
      })}
      aria-describedby="review-keys"
      onKeyDown={keysFor(onAdd, onDiscard)}
      {...handlers}
    >
      <div
        className="review-card-body"
        style={dx ? { transform: `translateX(${dx}px)` } : undefined}
      >
        <div className="review-card-head">
          <strong>{name}</strong>
          <strong className={income ? 'amount-pos' : 'amount-neg'}>{amount}</strong>
        </div>
        <small>{date(item.date)}</small>
        <p className="review-card-category">
          {t('app.review.category')} <strong>{categoryText}</strong>
        </p>
        {suggestion?.duplicate && <p className="section-hint">{t('app.review.duplicate')}</p>}
        <div className="review-card-actions">
          <button
            className="btn-primary review-btn"
            aria-label={t('app.review.addOne', { name })}
            onClick={onAdd}
          >
            <Icon name="checkCircle" /> {t('app.review.add')}
          </button>
          <button
            className="btn-secondary review-btn"
            aria-label={t('app.review.changeOne', { name })}
            aria-expanded={picking}
            onClick={onPick}
          >
            {t('app.review.change')}
          </button>
          <button
            className="btn-secondary review-btn"
            aria-label={t('app.review.discardOne', { name })}
            onClick={onDiscard}
          >
            <Icon name="close" /> {t('app.review.discard')}
          </button>
        </div>
        {picking && (
          <CategoryPicker
            name={name}
            category={category}
            recent={props.recent}
            categories={props.categories}
            onChoose={props.onChoose}
          />
        )}
      </div>
    </li>
  );
}
