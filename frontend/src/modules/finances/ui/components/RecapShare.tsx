import { useEffect, useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import { Icon } from '@shared/components/Icon';
import { shareImage } from '@shared/utils/shareImage';
import type { FinancialSummary } from '../../domain/types';
import { recapImage, type RecapImageData } from '../../domain/recapImage';
import '../css/Recap.css';

/** Builds the picture of the month. The amounts stay out of it unless asked for. */
function useRecapData(summary: FinancialSummary, month: string, amounts: boolean): RecapImageData {
  const { t, tCategory } = useI18n();
  const { money, percent } = useFormat();
  const top = Object.entries(summary.expensesByCategory).sort((a, b) => b[1] - a[1])[0];
  const rate = summary.totalIncome > 0 ? (summary.totalSaving / summary.totalIncome) * 100 : 0;
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
  return {
    title: t('app.recap.shareTitle'),
    month,
    rate: Math.max(0, rate),
    headline: percent(Math.max(0, rate), 0),
    headlineHint: t('app.recap.shareHeadline'),
    lines,
    footer: t('app.recap.shareBrand'),
    site: 'finanverso.app',
  };
}

/** Shares a picture of the month; with `preview` the picture is shown before sharing it. */
export function RecapShare({
  summary,
  month,
  preview = false,
}: {
  summary: FinancialSummary;
  month: string;
  preview?: boolean;
}) {
  const { t } = useI18n();
  const [amounts, setAmounts] = useState(false);
  const [status, setStatus] = useState<'idle' | 'working' | 'saved' | 'error'>('idle');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const data = useRecapData(summary, month, amounts);
  const key = JSON.stringify(data);

  useEffect(() => {
    if (!preview) return undefined;
    let url: string | null = null;
    let cancelled = false;
    recapImage(JSON.parse(key) as RecapImageData)
      .then((blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setPreviewUrl(url);
      })
      .catch(() => setPreviewUrl(null));
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [preview, key]);

  const share = async () => {
    setStatus('working');
    try {
      const blob = await recapImage(data);
      const result = await shareImage(blob, 'finanverso-resumen.png', t('app.recap.shareText'));
      setStatus(result === 'saved' ? 'saved' : 'idle');
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="recap-share">
      {previewUrl && (
        <img className="recap-preview" src={previewUrl} alt={t('app.recap.previewAlt')} />
      )}
      <label className="recap-switch">
        <input type="checkbox" checked={amounts} onChange={(e) => setAmounts(e.target.checked)} />
        <span className="recap-switch-track" aria-hidden="true" />
        <span>{t('app.recap.shareAmounts')}</span>
      </label>
      <button
        className="btn-primary recap-share-button"
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
