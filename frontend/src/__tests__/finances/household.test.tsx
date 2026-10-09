import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { HouseholdCard } from '@modules/finances/ui/components/HouseholdCard';
import { HouseholdJoinPrompt } from '@modules/finances/ui/components/HouseholdJoinPrompt';
import { PlanView } from '@modules/billing/ui/PlanView';
import { SettingsView } from '@modules/finances/ui/views/SettingsView';
import { ApiError } from '@core/api/http';
import {
  captureHouseholdInvite,
  clearHouseholdInvite,
  householdInviteLink,
  pendingHouseholdInvite,
} from '@core/householdInvite';
import { createFakeApi } from '@test-utils/fakeApi';
import * as f from '@test-utils/fixtures';
import { renderWithProviders, tr } from '@test-utils/render';

jest.mock('@shared/utils/navigation', () => ({ redirectTo: jest.fn(), reloadPage: jest.fn() }));
const { reloadPage } = jest.requireMock('@shared/utils/navigation') as { reloadPage: jest.Mock };

beforeEach(() => {
  localStorage.clear();
  reloadPage.mockClear();
});

const person = { id: 'p1', name: 'Marta' };
const FREE = f.billing({ plan: 'free', trialDaysLeft: 0, limits: f.catalog().limits.free });

function setup(
  status = f.household(),
  options: { plan?: boolean; billing?: ReturnType<typeof f.billing> } = {}
) {
  const api = createFakeApi();
  api.householdApi.status.mockResolvedValue(status);
  if (options.billing) api.billingApi.get.mockResolvedValue(options.billing);
  renderWithProviders(<HouseholdCard />, { api, plan: options.plan ?? false, finances: false });
  return api;
}

describe('invitation link storage', () => {
  it('keeps the code of a join link until it is answered', () => {
    expect(pendingHouseholdInvite()).toBeNull();
    captureHouseholdInvite('?join=%20ABCDEFGHIJKL%20');
    expect(pendingHouseholdInvite()).toBe('ABCDEFGHIJKL');
    captureHouseholdInvite('?other=1');
    expect(pendingHouseholdInvite()).toBe('ABCDEFGHIJKL');
    clearHouseholdInvite();
    expect(pendingHouseholdInvite()).toBeNull();
    window.history.replaceState(null, '', '/?join=FROMURLCODE1');
    captureHouseholdInvite();
    expect(pendingHouseholdInvite()).toBe('FROMURLCODE1');
    window.history.replaceState(null, '', '/');
    expect(householdInviteLink('A B')).toBe('https://www.winjgm.com/?join=A%20B');
  });
});

describe('Household card', () => {
  it('creates an invitation, shows the link once and copies it', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const api = setup();
    fireEvent.click(await screen.findByRole('button', { name: tr('app.household.invite') }));
    expect(await screen.findByText('https://www.winjgm.com/?join=CODE-123456789')).toBeVisible();
    expect(api.householdApi.invite).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: tr('billing.invite.copy') }));
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith('https://www.winjgm.com/?join=CODE-123456789')
    );
    expect(await screen.findByText(tr('billing.invite.copied'))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: tr('app.household.newInvite') })).toBeInTheDocument();
  });

  it('shows a pending invitation and lets the owner cancel it', async () => {
    const api = setup(f.household({ pendingInvite: { expiresAt: '2026-03-22T12:00:00Z' } }));
    expect(await screen.findByText(/Invitación pendiente hasta el/)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: tr('app.household.cancelInvite') }));
    await waitFor(() => expect(api.householdApi.cancelInvite).toHaveBeenCalled());
    expect(api.householdApi.status).toHaveBeenCalledTimes(2); // reloaded
  });

  it('lists the member, removes them and hides the invitation when it is full', async () => {
    const api = setup(f.household({ role: 'owner', members: [person] }));
    expect(await screen.findByText(/Marta/)).toBeVisible();
    expect(screen.queryByRole('button', { name: tr('app.household.invite') })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: tr('app.household.remove') }));
    await waitFor(() => expect(api.householdApi.remove).toHaveBeenCalledWith('p1'));
  });

  it('tells a member whose data they share and lets them leave', async () => {
    const api = setup(f.household({ role: 'member', owner: person }));
    expect(await screen.findByText(/Compartes los datos de Marta/)).toBeVisible();
    expect(screen.queryByRole('button', { name: tr('app.household.invite') })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: tr('app.household.leave') }));
    await waitFor(() => expect(reloadPage).toHaveBeenCalled());
    expect(api.householdApi.leave).toHaveBeenCalled();
  });

  it('offers the plans instead of the invitation to users without Premium', async () => {
    setup(f.household(), { plan: true, billing: FREE });
    fireEvent.click(await screen.findByRole('button', { name: tr('billing.seePlans') }));
    expect(
      await screen.findByText(
        tr('billing.reason.feature', { feature: tr('billing.feature.household') })
      )
    ).toBeInTheDocument();
  });

  it('shows what went wrong', async () => {
    const api = setup();
    api.householdApi.invite.mockRejectedValue(new ApiError('Tu hogar ya está completo', 409));
    fireEvent.click(await screen.findByRole('button', { name: tr('app.household.invite') }));
    expect(await screen.findByText('Tu hogar ya está completo')).toBeInTheDocument();
  });
});

describe('Join prompt', () => {
  const setupPrompt = (code: string | null = 'ABCDEFGHIJKL') => {
    if (code) localStorage.setItem('mm_join', code);
    const api = createFakeApi();
    renderWithProviders(<HouseholdJoinPrompt />, { api, finances: false });
    return api;
  };

  it('stays out of the way without an invitation', () => {
    const api = setupPrompt(null);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(api.householdApi.preview).not.toHaveBeenCalled();
  });

  it('shows who invites and joins, then reloads on the new data', async () => {
    const api = setupPrompt();
    const dialog = await screen.findByRole('dialog', { name: tr('app.household.joinTitle') });
    expect(api.householdApi.preview).toHaveBeenCalledWith('ABCDEFGHIJKL');
    expect(within(dialog).getByText(/Marta quiere compartir/)).toBeVisible();
    fireEvent.click(within(dialog).getByRole('button', { name: tr('app.household.join') }));
    await waitFor(() => expect(reloadPage).toHaveBeenCalled());
    expect(api.householdApi.join).toHaveBeenCalledWith('ABCDEFGHIJKL');
    expect(pendingHouseholdInvite()).toBeNull();
  });

  it('forgets the invitation when the user declines', async () => {
    setupPrompt();
    fireEvent.click(await screen.findByRole('button', { name: tr('app.household.notNow') }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(pendingHouseholdInvite()).toBeNull();
  });

  it('says so when the invitation is not valid and keeps the dialog if joining fails', async () => {
    const api = createFakeApi();
    api.householdApi.preview.mockRejectedValue(new ApiError('caducada', 404));
    localStorage.setItem('mm_join', 'OLDCODE12345');
    const { unmount } = renderWithProviders(<HouseholdJoinPrompt />, { api, finances: false });
    expect(await screen.findByText(tr('app.household.invalid'))).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: tr('app.menu.close') }));
    expect(screen.queryByRole('dialog')).toBeNull();
    unmount();

    const failing = createFakeApi();
    failing.householdApi.join.mockRejectedValue(new ApiError('Este hogar ya está completo', 409));
    localStorage.setItem('mm_join', 'ABCDEFGHIJKL');
    renderWithProviders(<HouseholdJoinPrompt />, { api: failing, finances: false });
    fireEvent.click(await screen.findByRole('button', { name: tr('app.household.join') }));
    expect(await screen.findByText('Este hogar ya está completo')).toBeInTheDocument();
    expect(reloadPage).not.toHaveBeenCalled();
  });
});

describe('Household member in the rest of the app', () => {
  const member = f.billing({ household: f.household({ role: 'member', owner: person }) });

  it('uses the plan of the household and cannot upgrade or invite', async () => {
    const api = createFakeApi();
    api.billingApi.get.mockResolvedValue(member);
    renderWithProviders(<PlanView />, { api, plan: true, finances: false });
    expect(await screen.findByText(/plan del hogar de Marta/)).toBeVisible();
    expect(screen.queryByText(tr('billing.invite.title'))).toBeNull();
    expect(screen.queryByText(tr('billing.upgradeTitle'))).toBeNull();
  });

  it('leaves currency, month start and default account to the owner', async () => {
    const api = createFakeApi();
    api.billingApi.get.mockResolvedValue(member);
    api.accountApi.getAll.mockResolvedValue({
      accounts: [
        f.account({ id: 'a1', isDefault: true }),
        f.account({ id: 'a2', name: 'Efectivo' }),
      ],
      total: 0,
    });
    renderWithProviders(<SettingsView onOpenProfile={jest.fn()} onStartTour={jest.fn()} />, {
      api,
      plan: true,
    });
    expect(await screen.findByText(tr('app.household.sharedSettings'))).toBeVisible();
    expect(
      screen.getByRole('combobox', { name: new RegExp(tr('app.settings.currency')) })
    ).toBeDisabled();
    expect(
      screen.getByRole('combobox', { name: new RegExp(tr('app.settings.monthStartDay')) })
    ).toBeDisabled();
    expect(
      screen.getByRole('combobox', { name: new RegExp(tr('app.settings.defaultAccount')) })
    ).toBeDisabled();
    expect(
      screen.getByRole('combobox', { name: new RegExp(tr('app.settings.language')) })
    ).toBeEnabled();
  });
});
