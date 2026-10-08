import { useState } from 'react';
import { useApi } from '@core/context/ApiContext';
import { useI18n } from '@core/i18n/I18nContext';
import { useSettings } from '@core/settings/SettingsContext';
import { useAuth } from '@shared/hooks/useAuth';
import { useAction } from '@shared/hooks/useAction';
import {
  cancelMonthlyReminder,
  notificationsSupported,
  requestNotificationPermission,
  scheduleMonthlyReminder,
} from '@core/notifications/notifications';
import type {
  Account,
  Currency,
  SettingsChanges,
  UserSettings,
} from '@modules/finances/domain/types';
import { useFinances } from '../../application/FinancesContext';
import {
  downloadFile,
  useExportCSV,
  type ExportableTransaction,
} from '../../application/hooks/useExportCSV';
import { todayDateOnly } from '@shared/utils/format';
import { errorMessage } from '@shared/utils/errors';
import '../css/Sections.css';

const CURRENCIES: Currency[] = ['EUR', 'USD', 'GBP', 'MXN', 'ARS', 'COP', 'CLP', 'CHF'];
const DAYS = Array.from({ length: 28 }, (_, i) => i + 1);

interface SettingsViewProps {
  onOpenProfile: () => void;
}

function PreferencesCard({
  settings,
  accounts,
  saving,
  save,
  toggleNotifications,
}: {
  settings: UserSettings;
  accounts: Account[];
  saving: boolean;
  save: (changes: SettingsChanges) => Promise<boolean>;
  toggleNotifications: (enabled: boolean) => void;
}) {
  const { t } = useI18n();
  const activeAccounts = accounts.filter((a) => !a.archived);
  return (
    <div className="settings-list">
      <label className="setting-row">
        <span>
          <strong>{t('app.settings.currency')}</strong>
          <small>{t('app.settings.currencyHint')}</small>
        </span>
        <select
          className="tx-input"
          disabled={saving}
          value={settings.currency}
          onChange={(e) => save({ currency: e.target.value as Currency })}
        >
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <label className="setting-row">
        <span>
          <strong>{t('app.settings.language')}</strong>
        </span>
        <select
          className="tx-input"
          disabled={saving}
          value={settings.locale}
          onChange={(e) => save({ locale: e.target.value as 'es' | 'en' })}
        >
          <option value="es">🇪🇸 Español</option>
          <option value="en">🇬🇧 English</option>
        </select>
      </label>
      <label className="setting-row">
        <span>
          <strong>{t('app.settings.monthStartDay')}</strong>
          <small>{t('app.settings.monthStartDayHint')}</small>
        </span>
        <select
          className="tx-input"
          disabled={saving}
          value={settings.monthStartDay}
          onChange={(e) => save({ monthStartDay: Number(e.target.value) })}
        >
          {DAYS.map((d) => (
            <option key={d} value={d}>
              {d === 1
                ? t('app.settings.calendarMonth')
                : t('app.settings.dayN', { day: String(d) })}
            </option>
          ))}
        </select>
      </label>
      {activeAccounts.length > 1 && (
        <label className="setting-row">
          <span>
            <strong>{t('app.settings.defaultAccount')}</strong>
          </span>
          <select
            className="tx-input"
            disabled={saving}
            value={settings.defaultAccountId ?? ''}
            onChange={(e) => save({ defaultAccountId: e.target.value })}
          >
            {activeAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.icon} {a.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="setting-row">
        <span>
          <strong>{t('app.settings.showOffers')}</strong>
          <small>{t('app.settings.showOffersHint')}</small>
        </span>
        <input
          type="checkbox"
          className="toggle"
          disabled={saving}
          checked={settings.showOffers !== false}
          onChange={(e) => save({ showOffers: e.target.checked })}
        />
      </label>
      {notificationsSupported() && (
        <label className="setting-row">
          <span>
            <strong>{t('app.settings.notifications')}</strong>
            <small>{t('app.settings.notificationsHint')}</small>
          </span>
          <input
            type="checkbox"
            className="toggle"
            disabled={saving}
            checked={settings.notificationsEnabled}
            onChange={(e) => toggleNotifications(e.target.checked)}
          />
        </label>
      )}
    </div>
  );
}

function DataCard({ onError }: { onError: (message: string) => void }) {
  const { t } = useI18n();
  const { dataApi } = useApi();
  const { exportAllCSV } = useExportCSV();

  const exportJson = async () => {
    const data = await dataApi.exportAll();
    downloadFile(
      JSON.stringify(data, null, 2),
      `money-manager-${todayDateOnly()}.json`,
      'application/json'
    );
  };
  const exportCsv = async () => {
    const data = (await dataApi.exportAll()) as { transactions?: ExportableTransaction[] };
    exportAllCSV(data.transactions ?? []);
  };
  const run = (action: () => Promise<void>) => () =>
    action().catch((e: unknown) => onError(errorMessage(e, 'Error')));

  return (
    <div className="card">
      <h2 className="section-title">📦 {t('app.settings.data')}</h2>
      <p className="section-hint">{t('app.settings.dataHint')}</p>
      <div className="button-row">
        <button className="btn-secondary" onClick={run(exportJson)}>
          ⬇️ {t('app.settings.exportJson')}
        </button>
        <button className="btn-secondary" onClick={run(exportCsv)}>
          ⬇️ {t('app.settings.exportCsv')}
        </button>
      </div>
    </div>
  );
}

function SecurityCard({
  onOpenProfile,
  onError,
}: {
  onOpenProfile: () => void;
  onError: (message: string) => void;
}) {
  const { t } = useI18n();
  const { logoutEverywhere } = useAuth();
  return (
    <div className="card">
      <h2 className="section-title">🔐 {t('app.settings.security')}</h2>
      <div className="button-row">
        <button className="btn-secondary" onClick={onOpenProfile}>
          👤 {t('app.header.openProfile')}
        </button>
        <button
          className="btn-secondary"
          onClick={() => {
            if (window.confirm(t('app.settings.logoutEverywhereConfirm'))) {
              logoutEverywhere().catch((e: unknown) => onError(errorMessage(e, 'Error')));
            }
          }}
        >
          🚪 {t('app.settings.logoutEverywhere')}
        </button>
      </div>
    </div>
  );
}

export function SettingsView({ onOpenProfile }: SettingsViewProps) {
  const { t } = useI18n();
  const { settings, updateSettings } = useSettings();
  const { accounts, refresh } = useFinances();
  const action = useAction();
  const [saved, setSaved] = useState(false);

  if (!settings) return <div className="card">{t('app.common.loading')}</div>;

  const reminder = (day: number) =>
    scheduleMonthlyReminder(
      day,
      t('app.notifications.monthlyTitle'),
      t('app.notifications.monthlyBody')
    );

  const save = async (changes: SettingsChanges): Promise<boolean> => {
    setSaved(false);
    const ok = await action.run(async () => {
      const updated = await updateSettings(changes);
      if (changes.monthStartDay !== undefined) {
        await refresh({ invalidate: true });
        if (updated.notificationsEnabled) await reminder(updated.monthStartDay);
      }
    });
    setSaved(ok);
    return ok;
  };

  const toggleNotifications = async (enabled: boolean) => {
    if (enabled && !(await requestNotificationPermission())) {
      action.setError(t('app.settings.notificationsDenied'));
      return;
    }
    if (await save({ notificationsEnabled: enabled })) {
      await (enabled ? reminder(settings.monthStartDay) : cancelMonthlyReminder());
    }
  };

  return (
    <div className="section-view">
      <div className="card">
        <h2 className="section-title">🛠️ {t('app.settings.title')}</h2>
        {action.error && <p className="form-error">{action.error}</p>}
        {/* Rendered from the key: after a language change it shows in the new language. */}
        {saved && <p className="section-success">{t('app.settings.saved')}</p>}
        <PreferencesCard
          settings={settings}
          accounts={accounts}
          saving={action.pending}
          save={save}
          toggleNotifications={toggleNotifications}
        />
      </div>
      <DataCard onError={action.setError} />
      <SecurityCard onOpenProfile={onOpenProfile} onError={action.setError} />
    </div>
  );
}
