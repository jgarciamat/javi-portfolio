import { useId, useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import { Icon } from '@shared/components/Icon';
import type { LeakDecision, LeakFinding, LeakKind } from '@modules/finances/domain/types';

/** Icon of each kind of finding: always next to a word, never alone. */
export const LEAK_ICONS: Record<LeakKind, string> = {
  recurring: 'repeat',
  increase: 'trend',
  duplicate: 'copy',
  small: 'receipt',
};

/** Purchases up to this amount count as small spending (docs C.5). */
const SMALL_LIMIT = 12;

/** «Unos 479 €»: the figures of a finding are rounded down to the euro, never in its favour. */
export const floorEuros = (amount: number) => Math.floor(amount);

interface Action {
  status: LeakDecision;
  key: string;
  primary?: boolean;
}

/** The two main buttons of each kind, and the ones under «More options» (docs C.7). */
const ACTIONS: Record<LeakKind, { main: Action[]; more: Action[] }> = {
  recurring: {
    main: [
      { status: 'keep', key: 'app.leaks.action.keep' },
      { status: 'cancel', key: 'app.leaks.action.cancel', primary: true },
    ],
    more: [
      { status: 'dismissed', key: 'app.leaks.action.dismiss' },
      { status: 'not_mine', key: 'app.leaks.action.notMine' },
    ],
  },
  increase: {
    main: [{ status: 'keep', key: 'app.leaks.action.seen', primary: true }],
    more: [
      { status: 'dismissed', key: 'app.leaks.action.dismissIncrease' },
      { status: 'not_mine', key: 'app.leaks.action.notMine' },
    ],
  },
  duplicate: {
    main: [
      { status: 'dismissed', key: 'app.leaks.action.dismissDuplicate' },
      { status: 'cancel', key: 'app.leaks.action.claim', primary: true },
    ],
    more: [{ status: 'not_mine', key: 'app.leaks.action.notMine' }],
  },
  small: {
    main: [
      { status: 'keep', key: 'app.leaks.action.seen', primary: true },
      { status: 'dismissed', key: 'app.leaks.action.dismissSmall' },
    ],
    more: [],
  },
};

/** What the reviewed card says about the decision. */
function statusKey(finding: LeakFinding): string {
  if (finding.status === 'keep') {
    return finding.kind === 'recurring' ? 'app.leaks.status.keep' : 'app.leaks.status.seen';
  }
  if (finding.status === 'cancel') {
    return finding.kind === 'duplicate' ? 'app.leaks.status.claim' : 'app.leaks.status.cancel';
  }
  return `app.leaks.status.${finding.status}`;
}

function FindingBody({ finding, explain }: { finding: LeakFinding; explain?: boolean }) {
  const { t } = useI18n();
  const { money, monthYear, dayMonth } = useFormat();
  const whole = (amount: number) => money(floorEuros(amount), { decimals: false });
  const [year, month] = finding.firstDate.split('-').map(Number);
  switch (finding.kind) {
    case 'recurring':
      return (
        <>
          <p className="leak-line">
            {t('app.leaks.recurring.since', {
              cadence: t(`app.leaks.cadence.${finding.cadence}`),
              month: monthYear(year, month),
              count: finding.count,
            })}
          </p>
          <p className="leak-line">
            {t('app.leaks.perYear', {
              amount: money(finding.amount),
              period: t(`app.leaks.period.${finding.cadence}`),
              annual: whole(finding.annual),
            })}
          </p>
          {finding.previousAmount !== null && (
            <p className="leak-line">
              {t('app.leaks.increase.line', {
                from: money(finding.previousAmount),
                to: money(finding.amount),
              })}
            </p>
          )}
          {finding.nextDate && finding.status === 'new' && (
            <p className="leak-line leak-muted">
              {t('app.leaks.next', { date: dayMonth(finding.nextDate) })}
            </p>
          )}
          {finding.status === 'new' && (
            <p className="leak-line leak-strong">
              {t('app.leaks.ifCancel', { annual: whole(finding.annual) })}
            </p>
          )}
        </>
      );
    case 'increase':
      return (
        <>
          <p className="leak-line">
            {t('app.leaks.increase.line', {
              from: money(finding.previousAmount as number),
              to: money(finding.amount),
            })}
          </p>
          <p className="leak-line leak-strong">
            {t('app.leaks.increase.impact', { amount: whole(finding.annual) })}
          </p>
          {finding.essential && <p className="leak-line leak-muted">{t('app.leaks.essential')}</p>}
        </>
      );
    case 'duplicate':
      return (
        <>
          <p className="leak-line leak-strong">
            {finding.firstDate === finding.lastDate
              ? t('app.leaks.duplicate.line', {
                  amount: money(finding.amount),
                  date: dayMonth(finding.firstDate),
                })
              : t('app.leaks.duplicate.lineDays', {
                  amount: money(finding.amount),
                  from: dayMonth(finding.firstDate),
                  to: dayMonth(finding.lastDate),
                })}
          </p>
          <p className="leak-line">{t('app.leaks.duplicate.hint')}</p>
        </>
      );
    default:
      return (
        <>
          {explain && <p className="leak-line">{t('app.leaks.small.help')}</p>}
          <p className="leak-line">
            {t('app.leaks.small.line', {
              perMonth: finding.perMonth as number,
              limit: money(SMALL_LIMIT, { decimals: false }),
            })}{' '}
            <span className="leak-strong">
              {t('app.leaks.small.annual', { amount: whole(finding.annual) })}
            </span>
          </p>
          <p className="leak-line">
            {t('app.leaks.small.half', {
              amount: money(Math.floor(finding.annual / 2 / 10) * 10, { decimals: false }),
            })}
          </p>
        </>
      );
  }
}

/** «See the 15 charges»: the dates and amounts behind a finding. */
function Evidence({ finding }: { finding: LeakFinding }) {
  const { t } = useI18n();
  const { money, date } = useFormat();
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <>
      <button
        type="button"
        className="leak-link"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? t('app.leaks.evidenceHide') : t('app.leaks.evidence', { count: finding.count })}
      </button>
      {open && (
        <table className="leak-evidence" id={id}>
          <caption>{t('app.leaks.evidenceTitle', { label: finding.label })}</caption>
          <thead>
            <tr>
              <th scope="col">{t('app.leaks.evidenceDate')}</th>
              <th scope="col">{t('app.leaks.evidenceAmount')}</th>
            </tr>
          </thead>
          <tbody>
            {finding.evidence.map((e, i) => (
              <tr key={`${e.date}-${i}`}>
                <td>{date(e.date)}</td>
                <td>{money(e.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

/** The buttons of a finding still to check: two main ones, «More options» and the evidence. */
function PendingActions({
  finding,
  disabled,
  onAction,
}: {
  finding: LeakFinding;
  disabled: boolean;
  onAction: (status: LeakDecision) => void;
}) {
  const { t } = useI18n();
  const [more, setMore] = useState(false);
  const moreId = useId();
  const actions = ACTIONS[finding.kind];
  const button = (action: Action) => (
    <button
      key={action.status}
      type="button"
      className={`leak-btn${action.primary ? ' leak-btn--primary' : ''}`}
      disabled={disabled}
      onClick={() => onAction(action.status)}
    >
      {t(action.key)}
    </button>
  );
  return (
    <>
      <div className="leak-actions">{actions.main.map(button)}</div>
      {more && (
        <div className="leak-actions" id={moreId}>
          {actions.more.map(button)}
        </div>
      )}
      <div className="leak-links">
        {actions.more.length > 0 && (
          <button
            type="button"
            className="leak-link"
            aria-expanded={more}
            aria-controls={moreId}
            onClick={() => setMore((v) => !v)}
          >
            {t('app.leaks.action.more')} {more ? '▴' : '▾'}
          </button>
        )}
        <Evidence finding={finding} />
      </div>
    </>
  );
}

/** A reviewed finding: what was decided, the help it needs and the way back to the list. */
function Decision({
  finding,
  disabled,
  onUndo,
}: {
  finding: LeakFinding;
  disabled: boolean;
  onUndo: () => void;
}) {
  const { t } = useI18n();
  const { money } = useFormat();
  if (finding.status === 'recovered') {
    return (
      <p className="leak-line leaks-saving">
        {t('app.leaks.recovered', {
          amount: money(floorEuros(finding.annual), { decimals: false }),
        })}
      </p>
    );
  }
  return (
    <>
      <FindingBody finding={finding} />
      <p className="leak-line leak-strong">{t(statusKey(finding))}</p>
      {finding.status === 'cancel' && finding.kind === 'recurring' && (
        <p className="leak-help">{t('app.leaks.cancel.help')}</p>
      )}
      {finding.status === 'not_mine' && <p className="leak-help">{t('app.leaks.notMine.help')}</p>}
      {finding.status !== 'refunded' && (
        <div className="leak-links">
          <button type="button" className="leak-link" disabled={disabled} onClick={onUndo}>
            {t('app.leaks.changeMind')}
          </button>
        </div>
      )}
    </>
  );
}

/**
 * One finding of «Tu dinero perdido»: what the movements show, as a question and never as an
 * order, with two big buttons and «More options». A reviewed finding says what was decided and
 * can go back to the list.
 */
export function LeakCard({
  finding,
  disabled,
  onAction,
  explain,
}: {
  finding: LeakFinding;
  /** First «ant spending» card of the list: adds a short explanation. */
  explain?: boolean;
  /** Offline or saving: the decisions wait. */
  disabled: boolean;
  /** A decision, or null to take it back («Check it again»). */
  onAction: (status: LeakDecision | null) => void;
}) {
  const { t } = useI18n();
  const { money } = useFormat();
  const titleId = useId();
  const kind = t(`app.leaks.tag.${finding.kind}`);
  const pending = finding.status === 'new';
  const amount =
    finding.kind === 'duplicate'
      ? money(finding.amount)
      : money(floorEuros(finding.annual), { decimals: false });
  const summary = t(
    finding.kind === 'duplicate' ? 'app.leaks.aria.oneOff' : 'app.leaks.aria.yearly',
    {
      label: finding.label,
      kind,
      amount,
    }
  );

  // The yearly cost (or the one charge seen twice), big at the top right of the card.
  const figure = finding.kind === 'duplicate' ? amount : t('app.leaks.headlineFigure', { amount });

  return (
    <article className={`leak-card leak-card--${finding.kind}`} aria-labelledby={titleId}>
      <div className="leak-card-head">
        <div className="leak-card-heading">
          <p className="leak-tags">
            <span className={`leak-tag leak-tag--${finding.kind}`} aria-hidden="true">
              <Icon
                name={finding.status === 'recovered' ? 'check' : LEAK_ICONS[finding.kind]}
                size={14}
              />
              {kind}
            </span>
            {finding.confidence === 'medium' && pending && (
              <span className="leak-tag leak-tag--medium">{t('app.leaks.medium')}</span>
            )}
          </p>
          <h3 className="leak-title" id={titleId}>
            <span aria-hidden="true">{finding.label}</span>
            <span className="sr-only">{summary}</span>
          </h3>
        </div>
        {pending && (
          <p className="leak-figure" aria-hidden="true">
            {figure}
          </p>
        )}
      </div>
      {pending ? (
        <>
          <FindingBody finding={finding} explain={explain} />
          <PendingActions finding={finding} disabled={disabled} onAction={onAction} />
        </>
      ) : (
        <Decision finding={finding} disabled={disabled} onUndo={() => onAction(null)} />
      )}
    </article>
  );
}
