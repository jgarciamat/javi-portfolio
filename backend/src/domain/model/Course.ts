/** Shapes of the investing course chapters served to Premium users (the app renders them). */

export type CourseBlock =
  | { k: 'h'; t: string }
  | { k: 'sh'; t: string }
  | { k: 'p'; t: string }
  | { k: 'ul'; items: string[] }
  | { k: 'key' | 'warn' | 'tip' | 'ex'; title?: string; t: string }
  | { k: 'table'; head: string[]; rows: string[][] }
  | { k: 'chart'; id: string }
  | { k: 'calc'; id: string }
  | { k: 'markets' };

export interface CourseGlossaryTerm {
  term: string;
  def: string;
}

export interface CourseChapter {
  id: string;
  emoji: string;
  color: string;
  title: string;
  titleEn: string;
  summary: string;
  summaryEn: string;
  level: 1 | 2 | 3;
  topic: 'basics' | 'stocks' | 'funds' | 'bonds' | 'crypto' | 'tax';
  blocks: CourseBlock[];
  glossary: CourseGlossaryTerm[];
}
