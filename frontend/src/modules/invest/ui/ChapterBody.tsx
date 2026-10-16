import { useI18n } from '@core/i18n/I18nContext';
import type { Block, Chapter } from '../domain/types';
import { InvestCalc } from './calculators/Calculators';
import { InvestChart } from './charts/Charts';
import { MarketsPanel } from './MarketsPanel';

const CALLOUT_ICON = { key: '💡', warn: '⚠️', tip: '✅', ex: '🧮' } as const;

function BlockView({ block }: { block: Block }) {
  const { t } = useI18n();
  switch (block.k) {
    case 'h':
      return <h3 className="inv-h">{block.t}</h3>;
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
        <div className="inv-table-wrap">
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
        </div>
      );
    case 'chart':
      return <InvestChart id={block.id} />;
    case 'calc':
      return <InvestCalc id={block.id} />;
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
export function ChapterBody({ chapter }: { chapter: Chapter }) {
  const { t } = useI18n();
  return (
    <div className="inv-chapter-body">
      {chapter.blocks.map((b, i) => (
        <BlockView key={i} block={b} />
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
