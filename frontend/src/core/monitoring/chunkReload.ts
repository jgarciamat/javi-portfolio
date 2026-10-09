import { reloadPage } from '@shared/utils/navigation';

const KEY = 'mm_chunk_reload';
/** A second failure within this time is a real problem, not an old version: show the error. */
const RETRY_AFTER_MS = 60_000;

function lastReload(): number {
  try {
    return Number(sessionStorage.getItem(KEY)) || 0;
  } catch {
    return 0;
  }
}

/**
 * After a deploy the files of the previous version disappear. A tab (or an installed app)
 * still running it fails to load a lazy chunk (404): fetch the new version once instead of
 * showing "Something went wrong".
 */
export function installChunkReload(now: () => number): () => void {
  const onError = (event: Event) => {
    if (now() - lastReload() < RETRY_AFTER_MS) return;
    event.preventDefault();
    try {
      sessionStorage.setItem(KEY, String(now()));
    } catch {
      /* private mode: reloading once more is harmless */
    }
    reloadPage();
  };
  window.addEventListener('vite:preloadError', onError);
  return () => window.removeEventListener('vite:preloadError', onError);
}
