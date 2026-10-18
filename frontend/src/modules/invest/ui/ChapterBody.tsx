import { ScrollRegion } from '@shared/components/ScrollRegion';
import { useI18n } from '@core/i18n/I18nContext';
import type { Block, ChapterContent } from '../domain/types';
import { InvestCalc } from './calculators/Calculators';
import { InvestChart } from './charts/Charts';
import { MarketsPanel } from './MarketsPanel';
import { scrollBehavior } from '@shared/utils/motion';

const CALLOUT_ICON = { key: '💡', warn: '⚠️', tip: '✅', ex: '🧮' } as const;

function BlockView({ block, anchor }: { block: Block; anchor: string }) {
  const { t } = useI18n();
  switch (block.k) {
    case 'h':
      return (
        <h3 className="inv-h" id={anchor}>
          {block.t}
        </h3>
      );
    case 'sh':
      return <h4 className="inv-sh">{block.t}</h4>;
    case 'p':
      return <p>{block.t}</p>;
    case 'ul':
      return (
        <ul className="inv-list">
          {block.items.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
      );
    case 'table':
      return (
        <ScrollRegion className="inv-table-wrap" label={block.head.join(', ')}>
          <table className="inv-table">
            <thead>
              <tr>
                {block.head.map((h, i) => (
                  <th key={i} scope="col">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row) => (
                <tr key={row.join('|')}>
                  {row.map((cell, i) =>
                    i === 0 ? (
                      <th key={i} scope="row">
                        {cell}
                      </th>
                    ) : (
                      <td key={i}>{cell}</td>
                    )
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollRegion>
      );
    case 'chart':
      return (
        <section className="inv-embed inv-embed--chart">
          <h3 className="inv-embed-title">📈 {t('app.invest.embed.chart')}</h3>
          <InvestChart id={block.id} />
        </section>
      );
    case 'calc':
      return (
        <section className="inv-embed inv-embed--calc">
          <h3 className="inv-embed-title">🧮 {t('app.invest.embed.calc')}</h3>
          <InvestCalc id={block.id} />
        </section>
      );
    case 'markets':
      return <MarketsPanel />;
    default:
      return (
        <aside className={`inv-callout inv-callout--${block.k}`}>
          <strong>
            <span aria-hidden="true">{CALLOUT_ICON[block.k]}</span>{' '}
            {block.title ?? t(`app.invest.callout.${block.k}`)}
          </strong>
          <p>{block.t}</p>
        </aside>
      );
  }
}

/** The text, tables, charts and calculators of one chapter, and its glossary. */
export function ChapterBody({ chapter }: { chapter: ChapterContent }) {
  const { t } = useI18n();
  const anchors = chapter.blocks.map((_, i) => `${chapter.id}-s${i}`);
  const headings = chapter.blocks.flatMap((b, i) =>
    b.k === 'h' ? [{ id: anchors[i], text: b.t }] : []
  );
  const jump = (id: string) =>
    (document.getElementById(id) as HTMLElement).scrollIntoView({
      behavior: scrollBehavior(),
      block: 'start',
    });
  return (
    <div className="inv-chapter-body">
      {headings.length >= 6 && (
        <nav className="inv-toc" aria-label={t('app.invest.learn.toc')}>
          <strong>{t('app.invest.learn.toc')}</strong>
          <ol>
            {headings.map((h) => (
              <li key={h.id}>
                <button type="button" className="inv-link" onClick={() => jump(h.id)}>
                  {h.text.replace(/^\d+\.\s*/, '')}
                </button>
              </li>
            ))}
          </ol>
        </nav>
      )}
      {chapter.blocks.map((b, i) => (
        <BlockView key={i} block={b} anchor={anchors[i]} />
      ))}
      <section className="inv-glossary" aria-label={t('app.invest.learn.glossary')}>
        <h3 className="inv-h">📖 {t('app.invest.learn.glossary')}</h3>
        <dl>
          {chapter.glossary.map((g) => (
            <div key={g.term}>
              <dt>{g.term}</dt>
              <dd>{g.def}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
