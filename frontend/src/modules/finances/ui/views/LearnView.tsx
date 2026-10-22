import { useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { GUIDES, findGuide } from '@modules/guides/domain/guides';
import { GuideCatalog } from '@modules/guides/ui/GuideCatalog';
import { AppGuideLink } from '@modules/guides/ui/GuideLinks';
import { isDashboardTab, type DashboardTab } from '../navigation';
import { GuideBody } from '@modules/guides/ui/GuideBody';
import { Icon } from '@shared/components/Icon';
import { InstallGuideCard } from '@shared/components/InstallGuide';
import '@modules/guides/ui/css/Guides.css';
import '@modules/guides/ui/css/Hacienda.css';
import '../css/Sections.css';

/** Savings guides, open to every account. */
export function LearnView({ onOpenTab }: { onOpenTab: (tab: DashboardTab) => void }) {
  const { t } = useI18n();
  const [open, setOpen] = useState<string | null>(null);
  const guide = open ? findGuide(open) : undefined;
  const openTab = (tab: string) => {
    if (isDashboardTab(tab)) onOpenTab(tab);
  };

  if (guide) {
    return (
      <div className="section-view">
        <div className="card guide-article">
          <button type="button" className="back-btn" onClick={() => setOpen(null)}>
            ← {t('app.learn.back')}
          </button>
          <h2 className="section-title">{guide.title}</h2>
          <GuideBody
            guide={guide}
            renderLink={(to, label) => (
              <AppGuideLink to={to} onGuide={setOpen} onTab={openTab}>
                {label}
              </AppGuideLink>
            )}
          />
          {guide.tool && (
            <p className="guide-tool">
              <AppGuideLink
                className="btn-secondary"
                to={guide.tool.to}
                onGuide={setOpen}
                onTab={openTab}
              >
                <Icon name="sparkles" /> {t('app.learn.tool', { label: guide.tool.label })}
              </AppGuideLink>
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="section-view">
      <div className="card">
        <h2 className="section-title">
          <Icon name="book" /> {t('app.learn.title')}
        </h2>
        <p className="section-hint">{t('app.learn.hint')}</p>
        <p className="section-hint">{t('app.learn.count', { total: GUIDES.length })}</p>
        <p className="hacienda-banner">
          <span>🏛️ {t('hacienda.banner')}</span>
          <button className="btn-secondary" onClick={() => onOpenTab('hacienda')}>
            {t('hacienda.cta')}
          </button>
        </p>
        <GuideCatalog
          renderLink={(g, className, children) => (
            <button className={`${className} guide-link`} onClick={() => setOpen(g.slug)}>
              {children}
            </button>
          )}
        />
      </div>
      <InstallGuideCard />
    </div>
  );
}
