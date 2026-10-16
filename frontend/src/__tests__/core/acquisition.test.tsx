import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import {
  captureAcquisition,
  clearAcquisition,
  pendingAcquisition,
  sourceOf,
} from '@core/acquisition';
import { ApiProvider } from '@core/context/ApiContext';
import { useAcquisition } from '@modules/finances/application/hooks/useAcquisition';
import { createFakeApi } from '@test-utils/fakeApi';

beforeEach(() => localStorage.clear());

describe('sourceOf', () => {
  it('prefers the campaign and cleans it', () => {
    expect(sourceOf('?utm_source=Reddit', 'https://x.com/a', 'finanverso.app')).toBe('reddit');
    expect(sourceOf('?utm_source=%20Tik%20Tok!', '', 'finanverso.app')).toBe('tiktok');
    expect(sourceOf(`?utm_source=${'a'.repeat(60)}`, '', 'finanverso.app')).toHaveLength(40);
  });

  it('falls back to the site that linked here, ignoring ours', () => {
    expect(sourceOf('', 'https://www.google.com/search?q=x', 'finanverso.app')).toBe('google.com');
    expect(sourceOf('?utm_source=!!!', 'https://news.ycombinator.com/', 'finanverso.app')).toBe(
      'news.ycombinator.com'
    );
    expect(sourceOf('', 'https://finanverso.app/guias', 'finanverso.app')).toBeNull();
    expect(sourceOf('', '', 'finanverso.app')).toBeNull();
    expect(sourceOf('', 'not a url', 'finanverso.app')).toBeNull();
  });
});

describe('captureAcquisition', () => {
  it('keeps the first source until it is reported', () => {
    captureAcquisition('?utm_source=reddit', '', 'finanverso.app');
    captureAcquisition('?utm_source=tiktok', '', 'finanverso.app');
    expect(pendingAcquisition()).toBe('reddit');
    clearAcquisition();
    expect(pendingAcquisition()).toBeUndefined();
    captureAcquisition('', '', 'finanverso.app');
    expect(pendingAcquisition()).toBeUndefined();
  });

  it('reads the page by default', () => {
    window.history.replaceState(null, '', '/?utm_source=blog');
    captureAcquisition();
    expect(pendingAcquisition()).toBe('blog');
    window.history.replaceState(null, '', '/');
  });
});

describe('useAcquisition', () => {
  const run = (api = createFakeApi()) => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <ApiProvider value={api}>{children}</ApiProvider>
    );
    renderHook(() => useAcquisition(), { wrapper });
    return api;
  };

  it('reports the source once and forgets it, also when the request fails', async () => {
    localStorage.setItem('mm_acq', 'reddit');
    const api = run();
    await waitFor(() => expect(api.authApi.acquisition).toHaveBeenCalledWith('reddit'));
    await waitFor(() => expect(pendingAcquisition()).toBeUndefined());
    localStorage.setItem('mm_acq', 'tiktok');
    const failing = createFakeApi();
    failing.authApi.acquisition.mockRejectedValue(new Error('offline'));
    run(failing);
    await waitFor(() => expect(pendingAcquisition()).toBeUndefined());
  });

  it('does nothing without a pending source', () => {
    const api = run();
    expect(api.authApi.acquisition).not.toHaveBeenCalled();
  });
});
