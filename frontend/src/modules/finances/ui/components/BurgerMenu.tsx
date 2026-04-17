import { useEffect } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import type { DashboardTab } from '../../application/hooks/useDashboard';

const TABS: { id: DashboardTab; icon: string; labelKey: string }[] = [
    { id: 'monthly', icon: '📅', labelKey: 'app.tabs.monthly' },
    { id: 'annual', icon: '📊', labelKey: 'app.tabs.annual' },
    { id: 'automations', icon: '⚙️', labelKey: 'app.tabs.automations' },
    { id: 'custom-alerts', icon: '🔔', labelKey: 'app.tabs.customAlerts' },
];

interface BurgerMenuProps {
    open: boolean;
    tab: DashboardTab;
    onSelectTab: (t: DashboardTab) => void;
    onClose: () => void;
}

export function BurgerMenu({ open, tab, onSelectTab, onClose }: BurgerMenuProps) {
    const { t } = useI18n();

    // Close on Escape
    useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [open, onClose]);

    // Prevent body scroll when open
    useEffect(() => {
        document.body.style.overflow = open ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [open]);

    return (
        <>
            {/* Overlay */}
            <div
                className={`burger-overlay${open ? ' burger-overlay--open' : ''}`}
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Sidebar panel */}
            <aside
                className={`burger-panel${open ? ' burger-panel--open' : ''}`}
                aria-label={t('app.menu.ariaLabel')}
                role="navigation"
            >
                {/* Panel header */}
                <div className="burger-panel-header">
                    <div className="burger-brand">
                        <span className="burger-brand-logo">💰</span>
                        <span className="burger-brand-name">{t('app.header.title')}</span>
                    </div>
                    <button
                        className="burger-close-btn"
                        onClick={onClose}
                        aria-label={t('app.menu.close')}
                    >
                        ✕
                    </button>
                </div>

                {/* Nav items */}
                <nav className="burger-nav">
                    {TABS.map(({ id, icon, labelKey }) => (
                        <button
                            key={id}
                            className={`burger-nav-item${tab === id ? ' burger-nav-item--active' : ''}`}
                            onClick={() => { onSelectTab(id); onClose(); }}
                            aria-current={tab === id ? 'page' : undefined}
                        >
                            <span className="burger-nav-icon">{icon}</span>
                            <span className="burger-nav-label">{t(labelKey)}</span>
                            {tab === id && <span className="burger-nav-dot" aria-hidden="true" />}
                        </button>
                    ))}
                </nav>
            </aside>
        </>
    );
}
