import { fireEvent, screen, within } from '@testing-library/react';
import { CHAPTERS, ASSET_CLASSES, findChapter } from '@modules/invest/domain/content';
import { InvestView } from '@modules/invest/ui/InvestView';
import { GUIDES, findGuide } from '@modules/guides/domain/guides';
import { categoryOf } from '@modules/guides/domain/guideCategories';
import { VIDEOS } from '@modules/guides/domain/videos';
import { createFakeApi } from '@test-utils/fakeApi';
import * as f from '@test-utils/fixtures';
import { literal, renderWithProviders, tr } from '@test-utils/render';

const DEBT = [
  'letras-del-tesoro',
  'bonos-obligaciones-estado',
  'comprar-deuda-publica',
  'deuda-publica-renta',
  'letras-depositos-monetarios',
];

const tab = (id: string) =>
  screen.getByRole('tab', { name: literal(tr(`app.invest.section.${id}`)) });

function renderInvest(billing = f.billing()) {
  const api = createFakeApi();
  api.billingApi.get.mockResolvedValue(billing);
  api.videosApi.premium.mockResolvedValue(f.premiumVideoIds({ 39: 'letras39' }));
  return { ...renderWithProviders(<InvestView />, { api, plan: true }), api };
}

describe('Government debt chapters in the catalogue', () => {
  it('come right after the bonds chapter, Premium, under the bonds topic', () => {
    const ids = CHAPTERS.map((c) => c.id);
    const start = ids.indexOf('renta-fija-bonos');
    expect(ids.slice(start + 1, start + 6)).toEqual(DEBT);
    for (const id of DEBT) {
      const c = findChapter(id)!;
      expect(c).toMatchObject({ topic: 'bonds', premium: true });
      expect(c.minutes).toBeGreaterThanOrEqual(3);
    }
    expect(findChapter('letras-del-tesoro')!.level).toBe(1);
    expect(findChapter('bonos-obligaciones-estado')!.level).toBe(2);
    expect(findChapter('comprar-deuda-publica')!.withCalc).toBe(false);
    expect(DEBT.filter((id) => findChapter(id)!.withCalc)).toHaveLength(4);
  });

  it('link only to videos that exist and are published', () => {
    const linked = CHAPTERS.flatMap((c) => c.videos ?? []);
    expect(linked).toContain(39);
    for (const n of linked) {
      expect(VIDEOS.find((v) => v.number === n)).toMatchObject({ published: true });
    }
  });
});

describe('Reading the government debt chapters', () => {
  it('shows the Letras calculator and the Premium video with its id for Premium users', async () => {
    const { api } = renderInvest();
    fireEvent.click(tab('learn'));
    fireEvent.click(
      await screen.findByRole('button', { name: literal(findChapter('letras-del-tesoro')!.title) })
    );
    expect(
      await screen.findByRole('region', { name: tr('app.invest.calc.letra.title') })
    ).toBeInTheDocument();
    expect(api.learnApi.chapter).toHaveBeenCalledWith('letras-del-tesoro');
    const videos = screen.getByRole('region', { name: tr('app.invest.learn.videos') });
    expect(await within(videos).findByRole('link')).toHaveAttribute(
      'href',
      'https://www.youtube.com/watch?v=letras39'
    );
  });

  it('keeps the chapter and its video locked for a free account', async () => {
    const FREE = f.billing({ plan: 'free', trialDaysLeft: 0, limits: f.catalog().limits.free });
    const { api } = renderInvest(FREE);
    fireEvent.click(tab('learn'));
    fireEvent.click(
      await screen.findByRole('button', {
        name: literal(findChapter('comprar-deuda-publica')!.title),
      })
    );
    expect(screen.getByRole('region', { name: tr('app.invest.locked.title') })).toBeInTheDocument();
    const videos = screen.getByRole('region', { name: tr('app.invest.learn.videos') });
    expect(within(videos).queryByRole('link')).toBeNull();
    expect(
      within(videos).getByRole('button', { name: new RegExp(tr('videos.premium.unlock')) })
    ).toBeInTheDocument();
    expect(api.learnApi.chapter).not.toHaveBeenCalled();
  });
});

describe('The fixed income card of the map', () => {
  it('names the Treasury products and the way to buy them', () => {
    const card = ASSET_CLASSES.find((a) => a.id === 'renta-fija')!;
    const text = JSON.stringify(card);
    expect(text).toMatch(/3, 6, 9 y 12 meses/);
    expect(text).toMatch(/10, 15, 30 y 50 años/);
    expect(text).toMatch(/0030/);
    expect(text).toMatch(/Fondo de Garantía de Depósitos/);
    expect(card.moreChapters).toEqual(DEBT);
  });

  it('links to every government debt chapter, in English too', async () => {
    renderInvest();
    fireEvent.click(await screen.findByRole('button', { name: /Renta fija/ }));
    const nav = screen.getByRole('navigation', { name: tr('app.invest.map.moreChapters') });
    expect(within(nav).getAllByRole('button')).toHaveLength(DEBT.length);
    fireEvent.click(
      within(nav).getByRole('button', {
        name: literal(findChapter('deuda-publica-renta')!.title),
      })
    );
    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: literal(findChapter('deuda-publica-renta')!.title),
      })
    ).toBeInTheDocument();
  });
});

describe('Public guides on government debt', () => {
  it.each(['como-comprar-letras-del-tesoro', 'letras-del-tesoro-renta'])(
    '%s is dated, sourced and in the investing topic',
    (slug) => {
      const g = findGuide(slug)!;
      expect(g.checked).toBe(g.updated);
      expect(g.sources!.length).toBeGreaterThanOrEqual(4);
      for (const s of g.sources!) expect(s.url).toMatch(/^https:\/\/www\.(tesoro|boe|cnmv)\.es\//);
      expect(categoryOf(slug).id).toBe('inversion');
      const text = JSON.stringify(g);
      expect(text).not.toMatch(/NO CONFIRMAD/);
      expect(GUIDES.filter((x) => x.related.includes(slug)).length).toBeGreaterThan(0);
    }
  );

  it('walks through the purchase as steps', () => {
    expect(findGuide('como-comprar-letras-del-tesoro')!.howTo).toBe(true);
    const tax = JSON.stringify(findGuide('letras-del-tesoro-renta'));
    for (const box of ['0027', '0030', '0031']) expect(tax).toContain(box);
  });
});
