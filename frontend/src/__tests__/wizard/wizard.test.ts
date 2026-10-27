import { act, renderHook } from '@testing-library/react';
import { useWizardProgress } from '@modules/wizard/application/useWizard';
import {
  NEW_PROGRESS,
  cheerOf,
  completeStep,
  dayOf,
  firstOpenStep,
  isFinished,
  isOpen,
  minutesLeft,
  percentDone,
  reviveProgress,
  streakAfter,
} from '@modules/wizard/domain/wizard';

const STEPS = [
  { id: 'a', minutes: 2 },
  { id: 'b', minutes: 3 },
  { id: 'c', minutes: 5 },
];

describe('the steps of the assistant', () => {
  it('opens a step only when every step before it is done', () => {
    expect(isOpen(STEPS, [], 0)).toBe(true);
    expect(isOpen(STEPS, [], 1)).toBe(false);
    expect(isOpen(STEPS, ['a'], 1)).toBe(true);
    expect(isOpen(STEPS, ['a'], 2)).toBe(false);
    // Done out of order (an old copy): the gap still locks what comes after it.
    expect(isOpen(STEPS, ['b'], 2)).toBe(false);
  });

  it('knows the first step to do and when everything is done', () => {
    expect(firstOpenStep(STEPS, [])).toBe(0);
    expect(firstOpenStep(STEPS, ['a'])).toBe(1);
    expect(firstOpenStep(STEPS, ['a', 'b', 'c'])).toBe(2);
    expect(isFinished(STEPS, ['a', 'b'])).toBe(false);
    expect(isFinished(STEPS, ['c', 'a', 'b'])).toBe(true);
  });

  it('adds up the minutes left and the share done', () => {
    expect(minutesLeft(STEPS, [])).toBe(10);
    expect(minutesLeft(STEPS, ['a', 'c'])).toBe(3);
    expect(percentDone(STEPS, [])).toBe(0);
    expect(percentDone(STEPS, ['a'])).toBe(33);
    expect(percentDone(STEPS, ['a', 'b', 'c'])).toBe(100);
  });

  it('cheers without pressure as the person gets on', () => {
    expect(cheerOf(0, 9)).toBe('start');
    expect(cheerOf(1, 9)).toBe('first');
    expect(cheerOf(2, 9)).toBe('going');
    expect(cheerOf(5, 9)).toBe('half');
    expect(cheerOf(7, 9)).toBe('almost');
    expect(cheerOf(8, 9)).toBe('last');
    expect(cheerOf(9, 9)).toBe('finished');
  });
});

describe('days in a row', () => {
  it('writes a day as YYYY-MM-DD in local time', () => {
    expect(dayOf(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });

  it('keeps the streak on the same day, adds one the next day and starts again after a gap', () => {
    const p = { ...NEW_PROGRESS, streak: 3, lastDay: '2026-02-28' };
    expect(streakAfter(p, '2026-02-28')).toBe(3);
    expect(streakAfter(p, '2026-03-01')).toBe(4);
    expect(streakAfter(p, '2026-03-05')).toBe(1);
    expect(streakAfter(NEW_PROGRESS, '2026-03-05')).toBe(1);
    // The first step of the day counts as one even with an old zero.
    expect(streakAfter({ ...NEW_PROGRESS, lastDay: '2026-03-05' }, '2026-03-05')).toBe(1);
  });
});

describe('finishing a step', () => {
  it('keeps it as done, moves to the next one and counts the day', () => {
    const p = completeStep({ ...NEW_PROGRESS, screen: 2 }, STEPS, 0, '2026-03-01');
    expect(p).toMatchObject({ done: ['a'], at: 1, screen: 0, streak: 1, lastDay: '2026-03-01' });
    // Again from the route: not twice in the list.
    expect(completeStep(p, STEPS, 0, '2026-03-02').done).toEqual(['a']);
    // The last one stays on screen.
    expect(completeStep({ ...p, done: ['a', 'b'] }, STEPS, 2, '2026-03-02').at).toBe(2);
  });
});

describe('a saved progress', () => {
  it('starts anew from nothing or from something that is not a progress', () => {
    expect(reviveProgress(null, STEPS)).toEqual(NEW_PROGRESS);
    expect(reviveProgress([1], STEPS)).toEqual(NEW_PROGRESS);
  });

  it('keeps what has its shape and drops the rest', () => {
    const p = reviveProgress(
      {
        at: 1,
        screen: 2,
        done: ['a', 'a', 'gone', 7],
        answers: { x: 'yes', y: 3 },
        streak: 4,
        lastDay: '2026-03-01',
      },
      STEPS
    );
    expect(p).toEqual({
      at: 1,
      screen: 2,
      done: ['a'],
      answers: { x: 'yes' },
      streak: 4,
      lastDay: '2026-03-01',
    });
  });

  it('never opens a locked step and ignores numbers out of range', () => {
    const p = reviveProgress(
      { at: 2, screen: -1, done: 'a', answers: [], streak: 1.5, lastDay: 'yesterday' },
      STEPS
    );
    expect(p).toEqual(NEW_PROGRESS);
    expect(reviveProgress({ at: 9, done: ['a'] }, STEPS).at).toBe(0);
  });
});

describe('the progress hook', () => {
  beforeEach(() => localStorage.clear());

  it('does not open a locked step and takes another copy once checked', () => {
    const { result } = renderHook(() => useWizardProgress('k', STEPS));
    act(() => result.current.go(2));
    expect(result.current.progress.at).toBe(0);
    act(() => result.current.replace({ at: 1, done: ['a'], answers: { q: 'no' } }));
    expect(result.current.progress).toMatchObject({ at: 1, done: ['a'], answers: { q: 'no' } });
    expect(JSON.parse(localStorage.getItem('k') as string).at).toBe(1);
  });
});
