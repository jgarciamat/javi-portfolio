/** Helpers to build the package of a year from another one, changing only what the sources say. */

const MANUALS = 'manuales-videos-folletos/manuales-practicos/irpf-';
const HELP = 'manuales-videos-folletos/manuales-ayuda-presentacion/irpf-';

/**
 * The same data with its links to the Manual práctico (and the help manual) of another year. The
 * pages of the Manual 2024 have the same paths as those of 2025: each one was opened on 22-10-2026.
 */
export function withManualOf<T>(data: T, from: number, to: number): T {
  const swap = (value: unknown): unknown => {
    if (typeof value === 'string')
      return value
        .split(`${MANUALS}${from}`)
        .join(`${MANUALS}${to}`)
        .split(`${HELP}${from}`)
        .join(`${HELP}${to}`);
    if (Array.isArray(value)) return value.map(swap);
    if (value && typeof value === 'object')
      return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, swap(v)]));
    return value;
  };
  return swap(data) as T;
}

/** A list of items with an id, with some of them changed (the rest as they are). */
export function patched<T extends { id: string }>(
  list: T[],
  changes: Record<string, Partial<T>>
): T[] {
  const unknown = Object.keys(changes).filter((id) => !list.some((x) => x.id === id));
  if (unknown.length) throw new Error(`Unknown ids: ${unknown.join(', ')}`);
  return list.map((x) => (changes[x.id] ? { ...x, ...changes[x.id] } : x));
}
