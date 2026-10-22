import { useId, useState } from 'react';
import { useI18n, type Locale } from '@core/i18n/I18nContext';
import { Modal } from '@shared/components/Modal';
import type { PdfTable } from '@modules/finances/application/tablePdf';
import { ExportButtons } from '@modules/finances/ui/components/ExportButtons';
import {
  formatChange,
  formatDateTime,
  formatEur,
  formatNumber,
  formatRate,
  tone,
} from '../domain/format';
import { FEE_OPTIONS_BPS, INITIAL_BALANCES } from '../domain/orders';
import type { SimPortfolio } from '../domain/types';
import { Help } from './Notices';
import '@shared/components/css/ConfirmDeleteModal.css';

type Translate = (key: string, vars?: Record<string, string | number>) => string;

/** Every operation of the simulator as a table (open ones with their result if sold now). */
export function historyTable(p: SimPortfolio, t: Translate, locale: Locale): PdfTable {
  const when = (iso: string) => formatDateTime(iso, locale);
  const type = (value: string) => t(`app.crypto.order.types.${value}`);
  const columns = [
    'state',
    'coin',
    'quantity',
    'buyPrice',
    'buyDate',
    'buyOrder',
    'sellPrice',
    'sellDate',
    'sellOrder',
    'invested',
    'fees',
    'result',
    'resultPercent',
  ];
  return {
    head: columns.map((c) => t(`app.crypto.csv.${c}`)),
    rows: [
      ...p.open.map((o) => [
        t('app.crypto.csv.open'),
        o.symbol,
        o.quantity,
        o.entryPrice,
        when(o.openedAt),
        type(o.openType),
        o.currentPrice,
        '',
        '',
        o.invested,
        o.entryFee,
        o.pnl,
        o.pnlPercent,
      ]),
      ...p.closed.map((c) => [
        t('app.crypto.csv.closed'),
        c.symbol,
        c.quantity,
        c.entryPrice,
        when(c.openedAt),
        type(c.openType),
        c.exitPrice,
        when(c.closedAt),
        type(c.closeType),
        c.invested,
        c.fees,
        c.pnl,
        c.pnlPercent,
      ]),
    ],
  };
}

/** How the play-money portfolio is doing: would it gain or lose, and the totals. */
export function SimSummary({ portfolio }: { portfolio: SimPortfolio }) {
  const { t, locale } = useI18n();
  const { account, summary } = portfolio;
  const money = (value: number | null, signed = false) =>
    value === null ? '—' : formatEur(value, locale, signed);
  const winRate =
    summary.winRate === null
      ? '—'
      : t('app.crypto.summary.winRateValue', {
          rate: formatNumber(summary.winRate, locale),
          wins: summary.wins,
          losses: summary.losses,
        });
  const figures: [string, string][] = [
    ['equity', money(summary.equity)],
    ['initial', money(account.initial)],
    ['cash', money(account.cash)],
    ['reserved', money(account.reserved)],
    ['realized', money(summary.realized, true)],
    ['unrealized', money(summary.unrealized, true)],
    ['trades', String(summary.trades)],
    ['winRate', winRate],
  ];

  return (
    <section className="card cc-summary" aria-labelledby="cc-summary-title">
      <h2 id="cc-summary-title" className="section-title">
        {t('app.crypto.summary.title')}
      </h2>
      <p className={`cc-total cc-${tone(summary.total)}`}>
        {summary.total === null || summary.totalPercent === null
          ? t('app.crypto.summary.noPrices')
          : t(
              summary.total >= 0 ? 'app.crypto.summary.wouldGain' : 'app.crypto.summary.wouldLose',
              {
                amount: formatEur(Math.abs(summary.total), locale),
                percent: formatChange(summary.totalPercent, locale),
              }
            )}
      </p>
      <dl className="cc-figures">
        {figures.map(([key, value]) => (
          <div key={key}>
            <dt>{t(`app.crypto.summary.${key}`)}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <p className="cc-helps">
        {(['realized', 'unrealized', 'winRate', 'reserved'] as const).map((term) => (
          <Help key={term} term={term} label={t(`app.crypto.help.${term}`)} />
        ))}
      </p>
      <p className="section-hint">
        {t('app.crypto.summary.since', { date: formatDateTime(account.startedAt, locale) })}
      </p>
    </section>
  );
}

/** The history to download, the commission and «Start again». */
export function SimSettings({
  portfolio,
  busy,
  onFee,
  onReset,
}: {
  portfolio: SimPortfolio;
  busy: boolean;
  onFee: (bps: number) => Promise<boolean>;
  onReset: (initial: number, bps: number) => Promise<boolean>;
}) {
  const { t, locale } = useI18n();
  const { account } = portfolio;
  const [confirming, setConfirming] = useState(false);
  const [initial, setInitial] = useState(account.initial);
  const feeId = useId();
  const initialId = useId();
  const close = () => setConfirming(false);

  return (
    <section className="card cc-settings-card" aria-labelledby="cc-settings-title">
      <h2 id="cc-settings-title" className="section-title">
        {t('app.crypto.settings.title')}
      </h2>
      <ExportButtons
        name="consola_crypto"
        what={t('app.crypto.csv.what')}
        count={portfolio.open.length + portfolio.closed.length}
        table={() => historyTable(portfolio, t, locale)}
      />
      <div className="cc-settings">
        <div className="field">
          <label className="field-label" htmlFor={feeId}>
            {t('app.crypto.settings.fee')}
          </label>
          <select
            id={feeId}
            value={account.feeBps}
            disabled={busy}
            onChange={(e) => void onFee(Number(e.target.value))}
          >
            {FEE_OPTIONS_BPS.map((bps) => (
              <option key={bps} value={bps}>
                {formatRate(bps, locale)}
              </option>
            ))}
          </select>
          <p className="section-hint">{t('app.crypto.settings.feeHint')}</p>
        </div>
        <div className="field">
          <label className="field-label" htmlFor={initialId}>
            {t('app.crypto.settings.initial')}
          </label>
          <select
            id={initialId}
            value={initial}
            onChange={(e) => setInitial(Number(e.target.value))}
          >
            {INITIAL_BALANCES.map((value) => (
              <option key={value} value={value}>
                {formatEur(value, locale)}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn-danger"
            disabled={busy}
            onClick={() => setConfirming(true)}
          >
            {t('app.crypto.settings.reset')}
          </button>
        </div>
      </div>
      {confirming && (
        <Modal
          label={t('app.crypto.settings.confirmTitle')}
          onClose={close}
          overlayClassName="confirm-delete-overlay"
          className="confirm-delete-modal"
        >
          <h2 className="confirm-delete-title">{t('app.crypto.settings.confirmTitle')}</h2>
          <p className="confirm-delete-message">
            {t('app.crypto.settings.confirmBody', { amount: formatEur(initial, locale) })}
          </p>
          <div className="confirm-delete-actions">
            <button type="button" className="btn-cancel" onClick={close} autoFocus>
              {t('app.common.cancel')}
            </button>
            <button
              type="button"
              className="btn-danger"
              onClick={() => {
                close();
                void onReset(initial, account.feeBps);
              }}
            >
              {t('app.crypto.settings.confirm')}
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
