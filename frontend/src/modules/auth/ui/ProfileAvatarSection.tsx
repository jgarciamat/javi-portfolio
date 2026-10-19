import { useRef, useState, type KeyboardEvent } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { useAvatarSection } from '../application/useProfileSections';
import { StatusMessage } from './StatusMessage';

/** Emoji per row of the grid (the arrows move by one, up and down by a row). */
const COLUMNS = 8;

const STEP: Record<string, (i: number, last: number) => number> = {
  ArrowRight: (i) => i + 1,
  ArrowLeft: (i) => i - 1,
  ArrowDown: (i) => i + COLUMNS,
  ArrowUp: (i) => i - COLUMNS,
  Home: () => 0,
  End: (_, last) => last,
};

/** A compact grid of emoji: the one picked is saved at once. */
export function AvatarSection() {
  const { t } = useI18n();
  const s = useAvatarSection();
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  // One stop for Tab (the selected emoji, or the first); the arrows move inside.
  const [focusIndex, setFocusIndex] = useState(() =>
    Math.max(0, s.choices.indexOf(s.selected ?? ''))
  );

  const onKeyDown = (e: KeyboardEvent, index: number) => {
    const step = STEP[e.key];
    if (!step) return;
    e.preventDefault();
    const last = s.choices.length - 1;
    const next = Math.min(last, Math.max(0, step(index, last)));
    setFocusIndex(next);
    buttons.current[next]?.focus();
  };

  return (
    <section className="profile-card" aria-labelledby="profile-avatar-title">
      <div className="profile-card-head">
        <h3 id="profile-avatar-title" className="profile-card-title">
          {t('app.profile.avatar.label')}
        </h3>
        <StatusMessage message={s.message} />
      </div>
      <p id="profile-avatar-hint" className="profile-card-hint">
        {t('app.profile.avatar.hint')}
      </p>
      <div
        className="avatar-grid"
        role="group"
        aria-labelledby="profile-avatar-title"
        aria-describedby="profile-avatar-hint"
      >
        {s.choices.map((emoji, i) => {
          const selected = s.selected === emoji;
          return (
            <button
              key={emoji}
              ref={(el) => {
                buttons.current[i] = el;
              }}
              type="button"
              className={`avatar-choice${selected ? ' is-selected' : ''}`}
              aria-pressed={selected}
              aria-label={t('app.profile.avatar.preset', { emoji })}
              tabIndex={i === focusIndex ? 0 : -1}
              onClick={() => {
                setFocusIndex(i);
                void s.choose(emoji);
              }}
              onKeyDown={(e) => onKeyDown(e, i)}
            >
              <span aria-hidden="true">{emoji}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
