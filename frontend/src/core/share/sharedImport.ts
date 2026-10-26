/**
 * «Compartir con Finanverso»: the installed web app is a share target (public/site.webmanifest).
 * The service worker (public/share-sw.js) keeps what was shared in this cache and opens
 * `/?importar=compartido`; the importer takes it from here, once.
 */
export const SHARE_CACHE = 'finanverso-share';
export const SHARED_FILE = '/compartir/archivo';
export const SHARED_TEXT = '/compartir/texto';

/** What another app shared: a file (screenshot, PDF, CSV…) and/or some text. */
export interface SharedContent {
  file: File | null;
  text: string | null;
}

/** The shared file and text, removed from the cache; null when there is nothing (or no cache). */
export async function takeShared(): Promise<SharedContent | null> {
  if (typeof caches === 'undefined') return null;
  const cache = await caches.open(SHARE_CACHE);
  const [fileResponse, textResponse] = await Promise.all([
    cache.match(SHARED_FILE),
    cache.match(SHARED_TEXT),
  ]);
  await Promise.all([cache.delete(SHARED_FILE), cache.delete(SHARED_TEXT)]);
  const file = fileResponse
    ? new File(
        [await fileResponse.blob()],
        decodeURIComponent(fileResponse.headers.get('x-file-name') ?? 'compartido'),
        { type: fileResponse.headers.get('content-type') ?? '' }
      )
    : null;
  const text = textResponse ? (await textResponse.text()).trim() || null : null;
  return file || text ? { file, text } : null;
}
