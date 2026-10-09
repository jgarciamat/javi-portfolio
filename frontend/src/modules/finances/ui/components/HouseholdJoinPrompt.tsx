import { useRef, useState } from 'react';
import { useApi } from '@core/context/ApiContext';
import { clearHouseholdInvite, pendingHouseholdInvite } from '@core/householdInvite';
import { useI18n } from '@core/i18n/I18nContext';
import { useAction } from '@shared/hooks/useAction';
import { useDialog } from '@shared/hooks/useDialog';
import { useResource } from '@shared/hooks/useResource';
import { reloadPage } from '@shared/utils/navigation';

function JoinDialog({
  ownerName,
  onJoin,
  onClose,
}: {
  /** null when the invitation is not valid. */
  ownerName: string | null;
  onJoin: () => Promise<void>;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const dialog = useRef<HTMLDivElement>(null);
  const action = useAction(t('app.household.error'));
  useDialog(dialog, onClose, true);

  return (
    <div className="report-overlay">
      <div
        ref={dialog}
        className="report-sheet household-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={t('app.household.joinTitle')}
        tabIndex={-1}
      >
        <h2>🏠 {t('app.household.joinTitle')}</h2>
        {ownerName !== null ? (
          <>
            <p>{t('app.household.joinBody', { name: ownerName })}</p>
            <p className="plan-note">{t('app.household.joinNote')}</p>
          </>
        ) : (
          <p className="form-error">{t('app.household.invalid')}</p>
        )}
        {action.error && <p className="form-error">{action.error}</p>}
        <div className="button-row">
          {ownerName !== null && (
            <button
              className="btn-primary"
              onClick={() => action.run(onJoin)}
              disabled={action.pending}
            >
              {t('app.household.join')}
            </button>
          )}
          <button className="btn-secondary" onClick={onClose}>
            {ownerName !== null ? t('app.household.notNow') : t('app.menu.close')}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Someone opened a `/?join=CODE` link: shows who invites and lets the user accept or refuse. */
export function HouseholdJoinPrompt() {
  const { householdApi } = useApi();
  const [code, setCode] = useState(pendingHouseholdInvite);
  const { data, error } = useResource(
    () => householdApi.preview(code as string),
    [householdApi, code],
    { enabled: code !== null }
  );
  if (code === null || (!data && !error)) return null;

  const close = () => {
    clearHouseholdInvite();
    setCode(null);
  };
  const join = async () => {
    await householdApi.join(code);
    clearHouseholdInvite();
    reloadPage();
  };
  return <JoinDialog ownerName={data ? data.owner.name : null} onJoin={join} onClose={close} />;
}
