import { useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import {
  guessMapping,
  headerKey,
  MAPPED_FIELDS,
  type Mapping,
} from '../../../domain/invest/mapping';
import type { Field } from '../../../domain/invest/read';
import type { AssetClass } from '../../../domain/invest/types';
import { savedMappings } from '../../../application/investImport';

export const CLASSES: AssetClass[] = [
  'crypto',
  'shares',
  'etf',
  'fund',
  'bill',
  'bond',
  'derivative',
  'commodity',
];

/** «¿Qué columna es la fecha, el activo, la cantidad...?»: the person says it once per kind of file. */
export function InvestMapping({
  header,
  onRead,
}: {
  header: string[];
  onRead: (mapping: Mapping) => void;
}) {
  const { t } = useI18n();
  const k = 'tools.invest.map';
  const [mapping, setMapping] = useState<Mapping>(
    () =>
      savedMappings()[headerKey(header)] ?? {
        columns: guessMapping(header),
        assetClass: 'crypto',
        locale: 'es',
        order: 'dmy',
        platform: '',
      }
  );
  const setColumn = (field: Field, value: string) => {
    const columns = { ...mapping.columns };
    if (value === '') delete columns[field];
    else columns[field] = Number(value);
    setMapping({ ...mapping, columns });
  };
  return (
    <fieldset className="renta-block">
      <legend>{t(`${k}.title`)}</legend>
      <p className="section-hint">{t(`${k}.hint`)}</p>
      <div className="tools-form">
        <label className="tools-field">
          <span>{t(`${k}.platform`)}</span>
          <input
            className="tx-input"
            value={mapping.platform}
            onChange={(e) => setMapping({ ...mapping, platform: e.target.value })}
          />
        </label>
        {MAPPED_FIELDS.map((field) => (
          <label key={field} className="tools-field">
            <span>{t(`${k}.field.${field}`)}</span>
            <select
              className="tx-input"
              value={mapping.columns[field] ?? ''}
              onChange={(e) => setColumn(field, e.target.value)}
            >
              <option value="">{t(`${k}.none`)}</option>
              {header.map((h, i) => (
                <option key={i} value={i}>
                  {h || t(`${k}.column`, { n: i + 1 })}
                </option>
              ))}
            </select>
          </label>
        ))}
        <label className="tools-field">
          <span>{t(`${k}.class`)}</span>
          <select
            className="tx-input"
            value={mapping.assetClass}
            onChange={(e) => setMapping({ ...mapping, assetClass: e.target.value as AssetClass })}
          >
            {CLASSES.map((c) => (
              <option key={c} value={c}>
                {t(`tools.invest.class.${c}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="tools-field">
          <span>{t(`${k}.locale`)}</span>
          <select
            className="tx-input"
            value={mapping.locale}
            onChange={(e) =>
              setMapping({ ...mapping, locale: e.target.value as Mapping['locale'] })
            }
          >
            <option value="es">1.234,56</option>
            <option value="en">1,234.56</option>
          </select>
        </label>
        <label className="tools-field">
          <span>{t(`${k}.order`)}</span>
          <select
            className="tx-input"
            value={mapping.order}
            onChange={(e) => setMapping({ ...mapping, order: e.target.value as Mapping['order'] })}
          >
            <option value="dmy">{t(`${k}.dmy`)}</option>
            <option value="mdy">{t(`${k}.mdy`)}</option>
          </select>
        </label>
      </div>
      <button
        className="btn-secondary"
        disabled={mapping.columns.date === undefined || mapping.columns.asset === undefined}
        onClick={() => onRead(mapping)}
      >
        {t(`${k}.read`)}
      </button>
    </fieldset>
  );
}
