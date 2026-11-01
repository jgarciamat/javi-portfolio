import { useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import { Icon } from '@shared/components/Icon';
import type { useQuickAdd } from './QuickAdd';

type Quick = ReturnType<typeof useQuickAdd>;

const NOTICE_KEY = 'mm_voice_notice';

const noticeSeen = (): boolean => {
  try {
    return localStorage.getItem(NOTICE_KEY) === '1';
  } catch {
    return false;
  }
};

/** The microphone next to the field; absent where the device cannot dictate. */
export function VoiceButton({ quick }: { quick: Quick }) {
  const { t } = useI18n();
  const { supported, listening, cancel } = quick.dictation;
  if (!supported) return null;
  return (
    <button
      type="button"
      className="quick-mic"
      aria-label={t('app.quickAdd.voice.label')}
      title={t('app.quickAdd.voice.label')}
      aria-pressed={listening}
      disabled={quick.busy}
      onClick={listening ? cancel : quick.dictate}
    >
      <Icon name="mic" />
    </button>
  );
}

/** What the dictation is doing: listening, what it understood to confirm, or why it failed. */
export function VoicePanel({ quick }: { quick: Quick }) {
  const { t, tCategory } = useI18n();
  const { money } = useFormat();
  const { supported, listening, error, cancel } = quick.dictation;
  const [notice, setNotice] = useState(() => !noticeSeen());
  if (!supported) return null;

  const dismissNotice = () => {
    setNotice(false);
    try {
      localStorage.setItem(NOTICE_KEY, '1');
    } catch {
      // Without storage the notice just comes back next time.
    }
  };

  const { entry, category, accountId, selectable } = quick;
  const account = selectable.find((a) => a.id === accountId);
  const summary = entry
    ? [
        entry.description,
        money(entry.amount),
        t(entry.type === 'INCOME' ? 'app.quickAdd.income' : 'app.quickAdd.expense'),
        tCategory(category as string),
        ...(account ? [t('app.quickAdd.voice.account', { name: account.name })] : []),
      ].join(' · ')
    : '';

  return (
    <>
      {listening && (
        <p className="quick-voice-listening" role="status">
          <span className="quick-voice-dot" aria-hidden="true" />
          <Icon name="mic" /> {t('app.quickAdd.voice.listening')}
          <button type="button" className="btn-secondary" onClick={cancel}>
            {t('app.quickAdd.voice.stop')}
          </button>
        </p>
      )}
      {error && (
        <p className="inline-error" role="alert">
          {t(`app.quickAdd.voice.error.${error}`)}
        </p>
      )}
      {quick.dictated && (
        <div className="quick-voice-card" role="status">
          <strong>
            {entry ? t('app.quickAdd.voice.heard', { summary }) : t('app.quickAdd.voice.unclear')}
          </strong>
          <div className="quick-voice-actions">
            {entry && (
              <button
                type="button"
                className="btn-primary"
                disabled={quick.busy}
                onClick={() => void quick.submit()}
              >
                {t('app.quickAdd.add')}
              </button>
            )}
            <button type="button" className="btn-secondary" onClick={quick.dictate}>
              {t('app.quickAdd.voice.repeat')}
            </button>
            <button type="button" className="btn-secondary" onClick={quick.discard}>
              {t('app.quickAdd.voice.stop')}
            </button>
          </div>
        </div>
      )}
      {notice && (
        <p className="section-hint">
          {t('app.quickAdd.voice.notice')}{' '}
          <button type="button" className="btn-secondary" onClick={dismissNotice}>
            {t('app.quickAdd.voice.noticeOk')}
          </button>
        </p>
      )}
    </>
  );
}
