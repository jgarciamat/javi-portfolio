import { Capacitor } from '@capacitor/core';
import { act, renderHook, waitFor } from '@testing-library/react';
import {
  DICTATION_TIMEOUT_MS,
  nativeError,
  useSpeechDictation,
} from '@modules/finances/application/hooks/useSpeechDictation';

class FakeRecognition {
  static last: FakeRecognition;
  static failToStart = false;
  lang = '';
  continuous = true;
  interimResults = true;
  maxAlternatives = 0;
  onresult: ((e: { results: { transcript: string }[][] }) => void) | null = null;
  onerror: ((e: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  start = jest.fn(() => {
    if (FakeRecognition.failToStart) throw new Error('already started');
  });
  abort = jest.fn();
  constructor() {
    FakeRecognition.last = this;
  }
}

const w = window as unknown as Record<string, unknown>;
const setWeb = (name: 'SpeechRecognition' | 'webkitSpeechRecognition' | null) => {
  delete w.SpeechRecognition;
  delete w.webkitSpeechRecognition;
  if (name) w[name] = FakeRecognition;
};

afterEach(() => {
  setWeb(null);
  FakeRecognition.failToStart = false;
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe('useSpeechDictation in the browser', () => {
  beforeEach(() => setWeb('webkitSpeechRecognition'));

  it('is not supported without the Web Speech API', () => {
    setWeb(null);
    const { result } = renderHook(() => useSpeechDictation('es-ES', jest.fn()));
    expect(result.current.supported).toBe(false);
  });

  it.each(['SpeechRecognition', 'webkitSpeechRecognition'] as const)('uses %s', (name) => {
    setWeb(name);
    const { result } = renderHook(() => useSpeechDictation('es-ES', jest.fn()));
    expect(result.current.supported).toBe(true);
  });

  it('listens for one phrase in the language and hands the text over', () => {
    const onText = jest.fn();
    const { result } = renderHook(() => useSpeechDictation('en-US', onText));
    act(() => result.current.start());
    const rec = FakeRecognition.last;
    expect(result.current.listening).toBe(true);
    expect(rec).toMatchObject({ lang: 'en-US', continuous: false, interimResults: false });
    expect(rec.maxAlternatives).toBe(1);
    act(() => rec.onresult?.({ results: [[{ transcript: ' café 1,50 ' }]] }));
    expect(onText).toHaveBeenCalledWith('café 1,50');
    expect(result.current.listening).toBe(false);
    // The end that follows the result says nothing more.
    act(() => rec.onend?.());
    expect(result.current.error).toBeNull();
  });

  it('says nothing was heard for an empty result or an end without a phrase', () => {
    const onText = jest.fn();
    const { result } = renderHook(() => useSpeechDictation('es-ES', onText));
    act(() => result.current.start());
    act(() => FakeRecognition.last.onresult?.({ results: [[{ transcript: '  ' }]] }));
    expect(result.current.error).toBe('noSpeech');
    act(() => result.current.start());
    expect(result.current.error).toBeNull();
    act(() => FakeRecognition.last.onresult?.({ results: [] }));
    expect(result.current.error).toBe('noSpeech');
    act(() => result.current.start());
    act(() => FakeRecognition.last.onend?.());
    expect(result.current.error).toBe('noSpeech');
    expect(onText).not.toHaveBeenCalled();
  });

  it.each([
    ['not-allowed', 'denied'],
    ['service-not-allowed', 'denied'],
    ['audio-capture', 'noMic'],
    ['no-speech', 'noSpeech'],
    ['network', 'network'],
    ['language-not-supported', 'unavailable'],
    ['bad-grammar', 'failed'],
  ])('maps the error %s to %s', (code, expected) => {
    const { result } = renderHook(() => useSpeechDictation('es-ES', jest.fn()));
    act(() => result.current.start());
    act(() => FakeRecognition.last.onerror?.({ error: code }));
    expect(result.current.error).toBe(expected);
    expect(result.current.listening).toBe(false);
  });

  it('gives up after the timeout and stops the recognizer', () => {
    jest.useFakeTimers();
    const { result } = renderHook(() => useSpeechDictation('es-ES', jest.fn()));
    act(() => result.current.start());
    const rec = FakeRecognition.last;
    act(() => {
      jest.advanceTimersByTime(DICTATION_TIMEOUT_MS);
    });
    expect(result.current.error).toBe('timeout');
    expect(rec.abort).toHaveBeenCalled();
  });

  it('cancels without an error and ignores what comes later', () => {
    const onText = jest.fn();
    const { result } = renderHook(() => useSpeechDictation('es-ES', onText));
    act(() => result.current.start());
    const rec = FakeRecognition.last;
    act(() => result.current.cancel());
    expect(rec.abort).toHaveBeenCalled();
    expect(result.current.listening).toBe(false);
    act(() => rec.onresult?.({ results: [[{ transcript: 'tarde' }]] }));
    act(() => rec.onerror?.({ error: 'aborted' }));
    expect(onText).not.toHaveBeenCalled();
    expect(result.current.error).toBeNull();
  });

  it('cancelling when nothing is listening does nothing', () => {
    const { result } = renderHook(() => useSpeechDictation('es-ES', jest.fn()));
    act(() => result.current.cancel());
    expect(result.current.listening).toBe(false);
  });

  it('a new start drops the previous session, and unmounting stops it', () => {
    const { result, unmount } = renderHook(() => useSpeechDictation('es-ES', jest.fn()));
    act(() => result.current.start());
    const first = FakeRecognition.last;
    act(() => result.current.start());
    expect(first.abort).toHaveBeenCalled();
    const second = FakeRecognition.last;
    unmount();
    expect(second.abort).toHaveBeenCalled();
  });

  it('reports a recognizer that cannot start', () => {
    FakeRecognition.failToStart = true;
    const { result } = renderHook(() => useSpeechDictation('es-ES', jest.fn()));
    act(() => result.current.start());
    expect(result.current.error).toBe('failed');
  });
});

describe('useSpeechDictation in the app', () => {
  const plugin = {
    available: jest.fn(),
    checkPermissions: jest.fn(),
    requestPermissions: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
  };
  jest.mock('@capacitor-community/speech-recognition', () => ({ SpeechRecognition: plugin }));

  beforeEach(() => {
    jest.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    plugin.available.mockResolvedValue({ available: true });
    plugin.checkPermissions.mockResolvedValue({ speechRecognition: 'granted' });
    plugin.requestPermissions.mockResolvedValue({ speechRecognition: 'granted' });
    plugin.start.mockResolvedValue({ matches: [' café 1,50 '] });
    plugin.stop.mockResolvedValue(undefined);
  });
  afterEach(() => jest.clearAllMocks());

  const setup = async (onText = jest.fn()) => {
    const hook = renderHook(() => useSpeechDictation('es-ES', onText));
    await waitFor(() => expect(plugin.available).toHaveBeenCalled());
    return { ...hook, onText };
  };

  it('is supported when the system recognizer is available', async () => {
    const { result } = await setup();
    await waitFor(() => expect(result.current.supported).toBe(true));
  });

  it('stays unsupported when it is not available, fails to answer or the screen is gone', async () => {
    plugin.available.mockResolvedValue({ available: false });
    const first = await setup();
    await act(async () => undefined);
    expect(first.result.current.supported).toBe(false);
    plugin.available.mockRejectedValue(new Error('x'));
    const second = await setup();
    await act(async () => undefined);
    expect(second.result.current.supported).toBe(false);
    plugin.available.mockResolvedValue({ available: true });
    const third = renderHook(() => useSpeechDictation('es-ES', jest.fn()));
    third.unmount();
    await act(async () => undefined);
    expect(third.result.current.supported).toBe(false);
  });

  it('listens once the permission is granted and hands the text over', async () => {
    const { result, onText } = await setup();
    act(() => result.current.start());
    expect(result.current.listening).toBe(true);
    await waitFor(() => expect(onText).toHaveBeenCalledWith('café 1,50'));
    expect(plugin.requestPermissions).not.toHaveBeenCalled();
    expect(plugin.start).toHaveBeenCalledWith({
      language: 'es-ES',
      maxResults: 1,
      partialResults: false,
      popup: false,
    });
    expect(result.current.listening).toBe(false);
  });

  it('asks for the microphone the first time, and tells when it is denied', async () => {
    plugin.checkPermissions.mockResolvedValue({ speechRecognition: 'prompt' });
    const { result, onText } = await setup();
    act(() => result.current.start());
    await waitFor(() => expect(onText).toHaveBeenCalled());
    expect(plugin.requestPermissions).toHaveBeenCalled();
    plugin.requestPermissions.mockResolvedValue({ speechRecognition: 'denied' });
    act(() => result.current.start());
    await waitFor(() => expect(result.current.error).toBe('denied'));
    expect(plugin.start).toHaveBeenCalledTimes(1);
  });

  it('says nothing was heard when there are no matches', async () => {
    plugin.start.mockResolvedValue({});
    const { result } = await setup();
    act(() => result.current.start());
    await waitFor(() => expect(result.current.error).toBe('noSpeech'));
  });

  it('reads the error of the plugin', async () => {
    plugin.start.mockRejectedValue(new Error('No match'));
    const { result } = await setup();
    act(() => result.current.start());
    await waitFor(() => expect(result.current.error).toBe('noSpeech'));
  });

  it('cancelling stops the recognizer, even if it refuses to stop', async () => {
    plugin.start.mockReturnValue(new Promise(() => undefined));
    plugin.stop.mockRejectedValue(new Error('x'));
    const { result, onText } = await setup();
    act(() => result.current.start());
    await waitFor(() => expect(plugin.start).toHaveBeenCalled());
    act(() => result.current.cancel());
    expect(plugin.stop).toHaveBeenCalled();
    expect(result.current.listening).toBe(false);
    expect(onText).not.toHaveBeenCalled();
  });

  it('cancelling while the permission is asked does not start listening', async () => {
    let answer: (v: unknown) => void = () => undefined;
    plugin.checkPermissions.mockReturnValue(new Promise((r) => (answer = r)));
    const { result } = await setup();
    act(() => result.current.start());
    act(() => result.current.cancel());
    await act(async () => answer({ speechRecognition: 'granted' }));
    expect(plugin.start).not.toHaveBeenCalled();
  });

  it('times out when the recognizer never answers', async () => {
    jest.useFakeTimers();
    plugin.start.mockReturnValue(new Promise(() => undefined));
    const { result } = renderHook(() => useSpeechDictation('es-ES', jest.fn()));
    act(() => result.current.start());
    await act(async () => undefined);
    await act(async () => {
      jest.advanceTimersByTime(DICTATION_TIMEOUT_MS);
    });
    expect(result.current.error).toBe('timeout');
    expect(plugin.stop).toHaveBeenCalled();
  });
});

describe('nativeError', () => {
  it.each([
    [new Error('Missing permission'), 'denied'],
    ['Insufficient permissions', 'denied'],
    [new Error("Didn't understand"), 'noSpeech'],
    [new Error('No speech input'), 'noSpeech'],
    [new Error('Network error'), 'network'],
    [new Error('Recognizer busy'), 'unavailable'],
    [new Error('boom'), 'failed'],
    [null, 'failed'],
  ])('%p -> %s', (error, expected) => {
    expect(nativeError(error)).toBe(expected);
  });
});
