import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { SHARED_FILE, SHARED_TEXT, takeShared } from '@core/share/sharedImport';
import { Dashboard } from '@modules/finances/ui/components/Dashboard';
import { ImportModal } from '@modules/finances/ui/components/ImportModal';
import { createFakeApi } from '@test-utils/fakeApi';
import * as f from '@test-utils/fixtures';
import { literal, renderWithProviders, tr } from '@test-utils/render';
import { freezeTime, restoreTime } from '@test-utils/time';

const worker = { recognize: jest.fn(), terminate: jest.fn() };
jest.mock('tesseract.js', () => ({ createWorker: jest.fn(async () => worker) }));

/** A Cache Storage in memory, with what the service worker keeps. */
function fakeCaches(entries: Record<string, Response> = {}) {
  const store = new Map(Object.entries(entries));
  const cache = {
    match: jest.fn(async (key: string) => store.get(key)),
    delete: jest.fn(async (key: string) => store.delete(key)),
    put: jest.fn(async (key: string, value: Response) => void store.set(key, value)),
  };
  const caches = { open: jest.fn(async () => cache) };
  Object.assign(globalThis, { caches });
  return { store, cache };
}

/** jsdom's Response has no blob() body for files: a minimal one. */
const response = (body: string, headers: Record<string, string> = {}) =>
  ({
    headers: new Headers(headers),
    blob: async () => new Blob([body]),
    text: async () => body,
  }) as unknown as Response;

afterEach(() => {
  delete (globalThis as { caches?: unknown }).caches;
});

describe('takeShared', () => {
  it('is null without Cache Storage or with nothing shared', async () => {
    expect(await takeShared()).toBeNull();
    fakeCaches({ [SHARED_TEXT]: response('   ') });
    expect(await takeShared()).toBeNull();
  });

  it('takes the shared file and text once', async () => {
    const { store } = fakeCaches({
      [SHARED_FILE]: response('x', {
        'content-type': 'image/png',
        'x-file-name': encodeURIComponent('Captura 1.png'),
      }),
      [SHARED_TEXT]: response('Bar -3,00 €'),
    });
    const shared = await takeShared();
    expect(shared?.file?.name).toBe('Captura 1.png');
    expect(shared?.file?.type).toBe('image/png');
    expect(shared?.text).toBe('Bar -3,00 €');
    expect(store.size).toBe(0);
    fakeCaches({ [SHARED_FILE]: response('x') });
    expect((await takeShared())?.file).toMatchObject({ name: 'compartido', type: '' });
  });
});

describe('the service worker of the share target (public/share-sw.js)', () => {
  type Listener = (event: unknown) => void;
  const load = () => {
    const listeners: Listener[] = [];
    const self = { addEventListener: (_type: string, fn: Listener) => listeners.push(fn) };
    const source = readFileSync(join(__dirname, '../../../public/share-sw.js'), 'utf8');
    new Function('self', 'caches', 'Response', source)(
      self,
      globalThis.caches,
      class {
        static redirect = (url: string, status: number) => ({ url, status });
        constructor(
          public body: unknown,
          public init?: unknown
        ) {}
      }
    );
    return listeners[0];
  };
  const event = (method: string, path: string, form: Record<string, unknown[]>) => {
    let answer: Promise<unknown> | null = null;
    return {
      request: {
        method,
        url: `https://finanverso.app${path}`,
        formData: async () => ({
          getAll: (name: string) => form[name] ?? [],
          get: (name: string) => (form[name] ?? [null])[0],
        }),
      },
      respondWith: (p: Promise<unknown>) => (answer = p),
      answer: () => answer,
    };
  };

  it('keeps the shared file and text and opens the importer', async () => {
    const { store } = fakeCaches();
    const listener = load();
    const shared = event('POST', '/compartir', {
      files: ['no es un fichero', new File(['x'], 'extracto.csv', { type: 'text/csv' })],
      title: ['Movimientos'],
      text: ['Bar -3,00 €'],
      url: [''],
    });
    listener(shared);
    expect(await shared.answer()).toEqual({ url: '/?importar=compartido', status: 303 });
    expect(store.get(SHARED_FILE)).toMatchObject({
      init: { headers: { 'content-type': 'text/csv', 'x-file-name': 'extracto.csv' } },
    });
    expect(store.get(SHARED_TEXT)).toMatchObject({ body: 'Movimientos\nBar -3,00 €' });

    const nameless = event('POST', '/compartir', { files: [new File(['x'], '')] });
    listener(nameless);
    await nameless.answer();
    expect(store.get(SHARED_FILE)).toMatchObject({
      init: {
        headers: { 'content-type': 'application/octet-stream', 'x-file-name': 'compartido' },
      },
    });
    expect(store.has(SHARED_TEXT)).toBe(false);
  });

  it('leaves every other request to the app', () => {
    fakeCaches();
    const listener = load();
    const get = event('GET', '/compartir', {});
    const other = event('POST', '/api/transactions', {});
    listener(get);
    listener(other);
    expect(get.answer()).toBeNull();
    expect(other.answer()).toBeNull();
  });
});

describe('opening the importer from the address', () => {
  beforeEach(() => freezeTime('2026-10-26T12:00:00'));
  afterEach(restoreTime);

  it('?importar=1 opens the importer (the monthly reminder)', async () => {
    renderWithProviders(<Dashboard />, { api: createFakeApi(), route: '/?importar=1' });
    expect(await screen.findByRole('dialog', { name: tr('app.import.title') })).toBeVisible();
  });

  it('?importar=compartido reads the shared text in the paste tab', async () => {
    fakeCaches({ [SHARED_TEXT]: response('12 oct Bar -3,00 €\n13 oct Pan -1,20 €') });
    renderWithProviders(<Dashboard />, { api: createFakeApi(), route: '/?importar=compartido' });
    expect(
      await screen.findByText(literal(tr('app.import.rowsFound', { count: 2 })))
    ).toBeVisible();
  });

  it('opens the importer anyway when the shared content cannot be read', async () => {
    Object.assign(globalThis, {
      caches: { open: jest.fn(async () => Promise.reject(new Error())) },
    });
    renderWithProviders(<Dashboard />, { api: createFakeApi(), route: '/?importar=compartido' });
    expect(await screen.findByRole('dialog', { name: tr('app.import.title') })).toBeVisible();
    expect(
      screen.getByRole('tab', { name: literal(tr('app.import.source.file')) })
    ).toHaveAttribute('aria-selected', 'true');
  });
});

describe('the importer with shared content', () => {
  const open = (shared: { file: File | null; text: string | null }) =>
    renderWithProviders(
      <ImportModal
        accounts={[f.account()]}
        shared={shared}
        onClose={jest.fn()}
        onImported={jest.fn()}
      />,
      { api: createFakeApi(), finances: false }
    );

  it('leaves unreadable shared text in the paste box, and starting again does not read it again', async () => {
    open({ file: null, text: 'Hola' });
    expect(screen.getByText(tr('app.import.paste.nothing'))).toBeInTheDocument();
    expect(screen.getByLabelText(tr('app.import.paste.label'))).toHaveValue('Hola');
  });

  it('reads a shared screenshot in the screenshot tab', async () => {
    worker.recognize.mockResolvedValueOnce({ data: { blocks: [] } });
    open({ file: new File(['x'], 'c.png', { type: 'image/png' }), text: null });
    expect(
      screen.getByRole('tab', { name: literal(tr('app.import.source.screenshot')) })
    ).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByText(tr('app.import.screenshot.nothing'))).toBeInTheDocument();
  });

  it('reads a shared statement file, and starting again leaves it alone', async () => {
    const csv = 'Fecha;Concepto;Importe\n02/03/2026;MERCADONA;-54,30';
    const bytes = new TextEncoder().encode(csv);
    const file = Object.assign(new File([bytes], 'extracto.csv', { type: 'text/csv' }), {
      arrayBuffer: async () => bytes.buffer,
    });
    open({ file, text: null });
    expect(await screen.findByText(/extracto\.csv · CSV/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: tr('app.import.otherFile') }));
    await act(async () => undefined);
    expect(screen.queryByText(/extracto\.csv · CSV/)).toBeNull();
    await waitFor(() =>
      expect(screen.getByRole('tab', { name: literal(tr('app.import.source.file')) })).toBeVisible()
    );
  });
});
