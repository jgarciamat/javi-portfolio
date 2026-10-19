import { act, fireEvent, screen } from '@testing-library/react';
import { useState } from 'react';
import { useWizardProgress, PREFS_KEY, speak } from '@modules/wizard/application/useWizard';
import { Choice } from '@modules/wizard/ui/Choice';
import { Wizard, type WizardStepView } from '@modules/wizard/ui/Wizard';
import { renderWithProviders, tr } from '@test-utils/render';

const DEFS = [
  { id: 'one', minutes: 2 },
  { id: 'two', minutes: 3 },
];
const KEY = 'test_wizard';

/** Two steps: the first with a question and a screen with nothing to answer, the second with one. */
function Harness({ onExpert = jest.fn(), onRestart = jest.fn() }) {
  const controls = useWizardProgress(KEY, DEFS);
  const [colour, setColour] = useState<string | null>(null);
  const steps: WizardStepView[] = [
    {
      id: 'one',
      title: 'First step',
      icon: 'user',
      badge: 'Starter',
      screens: [
        {
          id: 'colour',
          title: 'Which colour?',
          hint: 'For example: blue.',
          help: 'A colour is a colour.',
          ready: colour !== null,
          missing: 'Pick a colour.',
          warning: colour === 'red' ? 'Red is bold.' : null,
          onNext: () => controls.answer('seen', 'yes'),
          body: (
            <Choice
              name="colour"
              label="Which colour?"
              options={[
                { value: 'blue', label: 'Blue', hint: 'Like the sea' },
                { value: 'red', label: 'Red' },
              ]}
              value={colour}
              onChange={setColour}
            />
          ),
        },
        { id: 'info', title: 'Just so you know', ready: true, noSkip: true, body: <p>Info</p> },
      ],
    },
    {
      id: 'two',
      title: 'Second step',
      icon: 'home',
      badge: 'Finisher',
      screens: [
        {
          id: 'size',
          title: 'Which size?',
          ready: false,
          skipLabel: 'No idea',
          body: <p>Sizes</p>,
        },
      ],
    },
  ];
  return (
    <Wizard
      flow="test"
      defs={DEFS}
      steps={steps}
      controls={controls}
      onExpert={onExpert}
      onRestart={() => {
        onRestart();
        controls.restart();
      }}
      finale={<p>All done here</p>}
    />
  );
}

const next = () => screen.getByRole('button', { name: `${tr('wizard.next')} →` });
const finish = (n: number) => screen.getByRole('button', { name: tr('wizard.finishStep', { n }) });
const routeButton = (n: number, title: string) =>
  screen.getByRole('button', { name: new RegExp(`${tr('wizard.stepN', { n })} ${title}`) });

beforeEach(() => {
  localStorage.clear();
  document.documentElement.className = '';
});

describe('the assistant, one screen at a time', () => {
  it('locks the way on until the screen is answered, and the next step until this one is done', () => {
    renderWithProviders(<Harness />, { authenticated: false });
    expect(screen.getByRole('heading', { name: 'Which colour?' })).toBeInTheDocument();
    expect(
      screen.getByText(tr('wizard.kicker', { n: 1, total: 2, title: 'First step' }), {
        exact: false,
      })
    ).toBeInTheDocument();
    expect(next()).toBeDisabled();
    expect(screen.getByText('Pick a colour.')).toBeInTheDocument();
    // No way back on the very first screen.
    expect(screen.queryByRole('button', { name: `← ${tr('wizard.back')}` })).toBeNull();

    // The second step is there, with a padlock, and says why it does not open.
    const locked = routeButton(2, 'Second step');
    expect(locked).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(locked);
    expect(
      screen.getByText(tr('wizard.lockedSay', { n: 1, title: 'First step' }), { exact: false })
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Which colour?' })).toBeInTheDocument();
    // An open step from the route clears the message.
    fireEvent.click(routeButton(1, 'First step'));
    expect(screen.queryByText(tr('wizard.lockedSay', { n: 1, title: 'First step' }))).toBeNull();

    fireEvent.click(screen.getByRole('radio', { name: /Red/ }));
    expect(screen.getByText('Red is bold.')).toBeInTheDocument();
    expect(next()).toBeEnabled();
    fireEvent.click(next());
    expect(screen.getByRole('heading', { name: 'Just so you know' })).toHaveFocus();
    expect(JSON.parse(localStorage.getItem(KEY) as string).answers).toEqual({ seen: 'yes' });
    // Nothing to answer: no «I don't know».
    expect(screen.queryByRole('button', { name: tr('wizard.skip') })).toBeNull();

    // Back keeps the answer.
    fireEvent.click(screen.getByRole('button', { name: `← ${tr('wizard.back')}` }));
    expect(screen.getByRole('radio', { name: /Red/ })).toBeChecked();
    fireEvent.click(next());
    fireEvent.click(finish(1));

    expect(screen.getByText(tr('wizard.badgeWon', { badge: 'Starter' }))).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Which size?' })).toHaveFocus();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
    expect(screen.getByText(tr('wizard.minutesLeft', { minutes: 3 }))).toBeInTheDocument();
    expect(routeButton(1, 'First step')).toHaveTextContent(`(${tr('wizard.done')})`);
  });

  it("takes «I don't know» as an answer, goes back across steps and celebrates the end", () => {
    renderWithProviders(<Harness />, { authenticated: false });
    fireEvent.click(screen.getByRole('button', { name: tr('wizard.skip') }));
    expect(screen.getByRole('heading', { name: 'Just so you know' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: `← ${tr('wizard.back')}` }));
    expect(screen.getByText(tr('wizard.unknownNote'))).toBeInTheDocument();
    expect(next()).toBeEnabled();
    fireEvent.click(next());
    fireEvent.click(finish(1));

    // From the first screen of a step, back goes to the last screen of the one before.
    fireEvent.click(screen.getByRole('button', { name: `← ${tr('wizard.back')}` }));
    expect(screen.getByRole('heading', { name: 'Just so you know' })).toBeInTheDocument();
    fireEvent.click(finish(1));
    expect(screen.getByRole('button', { name: tr('wizard.finishAll') })).toBeDisabled();
    expect(screen.getByText(tr('wizard.answerFirst'))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'No idea' }));

    expect(screen.getByRole('heading', { name: tr('wizard.finaleTitle') })).toHaveFocus();
    expect(screen.getByText('All done here')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: tr('wizard.badges') })).toHaveTextContent('Finisher');
    expect(screen.getByText(tr('wizard.noTimeLeft'))).toBeInTheDocument();

    // A step opened again from the route shows it instead of the end.
    fireEvent.click(routeButton(2, 'Second step'));
    expect(screen.getByRole('heading', { name: 'Which size?' })).toBeInTheDocument();
  });

  it('picks up where it was left, with a note, and counts days in a row', () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        at: 1,
        screen: 0,
        done: ['one'],
        answers: {},
        streak: 3,
        lastDay: '2026-01-01',
      })
    );
    renderWithProviders(<Harness />, { authenticated: false });
    expect(
      screen.getByText(tr('wizard.resumed', { n: 2, title: 'Second step' }))
    ).toBeInTheDocument();
    expect(screen.getByText(tr('wizard.streak', { days: 3 }))).toBeInTheDocument();
    // The focus stays where the page put it.
    expect(screen.getByRole('heading', { name: 'Which size?' })).not.toHaveFocus();
  });
});

describe('coming back after the end', () => {
  it('shows the end, not where it was left', () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        at: 0,
        screen: 0,
        done: ['one', 'two'],
        answers: {},
        streak: 1,
        lastDay: null,
      })
    );
    renderWithProviders(<Harness />, { authenticated: false });
    expect(screen.getByRole('heading', { name: tr('wizard.finaleTitle') })).toBeInTheDocument();
    expect(screen.queryByText(/Seguimos donde lo dejaste/)).toBeNull();
  });
});

describe('reading tools', () => {
  it('makes the letters bigger and the contrast higher, and remembers it', () => {
    const { unmount } = renderWithProviders(<Harness />, { authenticated: false });
    const big = screen.getByRole('button', { name: tr('wizard.big') });
    fireEvent.click(big);
    expect(big).toHaveAttribute('aria-pressed', 'true');
    expect(document.documentElement).toHaveClass('wiz-big-text');
    fireEvent.click(screen.getByRole('button', { name: tr('wizard.contrast') }));
    expect(document.documentElement).toHaveClass('wiz-contrast');
    expect(JSON.parse(localStorage.getItem(PREFS_KEY) as string)).toEqual({
      big: true,
      contrast: true,
    });
    unmount();
    // Leaving the assistant leaves the rest of the app as it was.
    expect(document.documentElement).not.toHaveClass('wiz-big-text');
    renderWithProviders(<Harness />, { authenticated: false });
    expect(document.documentElement).toHaveClass('wiz-big-text', 'wiz-contrast');
  });

  it('opens the expert mode and starts again only after confirming', () => {
    const onExpert = jest.fn();
    const onRestart = jest.fn();
    renderWithProviders(<Harness onExpert={onExpert} onRestart={onRestart} />, {
      authenticated: false,
    });
    fireEvent.click(screen.getByRole('button', { name: new RegExp(tr('wizard.expert')) }));
    expect(onExpert).toHaveBeenCalled();
    const confirm = jest.spyOn(window, 'confirm').mockReturnValue(false);
    fireEvent.click(screen.getByRole('button', { name: new RegExp(tr('wizard.restart')) }));
    expect(onRestart).not.toHaveBeenCalled();
    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByRole('radio', { name: /Blue/ }));
    fireEvent.click(next());
    fireEvent.click(screen.getByRole('button', { name: new RegExp(tr('wizard.restart')) }));
    expect(confirm).toHaveBeenCalledWith(tr('wizard.restartConfirm'));
    expect(onRestart).toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'Which colour?' })).toBeInTheDocument();
    confirm.mockRestore();
  });

  it('explains the words of the screen and reads it aloud where the device can', () => {
    const synth = { speak: jest.fn(), cancel: jest.fn() };
    class Utterance {
      lang = '';
      rate = 1;
      constructor(public text: string) {}
    }
    Object.assign(window, { speechSynthesis: synth, SpeechSynthesisUtterance: Utterance });
    renderWithProviders(<Harness />, { authenticated: false });
    const what = screen.getByRole('button', { name: tr('wizard.whatIs') });
    fireEvent.click(screen.getByRole('button', { name: tr('wizard.readAloud') }));
    expect(synth.speak.mock.calls[0][0]).toMatchObject({
      text: 'Which colour?. For example: blue.',
      lang: 'es-ES',
      rate: 0.9,
    });
    fireEvent.click(what);
    expect(what).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('A colour is a colour.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: tr('wizard.readAloud') }));
    expect(synth.cancel).toHaveBeenCalledTimes(2);
    expect(synth.speak.mock.calls[1][0].text).toContain('A colour is a colour.');
    // A screen without help has only the voice.
    fireEvent.click(screen.getByRole('radio', { name: /Blue/ }));
    fireEvent.click(next());
    expect(screen.queryByRole('button', { name: tr('wizard.whatIs') })).toBeNull();
    act(() => speak('Hello', 'en-GB'));
    expect(synth.speak.mock.calls[2][0]).toMatchObject({ text: 'Hello', lang: 'en-GB' });
    delete (window as Partial<typeof window>).speechSynthesis;
  });

  it('has no voice button where the device cannot speak', () => {
    renderWithProviders(<Harness />, { authenticated: false });
    expect(screen.queryByRole('button', { name: tr('wizard.readAloud') })).toBeNull();
  });
});
