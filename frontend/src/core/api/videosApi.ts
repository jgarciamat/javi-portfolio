import type { PremiumVideoIds } from '@modules/guides/domain/videos';
import { apiRequest } from './http';

export const videosApi = {
  /** YouTube ids of the Premium videos of the «Videoteca» (refused with a 403 to free users). */
  premium() {
    return apiRequest<PremiumVideoIds>('/videos/premium');
  },
};
