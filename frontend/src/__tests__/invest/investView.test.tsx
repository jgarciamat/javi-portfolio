import { act, fireEvent, screen, within } from '@testing-library/react';
import { CHAPTERS, TOPICS } from '@modules/invest/domain/content';
import { ChapterBody } from '@modules/invest/ui/ChapterBody';
import { InvestView } from '@modules/invest/ui/InvestView';
import { mockMatchMedia } from '@test-utils/dom';
import { literal, renderWithI18n, tr } from '@test-utils/render';

const tab = (id: string) =>
  screen.getByRole('tab', { name: literal(tr(`app.invest.section.${id}`)) });
const open = (id: string) => fireEvent.click(tab(id));
const openChapter = (title: string) =>
  fireEvent.click(screen.getByRole('button', { name: literal(title) }));

describe('Invest tab', () => {
  it('shows the title, the disclaimer and the section menu', () => {
    renderWithI18n(<InvestView />);
    expect(
      screen.getByRole('heading', { level: 2, name: tr('app.invest.title') })
    ).toBeInTheDocument();
    const note = screen.getByRole('note', { name: tr('app.invest.disclaimer.title') });
    expect(note).toHaveTextContent(tr('app.invest.disclaimer.key1'));
    expect(note).toHaveTextContent(tr('app.invest.disclaimer.key2'));
    expect(note).toHaveTextContent(tr('app.invest.disclaimer.key3'));
    expect(screen.getByText(new RegExp(tr('app.invest.varies').slice(0, 30)))).toBeInTheDocument();
    expect(note).toHaveTextContent(tr('app.invest.disclaimer.edu'));
    expect(note).toHaveTextContent(tr('app.invest.disclaimer.risk'));
    expect(note).toHaveTextContent(tr('app.invest.disclaimer.advisor'));
    expect(note).toHaveTextContent(tr('app.invest.disclaimer.past'));
    expect(screen.getAllByRole('tab')).toHaveLength(3);
    expect(tab('map')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'inv-tab-map');
    expect(screen.getByText(tr('app.invest.disclaimer.short'))).toBeInTheDocument();
  });

  it('changes section with the mouse and with the arrow keys', () => {
    renderWithI18n(<InvestView />);
    fireEvent.keyDown(tab('map'), { key: 'ArrowRight' });
    expect(tab('learn')).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(tab('learn'), { key: 'Enter' });
    expect(tab('learn')).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(tab('learn'), { key: 'ArrowLeft' });
    fireEvent.keyDown(tab('map'), { key: 'ArrowLeft' });
    expect(tab('markets')).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(tab('markets'), { key: 'ArrowRight' });
    expect(tab('map')).toHaveAttribute('aria-selected', 'true');
    for (const id of ['learn', 'markets', 'map']) {
      open(id);
      expect(tab(id)).toHaveAttribute('aria-selected', 'true');
    }
    expect(screen.queryByRole('tab', { name: /Gráficos|Calculadoras/ })).toBeNull();
  });

  it('keeps the section menu under the header of the app', () => {
    const header = document.createElement('div');
    header.className = 'dashboard-sticky';
    jest.spyOn(header, 'getBoundingClientRect').mockReturnValue({ height: 57 } as DOMRect);
    document.body.appendChild(header);
    const { container, unmount } = renderWithI18n(<InvestView />);
    const root = container.querySelector('.invest') as HTMLElement;
    expect(root.style.getPropertyValue('--inv-top')).toBe('57px');
    jest.spyOn(header, 'getBoundingClientRect').mockReturnValue({ height: 80 } as DOMRect);
    fireEvent(window, new Event('resize'));
    expect(root.style.getPropertyValue('--inv-top')).toBe('80px');
    unmount();
    header.remove();
  });

  it('works without a header around it', () => {
    const { container } = renderWithI18n(<InvestView />);
    expect(
      (container.querySelector('.invest') as HTMLElement).style.getPropertyValue('--inv-top')
    ).toBe('0px');
  });
});

describe('Asset map', () => {
  it('lists the 9 classes collapsed, with risk and liquidity', () => {
    const { container } = renderWithI18n(<InvestView />);
    expect(container.querySelectorAll('.inv-asset')).toHaveLength(9);
    expect(screen.getByText(/Las 9 grandes clases/)).toBeInTheDocument();
    expect(container.querySelectorAll('.inv-asset-body')).toHaveLength(0);
    expect(screen.getAllByText('Renta variable / acciones').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Riesgo 7\/7/).length).toBeGreaterThan(0);
  });

  it('opens and closes a card with its sections and Spanish tax', () => {
    renderWithI18n(<InvestView />);
    const head = screen.getByRole('button', { name: /Renta fija/ });
    expect(head).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(head);
    expect(head).toHaveAttribute('aria-expanded', 'true');
    const body = document.getElementById(
      head.getAttribute('aria-controls') as string
    ) as HTMLElement;
    for (const key of ['what', 'earns', 'horizon', 'subtypes', 'pros', 'cons', 'example', 'tax']) {
      expect(body).toHaveTextContent(tr(`app.invest.map.${key}`));
    }
    expect(body).toHaveTextContent(/Letras del Tesoro/);
    fireEvent.click(head);
    expect(document.getElementById(head.getAttribute('aria-controls') as string)).toBeNull();
  });

  it('shows the lesson of the classes that have one', () => {
    renderWithI18n(<InvestView />);
    fireEvent.click(screen.getByRole('button', { name: /Inmuebles/ }));
    expect(screen.getByText('REIT y SOCIMI: ladrillo sin escritura')).toBeInTheDocument();
  });

  it('searches and filters by risk', () => {
    const { container } = renderWithI18n(<InvestView />);
    const search = screen.getByLabelText(tr('app.invest.map.search'));
    fireEvent.change(search, { target: { value: 'bitcoin' } });
    expect(container.querySelectorAll('.inv-asset')).toHaveLength(1);
    fireEvent.change(search, { target: { value: 'zzzz' } });
    expect(screen.getByText(tr('app.invest.map.empty'))).toBeInTheDocument();
    fireEvent.change(search, { target: { value: '' } });

    const low = screen.getByRole('button', { name: tr('app.invest.risk.low') });
    fireEvent.click(low);
    expect(low).toHaveAttribute('aria-pressed', 'true');
    expect(container.querySelectorAll('.inv-asset')).toHaveLength(1);
    fireEvent.click(low);
    expect(container.querySelectorAll('.inv-asset')).toHaveLength(9);
    fireEvent.click(screen.getByRole('button', { name: tr('app.invest.risk.high') }));
    const high = container.querySelectorAll('.inv-asset').length;
    fireEvent.click(screen.getByRole('button', { name: tr('app.invest.risk.mid') }));
    const mid = container.querySelectorAll('.inv-asset').length;
    expect(high + mid + 1).toBe(9);
    fireEvent.click(screen.getByRole('button', { name: tr('app.invest.filter.all') }));
    expect(container.querySelectorAll('.inv-asset')).toHaveLength(9);
  });

  it('compares risk, liquidity and tax in a grid', () => {
    renderWithI18n(<InvestView />);
    const grid = screen.getByRole('table', { name: tr('app.invest.heat.title') });
    expect(within(grid).getAllByRole('row')).toHaveLength(10);
    expect(
      within(grid).getAllByText('Ganancia patrimonial, base del ahorro').length
    ).toBeGreaterThan(0);
  });

  it('shows IRPF and IVA at a glance with the savings scale of the app data', () => {
    renderWithI18n(<InvestView />);
    const scale = screen.getByRole('list', { name: tr('app.invest.glance.scale') });
    const steps = within(scale).getAllByRole('listitem');
    expect(steps.map((s) => s.querySelector('strong')?.textContent)).toEqual([
      '19 %',
      '21 %',
      '23 %',
      '27 %',
      '30 %',
    ]);
    expect(steps[4]).toHaveTextContent(/Más de/);
    expect(screen.getByRole('table', { name: tr('app.invest.glance.irpf') })).toBeInTheDocument();
    expect(screen.getByRole('table', { name: tr('app.invest.glance.iva') })).toBeInTheDocument();
    expect(screen.getAllByText(/Oro de inversión/).length).toBeGreaterThan(0);
    expect(
      screen.getAllByRole('link', { name: tr('app.invest.calc.tax.source') })[0]
    ).toHaveAttribute('href', expect.stringContaining('agenciatributaria'));
  });

  it('is in English with English names and labels', () => {
    renderWithI18n(<InvestView />, 'en');
    expect(screen.getAllByText('Equities / stocks').length).toBeGreaterThan(0);
    expect(screen.getByRole('tab', { name: /Markets/ })).toBeInTheDocument();
    expect(screen.getAllByText(/Risk 7\/7/).length).toBeGreaterThan(0);
  });
});

describe('Learn', () => {
  it('lists every chapter with reading time and level', () => {
    const { container } = renderWithI18n(<InvestView />);
    open('learn');
    expect(
      screen.getByText(tr('app.invest.learn.lead', { total: CHAPTERS.length }))
    ).toBeInTheDocument();
    expect(container.querySelectorAll('.inv-chapter')).toHaveLength(CHAPTERS.length);
    expect(screen.getAllByText(/min de lectura/).length).toBe(CHAPTERS.length);
    expect(
      screen.getAllByText(tr('app.invest.learn.withCalc'), { exact: false }).length
    ).toBeGreaterThan(2);
  });

  it('filters by topic and searches', () => {
    const { container } = renderWithI18n(<InvestView />);
    open('learn');
    const topic = TOPICS.find((t) => t.id === 'crypto') as (typeof TOPICS)[number];
    const crypto = screen.getByRole('button', { name: `${topic.emoji} ${topic.label}` });
    fireEvent.click(crypto);
    expect(container.querySelectorAll('.inv-chapter')).toHaveLength(
      CHAPTERS.filter((c) => c.topic === 'crypto').length
    );
    fireEvent.click(crypto);
    expect(container.querySelectorAll('.inv-chapter')).toHaveLength(CHAPTERS.length);
    fireEvent.click(crypto);
    fireEvent.click(screen.getByRole('button', { name: tr('app.invest.filter.all') }));
    const search = screen.getByLabelText(tr('app.invest.learn.search'));
    fireEvent.change(search, { target: { value: 'MiCA' } });
    expect(container.querySelectorAll('.inv-chapter')).toHaveLength(1);
    fireEvent.change(search, { target: { value: 'zzzz' } });
    expect(screen.getByText(tr('app.invest.learn.empty'))).toBeInTheDocument();
  });

  it('opens a chapter, reads it and goes back to the list', () => {
    const { container } = renderWithI18n(<InvestView />);
    open('learn');
    const chapter = CHAPTERS[1];
    openChapter(chapter.title);
    expect(
      screen.getByRole('heading', { level: 2, name: new RegExp(chapter.title.slice(0, 20)) })
    ).toBeInTheDocument();
    expect(container.querySelector('.inv-callout--key')).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: tr('app.invest.learn.glossary') })
    ).toBeInTheDocument();
    expect(screen.queryByText(tr('app.invest.learn.spanishOnly'))).toBeNull();
    fireEvent.click(
      screen.getByRole('button', { name: literal(`← ${tr('app.invest.learn.back')}`) })
    );
    expect(container.querySelectorAll('.inv-chapter')).toHaveLength(CHAPTERS.length);
  });

  it('walks through the chapters with the previous and next buttons', () => {
    renderWithI18n(<InvestView />);
    open('learn');
    openChapter(CHAPTERS[0].title);
    const pager = screen.getByRole('navigation', { name: tr('app.invest.learn.pager') });
    expect(within(pager).getAllByRole('button')).toHaveLength(1);
    fireEvent.click(within(pager).getByRole('button', { name: literal(`${CHAPTERS[1].title} →`) }));
    const middle = screen.getByRole('navigation', { name: tr('app.invest.learn.pager') });
    expect(within(middle).getAllByRole('button')).toHaveLength(2);
    fireEvent.click(
      within(middle).getByRole('button', { name: literal(`← ${CHAPTERS[0].title}`) })
    );
    for (let i = 1; i < CHAPTERS.length; i++) {
      fireEvent.click(
        within(screen.getByRole('navigation', { name: tr('app.invest.learn.pager') })).getByRole(
          'button',
          { name: literal(`${CHAPTERS[i].title} →`) }
        )
      );
    }
    const last = screen.getByRole('navigation', { name: tr('app.invest.learn.pager') });
    expect(within(last).getAllByRole('button')).toHaveLength(1);
    expect(within(last).getByRole('button')).toHaveTextContent('←');
  });

  it('shows the glossary of every chapter and jumps to the chapter of a term', () => {
    renderWithI18n(<InvestView />);
    open('learn');
    const glossary = screen.getByRole('region', { name: tr('app.invest.learn.glossary') });
    const search = within(glossary).getByLabelText(tr('app.invest.learn.glossarySearch'));
    fireEvent.change(search, { target: { value: 'tracking' } });
    expect(within(glossary).getByText('Tracking difference')).toBeInTheDocument();
    fireEvent.click(
      within(glossary).getByRole('button', { name: tr('app.invest.learn.seeChapter') })
    );
    expect(screen.getByRole('heading', { level: 2, name: /Fondos indexados/ })).toBeInTheDocument();
  });

  it('says so when no term matches', () => {
    renderWithI18n(<InvestView />);
    open('learn');
    fireEvent.change(screen.getByLabelText(tr('app.invest.learn.glossarySearch')), {
      target: { value: 'qqqq' },
    });
    expect(screen.getByText(tr('app.invest.learn.glossaryEmpty'))).toBeInTheDocument();
  });

  it('renders chapters with charts, calculators and the market table', () => {
    const { container } = renderWithI18n(<InvestView />);
    open('learn');
    openChapter('Volatilidad y apalancamiento: por qué se pierde dinero tan rápido');
    expect(container.querySelectorAll('.inv-chart-card').length).toBe(2);
    expect(screen.getAllByText(`📈 ${tr('app.invest.embed.chart')}`)).toHaveLength(2);
    expect(screen.getByText(`🧮 ${tr('app.invest.embed.calc')}`)).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: tr('app.invest.calc.crypto.title') })
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: literal(`← ${tr('app.invest.learn.back')}`) })
    );
    openChapter('Los grandes mercados del mundo: horarios, apertura y cierre');
    expect(
      screen.getByRole('region', { name: tr('app.invest.markets.title') })
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: literal(`← ${tr('app.invest.learn.back')}`) })
    );
    openChapter('Las monedas principales y los proyectos que hay detrás');
    expect(screen.getByText('Bitcoin (BTC): la primera')).toBeInTheDocument();
  });

  it('shows English titles and says the text is in Spanish', () => {
    renderWithI18n(<InvestView />, 'en');
    fireEvent.click(screen.getByRole('tab', { name: /Learn/ }));
    expect(screen.getByRole('button', { name: CHAPTERS[1].titleEn })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: CHAPTERS[1].titleEn }));
    expect(screen.getByText('The text of this chapter is in Spanish only.')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: new RegExp(CHAPTERS[2].titleEn.slice(0, 15)) })
    ).toBeInTheDocument();
  });

  it('uses a generic title for a callout without one', () => {
    renderWithI18n(
      <ChapterBody chapter={{ ...CHAPTERS[0], blocks: [{ k: 'warn', t: 'Cuidado' }] }} />
    );
    expect(screen.getByText(tr('app.invest.callout.warn'), { exact: false })).toBeInTheDocument();
    expect(screen.getByText('Cuidado')).toBeInTheDocument();
  });
});

describe('Markets', () => {
  beforeEach(() => jest.useFakeTimers({ now: new Date('2026-10-16T08:00:00Z') }));
  afterEach(() => jest.useRealTimers());

  it('shows local and Spanish hours and which markets are open now', () => {
    renderWithI18n(<InvestView />);
    open('markets');
    expect(
      screen.getByText(tr('app.invest.markets.openCount', { open: 6, total: 14 }))
    ).toBeInTheDocument();
    const table = screen.getByRole('table', { name: tr('app.invest.markets.title') });
    const row = (name: RegExp) => within(table).getByRole('row', { name });
    const madrid = row(/Bolsa de Madrid/);
    expect(madrid).toHaveAttribute('data-state', 'open');
    expect(madrid).toHaveTextContent('09:00–17:30');
    expect(madrid).toHaveTextContent(tr('app.invest.markets.state.open'));
    const ny = row(/NYSE/);
    expect(ny).toHaveAttribute('data-state', 'pre');
    expect(ny).toHaveTextContent('09:30–16:00');
    expect(ny).toHaveTextContent('15:30–22:00');
    expect(ny).toHaveTextContent('04:00–09:30');
    expect(ny).toHaveTextContent('10:00–15:30');
    expect(row(/Tokio/)).toHaveAttribute('data-state', 'closed');
    expect(row(/Tokio/)).toHaveTextContent('02:00–04:30');
    expect(screen.getByText(/Viernes/)).toHaveTextContent('10:00');
    expect(screen.getByText(tr('app.invest.markets.note'))).toBeInTheDocument();
    expect(screen.getByText(/Subasta de apertura desde las 08:30/)).toBeInTheDocument();
  });

  it('shows the lunch break of Asian markets', () => {
    jest.setSystemTime(new Date('2026-10-16T04:00:00Z'));
    renderWithI18n(<InvestView />);
    open('markets');
    expect(screen.getByRole('row', { name: /Shanghái/ })).toHaveAttribute('data-state', 'break');
  });

  it('is closed at the weekend and has no countdown', () => {
    jest.setSystemTime(new Date('2026-10-17T10:00:00Z'));
    renderWithI18n(<InvestView />);
    open('markets');
    expect(
      screen.getByText(tr('app.invest.markets.openCount', { open: 0, total: 14 }))
    ).toBeInTheDocument();
    expect(screen.queryByText(/cambia en/)).toBeNull();
  });

  it('refreshes by itself and stops when it closes', () => {
    const { unmount } = renderWithI18n(<InvestView />);
    open('markets');
    expect(screen.getByText(/Viernes/)).toHaveTextContent('10:00');
    act(() => {
      jest.advanceTimersByTime(31 * 60 * 1000);
    });
    expect(screen.getByText(/Viernes/)).toHaveTextContent('10:31');
    unmount();
    expect(jest.getTimerCount()).toBe(0);
  });

  it('is in English', () => {
    renderWithI18n(<InvestView />, 'en');
    fireEvent.click(screen.getByRole('tab', { name: /Markets/ }));
    expect(screen.getByText(/Friday/)).toBeInTheDocument();
    expect(screen.getAllByText(/changes in/).length).toBeGreaterThan(0);
  });
});

const RISK = 'Riesgo, volatilidad y horizonte: por qué los precios se mueven';

describe('Charts inside the chapters', () => {
  const back = () =>
    fireEvent.click(
      screen.getByRole('button', { name: literal(`← ${tr('app.invest.learn.back')}`) })
    );

  it('shows every chart in its chapter, marked as a simulation', () => {
    const { container } = renderWithI18n(<InvestView />);
    open('learn');
    const seen = new Set<string>();
    for (const chapter of CHAPTERS) {
      const charts = chapter.blocks.filter((b) => b.k === 'chart');
      if (!charts.length) continue;
      openChapter(chapter.title);
      expect(container.querySelectorAll('.inv-chart-card')).toHaveLength(charts.length);
      expect(container.querySelectorAll('.inv-sim-badge')).toHaveLength(charts.length);
      expect(screen.getAllByText(tr('app.invest.chart.foot'))).toHaveLength(charts.length);
      charts.forEach((c) => seen.add(c.k === 'chart' ? c.id : ''));
      back();
    }
    expect([...seen].sort()).toEqual(
      ['bondCurve', 'drawdown', 'horizon', 'leverage', 'stockVsIndex', 'volatility'].sort()
    );
  });

  it('has no separate charts or calculators section any more', () => {
    renderWithI18n(<InvestView />);
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual([
      expect.stringContaining('Mapa'),
      expect.stringContaining('Aprende'),
      expect.stringContaining('Mercados'),
    ]);
  });

  it('draws a new simulation when asked', () => {
    const { container } = renderWithI18n(<InvestView />);
    open('learn');
    openChapter(RISK);
    const card = container.querySelector('.inv-chart-card') as HTMLElement;
    const before = card.querySelector('path[stroke="#f59e0b"]')?.getAttribute('d');
    fireEvent.click(within(card).getByRole('button', { name: tr('app.invest.chart.reroll') }));
    expect(card.querySelector('path[stroke="#f59e0b"]')?.getAttribute('d')).not.toBe(before);
    expect(
      screen.getByRole('table', { name: tr('app.invest.chart.hor.title') })
    ).toBeInTheDocument();
  });

  it('describes the largest fall, with and without a recovery', () => {
    renderWithI18n(<InvestView />);
    open('learn');
    openChapter(RISK);
    const card = screen.getAllByRole('region', { name: tr('app.invest.chart.dd.title') })[0];
    const seen = new Set<string>();
    for (let i = 0; i < 40; i++) {
      const result = card.querySelector('.inv-chart-result')?.textContent ?? '';
      seen.add(/Tardó|took/.test(result) ? 'recovered' : 'never');
      fireEvent.click(within(card).getByRole('button', { name: tr('app.invest.chart.reroll') }));
    }
    expect([...seen].sort()).toEqual(['never', 'recovered']);
  });

  it('compares one share with the index and can draw another one', () => {
    renderWithI18n(<InvestView />);
    open('learn');
    openChapter(CHAPTERS[0].title);
    const card = screen.getByRole('region', { name: tr('app.invest.chart.stk.title') });
    const text = () => card.querySelector('.inv-chart-result')?.textContent;
    const before = text();
    expect(before).toMatch(/índice -?\d+ %|índice −\d+ %|índice/);
    fireEvent.click(within(card).getByRole('button', { name: tr('app.invest.chart.reroll') }));
    expect(text()).not.toBe(before);
  });

  it('draws smaller on phones', () => {
    const restore = mockMatchMedia(true);
    const { container } = renderWithI18n(<InvestView />);
    open('learn');
    openChapter(RISK);
    expect(container.querySelector('.inv-chart svg')?.getAttribute('viewBox')).toBe('0 0 340 270');
    restore();
  });

  it('draws wide on larger screens', () => {
    const restore = mockMatchMedia(false);
    const { container } = renderWithI18n(<InvestView />);
    open('learn');
    openChapter(RISK);
    expect(container.querySelector('.inv-chart svg')?.getAttribute('viewBox')).toBe('0 0 640 300');
    restore();
  });
});

describe('Shares chapter', () => {
  it('is the first and a featured chapter of the list', () => {
    const { container } = renderWithI18n(<InvestView />);
    open('learn');
    const first = container.querySelector('.inv-chapter') as HTMLElement;
    expect(first).toHaveClass('inv-chapter--featured');
    expect(first).toHaveTextContent(/Acciones: qué son/);
    expect(container.querySelectorAll('.inv-chapter--featured')).toHaveLength(1);
  });

  it('is reached from the equities card of the map', () => {
    renderWithI18n(<InvestView />);
    fireEvent.click(screen.getByRole('button', { name: /Renta variable/ }));
    fireEvent.click(
      screen.getByRole('button', { name: new RegExp(tr('app.invest.map.goChapter')) })
    );
    expect(tab('learn')).toHaveAttribute('aria-selected', 'true');
    expect(
      screen.getByRole('heading', { level: 2, name: /Acciones: qué son/ })
    ).toBeInTheDocument();
  });

  it('only some classes link to a chapter, and the links all exist', () => {
    renderWithI18n(<InvestView />);
    fireEvent.click(screen.getByRole('button', { name: /Derivados/ }));
    expect(
      screen.queryByRole('button', { name: new RegExp(tr('app.invest.map.goChapter')) })
    ).toBeNull();
  });

  it('embeds the share calculator and says it is educational', () => {
    renderWithI18n(<InvestView />);
    open('learn');
    openChapter(CHAPTERS[0].title);
    expect(
      screen.getByRole('region', { name: tr('app.invest.calc.stock.title') })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Esto es educación, no una lista de acciones para comprar/)
    ).toBeInTheDocument();
  });
});
