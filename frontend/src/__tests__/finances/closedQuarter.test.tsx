import { useState } from 'react';
import { fireEvent, screen, within } from '@testing-library/react';
import {
  filingDeadline,
  isClosedQuarter,
  typedAmount,
} from '@modules/finances/domain/closedQuarter';
import {
  NO_EXTRAS,
  QuarterPanels,
  emptyManual,
  type ManualForm,
} from '@modules/finances/ui/components/AutonomoManual';
import { FIX_GUIDE_PATH } from '@modules/finances/ui/components/AutonomoClosedQuarter';
import { buildInputs } from '@modules/finances/ui/components/autonomoInputs';
import { toSaved } from '@modules/finances/ui/components/autonomoSync';
import { emptyActivity } from '@modules/finances/ui/components/activityForm';
import { renderWithProviders, tr } from '@test-utils/render';
import { freezeTime, restoreTime } from '@test-utils/time';

/**
 * A quarter whose filing period is over (docs/fiscalidad/corregir-un-modelo.md §11): the notice when
 * it is changed and what was filed, which only feeds box 05 of the next 130 (C1-C2). Invented data.
 */
const k = (key: string) => `app.autonomo.closed.${key}`;

describe('when a quarter is closed', () => {
  it('ends on the 20th after the quarter (30 January for the fourth), a weekend to Monday', () => {
    // 2026: 20 April and 20 July are Mondays, 20 October a Tuesday; 30 January 2027 is a Saturday.
    expect([1, 2, 3, 4].map((q) => filingDeadline(2026, q as 1 | 2 | 3 | 4))).toEqual([
      '2026-04-20',
      '2026-07-20',
      '2026-10-20',
      '2027-02-01',
    ]);
    expect(isClosedQuarter(2026, 3, '2026-10-20')).toBe(false);
    expect(isClosedQuarter(2026, 3, '2026-10-21')).toBe(true);
    expect(isClosedQuarter(2026, 4, '2027-01-31')).toBe(false);
  });

  it('reads a signed amount typed by hand, or nothing', () => {
    expect(typedAmount('-1000')).toBe(-1000);
    expect(typedAmount('200,5')).toBe(200.5);
    expect(typedAmount('')).toBeNull();
    expect(typedAmount(undefined)).toBeNull();
    expect(typedAmount('abc')).toBeNull();
  });
});

describe('what was filed, in the draft and in the account', () => {
  it('sends boxes 07 and 19 as filed, and nothing when none was typed', () => {
    const form: ManualForm = {
      ...emptyManual(),
      filed130: ['500', '500', '-1000', ''],
      activity: { ...emptyActivity(), paid130: ['500', '500', '0', ''] },
    };
    expect(buildInputs(form, NO_EXTRAS, 2026, 4).filed130).toEqual([
      { box07: 500, box19: 500 },
      { box07: 500, box19: 500 },
      { box07: -1000, box19: 0 },
      null,
    ]);
    // Box 19 alone (the Renta uses it) does not make a filed 130 for box 05.
    const paidOnly = { ...form, filed130: ['', '', '', ''] };
    expect('filed130' in buildInputs(paidOnly, NO_EXTRAS, 2026, 4)).toBe(false);
    expect('filed130' in buildInputs(emptyManual(), NO_EXTRAS, 2026, 4)).toBe(false);
  });

  it('keeps box 07 in the account copy only when something was typed', () => {
    expect(toSaved({ filed130: ['', '-1000'] }, NO_EXTRAS, {}).manual.filed130).toEqual([
      '',
      '-1000',
      '',
      '',
    ]);
    expect('filed130' in toSaved({ filed130: ['', ' '] }, NO_EXTRAS, {}).manual).toBe(false);
    expect('filed130' in toSaved(emptyManual(), NO_EXTRAS, {}).manual).toBe(false);
  });
});

function Panels({ start, onForm }: { start: ManualForm; onForm: (f: ManualForm) => void }) {
  const [form, setForm] = useState(start);
  return (
    <QuarterPanels
      form={form}
      onChange={(next) => {
        setForm(next);
        onForm(next);
      }}
      upTo={4}
      year={2026}
    />
  );
}

const quarter = (n: number) => document.getElementById(`autonomo-quarter-${n}`) as HTMLElement;
const type = (n: number, field: string, value: string) =>
  fireEvent.change(
    within(quarter(n)).getByLabelText(`${tr(`app.autonomo.income.${field}`)} ${n}`),
    { target: { value } }
  );

describe('the notice of a closed quarter', () => {
  beforeEach(() => freezeTime('2026-10-21T10:00:00'));
  afterEach(restoreTime);

  const open = (start: ManualForm = emptyManual()) => {
    const onForm = jest.fn();
    renderWithProviders(<Panels start={start} onForm={onForm} />, { authenticated: false });
    return onForm;
  };
  const last = (onForm: jest.Mock): ManualForm => onForm.mock.calls.at(-1)[0];

  it('comes once a closed quarter is changed, never on an open one', () => {
    open();
    expect(screen.queryByText(tr(k('title')))).toBeNull();
    // The 4T can still be filed until 1 February 2027: no notice.
    type(4, 'r21', '100');
    expect(screen.queryByText(tr(k('title')))).toBeNull();
    type(3, 'r21', '100');
    const notice = within(quarter(3)).getByRole('region', { name: tr(k('title')) });
    expect(within(notice).getByRole('status')).toHaveTextContent(tr(k('body')));
    expect(within(notice).getByText(tr(k('less')))).toBeInTheDocument();
    expect(within(notice).getByRole('link', { name: tr(k('guide')) })).toHaveAttribute(
      'href',
      FIX_GUIDE_PATH
    );
    expect(within(quarter(1)).queryByText(tr(k('title')))).toBeNull();
  });

  it('keeps what was filed: box 07 and 19 of the 130 and box 71 of the 303', () => {
    const onForm = open();
    type(3, 'r21', '100');
    const write = within(quarter(3)).getByRole('button', { name: tr(k('write')) });
    expect(write).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(write);
    expect(write).toHaveAttribute('aria-expanded', 'true');
    const field = (key: string) => within(quarter(3)).getByLabelText(tr(k(key), { n: 3 }));
    expect(field('box07')).toHaveAccessibleDescription(tr(k('box07Hint')));
    fireEvent.change(field('box07'), { target: { value: '-1000' } });
    expect(last(onForm).filed130).toEqual(['', '', '-1000', '']);
    expect(screen.getByText(tr(k('saved')))).toBeInTheDocument();
    fireEvent.change(field('box19'), { target: { value: '0' } });
    expect(last(onForm).activity?.paid130).toEqual(['', '', '0', '']);
    fireEvent.change(field('box71'), { target: { value: '-400' } });
    expect(last(onForm).filed303).toEqual([null, null, -400, null]);
    // Half-typed text is not kept as a number; an empty field forgets it.
    const calls = onForm.mock.calls.length;
    fireEvent.change(field('box71'), { target: { value: '-' } });
    expect(onForm.mock.calls).toHaveLength(calls);
    expect(field('box71')).toHaveValue('-');
    fireEvent.change(field('box71'), { target: { value: '' } });
    expect(last(onForm).filed303).toEqual([null, null, null, null]);
    fireEvent.click(write);
    expect(within(quarter(3)).queryByLabelText(tr(k('box07'), { n: 3 }))).toBeNull();
  });

  it('shows from the start when what was filed is already typed, with the 303 one too', () => {
    open({ ...emptyManual(), filed130: ['300'], filed303: [120, 80, null, null] });
    const notice = within(quarter(1)).getByRole('region', { name: tr(k('title')) });
    expect(within(notice).getByText(tr(k('saved')))).toBeInTheDocument();
    fireEvent.click(within(notice).getByRole('button', { name: tr(k('write')) }));
    expect(within(notice).getByLabelText(tr(k('box07'), { n: 1 }))).toHaveValue('300');
    expect(within(notice).getByLabelText(tr(k('box71'), { n: 1 }))).toHaveValue('120');
    // An imported 303 result alone, or nothing at all, brings no notice until the quarter is changed.
    expect(within(quarter(2)).queryByText(tr(k('title')))).toBeNull();
  });

  it('in modules asks only for the 303: the 130 does not apply', () => {
    open({
      ...emptyManual(),
      filed303: [null, 50, null, null],
      activity: { ...emptyActivity(), method: 'objective' },
    });
    fireEvent.click(
      within(quarter(2)).getByRole('button', { name: tr('app.autonomo.copyPrevious', { n: 1 }) })
    );
    const notice = within(quarter(2)).getByRole('region', { name: tr(k('title')) });
    fireEvent.click(within(notice).getByRole('button', { name: tr(k('write')) }));
    expect(within(notice).queryByLabelText(tr(k('box07'), { n: 2 }))).toBeNull();
    expect(within(notice).getByLabelText(tr(k('box71'), { n: 2 }))).toHaveValue('50');
    expect(within(notice).queryByText(tr(k('saved')))).toBeNull();
  });
});
