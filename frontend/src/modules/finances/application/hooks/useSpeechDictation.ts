import { useCallback, useEffect, useRef, useState } from 'react';
import { isNativeApp } from '@shared/utils/platform';

/**
 * Dictation: one phrase turned into text by the speech recognition of the device. In the browser
 * it is the Web Speech API (the browser or the system does it); in the Android/iOS app it is the
 * system recognizer through @capacitor-community/speech-recognition. The audio never reaches our
 * servers: only the recognized text comes back here.
 */
export type DictationError =
  'denied' | 'noMic' | 'unavailable' | 'noSpeech' | 'network' | 'timeout' | 'failed';

export interface Dictation {
  /** Whether this device can dictate (the button is hidden when it cannot). */
  supported: boolean;
  listening: boolean;
  error: DictationError | null;
  /** Starts listening (asks for the microphone the first time). */
  start: () => void;
  /** Stops listening and drops what was heard. */
  cancel: () => void;
}

/** Longest wait for a phrase before giving up. */
export const DICTATION_TIMEOUT_MS = 15000;

interface WebRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  abort: () => void;
}
type WebRecognitionCtor = new () => WebRecognition;

function webCtor(): WebRecognitionCtor | null {
  const w = window as unknown as {
    SpeechRecognition?: WebRecognitionCtor;
    webkitSpeechRecognition?: WebRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const WEB_ERRORS: Record<string, DictationError> = {
  'not-allowed': 'denied',
  'service-not-allowed': 'denied',
  'audio-capture': 'noMic',
  'no-speech': 'noSpeech',
  network: 'network',
  'language-not-supported': 'unavailable',
};

/** The plugin rejects with a message: its kind is read from the words. */
export function nativeError(error: unknown): DictationError {
  const message = String((error as { message?: unknown } | null)?.message ?? error).toLowerCase();
  if (/permission|denied|insufficient/.test(message)) return 'denied';
  if (/no match|didn.t understand|no speech|speech timeout|not understand/.test(message)) {
    return 'noSpeech';
  }
  if (/network/.test(message)) return 'network';
  if (/not available|unavailable|no recognizer|recognizer/.test(message)) return 'unavailable';
  return 'failed';
}

type Outcome = { text: string } | { error: DictationError };

export function useSpeechDictation(lang: string, onText: (text: string) => void): Dictation {
  const native = isNativeApp();
  const [supported, setSupported] = useState(() => (native ? false : webCtor() !== null));
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<DictationError | null>(null);
  /** Each listening session has a number: whatever arrives from an older one is ignored. */
  const session = useRef(0);
  const stopper = useRef<(() => void) | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const textHandler = useRef(onText);
  textHandler.current = onText;

  const cancel = useCallback(() => {
    session.current++;
    clearTimeout(timer.current);
    const stop = stopper.current;
    stopper.current = null;
    setListening(false);
    stop?.();
  }, []);

  const settle = useCallback((id: number, outcome: Outcome) => {
    if (session.current !== id) return;
    session.current++;
    clearTimeout(timer.current);
    stopper.current = null;
    setListening(false);
    if ('error' in outcome) setError(outcome.error);
    else textHandler.current(outcome.text);
  }, []);

  useEffect(() => {
    if (!native) return;
    let alive = true;
    void import('@capacitor-community/speech-recognition')
      .then(({ SpeechRecognition }) => SpeechRecognition.available())
      .then(({ available }) => alive && setSupported(available))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [native]);

  useEffect(() => cancel, [cancel]);

  const startNative = useCallback(
    async (id: number) => {
      try {
        const { SpeechRecognition } = await import('@capacitor-community/speech-recognition');
        let permission = await SpeechRecognition.checkPermissions();
        if (permission.speechRecognition !== 'granted') {
          permission = await SpeechRecognition.requestPermissions();
        }
        if (session.current !== id) return;
        if (permission.speechRecognition !== 'granted') return settle(id, { error: 'denied' });
        stopper.current = () => void SpeechRecognition.stop().catch(() => undefined);
        const { matches } = await SpeechRecognition.start({
          language: lang,
          maxResults: 1,
          partialResults: false,
          popup: false,
        });
        const text = matches?.[0]?.trim();
        settle(id, text ? { text } : { error: 'noSpeech' });
      } catch (e) {
        settle(id, { error: nativeError(e) });
      }
    },
    [lang, settle]
  );

  const startWeb = useCallback(
    (id: number) => {
      const Recognition = webCtor() as WebRecognitionCtor;
      const recognition = new Recognition();
      recognition.lang = lang;
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.onresult = (event) => {
        const text = event.results[0]?.[0]?.transcript.trim();
        settle(id, text ? { text } : { error: 'noSpeech' });
      };
      recognition.onerror = (event) => {
        settle(id, { error: WEB_ERRORS[event.error] ?? 'failed' });
      };
      // It ended without a phrase.
      recognition.onend = () => settle(id, { error: 'noSpeech' });
      stopper.current = () => recognition.abort();
      try {
        recognition.start();
      } catch {
        settle(id, { error: 'failed' });
      }
    },
    [lang, settle]
  );

  const start = useCallback(() => {
    cancel();
    const id = ++session.current;
    setError(null);
    setListening(true);
    timer.current = setTimeout(() => {
      const stop = stopper.current;
      settle(id, { error: 'timeout' });
      stop?.();
    }, DICTATION_TIMEOUT_MS);
    if (native) void startNative(id);
    else startWeb(id);
  }, [cancel, native, settle, startNative, startWeb]);

  return { supported, listening, error, start, cancel };
}
