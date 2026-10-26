import { storage } from '@shared/utils/storage';

/** Larger letters and stronger colours in the whole app, kept on this device. */
export interface Readability {
  big: boolean;
  contrast: boolean;
}

const KEY = 'mm_readability';
/** Classes on <html>: the stylesheet enlarges the text and strengthens the colours with them. */
export const BIG_CLASS = 'app-big-text';
export const CONTRAST_CLASS = 'app-contrast';

export function loadReadability(): Readability {
  const saved = storage.getJSON<Partial<Readability> | null>(KEY, null);
  return { big: saved?.big === true, contrast: saved?.contrast === true };
}

export function applyReadability(value: Readability): void {
  document.documentElement.classList.toggle(BIG_CLASS, value.big);
  document.documentElement.classList.toggle(CONTRAST_CLASS, value.contrast);
}

export function saveReadability(value: Readability): void {
  if (value.big || value.contrast) storage.setJSON(KEY, value);
  else storage.set(KEY, null);
  applyReadability(value);
}
