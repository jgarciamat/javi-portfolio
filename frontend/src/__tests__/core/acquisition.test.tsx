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
    expect(sourceOf('?utm_source=Reddit', 'https://x.com/a', 'winjgm.com')).toBe('reddit');
    expect(sourceOf('?utm_source=%20Tik%20Tok!', '', 'winjgm.com')).toBe('tiktok');
    expect(sourceOf(`?utm_source=${'a'.repeat(60)}`, '', 'winjgm.com')).toHaveLength(40);
  });

  it('falls back to the site that linked here, ignoring ours', () => {
    expect(sourceOf('', 'https://www.google.com/search?q=x', 'www.winjgm.com')).toBe('google.com');
    expect(sourceOf('?utm_source=!!!', 'https://news.ycombinator.com/', 'winjgm.com')).toBe(
      'news.ycombinator.com'
    );
    expect(sourceOf('', 'https://www.winjgm.com/guias', 'winjgm.com')).toBeNull();
    expect(sourceOf('', '', 'winjgm.com')).toBeNull();
    expect(sourceOf('', 'not a url', 'winjgm.com')).toBeNull();
  });
});

describe('captureAcquisition', () => {
  it('keeps the first source until it is reported', () => {
    captureAcquisition('?utm_source=reddit', '', 'winjgm.com');
    captureAcquisition('?utm_source=tiktok', '', 'winjgm.com');
    expect(pendingAcquisition()).toBe('reddit');
    clearAcquisition();
    expect(pendingAcquisition()).toBeUndefined();
    captureAcquisition('', '', 'winjgm.com');
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
