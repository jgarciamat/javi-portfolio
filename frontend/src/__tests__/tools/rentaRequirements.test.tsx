import { fireEvent, screen } from '@testing-library/react';
import { useState } from 'react';
import { allYes, checkDeduction, type Check } from '@modules/tools/domain/rentaRequirements';
import type { Family } from '@modules/tools/domain/rentaCalc';
import type { Deduction } from '@modules/tools/domain/rentaData';
import type { Choice } from '@modules/tools/domain/rentaForm';
import { withRequirements } from '@modules/tools/data/renta';
import { Requirements } from '@modules/tools/ui/renta/Requirements';
import { renderWithProviders, tr } from '@test-utils/render';

const family = (patch: Partial<Family> = {}): Family => ({
  age: 30,
  disability: 0,
  children: [{ age: 2, disability: 0 }],
  ascendants: [],
  sharedChildren: false,
  assistance: false,
  ...patch,
});
const ask: Check = { kind: 'ask', id: 'a', q: '¿Cumples?' };

describe('the requirements of a deduction', () => {
  it('checks what the return knows and asks the rest', () => {
    const checks: Check[] = [
      { kind: 'maxAge', age: 35 },
      { kind: 'minAge', age: 18 },
      { kind: 'children', min: 1 },
      { kind: 'childUnder', age: 3 },
      { kind: 'disability', min: 33 },
    ];
    expect(checkDeduction(checks, family(), {}).status).toBe('fail');
    expect(checkDeduction(checks, family({ disability: 33 }), {}).status).toBe('ok');
    expect(checkDeduction([{ kind: 'maxAge', age: 25 }], family(), {}).failed).toEqual({
      kind: 'maxAge',
      age: 25,
    });
    expect(checkDeduction([{ kind: 'minAge', age: 65 }], family(), {}).status).toBe('fail');
    expect(checkDeduction([{ kind: 'children', min: 2 }], family(), {}).status).toBe('fail');
    expect(checkDeduction([{ kind: 'childUnder', age: 1 }], family(), {}).status).toBe('fail');
    expect(checkDeduction([ask], family(), undefined)).toEqual({
      status: 'missing',
      failed: null,
      missing: [ask],
    });
    expect(checkDeduction([ask], family(), { a: 'no' }).status).toBe('fail');
    expect(checkDeduction([ask], family(), { a: 'yes' }).status).toBe('ok');
    expect(checkDeduction(undefined, family(), undefined).status).toBe('ok');
  });

  it('answers every question «yes» to know what it would give', () => {
    expect(allYes([ask, { kind: 'maxAge', age: 35 }])).toEqual({ a: 'yes' });
    expect(allYes([{ kind: 'maxAge', age: 35 }])).toBeUndefined();
  });

  it('adds the requirements of a community to its deductions', () => {
    const d = { id: 'x', title: 'X' } as Deduction;
    const merged = withRequirements(
      { id: 'c', name: 'C', regime: 'common', deductions: [d, { ...d, id: 'y' }], source: '' },
      { x: { box: '0001', checks: [ask] } }
    );
    expect(merged.deductions).toEqual([
      { ...d, box: '0001', checks: [ask] },
      { ...d, id: 'y' },
    ]);
  });
});

function Harness({ deduction, start }: { deduction: Deduction; start: Choice }) {
  const [choice, setChoice] = useState(start);
  return (
    <Requirements deduction={deduction} choice={choice} family={family()} onChange={setChoice} />
  );
}

describe('the requirements on screen', () => {
  const base = {
    id: 'd',
    title: 'D',
    group: 'family',
    summary: '',
    kind: 'fixed',
    requirements: '',
    url: '',
  } as const;
  const on: Choice = { on: true, amount: '', units: '' };

  it('says each known requirement in words and asks the questions', () => {
    const checks: Check[] = [
      { kind: 'maxAge', age: 35 },
      { kind: 'minAge', age: 18 },
      { kind: 'children', min: 1 },
      { kind: 'childUnder', age: 3 },
      { kind: 'disability', min: 33 },
      ask,
    ];
    renderWithProviders(<Harness deduction={{ ...base, checks }} start={on} />, {
      authenticated: false,
    });
    expect(screen.getByText(tr('tools.renta.req.maxAge', { age: 35 }))).toBeInTheDocument();
    expect(screen.getByText(tr('tools.renta.req.disability', { min: 33 }))).toBeInTheDocument();
    expect(screen.getByText(tr('tools.renta.req.fail'))).toBeInTheDocument();
  });

  it('shows nothing without requirements nor box, and only the box when there is one', () => {
    const { container } = renderWithProviders(<Harness deduction={base} start={on} />, {
      authenticated: false,
    });
    expect(container).toBeEmptyDOMElement();
    renderWithProviders(<Harness deduction={{ ...base, box: '0850' }} start={on} />, {
      authenticated: false,
    });
    expect(screen.getByText(tr('tools.renta.req.box', { box: '0850' }))).toBeInTheDocument();
    expect(screen.queryByText(tr('tools.renta.req.title'))).toBeNull();
  });

  it('waits for the answers', () => {
    renderWithProviders(<Harness deduction={{ ...base, checks: [ask] }} start={on} />, {
      authenticated: false,
    });
    expect(screen.getByText(tr('tools.renta.req.missing', { count: 1 }))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: tr('tools.renta.req.yes') }));
    expect(screen.queryByText(tr('tools.renta.req.missing', { count: 1 }))).toBeNull();
  });
});
