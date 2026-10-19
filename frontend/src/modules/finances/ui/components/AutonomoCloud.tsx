import { useState, type ReactNode } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import { Modal } from '@shared/components/Modal';
import { toManualData } from './AutonomoManual';
import { MOMENT, type AutonomoCloud, type AutonomoSaved, type CloudStatus } from './autonomoSync';

/** Statuses that come with a «Try again» button. */
const RETRY: CloudStatus[] = ['error', 'deleteFailed', 'unavailable'];

/** Date and time in the person's language, for the copies and the last save. */
function useDateTime() {
  const { locale } = useI18n();
  const format = new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const time = new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'es-ES', {
    timeStyle: 'short',
  });
  return {
    dateTime: (iso: string) => format.format(new Date(iso)),
    time: (iso: string) => time.format(new Date(iso)),
  };
}

/** How much a copy holds, so the person can tell the two apart. */
function CopyFacts({ copy }: { copy: AutonomoSaved }) {
  const { t } = useI18n();
  const { money } = useFormat();
  const income = toManualData(copy.manual).quarters.reduce(
    (s, q) => s + q.income.r21 + q.income.r10 + q.income.r4 + q.income.r0,
    0
  );
  return (
    <span className="autonomo-copy-facts">
      {t('app.autonomo.cloud.facts', {
        invoices: copy.manual.invoices.length,
        income: money(Math.round(income * 100) / 100),
      })}
    </span>
  );
}

/**
 * Both copies changed since they were last the same: the person chooses one, the other is kept.
 * Closing it leaves the choice for later (nothing is saved meanwhile).
 */
function ConflictDialog({ cloud, onClose }: { cloud: AutonomoCloud; onClose: () => void }) {
  const { t } = useI18n();
  const { dateTime } = useDateTime();
  const c = cloud.conflict as NonNullable<AutonomoCloud['conflict']>;
  return (
    <Modal label={t('app.autonomo.cloud.conflict.title')} onClose={onClose}>
      <h2 className="modal-title">{t('app.autonomo.cloud.conflict.title')}</h2>
      <p>{t('app.autonomo.cloud.conflict.text')}</p>
      <div className="autonomo-copies">
        <button type="button" className="autonomo-copy" onClick={() => cloud.resolve('local')}>
          <strong>{t('app.autonomo.cloud.conflict.local')}</strong>
          <span>
            {c.localAt
              ? t('app.autonomo.cloud.conflict.changed', { date: dateTime(c.localAt) })
              : t('app.autonomo.cloud.conflict.noDate')}
          </span>
          <CopyFacts copy={c.local} />
        </button>
        <button type="button" className="autonomo-copy" onClick={() => cloud.resolve('remote')}>
          <strong>{t('app.autonomo.cloud.conflict.remote')}</strong>
          <span>{t('app.autonomo.cloud.conflict.saved', { date: dateTime(c.remoteAt) })}</span>
          <CopyFacts copy={c.remote} />
        </button>
      </div>
      <p className="section-hint">{t('app.autonomo.cloud.conflict.kept')}</p>
      <div className="button-row">
        <button type="button" className="btn-secondary" onClick={onClose}>
          {t('app.autonomo.cloud.conflict.later')}
        </button>
      </div>
    </Modal>
  );
}

/** Turning the copy off: delete it from the account too, keep it there, or not turn it off. */
function TurnOffDialog({ cloud, onClose }: { cloud: AutonomoCloud; onClose: () => void }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const off = async (remove: boolean) => {
    setBusy(true);
    await cloud.turnOff(remove);
    onClose();
  };
  return (
    <Modal label={t('app.autonomo.cloud.off.title')} onClose={onClose} dismissible={!busy}>
      <h2 className="modal-title">{t('app.autonomo.cloud.off.title')}</h2>
      <p>{t('app.autonomo.cloud.off.text')}</p>
      <div className="button-row autonomo-off-actions">
        <button type="button" className="btn-danger" disabled={busy} onClick={() => void off(true)}>
          {t('app.autonomo.cloud.off.delete')}
        </button>
        <button
          type="button"
          className="btn-secondary"
          disabled={busy}
          onClick={() => void off(false)}
        >
          {t('app.autonomo.cloud.off.keep')}
        </button>
        <button type="button" className="btn-secondary" disabled={busy} onClick={onClose} autoFocus>
          {t('app.common.cancel')}
        </button>
      </div>
    </Modal>
  );
}

/** What is happening with the account copy, in a few words. */
function SyncStatus({ cloud, onChoose }: { cloud: AutonomoCloud; onChoose: () => void }) {
  const { t } = useI18n();
  const { time } = useDateTime();
  const { status, savedAt } = cloud;
  const text =
    status === 'saved'
      ? savedAt === null
        ? t('app.autonomo.cloud.status.ready')
        : Date.now() - new Date(savedAt).getTime() < MOMENT
        ? t('app.autonomo.cloud.status.savedNow')
        : t('app.autonomo.cloud.status.savedAt', { time: time(savedAt) })
      : t(`app.autonomo.cloud.status.${status}`);
  return (
    <p className={`autonomo-sync autonomo-sync--${status}`} role="status">
      {text}
      {status === 'conflict' && (
        <>
          {' '}
          <button type="button" className="btn-link" onClick={onChoose}>
            {t('app.autonomo.cloud.conflict.choose')}
          </button>
        </>
      )}
      {RETRY.includes(status) && (
        <>
          {' '}
          <button type="button" className="btn-link" onClick={cloud.retry}>
            {t('app.autonomo.cloud.retry')}
          </button>
        </>
      )}
    </p>
  );
}

/**
 * Where the data is kept: always on the device, and in the account too when the person turns it on.
 * `wipe` is «Delete the current data», shown here when there is something to delete.
 */
export function AutonomoCloudPanel({ cloud, wipe }: { cloud: AutonomoCloud; wipe: ReactNode }) {
  const { t } = useI18n();
  const { dateTime } = useDateTime();
  const [askOff, setAskOff] = useState(false);
  const [later, setLater] = useState(false);
  return (
    <section className="autonomo-storage" aria-label={t('app.autonomo.cloud.label')}>
      <p className="section-hint">
        {t(cloud.on ? 'app.autonomo.cloud.whereBoth' : 'app.autonomo.cloud.whereDevice')}
      </p>
      <div className="autonomo-storage-row">
        <label className="renta-check autonomo-switch">
          <input
            type="checkbox"
            role="switch"
            checked={cloud.on}
            onChange={(e) => (e.target.checked ? cloud.turnOn() : setAskOff(true))}
          />
          <span>{t('app.autonomo.cloud.toggle')}</span>
        </label>
        {wipe}
      </div>
      {!cloud.on && <small className="section-hint">{t('app.autonomo.cloud.toggleHint')}</small>}
      {cloud.on && <SyncStatus cloud={cloud} onChoose={() => setLater(false)} />}
      {cloud.previous && (
        <div
          className="autonomo-previous"
          role="group"
          aria-label={t('app.autonomo.cloud.previous.label')}
        >
          <p>{t('app.autonomo.cloud.previous.text', { date: dateTime(cloud.previous.at) })}</p>
          <div className="button-row">
            <button type="button" className="btn-secondary" onClick={cloud.restorePrevious}>
              {t('app.autonomo.cloud.previous.restore')}
            </button>
            <button type="button" className="btn-secondary" onClick={cloud.dismissPrevious}>
              {t('app.autonomo.cloud.previous.dismiss')}
            </button>
          </div>
        </div>
      )}
      {askOff && <TurnOffDialog cloud={cloud} onClose={() => setAskOff(false)} />}
      {cloud.conflict && !later && <ConflictDialog cloud={cloud} onClose={() => setLater(true)} />}
    </section>
  );
}
