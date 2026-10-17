import { useEffect, useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { findHaciendaGuide, guideKey } from '@modules/guides/domain/hacienda';
import {
  clearHaciendaRequest,
  requestedHaciendaGuide,
} from '@modules/guides/application/haciendaLink';
import { HaciendaCatalog, HaciendaGuideBody } from '@modules/guides/ui/HaciendaGuides';
import { Icon } from '@shared/components/Icon';
import type { DashboardTab } from '../navigation';
import '@modules/guides/ui/css/Guides.css';
import '../css/Sections.css';

/** «Hacienda paso a paso»: how to do things on the Agencia Tributaria website. Free for everybody. */
export function HaciendaView({ onOpenTab }: { onOpenTab: (tab: DashboardTab) => void }) {
  const { t } = useI18n();
  // Another section (the Renta, the self-employed draft) may have asked for a guide.
  const [open, setOpen] = useState<string | null>(requestedHaciendaGuide);
  useEffect(clearHaciendaRequest, []);
  const guide = findHaciendaGuide(open ?? undefined);

  if (guide) {
    return (
      <div className="section-view">
        <div className="card guide-article">
          <button className="btn-secondary" onClick={() => setOpen(null)}>
            ← {t('hacienda.back')}
          </button>
          <h2 className="section-title">{t(guideKey(guide, 'title'))}</h2>
          <HaciendaGuideBody
            guide={guide}
            renderTool={(tool, label) => (
              <button type="button" className="btn-secondary" onClick={() => onOpenTab(tool)}>
                <Icon name="sparkles" /> {label}
              </button>
            )}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="section-view">
      <div className="card">
        <h2 className="section-title">
          <Icon name="compass" /> {t('hacienda.title')}
        </h2>
        <p className="section-hint">{t('hacienda.hint')}</p>
        <p className="section-hint">{t('hacienda.free')}</p>
        <HaciendaCatalog
          renderLink={(g, className, children) => (
            <button className={`${className} guide-link`} onClick={() => setOpen(g.slug)}>
              {children}
            </button>
          )}
        />
      </div>
    </div>
  );
}
