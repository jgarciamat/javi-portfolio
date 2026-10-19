import { readPdf, type PdfText } from './readPdf';
import {
  declaredEncoding,
  isDraftXml,
  xmlExercise,
  type XmlBoxes,
  type XmlMap,
} from '../domain/rentaDraftXml';

/** What a file uploaded as the draft is: the PDF, the Agency's XML («.txt»), or plain text. */
export type DraftFile =
  | { kind: 'pdf'; pdf: PdfText }
  | { kind: 'xml'; text: string; exercise: number | null }
  | { kind: 'text'; text: string };

interface MapFile {
  ejercicio: number;
  casillas: Record<string, string[]>;
}

/** The maps of the boxes, by exercise (data/renta/xml, from the Agency's data dictionaries). */
const MAPS: Record<number, () => Promise<MapFile>> = {
  2023: () => import('../data/renta/xml/casillas-2023.json').then((m) => m.default as MapFile),
  2024: () => import('../data/renta/xml/casillas-2024.json').then((m) => m.default as MapFile),
  2025: () => import('../data/renta/xml/casillas-2025.json').then((m) => m.default as MapFile),
};

export const MAP_YEARS = Object.keys(MAPS).map(Number);

/**
 * The map to read an exercise with: its own, or else the nearest earlier one (the names of the
 * elements barely change from one year to the next), or the first one for an older file.
 */
export function mapYearFor(exercise: number | null): number {
  const latest = MAP_YEARS[MAP_YEARS.length - 1];
  if (exercise === null) return latest;
  const earlier = MAP_YEARS.filter((y) => y <= exercise);
  return earlier.length ? earlier[earlier.length - 1] : MAP_YEARS[0];
}

/** Loads the map of the boxes for the exercise of a file. */
export async function loadXmlMap(exercise: number | null): Promise<XmlMap> {
  const data = await MAPS[mapYearFor(exercise)]();
  return { exercise: data.ejercicio, boxes: data.casillas as unknown as XmlBoxes };
}

/** The text of a file in the encoding its XML declaration names (ISO-8859-1 for the Agency's). */
export function decodeText(bytes: Uint8Array): string {
  const head = new TextDecoder('latin1').decode(bytes.slice(0, 200));
  try {
    return new TextDecoder(declaredEncoding(head)).decode(bytes);
  } catch {
    // An encoding the browser does not know: Latin-1 keeps every byte.
    return new TextDecoder('latin1').decode(bytes);
  }
}

/** A PDF starts with `%PDF`. */
const isPdf = (bytes: Uint8Array) =>
  bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;

/** The bytes of a file (`File.arrayBuffer`, or a reader where it is missing). */
function bytesOf(file: File): Promise<Uint8Array> {
  if (typeof file.arrayBuffer === 'function')
    return file.arrayBuffer().then((b) => new Uint8Array(b));
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

/** Reads a file in the browser and tells what it is, by its content: the file never leaves the device. */
export async function readDraftFile(file: File): Promise<DraftFile> {
  const bytes = await bytesOf(file);
  if (isPdf(bytes) || file.type === 'application/pdf' || /\.pdf$/i.test(file.name))
    return { kind: 'pdf', pdf: await readPdf(file) };
  const text = decodeText(bytes);
  if (isDraftXml(text)) return { kind: 'xml', text, exercise: xmlExercise(text) };
  return { kind: 'text', text };
}
