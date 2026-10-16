import { Link } from 'react-router-dom';
import { useI18n } from '@core/i18n/I18nContext';
import { LanguageSwitcher } from './LanguageSwitcher';
import './css/PublicHeader.css';

export function PublicHeader() {
  const { t } = useI18n();

  return (
    <header className="public-header">
      <Link className="public-header-brand" to="/" aria-label={t('app.header.title')}>
        <img className="public-header-logo" src="/logo-192.png" alt="" width="32" height="32" />
        <div className="public-header-text">
          <span className="public-header-title">{t('app.header.title')}</span>
          <span className="public-header-sub">{t('app.header.subtitle')}</span>
        </div>
      </Link>
      <LanguageSwitcher />
    </header>
  );
}
