import { useEffect, useId, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import { isNativeApp } from '@shared/utils/platform';
import { shareImage } from '@shared/utils/shareImage';
import { storage } from '@shared/utils/storage';
import {
  EMPTY_DECLARANT,
  buildSedeFile,
  needs,
  type Check,
  type Declarant,
  type SedeFile,
  type SedeSource,
} from '../../application/aeatFiles/models';
import type { AutonomoDraft } from '../../domain/types';
import type { WithholdingResult } from '../../domain/withholdings';
import '../css/SedeFiles.css';

/** Kept only when the person ticks «remember» (and cleared on sign-out, as every `mm_` key). */
export const SEDE_DECLARANT_KEY = 'mm_sede_declarant';

/** Values of a check that are money (the rest are box numbers, rates or names). */
const MONEY = ['expected', 'got', 'difference'];

/** Phones and the app offer the share sheet; a computer just downloads the file. */
const shareMode = (): 'share' | 'download' =>
  isNativeApp() || window.matchMedia?.('(pointer: coarse)')?.matches ? 'share' : 'download';

function CheckItem({ check }: { check: Check }) {
  const { t } = useI18n();
  const { money } = useFormat();
  const values = Object.fromEntries(
    Object.entries(check.values ?? {}).map(([k, v]) => [
      k,
      MONEY.includes(k) && typeof v === 'number' ? money(v) : v,
    ])
  );
  return (
    <li className={`autonomo-check sede-check--${check.level}`}>
      <p>
        <strong className="autonomo-check-level">{t(`aeatFiles.level.${check.level}`)}</strong>{' '}
        {t(`aeatFiles.check.${check.code}`, values)}
      </p>
    </li>
  );
}

/** One file: its checks, the kind of declaration and the download button. */
function FileRow({ source, declarant }: { source: SedeSource; declarant: Declarant }) {
  const { t } = useI18n();
  const [failed, setFailed] = useState(false);
  const built = useMemo(() => buildSedeFile(source, declarant), [source, declarant]);
  const label = t(`aeatFiles.model.${source.model}`);
  const download = async (file: SedeFile) => {
    setFailed(false);
    try {
      const blob = new Blob([file.bytes as Uint8Array<ArrayBuffer>], {
        type: 'text/plain;charset=iso-8859-1',
      });
      await shareImage(blob, file.fileName, label, shareMode());
    } catch {
      setFailed(true);
    }
  };
  return (
    <div className="sede-file">
      <h5>{label}</h5>
      {built.kind && (
        <p className="section-hint">
          {t('aeatFiles.kind', { kind: t(`aeatFiles.kind.${built.kind}`) })}
        </p>
      )}
      {built.checks.length > 0 && (
        <ul className="autonomo-checks-list">
          {built.checks.map((c, i) => (
            <CheckItem key={`${c.code}-${i}`} check={c} />
          ))}
        </ul>
      )}
      {built.file ? (
        <button
          type="button"
          className="taxform-btn"
          onClick={() => void download(built.file as SedeFile)}
        >
          {t('aeatFiles.download', { file: built.file.fileName })}
        </button>
      ) : (
        <p className="section-hint">{t('aeatFiles.blocked')}</p>
      )}
      {failed && (
        <p className="form-error" role="alert">
          {t('aeatFiles.error')}
        </p>
      )}
    </div>
  );
}

type TextKey = Exclude<keyof Declarant, 'thirdParties'>;

function Field({
  name,
  value,
  onChange,
  hint,
}: {
  name: TextKey;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  const { t } = useI18n();
  const id = useId();
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {t(`aeatFiles.field.${name}`)}
      </label>
      <input
        id={id}
        className="tx-input"
        name={`sede-${name}`}
        autoComplete="off"
        spellCheck={false}
        inputMode={name === 'phone' ? 'tel' : 'text'}
        aria-describedby={hint ? `${id}-hint` : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint && (
        <small id={`${id}-hint`} className="section-hint">
          {hint}
        </small>
      )}
    </div>
  );
}

/** The data the files of the screen ask for: always the NIF and names, the rest by model. */
function DeclarantForm({
  sources,
  declarant,
  onChange,
}: {
  sources: SedeSource[];
  declarant: Declarant;
  onChange: Dispatch<SetStateAction<Declarant>>;
}) {
  const { t } = useI18n();
  const asks = sources.map(needs);
  const any = (k: keyof (typeof asks)[number]) => asks.some((a) => a[k]);
  const fields: [TextKey, boolean, string?][] = [
    ['nif', true],
    ['surname', true],
    ['name', true],
    ['iban', any('iban'), t('aeatFiles.hint.iban')],
    ['phone', any('contact')],
    ['contact', any('contact')],
    ['activity', any('activity')],
    ['activityCode', any('activity'), t('aeatFiles.hint.activityCode')],
    ['iae', any('activity')],
    ['cnae', any('cnae')],
  ];
  return (
    <>
      <div className="autonomo-grid">
        {fields
          .filter(([, shown]) => shown)
          .map(([name, , hint]) => (
            <Field
              key={name}
              name={name}
              hint={hint}
              value={declarant[name]}
              onChange={(v) => onChange((d) => ({ ...d, [name]: v }))}
            />
          ))}
      </div>
      {any('activity') && (
        <label className="renta-check">
          <input
            type="checkbox"
            checked={declarant.thirdParties}
            onChange={(e) => onChange((d) => ({ ...d, thirdParties: e.target.checked }))}
          />{' '}
          {t('aeatFiles.field.thirdParties')}
        </label>
      )}
    </>
  );
}

const stored = (): Declarant => ({
  ...EMPTY_DECLARANT,
  ...storage.getJSON<Partial<Declarant>>(SEDE_DECLARANT_KEY, {}),
});

/**
 * «Descargar fichero para la sede»: the files of the forms of the screen in the format of their
 * record design, for the «Importar» option of the sede of the AEAT. The NIF, names and IBAN are
 * typed here and used only on the device; they are kept only if the person asks for it.
 */
export function SedeFiles({ sources }: { sources: SedeSource[] }) {
  const { t } = useI18n();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [remember, setRemember] = useState(() => storage.get(SEDE_DECLARANT_KEY) !== null);
  const [declarant, setDeclarant] = useState<Declarant>(stored);

  useEffect(() => {
    storage.set(SEDE_DECLARANT_KEY, remember ? JSON.stringify(declarant) : null);
  }, [remember, declarant]);

  if (sources.length === 0) return null;
  return (
    <section className="sede-files" aria-labelledby={`${id}-title`}>
      <h4 id={`${id}-title`}>{t('aeatFiles.title')}</h4>
      <p className="section-hint">{t('aeatFiles.notice')}</p>
      <button
        type="button"
        className="taxform-btn"
        aria-expanded={open}
        aria-controls={`${id}-body`}
        onClick={() => setOpen((o) => !o)}
      >
        {t(open ? 'aeatFiles.close' : 'aeatFiles.open')}
      </button>
      <div id={`${id}-body`} hidden={!open}>
        <p className="section-hint">{t('aeatFiles.how')}</p>
        <p className="section-hint">{t('aeatFiles.privacy')}</p>
        <DeclarantForm sources={sources} declarant={declarant} onChange={setDeclarant} />
        <label className="renta-check">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
          />{' '}
          {t('aeatFiles.remember')}
        </label>
        {sources.map((s) => (
          <FileRow key={s.model} source={s} declarant={declarant} />
        ))}
      </div>
    </section>
  );
}

/** The files of a self-employed draft: the 303, and the 130, 349 and 390 when they are filed. */
export function sedeSourcesOfDraft(draft: AutonomoDraft): SedeSource[] {
  return [
    { model: '303', draft },
    ...(draft.irpf.required ? [{ model: '130' as const, draft }] : []),
    ...(draft.m349?.required ? [{ model: '349' as const, draft, m349: draft.m349 }] : []),
    ...(draft.m390 ? [{ model: '390' as const, draft, m390: draft.m390 }] : []),
  ];
}

/** The 111 and the 115 of the quarter, when there is something to file. */
export function sedeSourcesOfWithholdings(result: WithholdingResult, year: number): SedeSource[] {
  const q = result.quarter;
  return [
    ...(result.m111.result !== 'none'
      ? [{ model: '111' as const, year, quarter: q, result: result.m111 }]
      : []),
    ...(result.m115.result !== 'none'
      ? [{ model: '115' as const, year, quarter: q, result: result.m115 }]
      : []),
  ];
}
