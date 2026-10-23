import { useEffect, useState, type ReactNode } from 'react';
import { track } from '@core/analytics';
import { useI18n } from '@core/i18n/I18nContext';
import { inviteLink } from '@core/referral';
import type { ReferralSummary } from '@modules/billing/domain/types';
import { Icon } from '@shared/components/Icon';
import { storage } from '@shared/utils/storage';
import {
  NUDGE_KEY,
  invitedSomeone,
  nextNudge,
  nudgeKind,
  nudgeTriggers,
  readNudge,
  type NudgeTrigger,
} from '../domain/invite';
import { monthName } from '../domain/season';
import type { CryptoRanking, SimPortfolio } from '../domain/types';
import { RANKING_INTRO_KEY } from './RankingCard';
import { SEEN_KEY } from './SeasonPanel';
import './css/Season.css';

/**
 * «Copy link» and «Share» of the invitation of «Invite a friend» (the same link: only the random
 * code, nothing about the person). Sharing falls back to copying where the browser cannot share;
 * a share cancelled by the person is not an error.
 */
function useInviteLink(referral: ReferralSummary, onUsed?: () => void) {
  const { t } = useI18n();
  const link = inviteLink(referral.code);
  const [copied, setCopied] = useState<boolean | 'failed'>(false);
  useEffect(() => {
    if (copied !== true) return;
    const timer = setTimeout(() => setCopied(false), 2500);
    return () => clearTimeout(timer);
  }, [copied]);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      track('cons_invite_copy');
      onUsed?.();
    } catch {
      setCopied('failed');
    }
  };
  const share = async () => {
    if (typeof navigator.share !== 'function') return copy();
    try {
      await navigator.share({
        title: 'Finanverso',
        text: t('app.crypto.invite.shareText', { days: referral.rewardDays }),
        url: link,
      });
      track('cons_invite_share');
      onUsed?.();
    } catch {
      // Closed without sharing.
    }
  };
  return { link, copied, copy, share };
}

function InviteActions({
  invite,
  children,
}: {
  invite: ReturnType<typeof useInviteLink>;
  children?: ReactNode;
}) {
  const { t } = useI18n();
  const done = invite.copied === true;
  return (
    <>
      <div className="cc-invite-actions">
        <button
          type="button"
          className={done ? 'cc-save is-copied' : 'cc-save'}
          aria-live="polite"
          onClick={() => void invite.copy()}
        >
          <Icon name={done ? 'check' : 'copy'} />
          <span>{done ? t('billing.invite.copied') : t('billing.invite.copy')}</span>
        </button>
        <button type="button" className="btn-secondary" onClick={() => void invite.share()}>
          <Icon name="share" /> <span>{t('billing.invite.share')}</span>
        </button>
        {children}
      </div>
      {invite.copied === 'failed' && (
        <p className="cc-hint" role="status">
          {t('app.crypto.invite.copyFailed')}
        </p>
      )}
    </>
  );
}

/**
 * «Invite a friend and compete», next to the ranking: the real reward of the invitation programme
 * (the same link and counters as «Invite a friend» in the menu). Hidden when the programme does
 * not answer.
 */
export function InviteCard({ referral }: { referral: ReferralSummary | undefined }) {
  if (!referral) return null;
  return <InviteCardBody referral={referral} />;
}

function InviteCardBody({ referral }: { referral: ReferralSummary }) {
  const { t } = useI18n();
  const invite = useInviteLink(referral);
  useEffect(() => track('cons_invite_view'), []);
  return (
    <section className="card cc-invite" aria-labelledby="cc-invite-title">
      <h2 id="cc-invite-title" className="section-title">
        <Icon name="gift" /> {t('app.crypto.invite.title')}
      </h2>
      <p>{t('app.crypto.invite.body', { days: referral.rewardDays, max: referral.maxRewards })}</p>
      <p className="cc-hint">{t('app.crypto.invite.steps')}</p>
      <code className="cc-invite-link" aria-label={t('billing.invite.linkLabel')}>
        {invite.link}
      </code>
      <InviteActions invite={invite} />
      <p className="cc-hint">
        {t('app.crypto.invite.counts', {
          qualified: referral.qualified,
          pending: referral.pending,
          earned: referral.rewardsEarned,
          max: referral.maxRewards,
        })}
      </p>
    </section>
  );
}

/** Saves that the notice on screen was dealt with (closed, or its link used). */
function settle() {
  storage.setJSON(NUDGE_KEY, { ...readNudge(storage.getJSON(NUDGE_KEY, null)), open: null });
}

/**
 * The short notice after something good (see `domain/invite`): not a modal, closed with
 * «Not now» and never back for the same event. Off once the person has invited someone, while
 * the first notice of the ranking is still open, and when the programme does not answer.
 */
export function InviteNudge({
  portfolio,
  ranking,
  referral,
}: {
  portfolio: SimPortfolio;
  ranking: CryptoRanking | null;
  referral: ReferralSummary | undefined;
}) {
  const [open, setOpen] = useState<NudgeTrigger | null>(null);
  useEffect(() => {
    if (open || !referral || invitedSomeone(referral)) return;
    if (storage.get(RANKING_INTRO_KEY) !== '1') return;
    const next = nextNudge(
      readNudge(storage.getJSON(NUDGE_KEY, null)),
      nudgeTriggers(portfolio, ranking, storage.get(SEEN_KEY)),
      Date.now()
    );
    storage.setJSON(NUDGE_KEY, next.memory);
    setOpen(next.open);
  }, [open, portfolio, ranking, referral]);
  if (!open || !referral) return null;
  return <Nudge trigger={open} referral={referral} onClose={() => setOpen(null)} />;
}

function Nudge({
  trigger,
  referral,
  onClose,
}: {
  trigger: NudgeTrigger;
  referral: ReferralSummary;
  onClose: () => void;
}) {
  const { t, locale } = useI18n();
  const invite = useInviteLink(referral, settle);
  const kind = nudgeKind(trigger);
  const close = () => {
    settle();
    onClose();
  };
  return (
    <aside className="cc-invite-nudge" aria-labelledby="cc-invite-nudge-title">
      <h2 id="cc-invite-nudge-title">
        <Icon name="gift" />{' '}
        {t(`app.crypto.invite.nudge.${kind}`, {
          month: kind === 'season' ? monthName(trigger.slice(7), locale) : '',
        })}
      </h2>
      <p>
        {t('app.crypto.invite.nudge.body', { days: referral.rewardDays, max: referral.maxRewards })}
      </p>
      <InviteActions invite={invite}>
        <button type="button" className="cc-invite-later" onClick={close}>
          {t('app.crypto.invite.nudge.later')}
        </button>
      </InviteActions>
    </aside>
  );
}
