import { fireEvent, screen, waitFor } from '@testing-library/react';
import { FREE_GUIDE_SLUGS, GUIDES, findGuide } from '@modules/guides/domain/guides';
import { LearnView } from '@modules/finances/ui/views/LearnView';
import { createFakeApi } from '@test-utils/fakeApi';
import * as f from '@test-utils/fixtures';
import { literal, renderWithProviders, tr } from '@test-utils/render';

const freeGuide = findGuide(FREE_GUIDE_SLUGS[0])!;
const lockedGuide = GUIDES.find((g) => !FREE_GUIDE_SLUGS.includes(g.slug))!;

const setup = (plan: 'free' | 'premium') => {
  const api = createFakeApi();
  api.billingApi.get.mockResolvedValue(f.billing({ plan }));
  renderWithProviders(<LearnView />, { api, plan: true });
  return api;
};

describe('Learn to save', () => {
  it('has real free guides', () => {
    expect(FREE_GUIDE_SLUGS).toHaveLength(2);
    FREE_GUIDE_SLUGS.forEach((slug) => expect(findGuide(slug)).toBeDefined());
  });

  it('opens the free guides to free accounts and asks them to upgrade for the rest', async () => {
    setup('free');
    expect(
      await screen.findByText(tr('app.learn.freeNote', { free: 2, total: GUIDES.length }))
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: literal(lockedGuide.title) }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('reads a free guide and goes back to the list', async () => {
    setup('free');
    fireEvent.click(await screen.findByRole('button', { name: literal(freeGuide.title) }));
    expect(screen.getByText(freeGuide.intro)).toBeInTheDocument();
    if (freeGuide.tool) {
      expect(screen.getByRole('link')).toHaveAttribute('href', freeGuide.tool.to);
    }
    fireEvent.click(screen.getByRole('button', { name: literal(`← ${tr('app.learn.back')}`) }));
    expect(screen.getByText(tr('app.learn.hint'))).toBeInTheDocument();
  });

  it('gives Premium users every guide, without chips', async () => {
    setup('premium');
    expect(
      await screen.findByText(tr('app.learn.premiumNote', { total: GUIDES.length }))
    ).toBeInTheDocument();
    expect(screen.queryByText(tr('app.learn.locked'))).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: literal(lockedGuide.title) }));
    expect(screen.getByText(lockedGuide.intro)).toBeInTheDocument();
  });

  it('waits for the plan before deciding', async () => {
    const api = createFakeApi();
    api.billingApi.get.mockReturnValue(new Promise(() => undefined));
    renderWithProviders(<LearnView />, { api, plan: true });
    expect(await screen.findByText(tr('app.common.loading'))).toBeInTheDocument();
  });

  it('shows everything when there is no plan information', async () => {
    renderWithProviders(<LearnView />, { api: createFakeApi() });
    await waitFor(() =>
      expect(
        screen.getByText(tr('app.learn.premiumNote', { total: GUIDES.length }))
      ).toBeInTheDocument()
    );
  });
});
