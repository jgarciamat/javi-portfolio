import { useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { EMOJI_GROUPS } from '../../domain/categoryPresets';
import '../css/CategoryManager.css';

/** A button with the chosen emoji that opens a grid to pick another one. */
export function EmojiPickerButton({
  value,
  onChange,
}: {
  value: string;
  onChange: (emoji: string) => void;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <div className="emoji-picker-inline">
      <button
        type="button"
        className="cat-emoji-btn"
        aria-label={t('app.category.manager.emoji.choose')}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {value}
      </button>
      {open && (
        <div className="cat-emoji-panel emoji-picker-popover">
          <div className="cat-emoji-scroll">
            {EMOJI_GROUPS.map((group) => (
              <div key={group.label}>
                <div className="cat-emoji-group-label">{group.label}</div>
                <div className="cat-emoji-grid">
                  {group.emojis.map((e) => (
                    <button
                      key={e}
                      type="button"
                      className={`cat-emoji-item${value === e ? ' selected' : ''}`}
                      onClick={() => {
                        onChange(e);
                        setOpen(false);
                      }}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
