import { useEffect, useRef, useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { CCAA_OPTIONS } from '../../data/renta';
import type { Deduction, RentaCcaa } from '../../domain/rentaData';
import type { DraftReading } from '../../domain/rentaDraft';
import type { RentaProperty } from '../../domain/rentaExtras';
import { number, type RentaForm } from '../../domain/rentaForm';
import {
  OPTIONS,
  QUESTIONS,
  TYPED,
  answerOf,
  asksActive,
  choose,
  draftAnswers,
  firstOpen,
  grossPatch,
  housingDeductions,
  paidPatch,
  tickHousing,
  type QuestionId,
} from '../../domain/rentaGuide';
import { AscendantsSection, ChildrenSection } from './FamilyStep';
import { PartnerFields, SingleParentFields } from './JointStep';
import { RentalSection, UnrentedSection } from './PropertyStep';
import { Field, RadioOptions, Step, useMoney, type StepProps } from './shared';

export interface GuideProps extends StepProps {
  ccaa: RentaCcaa | null;
  loadError: boolean;
  /** The State's deductions and the community's: the housing question ticks some of them. */
  deductions: Deduction[];
  property: RentaProperty;
  reading: DraftReading | null;
  /** Goes on to the review of the deductions that could apply. */
  onReview: () => void;
}

const TOTAL = QUESTIONS.length;

type Translate = ReturnType<typeof useI18n>['t'];

/** The options of a question, with their labels. */
const optionsOf = (t: Translate, q: keyof typeof OPTIONS) =>
  OPTIONS[q].map((value) => ({ value, label: t(`tools.renta.guide.opt.${q}.${value}`) }));

/** The pay of the year and what was withheld, asked once the kind of income is known. */
function IncomeAmounts({ form, set }: StepProps) {
  const { t } = useI18n();
  const income = answerOf(form, 'income');
  if (income === null) return null;
  return (
    <div className="renta-block">
      <p className="section-hint">{t('tools.renta.guide.certificate')}</p>
      <div className="tools-form">
        <Field
          id="renta-guide-gross"
          label={t(income === 'work' ? 'tools.renta.gross' : 'tools.renta.guide.grossAll')}
          value={form.gross}
          onChange={(v) => set(grossPatch(form, v))}
        />
        {income === 'mixed' && (
          <Field
            id="renta-guide-non-salary"
            label={t('tools.renta.guide.nonSalary')}
            hint={t('tools.renta.nonSalaryHint')}
            value={form.nonSalary}
            onChange={(v) => set({ nonSalary: v })}
          />
        )}
        <Field
          id="renta-guide-ss"
          label={t('tools.renta.socialSecurity')}
          value={form.socialSecurity}
          onChange={(v) => set({ socialSecurity: v })}
        />
        <Field
          id="renta-guide-withheld"
          label={t('tools.renta.withheld')}
          value={form.withheld}
          onChange={(v) => set({ withheld: v })}
        />
      </div>
    </div>
  );
}

/** Disability: when it matters, whether the person works (only active workers get the extra expenses). */
function DisabilityFollowUp({ form, set }: StepProps) {
  const { t } = useI18n();
  if (form.disability === 0) return null;
  if (asksActive(form)) {
    return (
      <fieldset className="renta-question renta-follow-up">
        <legend>{t('tools.renta.guide.q.active')}</legend>
        <p className="renta-why">{t('tools.renta.guide.why.active')}</p>
        <RadioOptions
          name="renta-guide-active"
          options={optionsOf(t, 'active')}
          value={form.answers.active ?? null}
          onChange={(v) => set(choose(form, 'active', v))}
        />
      </fieldset>
    );
  }
  return (
    <p className="renta-why" role="status">
      {t(form.retired ? 'tools.renta.guide.notActive' : 'tools.renta.guide.isActive')}
    </p>
  );
}

/** The rent or the mortgage paid, and the deductions it can give (each one to tick when it applies). */
function HousingPart({
  form,
  set,
  deductions,
  kind,
}: StepProps & { deductions: Deduction[]; kind: 'rent' | 'mortgage' }) {
  const { t } = useI18n();
  const list = housingDeductions(deductions, kind);
  return (
    <div className="renta-block">
      <Field
        id={`renta-guide-${kind}`}
        label={t(`tools.renta.guide.paid.${kind}`)}
        value={kind === 'rent' ? form.rentPaid : form.mortgagePaid}
        onChange={(v) => set(paidPatch(form, kind, v, deductions))}
      />
      {/* The State's transitional deductions are always there: the list is never empty. */}
      <p className="section-hint">{t('tools.renta.guide.pickHousing')}</p>
      <ul className="renta-questions">
        {list.map((d) => (
          <li key={d.id}>
            <label className="renta-check">
              <input
                type="checkbox"
                checked={form.choices[d.id]?.on ?? false}
                onChange={(e) => set(tickHousing(form, d, e.target.checked, kind))}
              />
              <span>
                <strong>{d.title}</strong> <small>{d.summary}</small>
              </span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}

type BodyProps = GuideProps & { answer: string | null };

/** The community: a list, with what a foral one or a failed load means. */
function CcaaBody({ form, set, ccaa, loadError }: BodyProps) {
  const { t } = useI18n();
  return (
    <>
      <select
        id="renta-guide-ccaa"
        className="tx-input"
        aria-label={t('tools.renta.ccaa')}
        value={form.ccaaId}
        onChange={(e) => set({ ccaaId: e.target.value })}
      >
        <option value="">{t('tools.renta.chooseCcaa')}</option>
        {CCAA_OPTIONS.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
      {loadError && <p className="form-error">{t('tools.renta.loadError')}</p>}
      {ccaa?.regime === 'foral' && (
        <p className="renta-foral" role="note">
          {t('tools.renta.foral', { name: ccaa.name })}
        </p>
      )}
    </>
  );
}

function AgeBody({ form, set }: BodyProps) {
  const { t } = useI18n();
  return (
    <Field
      id="renta-guide-age"
      label={t('tools.renta.age')}
      value={form.age}
      onChange={(age) => set({ age })}
    />
  );
}

function FamilyBody({ form, set, answer }: BodyProps) {
  if (answer !== 'yes') return null;
  return (
    <div className="renta-block">
      <ChildrenSection form={form} set={set} />
      <AscendantsSection form={form} set={set} />
    </div>
  );
}

function JointBody({ form, set, answer }: BodyProps) {
  if (answer === 'couple') return <PartnerFields form={form} set={set} />;
  if (answer === 'single') return <SingleParentFields form={form} set={set} />;
  return null;
}

function PropertyBody({ form, set, property }: BodyProps) {
  return (
    <>
      {form.rentalOn && (
        <RentalSection form={form} set={set} rental={property.rental} toggle={false} />
      )}
      {form.unrented.length > 0 && (
        <UnrentedSection form={form} set={set} imputation={property.imputation} />
      )}
    </>
  );
}

function SavingsBody({ form, set, answer }: BodyProps) {
  const { t } = useI18n();
  if (answer !== 'yes') return null;
  return (
    <div className="tools-form">
      <Field
        id="renta-guide-savings"
        label={t('tools.renta.savings')}
        hint={t('tools.renta.savingsHint')}
        value={form.savings}
        onChange={(v) => set({ savings: v })}
      />
    </div>
  );
}

function PlanBody({ form, set, answer }: BodyProps) {
  const { t } = useI18n();
  if (answer !== 'yes') return null;
  return (
    <div className="tools-form">
      <Field
        id="renta-guide-pension"
        label={t('tools.renta.pension')}
        value={form.pension}
        onChange={(v) => set({ pension: v })}
      />
      <Field
        id="renta-guide-pension-employer"
        label={t('tools.renta.pensionEmployer')}
        value={form.pensionEmployer}
        onChange={(v) => set({ pensionEmployer: v })}
      />
    </div>
  );
}

function HousingBody({ form, set, deductions, answer }: BodyProps) {
  return (
    <>
      {(answer === 'rent' || answer === 'both') && (
        <HousingPart form={form} set={set} deductions={deductions} kind="rent" />
      )}
      {(answer === 'mortgage' || answer === 'both') && (
        <HousingPart form={form} set={set} deductions={deductions} kind="mortgage" />
      )}
    </>
  );
}

/** What each question asks besides its options: the typed answer, or the follow-up questions. */
const BODIES: Record<QuestionId, (props: BodyProps) => React.ReactNode> = {
  ccaa: CcaaBody,
  age: AgeBody,
  income: ({ form, set }) => <IncomeAmounts form={form} set={set} />,
  disability: ({ form, set }) => <DisabilityFollowUp form={form} set={set} />,
  family: FamilyBody,
  joint: JointBody,
  property: PropertyBody,
  savings: SavingsBody,
  plan: PlanBody,
  housing: HousingBody,
};

/** What a question asks for, besides the question itself: the options and their follow-up questions. */
export function QuestionBody({ q, ...props }: GuideProps & { q: QuestionId }) {
  const { t } = useI18n();
  const { form, set, deductions } = props;
  const answer = answerOf(form, q);
  const Body = BODIES[q];
  return (
    <>
      {!TYPED.includes(q) && (
        <RadioOptions
          name={`renta-guide-${q}`}
          options={optionsOf(t, q as keyof typeof OPTIONS)}
          value={answer}
          onChange={(v) => set(choose(form, q, v, deductions))}
        />
      )}
      <Body {...props} answer={answer} />
    </>
  );
}

/** Whether "Next" can be pressed: a community, a believable age, an option (and the follow-up that needs one). */
export function ready(form: RentaForm, q: QuestionId): boolean {
  if (q === 'age') {
    const age = number(form.age);
    return form.age.trim() !== '' && age >= 0 && age <= 120;
  }
  if (q === 'disability' && asksActive(form) && form.answers.active === undefined) return false;
  return answerOf(form, q) !== null;
}

type Money = (n: number) => string;

/** What is added to the option in the summary: the amounts and what follows from it. */
const DETAILS: Partial<
  Record<QuestionId, (form: RentaForm, answer: string, t: Translate, money: Money) => string | null>
> = {
  income: (form, _answer, _t, money) => money(number(form.gross)),
  disability: (form, answer, t) =>
    answer === '0' ? null : t(`tools.renta.guide.opt.active.${form.retired ? 'no' : 'yes'}`),
  family: (form, answer, t) =>
    answer === 'yes'
      ? t('tools.renta.guide.familyCount', {
          children: form.children.length,
          ascendants: form.ascendants.length,
        })
      : null,
  joint: (form, answer, _t, money) =>
    answer === 'couple' ? money(number(form.partner.gross)) : null,
};

/** The answer of a question in a few words, for the summary. */
function useDescribe(form: RentaForm) {
  const { t } = useI18n();
  const money = useMoney();
  return (q: QuestionId): string => {
    const answer = answerOf(form, q);
    if (answer === null || !(q in form.answers)) return t('tools.renta.guide.notAnswered');
    if (q === 'ccaa') return (CCAA_OPTIONS.find((o) => o.id === answer) as { name: string }).name;
    if (q === 'age') return t('tools.renta.guide.years', { age: answer });
    const label = t(`tools.renta.guide.opt.${q}.${answer}`);
    const detail = DETAILS[q]?.(form, answer, t, money) ?? null;
    return detail === null ? label : `${label} · ${detail}`;
  };
}

/** "This is what we understand": every answer, each with a way back to its question. */
function Summary({
  form,
  reading,
  go,
  heading,
  onReview,
}: {
  form: RentaForm;
  reading: DraftReading | null;
  go: (index: number) => void;
  heading: React.RefObject<HTMLHeadingElement | null>;
  onReview: () => void;
}) {
  const { t } = useI18n();
  const describe = useDescribe(form);
  const fromDraft = reading ? draftAnswers(reading) : {};
  return (
    <div className="renta-summary">
      <h3 ref={heading} tabIndex={-1}>
        {t('tools.renta.guide.summary')}
      </h3>
      <p className="section-hint">{t('tools.renta.guide.summaryHint')}</p>
      <ul>
        {QUESTIONS.map((q, i) => {
          const name = t(`tools.renta.guide.short.${q}`);
          return (
            <li key={q}>
              <div>
                <span>{name}</span> <strong>{describe(q)}</strong>
                {q in fromDraft && (
                  <span className="renta-badge renta-badge--inDraft">
                    {t('tools.renta.guide.fromDraft')}
                  </span>
                )}
              </div>
              <button
                type="button"
                className="btn-secondary"
                aria-label={t('tools.renta.guide.changeOne', { question: name })}
                onClick={() => go(i)}
              >
                {t('tools.renta.guide.change')}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="button-row renta-guide-nav">
        <button type="button" className="btn-primary" onClick={onReview}>
          {t('tools.renta.review.start')}
        </button>
      </div>
    </div>
  );
}

/** Step 1 of the guided mode: one short question at a time, then the summary of what was understood. */
export function GuidedInterview(props: GuideProps) {
  const { t } = useI18n();
  const { form, set, reading } = props;
  // Back where it was left: the first question not answered yet (or the summary).
  const [at, setAt] = useState(() => firstOpen(form));
  const legend = useRef<HTMLLegendElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  // The focus follows the person only once they move: not when the page opens.
  const moved = useRef(false);
  // A question opened from the summary goes back to it.
  const [fromSummary, setFromSummary] = useState(false);

  useEffect(() => {
    if (!moved.current) return;
    (at < TOTAL ? legend.current : heading.current)?.focus();
  }, [at]);

  const go = (index: number) => {
    moved.current = true;
    setAt(index);
  };
  const q = QUESTIONS[at];
  const next = (e: React.FormEvent) => {
    e.preventDefault();
    // A typed answer, or one the draft or the expert mode already gave, is kept as answered.
    set({ answers: { ...form.answers, [q]: answerOf(form, q) as string } });
    go(fromSummary ? TOTAL : at + 1);
    setFromSummary(false);
  };
  const fromDraft = reading ? draftAnswers(reading) : {};

  return (
    <Step n={1} titleKey="tools.renta.guide.title" className="renta-guide">
      {at < TOTAL ? (
        <form onSubmit={next} noValidate>
          <p id="renta-guide-progress" className="renta-guide-count">
            {t('tools.renta.guide.progress', { n: at + 1, total: TOTAL })}
          </p>
          <progress
            className="renta-progress"
            max={TOTAL}
            value={at + 1}
            aria-labelledby="renta-guide-progress"
          />
          <fieldset className="renta-question">
            <legend ref={legend} tabIndex={-1}>
              {t(`tools.renta.guide.q.${q}`)}
            </legend>
            {q in fromDraft && (
              <p className="renta-badge renta-badge--inDraft">{t('tools.renta.guide.fromDraft')}</p>
            )}
            <p className="renta-why">
              <strong>{t('tools.renta.guide.why')}</strong> {t(`tools.renta.guide.why.${q}`)}
            </p>
            <QuestionBody q={q} {...props} />
          </fieldset>
          <div className="button-row renta-guide-nav">
            {at > 0 && (
              <button type="button" className="btn-secondary" onClick={() => go(at - 1)}>
                {t('tools.renta.guide.back')}
              </button>
            )}
            <button type="submit" className="btn-primary" disabled={!ready(form, q)}>
              {t(at === TOTAL - 1 ? 'tools.renta.guide.finish' : 'tools.renta.guide.next')}
            </button>
          </div>
          {!TYPED.includes(q) && (
            <p className="section-hint renta-guide-keys">{t('tools.renta.guide.keys')}</p>
          )}
        </form>
      ) : (
        <Summary
          form={form}
          reading={reading}
          go={(index) => {
            setFromSummary(true);
            go(index);
          }}
          heading={heading}
          onReview={props.onReview}
        />
      )}
    </Step>
  );
}
