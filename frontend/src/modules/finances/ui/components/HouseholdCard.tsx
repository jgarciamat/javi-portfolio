import { useState } from 'react';
import { useApi } from '@core/context/ApiContext';
import { householdInviteLink } from '@core/householdInvite';
import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import { useAction } from '@shared/hooks/useAction';
import { useResource } from '@shared/hooks/useResource';
import { reloadPage } from '@shared/utils/navigation';
import { useOptionalPlan } from '@modules/billing/application/PlanContext';
import type { HouseholdStatus } from '@modules/billing/domain/types';
import '../css/Sections.css';

/** Share the data with a partner: invite, see who is in, remove or leave. */
export function HouseholdCard() {
  const { householdApi } = useApi();
  const { t } = useI18n();
  const { date } = useFormat();
  const plan = useOptionalPlan();
  const { data, reload } = useResource<HouseholdStatus | null>(
    () => householdApi.status(),
    [householdApi]
  );
  const action = useAction(t('app.household.error'));
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  if (!data) return null;

  const locked = plan !== null && !plan.isPremium && data.role === 'none';
  const refresh = (fn: () => Promise<unknown>) => async () => {
    if (await action.run(fn)) await reload();
  };
  const invite = async () => {
    const created = await householdApi.invite();
    setLink(householdInviteLink(created.code));
    setCopied(false);
  };
  const copy = async () => {
    await navigator.clipboard.writeText(link as string);
    setCopied(true);
  };
  const leave = async () => {
    await householdApi.leave();
    reloadPage();
  };

  return (
    <div className="card household-card">
      <h2 className="section-title">
        🏠 {t('app.household.title')} <span className="premium-chip">Premium</span>
      </h2>
      <p className="section-hint">{t('app.household.hint')}</p>
      {action.error && <p className="form-error">{action.error}</p>}

      {data.role === 'member' && data.owner && (
        <>
          <p>{t('app.household.memberOf', { name: data.owner.name })}</p>
          <p className="plan-note">{t('app.household.memberNote')}</p>
          <div className="button-row">
            <button className="btn-secondary" onClick={() => action.run(leave)}>
              {t('app.household.leave')}
            </button>
          </div>
        </>
      )}

      {data.role !== 'member' && data.members.length > 0 && (
        <ul className="household-members">
          {data.members.map((m) => (
            <li key={m.id}>
              <span>👤 {m.name}</span>
              <button className="btn-secondary" onClick={refresh(() => householdApi.remove(m.id))}>
                {t('app.household.remove')}
              </button>
            </li>
          ))}
        </ul>
      )}

      {data.role !== 'member' && data.members.length < data.maxMembers && (
        <>
          {locked ? (
            <button
              className="btn-primary"
              onClick={() => plan.openUpgrade({ kind: 'feature', feature: 'household' })}
            >
              {t('billing.seePlans')}
            </button>
          ) : (
            <div className="button-row">
              <button className="btn-secondary" onClick={refresh(invite)}>
                {data.pendingInvite || link
                  ? t('app.household.newInvite')
                  : t('app.household.invite')}
              </button>
              {data.pendingInvite && (
                <button
                  className="btn-secondary"
                  onClick={refresh(async () => {
                    await householdApi.cancelInvite();
                    setLink(null);
                  })}
                >
                  {t('app.household.cancelInvite')}
                </button>
              )}
            </div>
          )}
          {link && (
            <>
              <p className="invite-link">
                <code>{link}</code>
              </p>
              <div className="button-row">
                <button className="btn-secondary" onClick={copy}>
                  {copied ? t('billing.invite.copied') : t('billing.invite.copy')}
                </button>
              </div>
            </>
          )}
          {data.pendingInvite && (
            <p className="plan-note">
              {t('app.household.pending', { date: date(data.pendingInvite.expiresAt) })}
            </p>
          )}
        </>
      )}
    </div>
  );
}
