import { useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import { Icon } from '@shared/components/Icon';
import { shareImage } from '@shared/utils/shareImage';
import type { FinancialSummary } from '../../domain/types';
import { recapImage } from '../../domain/recapImage';

/** Builds a picture of the month and shares it. The amounts stay hidden unless asked for. */
export function RecapShare({ summary, month }: { summary: FinancialSummary; month: string }) {
  const { t, tCategory } = useI18n();
  const { money, percent } = useFormat();
  const [amounts, setAmounts] = useState(false);
  const [status, setStatus] = useState<'idle' | 'working' | 'saved' | 'error'>('idle');

  const top = Object.entries(summary.expensesByCategory).sort((a, b) => b[1] - a[1])[0];
  const rate = summary.totalIncome > 0 ? (summary.totalSaving / summary.totalIncome) * 100 : 0;

  const share = async () => {
    setStatus('working');
    const lines: string[] = [];
    if (top) {
      lines.push(
        amounts
          ? t('app.recap.shareTopAmount', { category: tCategory(top[0]), amount: money(top[1]) })
          : t('app.recap.shareTop', { category: tCategory(top[0]) })
      );
    }
    if (amounts) lines.push(t('app.recap.shareSaved', { amount: money(summary.totalSaving) }));
    lines.push(summary.balance >= 0 ? t('app.recap.shareUp') : t('app.recap.shareDown'));
    try {
      const blob = await recapImage({
        title: t('app.recap.shareTitle'),
        month,
        headline: percent(Math.max(0, rate), 0),
        headlineHint: t('app.recap.shareHeadline'),
        lines,
        footer: t('app.recap.shareFooter'),
      });
      const result = await shareImage(blob, 'money-manager-resumen.png', t('app.recap.shareText'));
      setStatus(result === 'saved' ? 'saved' : 'idle');
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="recap-share">
      <label className="plan-terms">
        <input type="checkbox" checked={amounts} onChange={(e) => setAmounts(e.target.checked)} />
        <span>{t('app.recap.shareAmounts')}</span>
      </label>
      <button
        className="btn-secondary"
        disabled={status === 'working'}
        onClick={() => void share()}
      >
        <Icon name="upload" /> {t('app.recap.share')}
      </button>
      {status === 'saved' && <p className="section-success">{t('app.recap.shareSaved2')}</p>}
      {status === 'error' && <p className="form-error">{t('app.recap.shareError')}</p>}
    </div>
  );
}
