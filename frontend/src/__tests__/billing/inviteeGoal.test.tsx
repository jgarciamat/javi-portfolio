import { fireEvent, screen, within } from '@testing-library/react';
import { Dashboard } from '@modules/finances/ui/components/Dashboard';
import { PlanView } from '@modules/billing/ui/PlanView';
import { createFakeApi } from '@test-utils/fakeApi';
import * as f from '@test-utils/fixtures';
import { renderWithProviders, tr } from '@test-utils/render';
import { freezeTime, restoreTime } from '@test-utils/time';

beforeEach(() => {
  localStorage.clear();
  freezeTime('2026-03-15T12:00:00');
});
afterEach(restoreTime);

const TITLE = () => tr('app.inviteeGoal.title');
const DONE = () => tr('app.inviteeGoal.done');

const invited = (counts: Parameters<typeof f.inviteeSteps>[0] = {}, rewarded = false) =>
  f.referral({ invited: { rewarded, steps: f.inviteeSteps(counts) } });

function dashboard(referral = invited({ movements: 1, goals: 1 })) {
  const api = createFakeApi();
  api.billingApi.referral.mockResolvedValue(referral);
  const view = renderWithProviders(<Dashboard />, { api, plan: true });
  return { ...view, api };
}

describe('The invited user’s free month', () => {
  it('lists what is missing on the month view, with its progress', async () => {
    dashboard();
    const card = await screen.findByRole('region', { name: TITLE() });
    expect(within(card).getByText(tr('app.inviteeGoal.hint', { days: 30 }))).toBeVisible();
    const progress = tr('app.inviteeGoal.progress', { done: 1, total: 4 });
    expect(within(card).getByText(progress)).toBeVisible();
    const bar = within(card).getByRole('progressbar', { name: TITLE() });
    expect(bar).toHaveAttribute('aria-valuenow', '2');
    expect(bar).toHaveAttribute('aria-valuemax', '6');
    expect(bar).toHaveAttribute('aria-valuetext', progress);
    expect(
      within(card).getByText(tr('app.inviteeGoal.movements', { count: 1, goal: 3 }))
    ).toBeVisible();
    expect(within(card).getByText(tr('app.inviteeGoal.goals'))).toBeVisible();
    expect(within(card).getByText(new RegExp(tr('app.inviteeGoal.stepDone')))).toHaveClass(
      'sr-only'
    );
    // A button for each step left; the goal is done.
    expect(within(card).getAllByRole('button')).toHaveLength(4);
    expect(within(card).queryByRole('button', { name: tr('app.inviteeGoal.go.goals') })).toBeNull();
  });

  const go = async (key: string) =>
    fireEvent.click(
      within(await screen.findByRole('region', { name: TITLE() })).getByRole('button', {
        name: tr(`app.inviteeGoal.go.${key}`),
      })
    );

  it('opens the section of each step', async () => {
    let view = dashboard();
    await go('budgets');
    expect(await screen.findByRole('region', { name: tr('app.tabs.budgets') })).toBeInTheDocument();
    view.unmount();
    localStorage.clear();
    view = dashboard();
    await go('automations');
    expect(
      await screen.findAllByRole('heading', { name: new RegExp(tr('app.tabs.automations')) })
    ).not.toHaveLength(0);
    view.unmount();
  });

  it('opens the new-transaction form for the movements', async () => {
    dashboard();
    await go('movements');
    expect(
      await screen.findByRole('button', { name: tr('app.transaction.form.save') })
    ).toBeVisible();
  });

  it('can be put away for the day, and comes back the next one', async () => {
    const view = dashboard();
    const card = await screen.findByRole('region', { name: TITLE() });
    fireEvent.click(within(card).getByRole('button', { name: tr('app.inviteeGoal.dismiss') }));
    expect(screen.queryByRole('region', { name: TITLE() })).toBeNull();
    view.unmount();

    dashboard();
    await screen.findByRole('region', { name: tr('app.gettingStarted.title') });
    expect(screen.queryByRole('region', { name: TITLE() })).toBeNull();
  });

  it('comes back as soon as the progress changes, or the next day', async () => {
    localStorage.setItem('mm_invitee_goal_hidden:u1', '2026-03-15|2');
    const view = dashboard(invited({ movements: 2, goals: 1 }));
    expect(await screen.findByRole('region', { name: TITLE() })).toBeInTheDocument();
    view.unmount();
    localStorage.setItem('mm_invitee_goal_hidden:u1', '2026-03-14|2');
    dashboard();
    expect(await screen.findByRole('region', { name: TITLE() })).toBeInTheDocument();
  });

  it('also shows in "Your plan", without "Not now"', async () => {
    const api = createFakeApi();
    api.billingApi.referral.mockResolvedValue(invited());
    const onOpenStep = jest.fn();
    renderWithProviders(<PlanView onOpenStep={onOpenStep} />, { api, plan: true, finances: false });
    const card = await screen.findByRole('region', { name: TITLE() });
    expect(within(card).queryByRole('button', { name: tr('app.inviteeGoal.dismiss') })).toBeNull();
    fireEvent.click(within(card).getByRole('button', { name: tr('app.inviteeGoal.go.movements') }));
    expect(onOpenStep).toHaveBeenCalledWith('movements');
  });

  it('celebrates the month once, then goes away', async () => {
    const all = { movements: 3, budgets: 1, goals: 1, automations: 1 };
    const view = dashboard(invited(all, true));
    expect(await screen.findByRole('status', { name: DONE() })).toBeVisible();
    expect(screen.getByText(tr('app.inviteeGoal.doneHint', { days: 30 }))).toBeVisible();
    view.unmount();

    dashboard(invited(all, true));
    await screen.findByRole('region', { name: tr('app.gettingStarted.title') });
    expect(screen.queryByRole('status', { name: DONE() })).toBeNull();
    expect(screen.queryByRole('region', { name: TITLE() })).toBeNull();
  });

  it('shows nothing to a user who was not invited', async () => {
    dashboard(f.referral());
    await screen.findByRole('region', { name: tr('app.gettingStarted.title') });
    expect(screen.queryByRole('region', { name: TITLE() })).toBeNull();
  });
});
