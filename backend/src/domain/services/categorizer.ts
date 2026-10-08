import { normalizeText } from '@domain/shared/text';

/**
 * Keyword rules used to guess a category for imported movements when the user's
 * own history has no match. Category names are the default (Spanish) ones; the
 * caller only uses a guess if the user still has that category. Rules are checked
 * in order, so more specific ones (e.g. "uber eats") go before generic ones ("uber").
 */
const KEYWORD_RULES: ReadonlyArray<{ category: string; keywords: string[] }> = [
  { category: 'Salario', keywords: ['nomina', 'salario', 'payroll', 'salary'] },
  {
    category: 'Vivienda',
    keywords: ['alquiler', 'hipoteca', 'arrendamiento', 'comunidad de propietarios', 'rent'],
  },
  {
    category: 'Alimentación',
    keywords: [
      'mercadona',
      'lidl',
      'carrefour',
      'aldi',
      'dia',
      'eroski',
      'alcampo',
      'supermercado',
      'consum',
      'hipercor',
      'restaurante',
      'glovo',
      'just eat',
      'uber eats',
    ],
  },
  {
    category: 'Luz',
    keywords: ['iberdrola', 'endesa', 'naturgy', 'holaluz', 'electricidad', 'luz'],
  },
  { category: 'Agua', keywords: ['canal de isabel', 'aguas de', 'agua'] },
  { category: 'Gas', keywords: ['butano', 'gas natural', 'gas'] },
  {
    category: 'Transporte',
    keywords: [
      'gasolina',
      'gasolinera',
      'repsol',
      'cepsa',
      'galp',
      'shell',
      'renfe',
      'metro',
      'emt',
      'cabify',
      'uber',
      'bolt',
      'parking',
      'peaje',
      'blablacar',
    ],
  },
  {
    category: 'Salud',
    keywords: [
      'farmacia',
      'medico',
      'clinica',
      'hospital',
      'dentista',
      'sanitas',
      'adeslas',
      'gimnasio',
      'gym',
    ],
  },
  {
    category: 'Ocio',
    keywords: [
      'netflix',
      'spotify',
      'hbo',
      'disney',
      'prime video',
      'cine',
      'steam',
      'playstation',
      'xbox',
      'teatro',
      'concierto',
    ],
  },
  {
    category: 'Ropa',
    keywords: ['zara', 'primark', 'h&m', 'mango', 'decathlon', 'pull&bear', 'bershka'],
  },
  {
    category: 'Tecnología',
    keywords: ['amazon', 'mediamarkt', 'pccomponentes', 'apple.com', 'fnac'],
  },
  {
    category: 'Educación',
    keywords: ['colegio', 'universidad', 'academia', 'udemy', 'coursera', 'matricula'],
  },
  {
    category: 'Inversiones',
    keywords: ['broker', 'myinvestor', 'indexa', 'degiro', 'trade republic', 'fondo de inversion'],
  },
];

/** Short keywords must match whole words ("dia" must not match "diario"); long ones may be substrings. */
function matches(text: string, keyword: string): boolean {
  const k = normalizeText(keyword);
  if (k.length >= 5) return text.includes(k);
  return ` ${text} `.includes(` ${k} `);
}

export function guessCategoryName(description: string): string | null {
  const text = normalizeText(description)
    .replace(/[^a-z0-9&.\s]/g, ' ')
    .replace(/\s+/g, ' ');
  for (const rule of KEYWORD_RULES) {
    if (rule.keywords.some((k) => matches(text, k))) return rule.category;
  }
  return null;
}
