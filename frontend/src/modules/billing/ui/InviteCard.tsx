import { useEffect, useState } from 'react';
import { useApi } from '@core/context/ApiContext';
import { useI18n } from '@core/i18n/I18nContext';
import { inviteLink } from '@core/referral';
import { Icon } from '@shared/components/Icon';
import { useResource } from '@shared/hooks/useResource';
import type { ReferralSummary } from '../domain/types';
import './css/Billing.css';

type Translate = ReturnType<typeof useI18n>['t'];

const plural = (t: Translate, unit: 'friend' | 'month', count: number) =>
  count === 1 ? t(`billing.invite.${unit}One`) : t(`billing.invite.${unit}Many`, { count });

/** How far the user is from the next month, counted from the month just earned. */
function tierPercent(data: ReferralSummary): number {
  if (data.nextAt === null) return 100;
  const from = data.tiers[data.rewardsEarned - 1] ?? 0;
  return Math.round(((data.qualified - from) / (data.nextAt - from)) * 100);
}

function progressText(data: ReferralSummary, t: Translate): string {
  if (data.maxed) return t('billing.invite.progressMaxed', { max: data.maxRewards });
  return data.missing === 1
    ? t('billing.invite.progressOne')
    : t('billing.invite.progressMany', { missing: data.missing });
}

/**
 * "Invite a friend": a link that gives both a free month of Premium. Inside "Your plan" it is a
 * card; with `onClose` it is the content of a dialog (no card of its own, a close button on top).
 */
export function InviteCard({ onClose }: { onClose?: () => void }) {
  const { billingApi } = useApi();
  const { t } = useI18n();
  const { data } = useResource(() => billingApi.referral(), [billingApi]);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2500);
    return () => clearTimeout(timer);
  }, [copied]);
  if (!data && !onClose) return null;

  const link = data ? inviteLink(data.code) : '';
  const share = typeof navigator.share === 'function' ? navigator.share.bind(navigator) : null;
  const copy = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
  };
  const percent = data ? tierPercent(data) : 0;
  const stats = data
    ? [
        { key: 'statQualified', icon: 'checkCircle', value: `${data.qualified}` },
        { key: 'statPending', icon: 'clock', value: `${data.pending}` },
        {
          key: 'statEarned',
          icon: 'gift',
          value: `${data.rewardsEarned}/${data.maxRewards}`,
        },
      ]
    : [];
  const statsLabel = data
    ? t(data.maxed ? 'billing.invite.statsMaxed' : 'billing.invite.stats', {
        qualified: data.qualified,
        pending: data.pending,
        earned: data.rewardsEarned,
        max: data.maxRewards,
        missing: data.missing,
      })
    : '';

  return (
    <section className={onClose ? 'invite invite--dialog' : 'card invite invite--card'}>
      {onClose && (
        <button
          type="button"
          className="invite-x"
          aria-label={t('app.common.close')}
          onClick={onClose}
        >
          <Icon name="close" size={20} />
        </button>
      )}
      <header className="invite-head">
        <span className="invite-badge" aria-hidden="true">
          <Icon name="gift" size={26} />
        </span>
        <h2 className="invite-title">{t('billing.invite.title')}</h2>
        <p className="invite-subtitle">{t('billing.invite.subtitle')}</p>
      </header>
      {data && (
        <>
          <ol className="invite-steps" aria-label={t('billing.invite.stepsLabel')}>
            <li>{t('billing.invite.step1')}</li>
            <li>{t('billing.invite.step2')}</li>
            <li>{t('billing.invite.step3', { days: data.rewardDays })}</li>
          </ol>
          <div className="invite-linkbox">
            <code className="invite-link" aria-label={t('billing.invite.linkLabel')}>
              {link}
            </code>
            <button
              type="button"
              className={copied ? 'invite-copy is-copied' : 'invite-copy'}
              aria-live="polite"
              onClick={copy}
            >
              <Icon name={copied ? 'check' : 'copy'} size={16} />
              <span>{copied ? t('billing.invite.copied') : t('billing.invite.copy')}</span>
            </button>
          </div>
          {share && (
            <button
              type="button"
              className="invite-share"
              onClick={() =>
                share({ title: 'Finanverso', text: t('billing.invite.shareText'), url: link })
              }
            >
              <Icon name="share" size={18} />
              <span>{t('billing.invite.share')}</span>
            </button>
          )}
          <ul className="invite-stats">
            {stats.map((s) => (
              <li key={s.key}>
                <Icon name={s.icon} size={16} />
                <strong>{s.value}</strong>
                <span>{t(`billing.invite.${s.key}`)}</span>
              </li>
            ))}
          </ul>
          <div className="invite-progress">
            <p className="invite-progress-text">{progressText(data, t)}</p>
            <div
              className="invite-bar"
              role="progressbar"
              aria-label={statsLabel}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
            >
              <span style={{ width: `${percent}%` }} />
            </div>
          </div>
          <details className="invite-months">
            <summary>{t('billing.invite.monthsTitle')}</summary>
            <p>{t('billing.invite.monthsRule')}</p>
            <table className="invite-tiers">
              <thead>
                <tr>
                  <th scope="col">{t('billing.invite.monthsColFriends')}</th>
                  <th scope="col">{t('billing.invite.monthsColMonths')}</th>
                </tr>
              </thead>
              <tbody>
                {data.tiers.map((friends, i) => (
                  <tr key={friends} className={i < data.rewardsEarned ? 'is-earned' : undefined}>
                    <td>{plural(t, 'friend', friends)}</td>
                    <td>{plural(t, 'month', i + 1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      )}
      {onClose && (
        <div className="invite-foot">
          <button type="button" className="btn-secondary" onClick={onClose}>
            {t('app.common.close')}
          </button>
        </div>
      )}
    </section>
  );
}
