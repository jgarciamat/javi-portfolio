import { NotFoundError } from '@domain/errors';
import { CourseBlock, CourseChapter, CourseGlossaryTerm } from '@domain/model/Course';
import { EntitlementService } from '@application/billing/EntitlementService';

/** What the app needs to show a Premium chapter (it already knows its title and summary). */
export interface ChapterContent {
  id: string;
  blocks: CourseBlock[];
  glossary: CourseGlossaryTerm[];
}

/** The Premium chapters of the investing course. */
export class LearnService {
  private readonly byId: Map<string, CourseChapter>;

  constructor(
    private readonly chapters: CourseChapter[],
    private readonly entitlements: EntitlementService
  ) {
    this.byId = new Map(chapters.map((c) => [c.id, c]));
  }

  chapter(userId: string, id: string): ChapterContent {
    this.entitlements.assertFeature(userId, 'investCourse');
    const chapter = this.byId.get(id);
    if (!chapter) throw new NotFoundError('Capítulo no encontrado', 'CHAPTER_NOT_FOUND');
    return { id: chapter.id, blocks: chapter.blocks, glossary: chapter.glossary };
  }

  /** The glossary terms of every Premium chapter, with the chapter they come from. */
  glossary(userId: string): (CourseGlossaryTerm & { chapterId: string })[] {
    this.entitlements.assertFeature(userId, 'investCourse');
    return this.chapters.flatMap((c) => c.glossary.map((g) => ({ ...g, chapterId: c.id })));
  }
}
