import { useState } from 'react';
import { useApi } from '@core/context/ApiContext';
import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import { Icon } from '@shared/components/Icon';
import { useAction } from '@shared/hooks/useAction';
import { useResource } from '@shared/hooks/useResource';
import { PremiumOnly } from '@modules/billing/ui/PremiumOnly';
import type { Inbox } from '../../domain/types';
import '../css/Sections.css';

/** The private address to forward receipts to: they become expenses. Hidden until it is set up. */
function InboxAddress() {
  const { inboxApi } = useApi();
  const { t } = useI18n();
  const { money, date } = useFormat();
  const action = useAction();
  const { data, setData } = useResource(() => inboxApi.get(), [inboxApi]);
  const [copied, setCopied] = useState(false);
  if (!data?.address) return null;

  const copy = async () => {
    await navigator.clipboard.writeText(data.address as string);
    setCopied(true);
  };
  const rotate = () => {
    if (!window.confirm(t('app.inbox.rotateConfirm'))) return;
    void action.run(async () => {
      setData((await inboxApi.rotate()) as Inbox);
      setCopied(false);
    });
  };

  return (
    <div className="card">
      <h2 className="section-title">
        <Icon name="mail" /> {t('app.inbox.title')}
      </h2>
      <p className="section-hint">{t('app.inbox.hint')}</p>
      {action.error && <p className="form-error">{action.error}</p>}
      <p className="invite-link">
        <code>{data.address}</code>
      </p>
      <div className="button-row">
        <button className="btn-secondary" onClick={() => void copy()}>
          {copied ? t('app.inbox.copied') : t('app.inbox.copy')}
        </button>
        <button className="btn-secondary" disabled={action.pending} onClick={rotate}>
          {t('app.inbox.rotate')}
        </button>
      </div>
      {data.recent.length > 0 && (
        <>
          <h3>{t('app.inbox.recent')}</h3>
          <ul className="inbox-recent">
            {data.recent.map((m) => (
              <li key={m.id}>
                <span>
                  <strong>{m.description ?? t('app.inbox.unknown')}</strong>
                  <small>{date(m.receivedAt.slice(0, 10))}</small>
                </span>
                <span>
                  {m.amount !== null && money(m.amount)}{' '}
                  <em>{t(`app.inbox.status.${m.status}`)}</em>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

/** Receipts by e-mail are Premium: the free plan sees what it is and the way to upgrade. */
export function InboxCard() {
  return (
    <PremiumOnly icon="mail" titleKey="app.inbox.title" hintKey="app.inbox.locked" feature="inbox">
      <InboxAddress />
    </PremiumOnly>
  );
}
