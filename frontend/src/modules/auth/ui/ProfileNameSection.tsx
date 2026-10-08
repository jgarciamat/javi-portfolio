import { useI18n } from '@core/i18n/I18nContext';
import { useNameSection } from '../application/useProfileSections';
import { StatusMessage } from './StatusMessage';

export function NameSection() {
  const { t } = useI18n();
  const s = useNameSection();
  return (
    <form className="profile-section" onSubmit={s.handleNameSubmit}>
      <label className="profile-label" htmlFor="profile-name">
        {t('app.profile.name.label')}
      </label>
      <input
        id="profile-name"
        className="auth-input"
        type="text"
        value={s.name}
        onChange={(e) => s.setName(e.target.value)}
        maxLength={80}
        required
        autoComplete="name"
      />
      <StatusMessage message={s.message} />
      <button type="submit" className="btn-primary" disabled={s.loading || s.unchanged}>
        {s.loading ? t('app.profile.name.saving') : t('app.profile.name.save')}
      </button>
    </form>
  );
}
