import { useState } from 'react';
import { useApi } from '@core/context/ApiContext';
import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import { Icon } from '@shared/components/Icon';
import { useResource } from '@shared/hooks/useResource';
import { storage } from '@shared/utils/storage';
import type { MoneyLeaks } from '@modules/finances/domain/types';
import '../css/MoneyLeaks.css';

/** Findings the monthly notice was closed on: it comes back only with a new one (this device). */
export const TEASER_SEEN_KEY = 'mm_leaks_teaser_seen';

const pendingIds = (data: MoneyLeaks) =>
  data.findings.filter((f) => f.status === 'new').map((f) => f.id);

/** «About 870 € a year», rounded down. */
function useYearly() {
  const { money } = useFormat();
  return (data: MoneyLeaks) => money(Math.floor(data.total.annual), { decimals: false });
}

/**
 * The line of «Tu dinero perdido» in the monthly summary: only with a full analysis (3 months of
 * movements) and something still to check. Closed with ✕, it stays away until a new finding.
 */
export function LeaksTeaser({ onOpen }: { onOpen: () => void }) {
  const { insightsApi } = useApi();
  const { t } = useI18n();
  const yearly = useYearly();
  const { data } = useResource(() => insightsApi.moneyLeaks('summary'), [insightsApi]);
  const [seen, setSeen] = useState<string[]>(() => storage.getJSON<string[]>(TEASER_SEEN_KEY, []));
  if (!data || data.coverage.level !== 'complete' || data.total.count === 0) return null;
  const ids = pendingIds(data);
  if (ids.every((id) => seen.includes(id))) return null;
  const close = () => {
    storage.set(TEASER_SEEN_KEY, JSON.stringify(ids));
    setSeen(ids);
  };
  return (
    <aside className="card leaks-teaser" aria-label={t('app.tabs.leaks')}>
      <span className="leaks-teaser-icon" aria-hidden="true">
        <Icon name="coins" />
      </span>
      <p>
        {t(data.total.count === 1 ? 'app.leaks.teaserOne' : 'app.leaks.teaser', {
          amount: yearly(data),
          count: data.total.count,
        })}
      </p>
      <button type="button" className="leak-btn" onClick={onOpen}>
        {t('app.leaks.see')}
      </button>
      <button
        type="button"
        className="icon-btn leaks-teaser-close"
        onClick={close}
        aria-label={t('app.leaks.teaserClose')}
      >
        <Icon name="close" />
      </button>
    </aside>
  );
}

/** After importing a statement, the moment it matters most: what was found, with the way there. */
export function LeaksAfterImport({ onOpen }: { onOpen: () => void }) {
  const { insightsApi } = useApi();
  const { t } = useI18n();
  const yearly = useYearly();
  const { data } = useResource(() => insightsApi.moneyLeaks('import'), [insightsApi]);
  if (!data || data.total.count === 0) return null;
  return (
    <p className="leak-line leaks-after-import">
      <Icon name="coins" /> {t('app.leaks.afterImport', { amount: yearly(data) })}{' '}
      <button type="button" className="leak-link" onClick={onOpen}>
        {t('app.leaks.see')}
      </button>
    </p>
  );
}
