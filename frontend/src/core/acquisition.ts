import { storage } from '@shared/utils/storage';

/**
 * The signup source is no longer kept in the browser (LSSI art. 22.2): the server measures it
 * from the UTM and referrer of the request. This only removes what earlier versions stored.
 */
const LEGACY_KEY = 'mm_acq';

export function removeLegacyAcquisition(): void {
  storage.set(LEGACY_KEY, null);
}
