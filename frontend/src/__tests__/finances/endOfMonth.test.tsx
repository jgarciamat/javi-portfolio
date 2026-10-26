import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import es from '../../locales/es.json';
import en from '../../locales/en.json';
import { leftoverAt, parseDaily, sliderMax } from '@modules/finances/domain/endOfMonth';
import { EndOfMonthBlock } from '@modules/finances/ui/components/EndOfMonthBlock';
import { createFakeApi } from '@test-utils/fakeApi';
import * as f from '@test-utils/fixtures';
import { renderWithProviders, tr } from '@test-utils/render';

describe('leftoverAt / sliderMax / parseDaily', () => {
  const plan = f.endOfMonth();

  it.each([
    // 2.317,52 − 199,39 − daily · 5
    [71.03, 1762.98],
    [423.62, 0.03],
    [0, 2118.13],
    [500, -381.87],
  ])('spending %s a day leaves %s', (daily, left) => {
    expect(leftoverAt(plan, daily)).toBeCloseTo(left, 2);
  });

  it('takes the payments still to come on a negative month too', () => {
    const negative = f.endOfMonth({ available: -3575.08, pendingTotal: 12.99, daysLeft: 5 });
    expect(leftoverAt(negative, 20)).toBeCloseTo(-3688.07, 2);
  });

  it('tops the slider at twice the larger of the pace and the maximum, in tens', () => {
    expect(sliderMax(plan)).toBe(850); // 423,62 · 2 = 847,24
    expect(sliderMax(f.endOfMonth({ pace: 0, maxDaily: 0 }))).toBe(10);
  });

  it('reads the field with a comma or a dot, and nothing else', () => {
    expect(parseDaily('12,5')).toBe(12.5);
    expect(parseDaily('7.255')).toBe(7.26);
    expect(parseDaily('')).toBeNull();
    expect(parseDaily('-3')).toBeNull();
    expect(parseDaily('abc')).toBeNull();
  });
});

const show = (plan = f.endOfMonth(), onOpenTab?: (tab: string) => void, api = createFakeApi()) =>
  renderWithProviders(<EndOfMonthBlock plan={plan} onOpenTab={onOpenTab} />, {
    api,
    finances: false,
  });

/** «1.762,98 €» with or without the thousands dot and with the non-breaking space. */
const amount = (text: string) => new RegExp(text.replace('.', '\\.?').replace(' ', '\\s'));

describe('EndOfMonthBlock', () => {
  it('says how the month would end, the most a day and the figures behind them', () => {
    const { container } = show();
    expect(screen.getByText(tr('app.forecast.eom.kicker'))).toBeInTheDocument();
    const figure = container.querySelector('.eom-figure') as HTMLElement;
    expect(figure).toHaveTextContent(amount('1.762,98 €'));
    expect(figure).toHaveClass('eom-tone--ok');
    expect(container.querySelector('.eom')).toHaveClass('eom--ok');
    expect(screen.getByText(tr('app.forecast.eom.status.ok'))).toBeInTheDocument();
    expect(screen.getByText(amount('423,62 €/día'), { selector: 'strong' })).toBeInTheDocument();
    const facts = within(container.querySelector('.eom-facts') as HTMLElement);
    expect(facts.getByText(amount('2.317,52 €'))).toBeInTheDocument();
    expect(facts.getByText(amount('199,39 €'))).toBeInTheDocument();
    expect(facts.getByText('5, con hoy')).toBeInTheDocument();
    expect(facts.getByText(amount('71,03 €/día'))).toBeInTheDocument();
    expect(screen.queryByText(tr('app.forecast.eom.fewData'))).toBeNull();
    expect(screen.getByText(tr('app.forecast.eom.disclaimer'))).toBeInTheDocument();
  });

  it('explains the formula with the real figures and lists the payments', () => {
    const { container } = show();
    const how = within(container.querySelector('details.eom-how') as HTMLElement);
    expect(how.getByText(tr('app.forecast.eom.how.title'))).toBeInTheDocument();
    expect(how.getByText(/Este mes llevas .*1\.?890,00.* en 27 días: .*70,00/)).toBeInTheDocument();
    expect(how.getByText(/últimos 3 meses completos: .*75,00/)).toBeInTheDocument();
    expect(
      how.getByText(/\(.*1\.?890,00.* \+ 7 × .*75,00.*\) ÷ \(27 \+ 7\) = .*71,03/)
    ).toBeInTheDocument();
    expect(
      how.getByText(/2\.?317,52.* − .*199,39.* − .*71,03.* × 5 días = .*1\.?762,98/)
    ).toBeInTheDocument();
    expect(how.getByText(/Máximo al día: .* ÷ 5 días = .*423,62/)).toBeInTheDocument();
    expect(how.getByText(tr('app.forecast.eom.how.excluded'))).toBeInTheDocument();
    expect(how.queryByText(tr('app.forecast.eom.how.pendingNone'))).toBeNull();
    const pending = how.getByText(tr('app.forecast.eom.how.pendingTitle')).parentElement!;
    const rows = within(pending).getAllByRole('row');
    expect(rows).toHaveLength(3);
    expect(within(rows[1]).getByText('NETFLIX.COM')).toBeInTheDocument();
    expect(within(rows[1]).getByText('29 de octubre')).toBeInTheDocument();
    expect(within(rows[1]).getByText(amount('12,99 €'))).toBeInTheDocument();
    expect(how.getByText(tr('app.forecast.eom.how.scheduledTitle'))).toBeInTheDocument();
    expect(how.getByText('Dentista')).toBeInTheDocument();
    expect(how.queryByText(tr('app.forecast.eom.how.oneOffsTitle'))).toBeNull();
  });

  it('tries another daily amount with the field and the slider, and goes back to the usual pace', () => {
    show();
    const field = screen.getByLabelText(tr('app.forecast.eom.whatIf.label'));
    const slider = screen.getByRole('slider', { name: tr('app.forecast.eom.whatIf.slider') });
    expect(field).toHaveValue(71.03);
    expect(slider).toHaveAttribute('max', '850');
    expect(
      screen.getByText(/te quedarían .*1\.?762,98.* para ahorrar o invertir/)
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: tr('app.forecast.eom.whatIf.reset') })).toBeNull();

    fireEvent.change(field, { target: { value: '500' } });
    const missing = screen.getByText(
      /no llegarías a fin de mes con ese ritmo, te faltarían .*381,87/
    );
    expect(missing).toHaveClass('eom-tone--short');
    // The slider stops at its top while the field says more.
    fireEvent.change(field, { target: { value: '900' } });
    expect(slider).toHaveValue('850');

    fireEvent.change(slider, { target: { value: '100' } });
    expect(field).toHaveValue(100);
    expect(screen.getByText(/te quedarían .*1\.?618,13/)).toHaveClass('eom-tone--ok');
    expect(slider).toHaveAttribute('aria-valuetext', expect.stringMatching(/100,00.*\/día/));

    // While the field is empty, the usual pace is used.
    fireEvent.change(field, { target: { value: '' } });
    expect(screen.getByText(/te quedarían .*1\.?762,98/)).toBeInTheDocument();

    fireEvent.change(field, { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: tr('app.forecast.eom.whatIf.reset') }));
    expect(field).toHaveValue(71.03);
  });

  it('links to the guides of what to do with the rest, inside the app or by address', () => {
    const open = jest.fn();
    const { unmount } = show(f.endOfMonth(), open);
    expect(screen.getByText(tr('app.forecast.eom.surplus.title'))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: tr('app.forecast.eom.surplus.invest') }));
    fireEvent.click(screen.getByRole('button', { name: tr('app.forecast.eom.surplus.crypto') }));
    expect(open.mock.calls).toEqual([['invest'], ['crypto']]);
    unmount();

    show();
    expect(
      screen.getByRole('link', { name: tr('app.forecast.eom.surplus.invest') })
    ).toHaveAttribute('href', '/?tab=invest');
    expect(
      screen.getByRole('link', { name: tr('app.forecast.eom.surplus.crypto') })
    ).toHaveAttribute('href', '/?tab=crypto');
  });

  it('on a negative month without history: no daily margin, this month only and in red', () => {
    const { container } = show(
      f.endOfMonth({
        fewData: true,
        available: -3575.08,
        historyDaily: null,
        historyMonths: 0,
        monthVariable: 540,
        monthDaily: 20,
        pace: 20,
        pending: [],
        pendingTotal: 0,
        scheduled: [],
        scheduledTotal: 0,
        oneOffs: [{ description: 'Televisor', date: '2026-10-03', amount: 2000 }],
        outlierMonths: [{ year: 2025, month: 11 }],
        projectedEnd: -3675.08,
        maxDaily: 0,
        status: 'short',
      })
    );
    expect(container.querySelector('.eom-figure')).toHaveClass('eom-tone--short');
    expect(screen.getByText(tr('app.forecast.eom.status.short'))).toBeInTheDocument();
    expect(screen.getByText(tr('app.forecast.noneLeft'))).toBeInTheDocument();
    expect(screen.getByText(tr('app.forecast.eom.fewData'))).toBeInTheDocument();
    expect(screen.getByText(/tu ritmo habitual es el de este mes: .*20,00/)).toBeInTheDocument();
    expect(screen.queryByText(/meses completos/)).toBeNull();
    expect(screen.getByText(tr('app.forecast.eom.how.pendingNone'))).toBeInTheDocument();
    expect(screen.getByText(tr('app.forecast.eom.how.oneOffsTitle'))).toBeInTheDocument();
    expect(screen.getByText('Televisor')).toBeInTheDocument();
    expect(screen.getByText(/fuera de la media .*: nov(iembre)? 2025\./i)).toBeInTheDocument();
    expect(screen.getByText(/te faltarían .*3\.?675,08/)).toBeInTheDocument();
  });

  it('marks a tight month in amber', () => {
    const { container } = show(f.endOfMonth({ status: 'tight', projectedEnd: 50 }));
    expect(container.querySelector('.eom-figure')).toHaveClass('eom-tone--tight');
    expect(screen.getByText(tr('app.forecast.eom.status.tight'))).toBeInTheDocument();
  });

  it('asks for more data instead of guessing', () => {
    const { container } = show(f.endOfMonth({ enoughData: false }));
    expect(screen.getByText(tr('app.forecast.eom.notEnough'))).toBeInTheDocument();
    expect(container.querySelector('.eom-figure')).toBeNull();
    expect(screen.queryByRole('slider')).toBeNull();
  });

  it('uses the currency of the user (dollars)', async () => {
    const api = createFakeApi();
    api.settingsApi.get.mockResolvedValue(f.settings({ currency: 'USD' }));
    const { container } = show(f.endOfMonth(), undefined, api);
    await waitFor(() =>
      expect(container.querySelector('.eom-figure')).toHaveTextContent(/1\.?762,98\sUS\$/)
    );
  });

  it('speaks English', () => {
    renderWithProviders(<EndOfMonthBlock plan={f.endOfMonth()} />, {
      finances: false,
      locale: 'en',
    });
    expect(screen.getByText(en['app.forecast.eom.kicker'])).toBeInTheDocument();
    expect(
      screen.getByText(/you would have .*1,762\.98 left to save or invest/)
    ).toBeInTheDocument();
  });
});

/**
 * Orientative and in the user's own figures: no promises, no orders, no «exact», no «gestor», and
 * «transacción», never «movimiento».
 */
describe('The words of «¿Llegas a fin de mes?»', () => {
  const FORBIDDEN =
    /recomend|ahorrarás|perfect|exact|garantiz|gestor|NO CONFIRMADO|movimiento|deberías|recommend|you will save|guarantee|you should|movement/i;
  const keys = (texts: Record<string, string>) =>
    Object.entries(texts).filter(([key]) => key.startsWith('app.forecast.eom.'));

  it('estimate, never promise or advise', () => {
    for (const texts of [es, en]) {
      expect(keys(texts).filter(([, text]) => FORBIDDEN.test(text))).toEqual([]);
    }
    expect(keys(es).map(([k]) => k)).toEqual(keys(en).map(([k]) => k));
    expect(es['app.forecast.eom.disclaimer']).toMatch(/no es asesoramiento financiero/);
    expect(es['app.forecast.eom.surplus.body']).toMatch(/podrías destinarlo/);
  });
});
