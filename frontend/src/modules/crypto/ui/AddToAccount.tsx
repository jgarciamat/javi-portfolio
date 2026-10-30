import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '@core/i18n/I18nContext';
import { Modal } from '@shared/components/Modal';
import type { AccountTransfer } from '../application/useAccountTransfer';
import { formatEur } from '../domain/format';
import { withSlot } from '../domain/orders';
import type { ClosedTrade } from '../domain/types';
import '@shared/components/css/ConfirmDeleteModal.css';

/**
 * Under a closed operation of a practice portfolio: «Add to an account», which first explains
 * that it is practice money and what it will write (an income or an expense of exactly its
 * result, once), then offers one button per account of type Criptomonedas. Once added, it says
 * where it went. Always in euros: the simulator and the movement are in euros.
 */
export function AddToAccount({
  trade,
  transfer,
}: {
  trade: ClosedTrade;
  transfer: AccountTransfer;
}) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  if (trade.transfer) {
    return (
      <p className="cc-transfer cc-transfer--done">
        <span aria-hidden="true">✓ </span>
        {t('app.crypto.transfer.done', {
          account: trade.transfer.accountName,
          amount: formatEur(trade.transfer.amount, locale, true),
        })}
      </p>
    );
  }
  // Nothing gained or lost: nothing to add.
  if (trade.pnl === 0) return null;

  const amount = formatEur(trade.pnl, locale, true);
  const which = withSlot(trade.symbol, trade.slot);
  const close = () => setOpen(false);
  const title = t('app.crypto.transfer.title');
  return (
    <div className="cc-transfer">
      <button
        type="button"
        className="cc-tool cc-tool--strong"
        onClick={() => {
          transfer.clearError();
          setOpen(true);
        }}
      >
        {t('app.crypto.transfer.open')}
        <span className="sr-only">
          {' '}
          {which} {amount}
        </span>
      </button>
      {/* On <body>: the list of operations is a size container, which would hold a fixed dialog. */}
      {open &&
        createPortal(
          <Modal
            label={title}
            onClose={close}
            overlayClassName="confirm-delete-overlay"
            className="confirm-delete-modal cc-transfer-modal"
          >
            <h2 className="confirm-delete-title">{title}</h2>
            <p className="confirm-delete-message">
              {/* «An expense of 101,90 €»: the word says which way, the amount goes without sign. */}
              {t(trade.pnl > 0 ? 'app.crypto.transfer.bodyGain' : 'app.crypto.transfer.bodyLoss', {
                symbol: which,
                amount: formatEur(Math.abs(trade.pnl), locale),
              })}
            </p>
            <p className="cc-transfer-practice">{t('app.crypto.transfer.practice')}</p>
            {transfer.error && (
              <p className="form-error" role="alert">
                {transfer.error}
              </p>
            )}
            {transfer.accounts.length > 0 ? (
              <div
                className="cc-transfer-accounts"
                role="group"
                aria-label={t('app.crypto.transfer.choose')}
              >
                {transfer.accounts.map((account) => (
                  <button
                    key={account.id}
                    type="button"
                    className="btn-primary"
                    disabled={transfer.busy}
                    onClick={async () => {
                      if (await transfer.add(trade.id, account.id)) close();
                    }}
                  >
                    {t('app.crypto.transfer.to', { account: `${account.icon} ${account.name}` })}
                  </button>
                ))}
              </div>
            ) : (
              <div className="cc-transfer-none">
                <p>{t('app.crypto.transfer.noAccount')}</p>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={transfer.busy}
                  onClick={() => void transfer.createAccount()}
                >
                  {t('app.crypto.transfer.create')}
                </button>
                <p className="cc-hint">{t('app.crypto.transfer.createHint')}</p>
              </div>
            )}
            <div className="confirm-delete-actions">
              <button type="button" className="btn-cancel" onClick={close} autoFocus>
                {t('app.common.cancel')}
              </button>
            </div>
          </Modal>,
          document.body
        )}
    </div>
  );
}
