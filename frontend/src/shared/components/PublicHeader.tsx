import { useI18n } from '@core/i18n/I18nContext';
import { LanguageSwitcher } from './LanguageSwitcher';
import './css/PublicHeader.css';

export function PublicHeader() {
    const { t } = useI18n();

    return (
        <header className="public-header">
            <div className="public-header-brand">
                <span className="public-header-logo">💰</span>
                <div className="public-header-text">
                    <span className="public-header-title">{t('app.header.title')}</span>
                    <span className="public-header-sub">{t('app.header.subtitle')}</span>
                </div>
            </div>
            <LanguageSwitcher />
        </header>
    );
}
