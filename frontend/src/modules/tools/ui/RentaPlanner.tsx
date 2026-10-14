import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '@core/i18n/I18nContext';
import { storage } from '@shared/utils/storage';
import { parseDecimal } from '@shared/utils/numbers';
import {
  computeRenta,
  deductionAmount,
  descendantBreakdown,
  type Disability,
  type Family,
  type RentaResult,
} from '../domain/rentaCalc';
import type { Deduction, DeductionGroup, RentaCcaa } from '../domain/rentaData';
import { rentaObligation } from '../domain/calculators';
import { workReductionOf } from '../domain/rentaWork';
import { useRentaAccess, type RentaAccess, type RentaMode } from '../application/useRentaAccess';
import { CCAA_OPTIONS, loadCcaa } from '../data/renta';
import { rentaState } from '../data/renta/state';
import './css/Renta.css';

const number = (text: string): number => {
  const parsed = parseDecimal(text);
  return Number.isFinite(parsed) ? parsed : 0;
};

const SNAPSHOT_KEY = 'mm_renta_snapshot';
const GROUPS: DeductionGroup[] = ['family', 'housing', 'donations', 'other'];
const DISABILITIES: Disability[] = [0, 33, 65];
const SOCIAL_SECURITY_RATE = 0.065;

function useMoney() {
  const { locale } = useI18n();
  const formatter = new Intl.NumberFormat(locale === 'en' ? 'en-IE' : 'es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  });
  return (n: number) => formatter.format(n);
}

interface ChildForm {
  age: string;
  disability: Disability;
}

interface AscendantForm {
  over75: boolean;
  disability: Disability;
}

interface Choice {
  on: boolean;
  amount: string;
  units: string;
}

function DisabilitySelect({
  id,
  value,
  onChange,
}: {
  id: string;
  value: Disability;
  onChange: (value: Disability) => void;
}) {
  const { t } = useI18n();
  return (
    <select
      id={id}
      className="tx-input"
      value={value}
      onChange={(e) => onChange(Number(e.target.value) as Disability)}
    >
      {DISABILITIES.map((d) => (
        <option key={d} value={d}>
          {t(`tools.renta.disability.${d}`)}
        </option>
      ))}
    </select>
  );
}

/** One deduction: what it gives, who it is for and the fields to see what it would save. */
function DeductionRow({
  deduction,
  choice,
  childCount,
  suggested,
  onChange,
}: {
  deduction: Deduction;
  choice: Choice;
  childCount: number;
  suggested: boolean;
  onChange: (choice: Choice) => void;
}) {
  const { t } = useI18n();
  const money = useMoney();
  const value = deductionAmount(deduction, {
    on: choice.on,
    amount: number(choice.amount),
    units: choice.units === '' ? childCount || 1 : number(choice.units),
  });
  const perChild = !!deduction.perChild && deduction.perChild.length > 0;

  return (
    <li className={`renta-deduction${choice.on ? ' renta-deduction--on' : ''}`}>
      <label className="renta-deduction-head">
        <input
          type="checkbox"
          checked={choice.on}
          onChange={(e) => onChange({ ...choice, on: e.target.checked })}
        />
        <span>
          <strong>{deduction.title}</strong>
          {suggested && <em className="renta-badge">{t('tools.renta.suggested')}</em>}
          <small>{deduction.summary}</small>
        </span>
      </label>
      <details className="renta-requirements">
        <summary>{t('tools.renta.requirements')}</summary>
        <p>{deduction.requirements}</p>
        <a href={deduction.url} target="_blank" rel="noopener noreferrer">
          {t('tools.renta.official')}
        </a>
      </details>
      {choice.on && (
        <div className="renta-deduction-fields">
          {deduction.kind === 'fixed' && (perChild || deduction.unit) && (
            <label className="tools-field">
              <span>
                {t('tools.renta.units', { unit: deduction.unit ?? t('tools.renta.child') })}
              </span>
              <input
                className="tx-input"
                inputMode="numeric"
                value={choice.units}
                placeholder={String(childCount || 1)}
                onChange={(e) => onChange({ ...choice, units: e.target.value })}
              />
            </label>
          )}
          {deduction.kind === 'percent' && (
            <label className="tools-field">
              <span>{t('tools.renta.spent', { percent: deduction.percent as number })}</span>
              <input
                className="tx-input"
                inputMode="decimal"
                value={choice.amount}
                onChange={(e) => onChange({ ...choice, amount: e.target.value })}
              />
            </label>
          )}
          {deduction.kind === 'special' && (
            <label className="tools-field">
              <span>{t('tools.renta.special')}</span>
              <input
                className="tx-input"
                inputMode="decimal"
                value={choice.amount}
                onChange={(e) => onChange({ ...choice, amount: e.target.value })}
              />
            </label>
          )}
          <p className="renta-gives">
            {t('tools.renta.gives')} <strong>{money(value)}</strong>
          </p>
        </div>
      )}
    </li>
  );
}

function DeductionList({
  title,
  hint,
  deductions,
  choices,
  childCount,
  family,
  onChange,
}: {
  title: string;
  hint?: string;
  deductions: Deduction[];
  choices: Record<string, Choice>;
  childCount: number;
  family: Family;
  onChange: (id: string, choice: Choice) => void;
}) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const normalized = query.trim().toLowerCase();
  const visible = deductions.filter(
    (d) => !normalized || `${d.title} ${d.summary}`.toLowerCase().includes(normalized)
  );
  const under3 = family.children.some((c) => c.age < 3);
  const isSuggested = (d: Deduction) => /maternidad/.test(d.id) && under3;

  return (
    <section className="renta-block">
      <h3>{title}</h3>
      {hint && <p className="section-hint">{hint}</p>}
      <input
        className="tx-input"
        type="search"
        placeholder={t('tools.renta.search')}
        aria-label={t('tools.renta.search')}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {visible.length === 0 && <p className="section-hint">{t('tools.renta.noMatch')}</p>}
      {GROUPS.map((group) => {
        const items = visible.filter((d) => d.group === group);
        if (items.length === 0) return null;
        return (
          <details key={group} className="renta-group" open={!!normalized || group === 'family'}>
            <summary>
              {t(`tools.renta.group.${group}`)} <span>({items.length})</span>
            </summary>
            <ul className="renta-deductions">
              {items.map((d) => (
                <DeductionRow
                  key={d.id}
                  deduction={d}
                  choice={choices[d.id] ?? { on: false, amount: '', units: '' }}
                  childCount={childCount}
                  suggested={isSuggested(d)}
                  onChange={(c) => onChange(d.id, c)}
                />
              ))}
            </ul>
          </details>
        );
      })}
    </section>
  );
}

/** An amount that is taken off, shown with a minus sign unless it is zero. */
const minus = (n: number, money: (n: number) => string) => (n > 0 ? `−${money(n)}` : money(0));

interface Snapshot {
  result: RentaResult;
  kids: ReturnType<typeof descendantBreakdown>;
}

/** The estimated result: how much to pay or get back, line by line, and what the family minimum saves. */
function ResultCard({ shown, money }: { shown: Snapshot; money: (n: number) => string }) {
  const { t } = useI18n();
  const { result, kids } = shown;
  const toPay = result.result >= 0;
  return (
    <>
      <p className={`renta-total ${toPay ? 'renta-total--pay' : 'renta-total--refund'}`}>
        {toPay ? t('tools.renta.toPay') : t('tools.renta.refund')}:{' '}
        <strong>{money(Math.abs(result.result))}</strong>
      </p>
      <dl className="renta-lines">
        <dt>{t('tools.renta.line.netIncome')}</dt>
        <dd>{money(result.netIncome)}</dd>
        <dt>{t('tools.renta.line.reductions')}</dt>
        <dd>{minus(result.workReduction + result.pensionReduction, money)}</dd>
        <dt>{t('tools.renta.line.base')}</dt>
        <dd>{money(result.taxBase)}</dd>
        <dt>{t('tools.renta.line.minimum')}</dt>
        <dd>{money(result.minimum.total)}</dd>
        <dt>{t('tools.renta.line.stateQuota')}</dt>
        <dd>{money(result.stateQuota)}</dd>
        <dt>{t('tools.renta.line.regionalQuota')}</dt>
        <dd>{money(result.regionalQuota)}</dd>
        <dt>{t('tools.renta.line.deductions')}</dt>
        <dd>
          {minus(result.stateDeductions + result.regionalDeductions + result.refundable, money)}
        </dd>
        <dt>{t('tools.renta.line.netQuota')}</dt>
        <dd>{money(result.netQuota)}</dd>
        <dt>{t('tools.renta.line.withheld')}</dt>
        <dd>{minus(result.withheld, money)}</dd>
      </dl>
      <h3>{t('tools.renta.minimumTitle')}</h3>
      <p className="section-hint">{t('tools.renta.minimumHint')}</p>
      <ul className="renta-minimum">
        {result.minimum.items.map((item) => (
          <li key={item.key}>
            <span>{t(`tools.renta.minimum.${item.key}`)}</span>
            <span>
              {money(item.amount)} · {t('tools.renta.saves')}{' '}
              <strong>{money(result.minimumSavings[item.key])}</strong>
            </span>
          </li>
        ))}
        {kids.map((kid, i) => (
          <li key={`kid-${i}`} className="renta-kid">
            <span>{t('tools.renta.kidLine', { n: i + 1, age: kid.age })}</span>
            <span>{money(kid.amount)}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

/** The way to more calculations: the upgrade dialog in the app, a free account outside it. */
function UpgradeCta({ access }: { access: RentaAccess }) {
  const { t } = useI18n();
  if (access.upgrade) {
    return (
      <button className="btn-primary" onClick={access.upgrade}>
        {t('tools.renta.goPremium')}
      </button>
    );
  }
  return (
    <p>
      <Link className="btn-primary" to="/login?mode=register">
        {t('tools.renta.createAccount')}
      </Link>
    </p>
  );
}

/** Step by step: your situation, your income, the deductions and the estimated result. */
export function RentaPlanner({
  initialIncome = '',
  mode,
}: {
  initialIncome?: string;
  mode: RentaMode;
}) {
  const { t } = useI18n();
  const money = useMoney();
  const [ccaaId, setCcaaId] = useState('');
  const [ccaa, setCcaa] = useState<RentaCcaa | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [age, setAge] = useState('40');
  const [disability, setDisability] = useState<Disability>(0);
  const [children, setChildren] = useState<ChildForm[]>([]);
  const [ascendants, setAscendants] = useState<AscendantForm[]>([]);
  const [shared, setShared] = useState(false);
  const [gross, setGross] = useState(initialIncome);
  const [socialSecurity, setSocialSecurity] = useState('');
  const [withheld, setWithheld] = useState('');
  const [pension, setPension] = useState('');
  const [choices, setChoices] = useState<Record<string, Choice>>({});
  const access = useRentaAccess(mode);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(() =>
    storage.getJSON<Snapshot | null>(SNAPSHOT_KEY, null)
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setCcaa(null);
    setLoadError(false);
    if (!ccaaId) return undefined;
    loadCcaa(ccaaId)
      .then((data) => !cancelled && setCcaa(data))
      .catch(() => !cancelled && setLoadError(true));
    return () => {
      cancelled = true;
    };
  }, [ccaaId]);

  const family: Family = useMemo(
    () => ({
      age: number(age),
      disability,
      children: children.map((c) => ({ age: number(c.age), disability: c.disability })),
      ascendants,
      sharedChildren: shared,
    }),
    [age, disability, children, ascendants, shared]
  );
  const foral = ccaa?.regime === 'foral';
  const effective: RentaCcaa = ccaa ?? {
    id: '',
    name: '',
    regime: 'common',
    deductions: [],
    source: '',
  };
  const grossAmount = number(gross);
  const ssAmount =
    socialSecurity.trim() === '' ? grossAmount * SOCIAL_SECURITY_RATE : number(socialSecurity);
  const reduction = useMemo(() => workReductionOf(rentaState), []);
  const resultData = useMemo(
    () =>
      computeRenta({
        gross: grossAmount,
        socialSecurity: ssAmount,
        withheld: number(withheld),
        pensionPlan: number(pension),
        family,
        state: rentaState,
        ccaa: effective,
        workReduction: reduction,
        choices: Object.fromEntries(
          Object.entries(choices).map(([id, c]) => [
            id,
            {
              on: c.on,
              amount: number(c.amount),
              units: c.units === '' ? Math.max(1, children.length) : number(c.units),
            },
          ])
        ),
      }),
    [
      grossAmount,
      ssAmount,
      withheld,
      pension,
      family,
      effective,
      reduction,
      choices,
      children.length,
    ]
  );
  const kids = descendantBreakdown(family, rentaState.minimums);
  const live: Snapshot = { result: resultData, kids };
  const shown = access.premium ? live : snapshot;
  const calculate = async () => {
    setBusy(true);
    const allowed = await access.consume();
    setBusy(false);
    if (allowed) {
      storage.setJSON(SNAPSHOT_KEY, live);
      setSnapshot(live);
    }
  };
  const setChoice = (id: string, choice: Choice) => setChoices((all) => ({ ...all, [id]: choice }));

  return (
    <div className="renta-planner">
      <section className="renta-step">
        <h2>
          <span className="renta-number">1</span> {t('tools.renta.step1')}
        </h2>
        <div className="tools-form">
          <div className="tools-field">
            <label htmlFor="renta-ccaa">{t('tools.renta.ccaa')}</label>
            <select
              id="renta-ccaa"
              className="tx-input"
              value={ccaaId}
              onChange={(e) => setCcaaId(e.target.value)}
            >
              <option value="">{t('tools.renta.chooseCcaa')}</option>
              {CCAA_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
          <div className="tools-field">
            <label htmlFor="renta-age">{t('tools.renta.age')}</label>
            <input
              id="renta-age"
              className="tx-input"
              inputMode="numeric"
              value={age}
              onChange={(e) => setAge(e.target.value)}
            />
          </div>
          <div className="tools-field">
            <label htmlFor="renta-disability">{t('tools.renta.ownDisability')}</label>
            <DisabilitySelect id="renta-disability" value={disability} onChange={setDisability} />
          </div>
        </div>
        {loadError && <p className="form-error">{t('tools.renta.loadError')}</p>}
        {foral && (
          <p className="renta-foral" role="note">
            {t('tools.renta.foral', { name: effective.name })}{' '}
            <a href={effective.source} target="_blank" rel="noopener noreferrer">
              {t('tools.renta.officialSite')}
            </a>
          </p>
        )}

        <h3>{t('tools.renta.children')}</h3>
        <p className="section-hint">{t('tools.renta.childrenHint')}</p>
        <ul className="renta-people">
          {children.map((child, i) => (
            <li key={i}>
              <label className="tools-field">
                <span>{t('tools.renta.childAge', { n: i + 1 })}</span>
                <input
                  className="tx-input"
                  inputMode="numeric"
                  value={child.age}
                  onChange={(e) =>
                    setChildren((list) =>
                      list.map((c, j) => (j === i ? { ...c, age: e.target.value } : c))
                    )
                  }
                />
              </label>
              <label className="tools-field">
                <span>{t('tools.renta.childDisability', { n: i + 1 })}</span>
                <DisabilitySelect
                  id={`child-disability-${i}`}
                  value={child.disability}
                  onChange={(d) =>
                    setChildren((list) =>
                      list.map((c, j) => (j === i ? { ...c, disability: d } : c))
                    )
                  }
                />
              </label>
              <button
                className="btn-secondary"
                aria-label={t('tools.renta.removeChild', { n: i + 1 })}
                onClick={() => setChildren((list) => list.filter((_, j) => j !== i))}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
        <div className="button-row">
          <button
            className="btn-secondary"
            onClick={() => setChildren((list) => [...list, { age: '5', disability: 0 }])}
          >
            + {t('tools.renta.addChild')}
          </button>
        </div>
        {children.length > 0 && (
          <label className="renta-check">
            <input type="checkbox" checked={shared} onChange={(e) => setShared(e.target.checked)} />
            <span>{t('tools.renta.shared')}</span>
          </label>
        )}

        <h3>{t('tools.renta.ascendants')}</h3>
        <p className="section-hint">{t('tools.renta.ascendantsHint')}</p>
        <ul className="renta-people">
          {ascendants.map((a, i) => (
            <li key={i}>
              <label className="renta-check">
                <input
                  type="checkbox"
                  checked={a.over75}
                  onChange={(e) =>
                    setAscendants((list) =>
                      list.map((x, j) => (j === i ? { ...x, over75: e.target.checked } : x))
                    )
                  }
                />
                <span>{t('tools.renta.over75', { n: i + 1 })}</span>
              </label>
              <label className="tools-field">
                <span>{t('tools.renta.ascendantDisability', { n: i + 1 })}</span>
                <DisabilitySelect
                  id={`ascendant-disability-${i}`}
                  value={a.disability}
                  onChange={(d) =>
                    setAscendants((list) =>
                      list.map((x, j) => (j === i ? { ...x, disability: d } : x))
                    )
                  }
                />
              </label>
              <button
                className="btn-secondary"
                aria-label={t('tools.renta.removeAscendant', { n: i + 1 })}
                onClick={() => setAscendants((list) => list.filter((_, j) => j !== i))}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
        <div className="button-row">
          <button
            className="btn-secondary"
            onClick={() => setAscendants((list) => [...list, { over75: false, disability: 0 }])}
          >
            + {t('tools.renta.addAscendant')}
          </button>
        </div>
      </section>

      <section className="renta-step">
        <h2>
          <span className="renta-number">2</span> {t('tools.renta.step2')}
        </h2>
        <div className="tools-form">
          <div className="tools-field">
            <label htmlFor="renta-gross">{t('tools.renta.gross')}</label>
            <input
              id="renta-gross"
              className="tx-input"
              inputMode="decimal"
              value={gross}
              onChange={(e) => setGross(e.target.value)}
            />
          </div>
          <div className="tools-field">
            <label htmlFor="renta-ss">{t('tools.renta.socialSecurity')}</label>
            <input
              id="renta-ss"
              className="tx-input"
              inputMode="decimal"
              placeholder={String(Math.round(grossAmount * SOCIAL_SECURITY_RATE))}
              value={socialSecurity}
              onChange={(e) => setSocialSecurity(e.target.value)}
            />
          </div>
          <div className="tools-field">
            <label htmlFor="renta-withheld">{t('tools.renta.withheld')}</label>
            <input
              id="renta-withheld"
              className="tx-input"
              inputMode="decimal"
              value={withheld}
              onChange={(e) => setWithheld(e.target.value)}
            />
          </div>
          <div className="tools-field">
            <label htmlFor="renta-pension">{t('tools.renta.pension')}</label>
            <input
              id="renta-pension"
              className="tx-input"
              inputMode="decimal"
              value={pension}
              onChange={(e) => setPension(e.target.value)}
            />
          </div>
        </div>
        <p className="section-hint">{t('tools.renta.incomeHint')}</p>
        {grossAmount > 0 && (
          <p className="renta-obligation" role="status">
            {rentaObligation({ mainIncome: grossAmount, otherIncome: 0 }).required
              ? t('tools.renta.obligation.yes')
              : t('tools.renta.obligation.no')}
          </p>
        )}
      </section>

      <section className="renta-step">
        <h2>
          <span className="renta-number">3</span> {t('tools.renta.step3')}
        </h2>
        <p className="section-hint">{t('tools.renta.deductionsHint')}</p>
        <DeductionList
          title={t('tools.renta.stateDeductions')}
          hint={t('tools.renta.stateHint')}
          deductions={rentaState.deductions}
          choices={choices}
          childCount={children.length}
          family={family}
          onChange={setChoice}
        />
        {ccaa && !foral && (
          <DeductionList
            title={t('tools.renta.ccaaDeductions', { name: ccaa.name })}
            hint={t('tools.renta.ccaaHint', { count: ccaa.deductions.length })}
            deductions={ccaa.deductions}
            choices={choices}
            childCount={children.length}
            family={family}
            onChange={setChoice}
          />
        )}
        {!ccaa && !loadError && <p className="section-hint">{t('tools.renta.pickCcaa')}</p>}
      </section>

      <section className="renta-step renta-result" aria-live="polite">
        <h2>
          <span className="renta-number">4</span> {t('tools.renta.step4')}
        </h2>
        {access.loading && <p className="section-hint">{t('app.common.loading')}</p>}
        {!access.loading && !shown && (
          <div className="renta-gate">
            <p className="section-hint">
              {access.used ? t('tools.renta.usedNoSnapshot') : t('tools.renta.freeOne')}
            </p>
            {access.used ? (
              <UpgradeCta access={access} />
            ) : (
              <button className="btn-primary" disabled={busy} onClick={() => void calculate()}>
                {busy ? t('tools.renta.calculating') : t('tools.renta.calculate')}
              </button>
            )}
          </div>
        )}
        {shown && (
          <>
            <ResultCard shown={shown} money={money} />
            {!access.premium && (
              <div className="renta-gate">
                <p className="section-hint">{t('tools.renta.usedFree')}</p>
                <UpgradeCta access={access} />
              </div>
            )}
          </>
        )}
        <p className="plan-note">{t('tools.renta.disclaimerFull', { year: rentaState.year })}</p>
      </section>
    </div>
  );
}
