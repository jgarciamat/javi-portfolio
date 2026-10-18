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
import '@modules/billing/ui/css/Billing.css';
import '../css/Sections.css';

/**
 * A member sees whose household it is and can leave it. While the owner has no Premium the
 * household is paused: the member is back on their own data until the owner renews.
 */
function MemberOf({
  name,
  paused,
  onLeave,
}: {
  name: string;
  paused: boolean;
  onLeave: () => void;
}) {
  const { t } = useI18n();
  return (
    <>
      {paused ? (
        <p className="household-paused" role="status">
          {t('app.household.pausedMember', { name })}
        </p>
      ) : (
        <>
          <p>{t('app.household.memberOf', { name })}</p>
          <p className="plan-note">{t('app.household.memberNote')}</p>
        </>
      )}
      <div className="button-row">
        <button className="btn-secondary" onClick={onLeave}>
          {t('app.household.leave')}
        </button>
      </div>
    </>
  );
}

/** The owner has no Premium: nothing is shared until they renew. */
function PausedOwner({ paused }: { paused: boolean }) {
  const { t } = useI18n();
  const plan = useOptionalPlan();
  if (!paused) return null;
  return (
    <div className="household-paused" role="status">
      <p>{t('app.household.pausedOwner')}</p>
      {plan && (
        <button
          className="btn-primary"
          onClick={() => plan.openUpgrade({ kind: 'feature', feature: 'household' })}
        >
          {t('billing.seePlans')}
        </button>
      )}
    </div>
  );
}

/** The people the owner shares the data with. */
function HouseholdMembers({
  members,
  onRemove,
}: {
  members: HouseholdStatus['members'];
  onRemove: (id: string) => () => void;
}) {
  const { t } = useI18n();
  return (
    <ul className="household-members">
      {members.map((m) => (
        <li key={m.id}>
          <span>👤 {m.name}</span>
          <button className="btn-secondary" onClick={onRemove(m.id)}>
            {t('app.household.remove')}
          </button>
        </li>
      ))}
    </ul>
  );
}

/** The link just created, to copy and send. */
function InviteLink({
  link,
  copied,
  onCopy,
}: {
  link: string;
  copied: boolean;
  onCopy: () => void;
}) {
  const { t } = useI18n();
  return (
    <>
      <p className="invite-link">
        <code>{link}</code>
      </p>
      <div className="button-row">
        <button className="btn-secondary" onClick={onCopy}>
          {copied ? t('billing.invite.copied') : t('billing.invite.copy')}
        </button>
      </div>
    </>
  );
}

interface HouseholdInviteProps {
  pendingInvite: HouseholdStatus['pendingInvite'];
  link: string | null;
  copied: boolean;
  /** Set when the plan does not include the household: opens the plans instead. */
  onUpgrade: (() => void) | null;
  onInvite: () => void;
  onCancelInvite: () => void;
  onCopy: () => void;
}

/** Invite someone while there is room: create, cancel and copy the link. */
function HouseholdInvite({
  pendingInvite,
  link,
  copied,
  onUpgrade,
  onInvite,
  onCancelInvite,
  onCopy,
}: HouseholdInviteProps) {
  const { t } = useI18n();
  const { date } = useFormat();
  return (
    <>
      {onUpgrade ? (
        <button className="btn-primary" onClick={onUpgrade}>
          {t('billing.seePlans')}
        </button>
      ) : (
        <div className="button-row">
          <button className="btn-secondary" onClick={onInvite}>
            {pendingInvite || link ? t('app.household.newInvite') : t('app.household.invite')}
          </button>
          {pendingInvite && (
            <button className="btn-secondary" onClick={onCancelInvite}>
              {t('app.household.cancelInvite')}
            </button>
          )}
        </div>
      )}
      {link && <InviteLink link={link} copied={copied} onCopy={onCopy} />}
      {pendingInvite && (
        <p className="plan-note">
          {t('app.household.pending', { date: date(pendingInvite.expiresAt) })}
        </p>
      )}
    </>
  );
}

/** Share the data with a partner: invite, see who is in, remove or leave. */
export function HouseholdCard() {
  const { householdApi } = useApi();
  const { t } = useI18n();
  const plan = useOptionalPlan();
  const { data, reload } = useResource<HouseholdStatus | null>(
    () => householdApi.status(),
    [householdApi]
  );
  const action = useAction(t('app.household.error'));
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  if (!data) return null;

  const locked = plan !== null && plan.isFree && data.role === 'none';
  const refresh = (fn: () => Promise<unknown>) => async () => {
    if (await action.run(fn)) await reload();
  };
  const invite = async () => {
    const created = await householdApi.invite();
    setLink(householdInviteLink(created.code));
    setCopied(false);
  };
  const cancelInvite = async () => {
    await householdApi.cancelInvite();
    setLink(null);
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

      {data.role === 'member' ? (
        data.owner && (
          <MemberOf name={data.owner.name} paused={data.paused} onLeave={() => action.run(leave)} />
        )
      ) : (
        <>
          <PausedOwner paused={data.paused} />
          {data.members.length > 0 && (
            <HouseholdMembers
              members={data.members}
              onRemove={(id) => refresh(() => householdApi.remove(id))}
            />
          )}
          {data.members.length < data.maxMembers && (
            <HouseholdInvite
              pendingInvite={data.pendingInvite}
              link={link}
              copied={copied}
              onUpgrade={
                locked ? () => plan.openUpgrade({ kind: 'feature', feature: 'household' }) : null
              }
              onInvite={refresh(invite)}
              onCancelInvite={refresh(cancelInvite)}
              onCopy={copy}
            />
          )}
        </>
      )}
    </div>
  );
}
