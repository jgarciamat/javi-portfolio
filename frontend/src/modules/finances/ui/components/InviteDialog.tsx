import { useI18n } from '@core/i18n/I18nContext';
import { Modal } from '@shared/components/Modal';
import { InviteCard } from '@modules/billing/ui/InviteCard';

/** The invitation link from the menu, for any user (also without Premium). */
export function InviteDialog({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  return (
    <Modal label={t('billing.invite.title')} onClose={onClose} className="modal-panel invite-panel">
      <InviteCard onClose={onClose} />
    </Modal>
  );
}
