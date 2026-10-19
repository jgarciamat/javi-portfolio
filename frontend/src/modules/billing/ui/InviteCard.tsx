import { useState } from 'react';
import { useApi } from '@core/context/ApiContext';
import { useI18n } from '@core/i18n/I18nContext';
import { inviteLink } from '@core/referral';
import { Icon } from '@shared/components/Icon';
import { useResource } from '@shared/hooks/useResource';
import './css/Billing.css';

/** "Invite a friend": a link that gives both a free month of Premium. */
export function InviteCard() {
  const { billingApi } = useApi();
  const { t } = useI18n();
  const { data } = useResource(() => billingApi.referral(), [billingApi]);
  const [copied, setCopied] = useState(false);
  if (!data) return null;
  const link = inviteLink(data.code);
  const share = typeof navigator.share === 'function' ? navigator.share.bind(navigator) : null;
  const copy = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
  };

  return (
    <div className="card invite-card">
      <h2 className="section-title">
        <Icon name="gift" /> {t('billing.invite.title')}
      </h2>
      <p className="section-hint">{t('billing.invite.hint', { days: data.rewardDays })}</p>
      <p className="invite-link">
        <code>{link}</code>
      </p>
      <div className="button-row">
        <button className="btn-secondary" onClick={copy}>
          {copied ? t('billing.invite.copied') : t('billing.invite.copy')}
        </button>
        {share && (
          <button
            className="btn-secondary"
            onClick={() =>
              share({ title: 'Finanverso', text: t('billing.invite.shareText'), url: link })
            }
          >
            {t('billing.invite.share')}
          </button>
        )}
      </div>
      <p className="plan-note">
        {t('billing.invite.stats', {
          qualified: data.qualified,
          pending: data.pending,
          earned: data.rewardsEarned,
          missing: data.missing,
        })}
      </p>
    </div>
  );
}
