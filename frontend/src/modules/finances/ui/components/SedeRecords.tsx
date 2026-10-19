import { useId, type Dispatch, type SetStateAction } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { recordsOf, type Informative } from '../../application/aeatFiles/annualFiles';
import type { Premises } from '../../application/aeatFiles/informative';
import type { Declarant, RecordExtra } from '../../application/aeatFiles/models';
import { provincesOf } from '../../application/aeatFiles/provinces';

type Text = Exclude<keyof Premises, 'situation' | 'province'>;
const PREMISES_TEXT: Text[] = [
  'cadastre',
  'streetType',
  'street',
  'number',
  'floor',
  'door',
  'town',
  'municipality',
  'municipalityCode',
  'postcode',
];
const SITUATIONS = ['1', '2', '3', '4'] as const;

function ProvinceSelect({
  model,
  label,
  value,
  onChange,
}: {
  model: Informative['model'];
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const { t } = useI18n();
  const id = useId();
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <select id={id} className="tx-input" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{t('aeatFiles.records.choose')}</option>
        {provincesOf(model).map(([code, name]) => (
          <option key={code} value={code}>
            {code} · {name}
          </option>
        ))}
      </select>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const id = useId();
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className="tx-input"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

/** The premises of a rent of the 180: situation, cadastral reference and address. */
function PremisesFields({
  premises,
  onChange,
}: {
  premises: Partial<Premises>;
  onChange: (patch: Partial<Premises>) => void;
}) {
  const { t } = useI18n();
  const id = useId();
  return (
    <>
      <div className="field">
        <label className="field-label" htmlFor={id}>
          {t('aeatFiles.records.situation')}
        </label>
        <select
          id={id}
          className="tx-input"
          value={premises.situation ?? '1'}
          onChange={(e) => onChange({ situation: e.target.value as Premises['situation'] })}
        >
          {SITUATIONS.map((s) => (
            <option key={s} value={s}>
              {t(`aeatFiles.records.situation.${s}`)}
            </option>
          ))}
        </select>
      </div>
      {PREMISES_TEXT.map((name) => (
        <TextField
          key={name}
          label={t(`aeatFiles.records.${name}`)}
          value={premises[name] ?? ''}
          onChange={(v) => onChange({ [name]: v })}
        />
      ))}
      <ProvinceSelect
        model="180"
        label={t('aeatFiles.records.premisesProvince')}
        value={premises.province ?? ''}
        onChange={(v) => onChange({ province: v })}
      />
    </>
  );
}

/**
 * What each record of a 190, 180 or 347 needs and the app does not keep: the province of the
 * domicile of the person and, in the 180, the premises. Typed and kept like the rest of the data.
 */
export function SedeRecords({
  source,
  declarant,
  onChange,
}: {
  source: Informative;
  declarant: Declarant;
  onChange: Dispatch<SetStateAction<Declarant>>;
}) {
  const { t } = useI18n();
  const rows = recordsOf(source);
  if (rows.length === 0) return null;
  const update = (id: string, patch: (e: RecordExtra) => RecordExtra) =>
    onChange((d) => ({
      ...d,
      records: { ...d.records, [id]: patch(d.records[id] ?? { province: '' }) },
    }));
  return (
    <details className="sede-records">
      <summary>{t('aeatFiles.records.title', { n: rows.length })}</summary>
      {rows.map((r) => {
        const extra = declarant.records[r.id] ?? { province: '' };
        const name = r.who || '—';
        const who = r.key ? t(`aeatFiles.records.key.${r.key}`, { who: name }) : name;
        return (
          <fieldset key={r.id} className="sede-record">
            <legend>{`${who} · ${r.nif ?? t('aeatFiles.records.noNif')}`}</legend>
            <div className="autonomo-grid">
              <ProvinceSelect
                model={source.model}
                label={t('aeatFiles.records.province')}
                value={extra.province}
                onChange={(v) => update(r.id, (e) => ({ ...e, province: v }))}
              />
              {source.model === '180' && (
                <PremisesFields
                  premises={extra.premises ?? {}}
                  onChange={(patch) =>
                    update(r.id, (e) => ({ ...e, premises: { ...e.premises, ...patch } }))
                  }
                />
              )}
            </div>
          </fieldset>
        );
      })}
    </details>
  );
}
