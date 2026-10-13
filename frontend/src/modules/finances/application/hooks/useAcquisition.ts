import { useEffect } from 'react';
import { useApi } from '@core/context/ApiContext';
import { clearAcquisition, pendingAcquisition } from '@core/acquisition';

/** After the first sign-in, tells the server (anonymously) where the new user came from. */
export function useAcquisition(): void {
  const { authApi } = useApi();
  useEffect(() => {
    const source = pendingAcquisition();
    if (!source) return;
    authApi
      .acquisition(source)
      .catch(() => undefined)
      .finally(clearAcquisition);
  }, [authApi]);
}
