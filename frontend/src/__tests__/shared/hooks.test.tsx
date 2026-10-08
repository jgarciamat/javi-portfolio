import { act, fireEvent, render, renderHook, waitFor } from '@testing-library/react';
import { useRef } from 'react';
import { useResource } from '@shared/hooks/useResource';
import { useAction } from '@shared/hooks/useAction';
import { useEscapeKey } from '@shared/hooks/useEscapeKey';
import { useClickOutside } from '@shared/hooks/useClickOutside';
import { useMediaQuery } from '@shared/hooks/useMediaQuery';
import { useToggleSet } from '@shared/hooks/useToggleSet';

const deferred = <T,>() => {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe('useResource', () => {
  it('loads data and reloads on demand', async () => {
    const load = jest.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(2);
    const { result } = renderHook(() => useResource(load, []));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.data).toBe(1));
    await act(() => result.current.reload());
    expect(result.current.data).toBe(2);
    expect(result.current.loading).toBe(false);
  });

  it('keeps only the newest response when dependencies change', async () => {
    const slow = deferred<string>();
    const fast = deferred<string>();
    const { result, rerender } = renderHook(
      ({ q }) => useResource(() => (q === 'a' ? slow.promise : fast.promise), [q]),
      {
        initialProps: { q: 'a' },
      }
    );
    rerender({ q: 'b' });
    await act(async () => fast.resolve('B'));
    await act(async () => slow.resolve('A'));
    expect(result.current.data).toBe('B');
  });

  it('reports errors with the message or the fallback, ignoring stale ones', async () => {
    const { result } = renderHook(() =>
      useResource(() => Promise.reject(new Error('down')), [], { fallbackError: 'x' })
    );
    await waitFor(() => expect(result.current.error).toBe('down'));
    const stale = deferred<never>();
    const { result: r2, unmount } = renderHook(() => useResource(() => stale.promise, []));
    unmount();
    await act(async () => stale.reject('late'));
    expect(r2.current.error).toBeNull();
    const { result: r3 } = renderHook(() =>
      useResource(() => Promise.reject('plain'), [], { fallbackError: 'Fallo' })
    );
    await waitFor(() => expect(r3.current.error).toBe('Fallo'));
  });

  it('does nothing while disabled', async () => {
    const load = jest.fn();
    const { result } = renderHook(() => useResource(load, [], { enabled: false }));
    await act(() => result.current.reload());
    expect(load).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
  });
});

describe('useAction', () => {
  it('tracks pending state and turns failures into messages', async () => {
    const { result } = renderHook(() => useAction('Fallo'));
    let ok = false;
    await act(async () => {
      ok = await result.current.run(() => Promise.resolve());
    });
    expect(ok).toBe(true);
    await act(async () => {
      ok = await result.current.run(() => Promise.reject(new Error('no')));
    });
    expect(ok).toBe(false);
    expect(result.current.error).toBe('no');
    act(() => result.current.setError(null));
    expect(result.current.error).toBeNull();
  });

  it('stays pending until every running action finishes', async () => {
    const { result } = renderHook(() => useAction());
    const a = deferred<void>();
    const b = deferred<void>();
    let pa!: Promise<boolean>;
    let pb!: Promise<boolean>;
    act(() => {
      pa = result.current.run(() => a.promise);
      pb = result.current.run(() => b.promise);
    });
    await act(async () => {
      a.resolve();
      await pa;
    });
    expect(result.current.pending).toBe(true);
    await act(async () => {
      b.resolve();
      await pb;
    });
    expect(result.current.pending).toBe(false);
  });
});

describe('useEscapeKey', () => {
  it('calls the handler on Escape only while enabled', () => {
    const onEscape = jest.fn();
    const { rerender } = renderHook(({ on }) => useEscapeKey(onEscape, on), {
      initialProps: { on: true },
    });
    fireEvent.keyDown(document, { key: 'Enter' });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onEscape).toHaveBeenCalledTimes(1);
    rerender({ on: false });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onEscape).toHaveBeenCalledTimes(1);
  });
});

describe('useClickOutside', () => {
  function Box({ onOutside, enabled }: { onOutside: () => void; enabled: boolean }) {
    const ref = useRef<HTMLDivElement>(null);
    useClickOutside(ref, onOutside, enabled);
    return (
      <div>
        <div ref={ref}>inside</div>
        <span>outside</span>
      </div>
    );
  }

  it('fires only for clicks outside the element', () => {
    const onOutside = jest.fn();
    const { getByText, rerender } = render(<Box onOutside={onOutside} enabled />);
    fireEvent.mouseDown(getByText('inside'));
    expect(onOutside).not.toHaveBeenCalled();
    fireEvent.mouseDown(getByText('outside'));
    expect(onOutside).toHaveBeenCalledTimes(1);
    rerender(<Box onOutside={onOutside} enabled={false} />);
    fireEvent.mouseDown(getByText('outside'));
    expect(onOutside).toHaveBeenCalledTimes(1);
  });
});

describe('useMediaQuery', () => {
  const original = window.matchMedia;
  afterEach(() => {
    window.matchMedia = original;
  });

  it('is false without matchMedia', () => {
    // @ts-expect-error jsdom has no matchMedia
    window.matchMedia = undefined;
    const { result } = renderHook(() => useMediaQuery('(max-width: 600px)'));
    expect(result.current).toBe(false);
  });

  it('follows the media query', () => {
    let listener: () => void = () => undefined;
    const list = {
      matches: true,
      addEventListener: (_: string, cb: () => void) => {
        listener = cb;
      },
      removeEventListener: jest.fn(),
    };
    window.matchMedia = jest.fn().mockReturnValue(list);
    const { result, unmount } = renderHook(() => useMediaQuery('(max-width: 600px)'));
    expect(result.current).toBe(true);
    list.matches = false;
    act(() => listener());
    expect(result.current).toBe(false);
    unmount();
    expect(list.removeEventListener).toHaveBeenCalled();
  });
});

describe('useToggleSet', () => {
  it('adds, toggles and checks keys', () => {
    const { result } = renderHook(() => useToggleSet(['a']));
    expect(result.current.has('a')).toBe(true);
    act(() => result.current.toggle('a'));
    expect(result.current.has('a')).toBe(false);
    act(() => result.current.add('b'));
    const before = result.current.items;
    act(() => result.current.add('b'));
    expect(result.current.items).toBe(before);
    act(() => result.current.toggle('c'));
    expect([...result.current.items]).toEqual(['b', 'c']);
  });
});
