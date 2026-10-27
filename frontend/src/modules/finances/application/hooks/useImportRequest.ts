import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { type SharedContent, takeShared } from '@core/share/sharedImport';

/** `?importar=…` opens the importer: `compartido` with what another app shared (see share-sw.js). */
export const IMPORT_PARAM = 'importar';
export const SHARED_VALUE = 'compartido';

/**
 * Opens the importer when the address asks for it (the monthly reminder, a share from another app)
 * and returns what was shared, if anything. The parameter is removed so a reload does not open it
 * again.
 */
export function useImportRequest(open: () => void): SharedContent | null {
  const [params, setParams] = useSearchParams();
  const request = params.get(IMPORT_PARAM);
  const [shared, setShared] = useState<SharedContent | null>(null);
  // Once per request, also when StrictMode runs the effect twice.
  const handled = useRef(false);

  useEffect(() => {
    if (request === null || handled.current) return;
    handled.current = true;
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete(IMPORT_PARAM);
        return next;
      },
      { replace: true }
    );
    const done = (content: SharedContent | null) => {
      handled.current = false;
      setShared(content);
      open();
    };
    if (request !== SHARED_VALUE) done(null);
    else void takeShared().then(done, () => done(null));
  }, [request, setParams, open]);

  return shared;
}
