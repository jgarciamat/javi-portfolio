import type { ChapterContent, ChapterTerm } from '@modules/invest/domain/types';
import { apiRequest } from './http';

export const learnApi = {
  /** The text of a Premium chapter of «Learn to invest» (refused with a 402 to free users). */
  chapter(id: string) {
    return apiRequest<ChapterContent>(`/learn/chapters/${encodeURIComponent(id)}`);
  },
  /** The glossary terms of the Premium chapters. */
  glossary() {
    return apiRequest<ChapterTerm[]>('/learn/glossary');
  },
};
