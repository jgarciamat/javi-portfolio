import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import { captureSupported } from '@core/capture/notificationCapture';
import { Icon } from '@shared/components/Icon';
import { useCapturedPayments } from '../../application/hooks/useCapturedPayments';
import '../css/Sections.css';

/** Payments found in the bank notifications: one tap adds them, with their category. */
export function CapturedPayments() {
  const { t } = useI18n();
  const { money, date } = useFormat();
  const { pending, error, add, ignore } = useCapturedPayments();
  if (!captureSupported() || pending.length === 0) return null;

  return (
    <section className="card" aria-label={t('app.capture.detected')}>
      <h2 className="section-title">
        <Icon name="bell" /> {t('app.capture.detected')}
      </h2>
      <p className="section-hint">{t('app.capture.detectedHint', { count: pending.length })}</p>
      {error && <p className="form-error">{error}</p>}
      <ul className="inbox-recent">
        {pending.map((p) => (
          <li key={p.id}>
            <span>
              <strong>{p.description}</strong>
              <small>{date(p.date)}</small>
            </span>
            <span className="capture-actions">
              <strong className={p.type === 'INCOME' ? 'amount-pos' : 'amount-neg'}>
                {p.type === 'INCOME' ? '+' : '−'}
                {money(p.amount)}
              </strong>
              <button
                className="btn-secondary"
                aria-label={t('app.capture.addOne', { name: p.description })}
                onClick={() => void add([p])}
              >
                {t('app.capture.add')}
              </button>
              <button
                className="btn-secondary"
                aria-label={t('app.capture.ignoreOne', { name: p.description })}
                onClick={() => ignore([p])}
              >
                <Icon name="close" />
              </button>
            </span>
          </li>
        ))}
      </ul>
      {pending.length > 1 && (
        <div className="button-row">
          <button className="btn-secondary" onClick={() => void add(pending)}>
            {t('app.capture.addAll')}
          </button>
          <button className="btn-secondary" onClick={() => ignore(pending)}>
            {t('app.capture.ignoreAll')}
          </button>
        </div>
      )}
    </section>
  );
}
