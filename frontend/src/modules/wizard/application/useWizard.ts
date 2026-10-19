import { useEffect, useState } from 'react';
import { storage } from '@shared/utils/storage';
import {
  NEW_PROGRESS,
  completeStep,
  dayOf,
  isOpen,
  reviveProgress,
  type WizardProgress,
  type WizardStep,
} from '../domain/wizard';

/** The progress of a flow, saved on the device as it changes. */
export function useWizardProgress(key: string, steps: readonly WizardStep[]) {
  const [progress, setProgress] = useState<WizardProgress>(() =>
    reviveProgress(storage.getJSON<unknown>(key, null), steps)
  );
  // Whether there was something to continue when the page opened.
  const [resumed] = useState(() => storage.get(key) !== null && progress.done.length > 0);

  useEffect(() => storage.setJSON(key, progress), [key, progress]);

  return {
    progress,
    resumed,
    /** Another copy of the progress (the account's): taken as it is, once checked. */
    replace: (saved: unknown) => setProgress(reviveProgress(saved, steps)),
    /** Opens a step, only when it is open; it starts at its first screen. */
    go: (index: number) =>
      setProgress((p) => (isOpen(steps, p.done, index) ? { ...p, at: index, screen: 0 } : p)),
    /** A screen of the step on screen; the last one when it comes from the step after it. */
    setScreen: (screen: number) => setProgress((p) => ({ ...p, screen })),
    back: (screensOfPrevious: number) =>
      setProgress((p) =>
        p.screen > 0
          ? { ...p, screen: p.screen - 1 }
          : { ...p, at: Math.max(0, p.at - 1), screen: Math.max(0, screensOfPrevious - 1) }
      ),
    answer: (id: string, value: string) =>
      setProgress((p) => ({ ...p, answers: { ...p.answers, [id]: value } })),
    complete: (index: number) =>
      setProgress((p) => completeStep(p, steps, index, dayOf(new Date()))),
    restart: () => setProgress({ ...NEW_PROGRESS }),
  };
}

export type WizardControls = ReturnType<typeof useWizardProgress>;

/** Letter size and contrast of the assistant: a preference of this device. */
export interface WizardPrefs {
  big: boolean;
  contrast: boolean;
}

export const PREFS_KEY = 'mm_wizard_prefs';

export function useWizardPrefs(): [WizardPrefs, (patch: Partial<WizardPrefs>) => void] {
  const [prefs, setPrefs] = useState<WizardPrefs>(() => {
    const saved = storage.getJSON<Partial<WizardPrefs> | null>(PREFS_KEY, null);
    return { big: saved?.big === true, contrast: saved?.contrast === true };
  });
  useEffect(() => storage.setJSON(PREFS_KEY, prefs), [prefs]);
  // From the latest value: two quick taps never undo each other.
  const change = (patch: Partial<WizardPrefs>) => setPrefs((p) => ({ ...p, ...patch }));
  return [prefs, change];
}

/** Step by step (the assistant) or everything together (expert mode): remembered on this device. */
export function useAssistantMode(key: string): [boolean, (expert: boolean) => void] {
  const [expert, setExpert] = useState(() => storage.get(key) === 'expert');
  const change = (on: boolean) => {
    storage.set(key, on ? 'expert' : 'steps');
    setExpert(on);
  };
  return [expert, change];
}

/** Reads a text aloud with the voice of the device, when it has one. */
export const canSpeak = () =>
  'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function';

export function speak(text: string, lang: string): void {
  window.speechSynthesis.cancel();
  const utterance = new window.SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  // A little slower than the default: easier to follow.
  utterance.rate = 0.9;
  window.speechSynthesis.speak(utterance);
}
