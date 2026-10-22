import { fireEvent, screen, within } from '@testing-library/react';
import { campaignFor, campaignPhase, daysUntil } from '@modules/tools/domain/rentaCampaign';
import { CampaignDates } from '@modules/tools/ui/renta/CampaignDates';
import { RentaCalculatorPage } from '@modules/tools/ui/CalculatorPages';
import { renderWithProviders, tr } from '@test-utils/render';
import { freezeTime, restoreTime } from '@test-utils/time';

afterEach(restoreTime);

// Kept first: run after the frozen-clock tests of this file, the page stays empty in jsdom.
describe('the public page', () => {
  it('is on the public page of the calculator, above the sign-up wall', async () => {
    renderWithProviders(<RentaCalculatorPage />, {
      authenticated: false,
      route: '/calculadora-renta',
    });
    expect(
      await screen.findByRole('region', {
        name: tr('tools.renta.campaign.title', { year: 2025, filed: 2026 }),
      })
    ).toBeInTheDocument();
  });

  it('picks the year of the return, as the app does', async () => {
    freezeTime('2026-10-22T12:00:00');
    renderWithProviders(<RentaCalculatorPage />, {
      authenticated: false,
      route: '/calculadora-renta',
    });
    const select = await screen.findByRole('combobox', { name: tr('app.renta.year') });
    // The years with rules up to this one, the newest first.
    expect(
      within(select)
        .getAllByRole('option')
        .map((o) => o.textContent)
    ).toEqual(['2026', '2025', '2024']);
    fireEvent.change(select, { target: { value: '2024' } });
    expect(
      screen.getByRole('region', {
        name: tr('tools.renta.campaign.title', { year: 2024, filed: 2025 }),
      })
    ).toBeInTheDocument();
  });
});

describe('the dates of the Renta campaign', () => {
  it('has the published dates of Renta 2025, with their source', () => {
    const c = campaignFor(2025);
    expect(c).toMatchObject({
      start: '2026-04-08',
      officeStart: '2026-06-01',
      directDebitEnd: '2026-06-25',
      end: '2026-06-30',
      confirmed: true,
    });
    expect(c.source).toContain('sede.agenciatributaria.gob.es');
  });

  it('expects the usual dates for a campaign not published yet', () => {
    expect(campaignFor(2026)).toMatchObject({
      start: '2027-04-08',
      end: '2027-06-30',
      confirmed: false,
    });
  });

  it('counts whole days by the calendar, and knows the phase', () => {
    const c = campaignFor(2025);
    const at = (iso: string) => new Date(`${iso}T23:30:00`);
    expect(daysUntil('2026-04-08', at('2026-04-07'))).toBe(1);
    expect(daysUntil('2026-04-08', at('2026-04-09'))).toBe(-1);
    expect(campaignPhase(c, at('2026-04-07'))).toBe('before');
    expect(campaignPhase(c, at('2026-04-08'))).toBe('open');
    expect(campaignPhase(c, at('2026-06-30'))).toBe('open');
    expect(campaignPhase(c, at('2026-07-01'))).toBe('closed');
  });
});

describe('the panel of dates', () => {
  it('counts the days to the start before the campaign', () => {
    freezeTime('2026-03-29T10:00:00');
    renderWithProviders(<CampaignDates exercise={2025} />);
    expect(screen.getByRole('status')).toHaveTextContent(/faltan 10 días/);
    expect(screen.getByText(tr('tools.renta.campaign.start')).closest('li')).toHaveTextContent(
      tr('tools.renta.campaign.inDays', { count: 10 })
    );
    expect(screen.queryByText(tr('tools.renta.campaign.expected'))).toBeNull();
    expect(
      screen.getByRole('link', { name: tr('tools.renta.campaign.sourceLink') })
    ).toHaveAttribute('href', expect.stringContaining('fechas-campana-renta-patrimonio'));
  });

  it('counts the days left while it is open, and says what is today', () => {
    freezeTime('2026-06-25T10:00:00');
    renderWithProviders(<CampaignDates exercise={2025} />);
    expect(screen.getByRole('status')).toHaveTextContent(/quedan 5 días/);
    const debit = screen.getByText(tr('tools.renta.campaign.directDebitEnd')).closest('li');
    expect(debit).toHaveTextContent(tr('tools.renta.campaign.today'));
    const start = screen.getByText(tr('tools.renta.campaign.start')).closest('li') as HTMLElement;
    expect(start).toHaveClass('renta-campaign-past');
    expect(within(start).getByText(/pasado/)).toBeInTheDocument();
  });

  it('says when it closed, and that it can still be filed late', () => {
    freezeTime('2026-10-19T10:00:00');
    renderWithProviders(<CampaignDates exercise={2025} />);
    expect(screen.getByRole('status')).toHaveTextContent(/cerró el 30 de junio de 2026/);
    expect(screen.getByText(tr('tools.renta.campaign.late'))).toBeInTheDocument();
  });

  it('marks the dates of a campaign that is not published as expected', () => {
    freezeTime('2026-10-19T10:00:00');
    renderWithProviders(<CampaignDates exercise={2026} />);
    expect(screen.getByText(tr('tools.renta.campaign.expected'))).toBeInTheDocument();
    expect(
      screen.getByText(new RegExp(tr('tools.renta.campaign.expectedHint')))
    ).toBeInTheDocument();
  });
});
