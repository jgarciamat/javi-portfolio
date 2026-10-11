import { useState } from 'react';
import { useApi } from '@core/context/ApiContext';
import { useI18n } from '@core/i18n/I18nContext';
import { useAction } from '@shared/hooks/useAction';
import { useResource } from '@shared/hooks/useResource';
import { useFinances } from '../../application/FinancesContext';
import '../css/Sections.css';

/** "When the description contains … use this category": applied to imports and kept private. */
export function CategoryRulesCard() {
  const { categoryRuleApi } = useApi();
  const { t, tCategory } = useI18n();
  const { categories } = useFinances();
  const { data: rules, reload } = useResource(() => categoryRuleApi.getAll(), [categoryRuleApi], {
    initial: [],
  });
  const action = useAction();
  const [pattern, setPattern] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const chosen = categoryId || categories[0]?.id || '';

  const add = async () => {
    const ok = await action.run(async () => {
      await categoryRuleApi.add(pattern, chosen);
      setPattern('');
      await reload();
    });
    return ok;
  };

  return (
    <div className="card">
      <h2 className="section-title">🪄 {t('app.rules.title')}</h2>
      <p className="section-hint">{t('app.rules.hint')}</p>
      {action.error && <p className="form-error">{action.error}</p>}
      <div className="form-grid">
        <label className="field">
          <span className="field-label">{t('app.rules.pattern')}</span>
          <input
            className="tx-input"
            value={pattern}
            maxLength={60}
            placeholder="Mercadona"
            onChange={(e) => setPattern(e.target.value)}
          />
        </label>
        <label className="field">
          <span className="field-label">{t('app.rules.category')}</span>
          <select
            className="tx-input"
            value={chosen}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {tCategory(c.name)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="button-row">
        <button
          className="btn-secondary"
          disabled={action.pending || pattern.trim().length < 3}
          onClick={() => void add()}
        >
          {t('app.rules.add')}
        </button>
      </div>
      {rules.length > 0 && (
        <ul className="rule-list">
          {rules.map((r) => (
            <li key={r.id}>
              <span>
                «{r.pattern}» → <strong>{tCategory(r.categoryName)}</strong>
              </span>
              <button
                className="btn-secondary"
                aria-label={t('app.rules.remove', { pattern: r.pattern })}
                onClick={() =>
                  void action.run(async () => {
                    await categoryRuleApi.remove(r.id);
                    await reload();
                  })
                }
              >
                🗑️
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
