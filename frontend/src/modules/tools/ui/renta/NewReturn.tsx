import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '@core/i18n/I18nContext';
import { Icon } from '@shared/components/Icon';
import { Modal } from '@shared/components/Modal';
import '@shared/components/css/ConfirmDeleteModal.css';

/** Where the screen of the Renta puts the year's actions, under the year picker (RentaView). */
export const YEAR_ACTIONS_ID = 'renta-year-actions';

/** Under the year picker when the screen has one (the expert mode); else where it is. */
export function UnderYear({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  useEffect(() => setTarget(document.getElementById(YEAR_ACTIONS_ID)), []);
  return target ? createPortal(children, target) : <>{children}</>;
}

/** What «Start a new return» wipes, in the order the modal lists it. */
const WIPED = ['answers', 'data', 'draft', 'invest', 'properties', 'result'] as const;

/**
 * «Start a new return»: one compact button that asks first, in the app's delete dialog, and then
 * wipes everything of this year's return. The activity brought from Autónomos stays unless ticked.
 * The same in the assistant (under the title of each screen) and in the expert mode.
 */
export function NewReturn({
  year,
  hasActivity,
  onConfirm,
}: {
  year: number;
  /** There is an activity brought from Autónomos: the box to wipe it too is offered. */
  hasActivity: boolean;
  onConfirm: (alsoActivity: boolean) => void;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [alsoActivity, setAlsoActivity] = useState(false);
  const k = (key: string) => `tools.renta.newReturn.${key}`;
  const close = () => {
    setOpen(false);
    setAlsoActivity(false);
  };
  return (
    <>
      <button type="button" className="btn-danger renta-new-return" onClick={() => setOpen(true)}>
        <Icon name="repeat" /> {t(k('button'))}
      </button>
      {open && (
        <Modal
          label={t(k('title'), { year })}
          onClose={close}
          overlayClassName="confirm-delete-overlay"
          className="confirm-delete-modal renta-new-return-modal"
        >
          <div className="confirm-delete-icon" aria-hidden="true">
            <Icon name="trash" />
          </div>
          <h2 className="confirm-delete-title">{t(k('title'), { year })}</h2>
          <p className="confirm-delete-message">{t(k('intro'), { year })}</p>
          <ul className="renta-new-return-list">
            {WIPED.map((item) => (
              <li key={item}>{t(k(`wiped.${item}`))}</li>
            ))}
          </ul>
          <p className="confirm-delete-message">{t(k('kept'))}</p>
          {hasActivity && (
            <label className="renta-check">
              <input
                type="checkbox"
                checked={alsoActivity}
                onChange={(e) => setAlsoActivity(e.target.checked)}
              />
              <span>{t(k('alsoActivity'))}</span>
            </label>
          )}
          <p className="confirm-delete-message confirm-delete-warning">{t(k('undo'))}</p>
          <div className="confirm-delete-actions">
            <button type="button" className="btn-cancel" onClick={close} autoFocus>
              {t(k('cancel'))}
            </button>
            <button
              type="button"
              className="btn-danger"
              onClick={() => {
                onConfirm(alsoActivity);
                close();
              }}
            >
              {t(k('confirm'))}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
