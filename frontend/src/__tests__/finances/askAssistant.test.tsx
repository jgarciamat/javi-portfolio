import { fireEvent, screen } from '@testing-library/react';
import { AIAdvisor } from '@modules/finances/ui/components/AIAdvisor';
import { AskAssistant } from '@modules/finances/ui/components/AskAssistant';
import { ApiError } from '@core/api/http';
import { createFakeApi } from '@test-utils/fakeApi';
import * as f from '@test-utils/fixtures';
import { renderWithProviders, tr } from '@test-utils/render';

const input = () => screen.getByRole('textbox', { name: tr('app.ask.title') });
const submit = () => fireEvent.click(screen.getByRole('button', { name: tr('app.ask.submit') }));

describe('Ask the assistant', () => {
  it('sends the question in the user language and shows the answer with the quota', async () => {
    const api = createFakeApi();
    renderWithProviders(<AskAssistant />, { api, finances: false });
    fireEvent.change(input(), { target: { value: '  ¿Cuánto gasté en ocio?  ' } });
    submit();
    expect(await screen.findByText('Gastaste 120 € en ocio.')).toBeInTheDocument();
    expect(api.insightsApi.ask).toHaveBeenCalledWith('¿Cuánto gasté en ocio?', 'es');
    expect(screen.getByText(tr('app.ai.quota', { used: 2, quota: 10 }))).toBeInTheDocument();
    expect(screen.getByText(tr('app.ask.privacy'))).toBeInTheDocument();
  });

  it('ignores a question that is too short', () => {
    const api = createFakeApi();
    renderWithProviders(<AskAssistant />, { api, finances: false });
    fireEvent.change(input(), { target: { value: 'ab' } });
    submit();
    expect(api.insightsApi.ask).not.toHaveBeenCalled();
  });

  it('shows what went wrong and clears the previous answer', async () => {
    const api = createFakeApi();
    renderWithProviders(<AskAssistant />, { api, finances: false });
    fireEvent.change(input(), { target: { value: 'primera pregunta' } });
    submit();
    await screen.findByText('Gastaste 120 € en ocio.');
    api.insightsApi.ask.mockRejectedValueOnce(
      new ApiError('Has usado todos tus análisis con IA de este mes', 400, 'AI_QUOTA')
    );
    submit();
    expect(await screen.findByText(/Has usado todos tus análisis/)).toBeInTheDocument();
    expect(screen.queryByText('Gastaste 120 € en ocio.')).toBeNull();
    api.insightsApi.ask.mockRejectedValueOnce('boom');
    submit();
    expect(await screen.findByText(new RegExp(tr('app.ask.error')))).toBeInTheDocument();
  });

  it('disables the button while waiting', async () => {
    const api = createFakeApi();
    let finish!: (value: ReturnType<typeof f.answer>) => void;
    api.insightsApi.ask.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    renderWithProviders(<AskAssistant />, { api, finances: false });
    fireEvent.change(input(), { target: { value: 'una pregunta' } });
    submit();
    expect(await screen.findByRole('button', { name: tr('app.common.loading') })).toBeDisabled();
    finish(f.answer());
    await screen.findByText('Gastaste 120 € en ocio.');
  });

  it('offers the plans instead of the box to users without Premium', async () => {
    const api = createFakeApi();
    api.billingApi.get.mockResolvedValue(
      f.billing({ plan: 'free', trialDaysLeft: 0, limits: f.catalog().limits.free })
    );
    renderWithProviders(<AskAssistant />, { api, plan: true, finances: false });
    expect(await screen.findByText(tr('app.ask.locked'))).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: new RegExp(tr('billing.seePlans')) }));
    expect(
      await screen.findByText(
        tr('billing.reason.feature', { feature: tr('billing.feature.aiAdvisor') })
      )
    ).toBeInTheDocument();
  });
});

describe('AI analysis for free users', () => {
  const free = f.billing({ plan: 'free', trialDaysLeft: 0, limits: f.catalog().limits.free });

  it('offers Premium once the one free analysis of the month is spent', async () => {
    const api = createFakeApi();
    api.billingApi.get.mockResolvedValue(free);
    api.insightsApi.advice.mockResolvedValue(f.advice({ source: 'rules', reason: 'quota' }));
    renderWithProviders(<AIAdvisor year={2026} month={3} onAnalyzed={jest.fn()} />, {
      api,
      plan: true,
    });
    fireEvent.click(await screen.findByRole('button', { name: tr('app.ai.btn.analyze') }));
    expect(await screen.findByText(tr('app.ai.fallback.quotaFree'))).toBeInTheDocument();
    // One in the notice and one in the locked question box.
    const plans = screen.getAllByRole('button', { name: new RegExp(tr('billing.seePlans')) });
    expect(plans).toHaveLength(2);
    fireEvent.click(plans[0]);
    expect(
      await screen.findByText(
        tr('billing.reason.feature', { feature: tr('billing.feature.aiAdvisor') })
      )
    ).toBeInTheDocument();
  });
});
