import { screen } from '@testing-library/react';
import { RentaPlanner } from '@modules/tools/ui/RentaPlanner';
import { PROGRESS_KEY, PROGRESS_VERSION } from '@modules/tools/application/rentaProgress';
import { createFakeApi } from '@test-utils/fakeApi';
import * as f from '@test-utils/fixtures';
import { renderWithProviders, tr } from '@test-utils/render';

jest.setTimeout(60000);
beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('mm_renta_view', 'expert');
});

const premium = () => {
  const api = createFakeApi();
  api.billingApi.get.mockResolvedValue(
    f.billing({
      plan: 'premium',
      renta: { draft: { allowed: true, reason: 'premium' }, eligibleOn: null, passUntil: null },
    })
  );
  return api;
};
/** A Renta of `year` left half done, with made-up figures. */
const saved = (year: number, form: Record<string, unknown>) =>
  localStorage.setItem(PROGRESS_KEY, JSON.stringify({ version: PROGRESS_VERSION, year, form }));
const render = (year: number) =>
  renderWithProviders(<RentaPlanner mode="account" year={year} />, { api: premium(), plan: true });

describe('the Renta of a year without all its official figures', () => {
  it('2026 in Madrid: says the regional figures are missing and shows no result', async () => {
    saved(2026, { gross: '24000', ccaaId: 'madrid', answers: { ccaa: 'madrid' } });
    render(2026);
    expect(await screen.findByText(tr('tools.renta.year.missing', { year: 2026 }))).toBeVisible();
    expect(
      screen.getByText(
        tr('tools.renta.year.part.regions', { year: 2026, name: 'Comunidad de Madrid' })
      )
    ).toBeVisible();
    expect(screen.getByText(tr('tools.renta.year.noResult', { year: 2026 }))).toBeVisible();
    expect(screen.getByText(tr('tools.renta.year.provisional', { year: 2026 }))).toBeVisible();
  });

  it('2024 in Aragón: a result, and the deductions of 2024 the app does not calculate', async () => {
    saved(2024, { gross: '24000', ccaaId: 'aragon', answers: { ccaa: 'aragon' } });
    render(2024);
    expect(
      await screen.findByText(tr('tools.renta.year.notInApp', { year: 2024, name: 'Aragón' }))
    ).toBeVisible();
    expect(
      screen.getByText('Por ayudas de carácter humanitario al pueblo ucraniano')
    ).toBeVisible();
    expect(screen.queryByText(tr('tools.renta.year.missing', { year: 2024 }))).toBeNull();
    expect(screen.queryByText(tr('tools.renta.year.noResult', { year: 2024 }))).toBeNull();
  });

  it('2024 in Madrid: all its figures are there, so nothing is said', async () => {
    saved(2024, { gross: '24000', ccaaId: 'madrid', answers: { ccaa: 'madrid' } });
    render(2024);
    expect(await screen.findByText(tr('tools.renta.disclaimerFull', { year: 2024 }))).toBeVisible();
    expect(screen.queryByText(tr('tools.renta.year.missing', { year: 2024 }))).toBeNull();
    expect(
      screen.queryByText(
        tr('tools.renta.year.notInApp', { year: 2024, name: 'Comunidad de Madrid' })
      )
    ).toBeNull();
  });

  it('2026 in Ceuta: provisional figures of the BOE, with a result', async () => {
    saved(2026, { gross: '24000', ccaaId: 'ceuta', answers: { ccaa: 'ceuta' } });
    render(2026);
    expect(
      await screen.findByText(tr('tools.renta.year.provisional', { year: 2026 }))
    ).toBeVisible();
    expect(screen.queryByText(tr('tools.renta.year.missing', { year: 2026 }))).toBeNull();
    expect(screen.queryByText(tr('tools.renta.year.noResult', { year: 2026 }))).toBeNull();
  });

  it('2025 says nothing: all its figures are there', async () => {
    saved(2025, { gross: '24000', ccaaId: 'madrid', answers: { ccaa: 'madrid' } });
    render(2025);
    expect(await screen.findByText(tr('tools.renta.disclaimerFull', { year: 2025 }))).toBeVisible();
    expect(screen.queryByText(tr('tools.renta.year.provisional', { year: 2025 }))).toBeNull();
    expect(screen.queryByText(tr('tools.renta.year.missing', { year: 2025 }))).toBeNull();
  });
});
