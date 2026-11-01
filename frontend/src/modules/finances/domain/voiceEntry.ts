import { parseQuickEntry, type QuickEntry } from './quickEntry';

/**
 * «Dictar un gasto»: what the speech recognition of the device heard («he pagado por un café 50
 * céntimos») turned into the same entry as the typed quick add. The text is first rewritten
 * (spoken numbers into digits, filler verbs out) and then read by `parseQuickEntry`.
 */
export type VoiceLang = 'es' | 'en';

interface Grammar {
  /** Number words (no accents) and their value; `hundred`/`thousand` are the multipliers. */
  words: Record<string, number>;
  hundred?: string;
  thousand: string;
  /** The word between tens and units («treinta y cinco») or after hundreds («hundred and five»). */
  join: string;
  /** Words that link euros and cents («nueve euros con ochenta»). */
  link: string[];
  /** Words that link the whole part and the cents without a currency («nueve con ochenta»). */
  bare?: string;
  /** Words that can stand next to the amount and are not part of the concept. */
  edge: string[];
  income: RegExp;
  filler: RegExp;
  fallback: { expense: string; income: string };
}

const ES_WORDS: Record<string, number> = {
  un: 1,
  uno: 1,
  una: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
  nueve: 9,
  diez: 10,
  once: 11,
  doce: 12,
  trece: 13,
  catorce: 14,
  quince: 15,
  dieciseis: 16,
  diecisiete: 17,
  dieciocho: 18,
  diecinueve: 19,
  veinte: 20,
  veintiun: 21,
  veintiuno: 21,
  veintiuna: 21,
  veintidos: 22,
  veintitres: 23,
  veinticuatro: 24,
  veinticinco: 25,
  veintiseis: 26,
  veintisiete: 27,
  veintiocho: 28,
  veintinueve: 29,
  treinta: 30,
  cuarenta: 40,
  cincuenta: 50,
  sesenta: 60,
  setenta: 70,
  ochenta: 80,
  noventa: 90,
  cien: 100,
  ciento: 100,
  doscientos: 200,
  doscientas: 200,
  trescientos: 300,
  trescientas: 300,
  cuatrocientos: 400,
  cuatrocientas: 400,
  quinientos: 500,
  quinientas: 500,
  seiscientos: 600,
  seiscientas: 600,
  setecientos: 700,
  setecientas: 700,
  ochocientos: 800,
  ochocientas: 800,
  novecientos: 900,
  novecientas: 900,
};

const EN_WORDS: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
};

const GRAMMAR: Record<VoiceLang, Grammar> = {
  es: {
    words: ES_WORDS,
    thousand: 'mil',
    join: 'y',
    link: ['con', 'y'],
    bare: 'con',
    edge: [
      'por',
      'de',
      'del',
      'en',
      'para',
      'a',
      'al',
      'con',
      'el',
      'la',
      'los',
      'las',
      'un',
      'una',
      'unos',
      'unas',
      'concepto',
    ],
    income:
      /(?<=^|\s)(?:he cobrado|cobr[eé]|me han (?:ingresado|pagado|transferido|abonado|dado)|me (?:ingresaron|pagaron|transfirieron|abonaron)|he recibido|recib[ií]|ingreso de|ingreso)(?=\s|$)/,
    filler:
      /^(?:(?:apunta|anota|registra|a[ñn]ade|ap[uú]ntame|an[oó]tame)\s+(?:(?:un\s+)?gasto\s+(?:de\s+)?)?)?(?:(?:(?:me|nos)\s+)?(?:he|hemos|acabo de|acabamos de)\s+(?:pagado|gastado|comprado|comido|tomado|bebido|cenado|desayunado|almorzado|merendado|echado|puesto|sacado|pedido|pagar|gastar|comprar|comer|tomar|beber|cenar|desayunar|almorzar|gastarme|comprarme)|(?:(?:me|nos)\s+)?(?:pagu[eé]|gast[eé]|compr[eé]|com[ií]|tom[eé]|beb[ií]|cen[eé]|desayun[eé]|almorc[eé])|(?:un\s+)?gasto\s+de|(?:una\s+)?compra\s+de|pago\s+de)(?=\s|$)\s*/,
    fallback: { expense: 'Gasto', income: 'Ingreso' },
  },
  en: {
    words: EN_WORDS,
    hundred: 'hundred',
    thousand: 'thousand',
    join: 'and',
    link: ['and'],
    edge: ['for', 'on', 'at', 'in', 'of', 'the', 'a', 'an', 'my', 'some', 'with', 'to'],
    income:
      /(?<=^|\s)(?:i (?:just )?(?:got paid|was paid|earned|received)|(?:(?:they|someone|he|she|my \w+|the \w+) )?paid me|income of|deposit of)(?=\s|$)/,
    filler:
      /^(?:(?:i(?:'ve| have)? )?(?:just )?(?:paid|spent|bought|had|ate|eaten|drank|ordered|got)|expense of|purchase of)(?=\s|$)\s*/,
    fallback: { expense: 'Expense', income: 'Income' },
  },
};

const plain = (s: string): string => s.normalize('NFD').replace(/\p{M}/gu, '');

const isCurrency = (w: string | undefined): boolean =>
  /^(?:euros?|eur|€|dolar(?:es)?|dollars?|bucks?|usd|\$)$/.test(plain(w ?? ''));
const isCents = (w: string | undefined): boolean =>
  /^(?:centimos?|centavos?|cents?)$/.test(plain(w ?? ''));
const isOne = (value: number, end: number, start: number): boolean =>
  value === 1 && end - start === 1;

interface Read {
  value: number;
  end: number;
  /** Written with letters («nueve») instead of digits. */
  words: boolean;
}

/** A number in words starting at token `i` («treinta y cinco», «two hundred and five», «cinco mil»). */
function readWords(tok: string[], i: number, g: Grammar): Read | null {
  let total = 0;
  let group = 0;
  let thousands = false;
  let end = i;
  let k = i;
  while (k < tok.length) {
    let w = plain(tok[k]);
    let joined = false;
    if (w === g.join && k > i) {
      const next = g.words[plain(tok[k + 1] ?? '')];
      const tens = group % 100;
      const valid =
        next !== undefined &&
        (g.hundred ? tens === 0 && group + total > 0 : tens >= 30 && tens % 10 === 0 && next < 10);
      if (!valid) break;
      joined = true;
      k++;
      w = plain(tok[k]);
    }
    if (w === g.thousand) {
      if (thousands) break;
      total += (group || 1) * 1000;
      group = 0;
      thousands = true;
    } else if (w === g.hundred) {
      if (group < 1 || group > 9) break;
      group *= 100;
    } else {
      const v = g.words[w];
      const tens = group % 100;
      const fits =
        v !== undefined &&
        (v >= 100
          ? group === 0
          : v >= 10
            ? tens === 0
            : tens === 0 || joined || (!!g.hundred && tens >= 20 && tens % 10 === 0));
      if (!fits) break;
      group += v;
    }
    end = ++k;
  }
  return end > i ? { value: total + group, end, words: true } : null;
}

/** A number (digits or words) starting at token `i`. */
function readNumber(tok: string[], i: number, g: Grammar): Read | null {
  if (/^\d+$/.test(tok[i] ?? '')) {
    const thousand = plain(tok[i + 1] ?? '') === g.thousand;
    return {
      value: Number(tok[i]) * (thousand ? 1000 : 1),
      end: i + (thousand ? 2 : 1),
      words: false,
    };
  }
  return tok[i] === undefined ? null : readWords(tok, i, g);
}

interface Spoken {
  start: number;
  end: number;
  value: number;
  /** With a currency, cents or «con»: surely an amount. */
  explicit: boolean;
}

/** The amount said at token `i`, if any: «nueve euros con ochenta», «50 céntimos», «9 con 80». */
function readAmount(tok: string[], i: number, g: Grammar): Spoken | null {
  const num = readNumber(tok, i, g);
  if (!num) return null;
  const at = num.end;
  const currency = isCurrency(tok[at]);
  // «un», «una» and «a» are articles unless they are followed by «euro».
  if (num.words && isOne(num.value, num.end, i) && !currency) return null;
  const cents = (from: number): Read | null => {
    const read = readNumber(tok, from, g);
    return read && read.value < 100 ? read : null;
  };
  if (currency) {
    const linked = g.link.includes(tok[at + 1]);
    const c = cents(at + 1 + (linked ? 1 : 0));
    const after = c ? tok[c.end] : undefined;
    // «un euro cincuenta»: the cents may come without a link when the phrase goes on or ends.
    if (c && (linked || after === undefined || isCents(after) || g.edge.includes(after))) {
      const end = c.end + (isCents(after) ? 1 : 0);
      return { start: i, end, value: num.value + c.value / 100, explicit: true };
    }
    return { start: i, end: at + 1, value: num.value, explicit: true };
  }
  if (isCents(tok[at])) {
    return { start: i, end: at + 1, value: num.value / 100, explicit: true };
  }
  const c = g.bare && tok[at] === g.bare ? cents(at + 1) : null;
  if (c) {
    const end = c.end + (isCurrency(tok[c.end]) || isCents(tok[c.end]) ? 1 : 0);
    return { start: i, end, value: num.value + c.value / 100, explicit: true };
  }
  return { start: i, end: at, value: num.value, explicit: false };
}

const euros = (value: number): string => {
  const cents = Math.round(value * 100);
  const rest = cents % 100;
  return `${Math.floor(cents / 100)}${rest ? `,${String(rest).padStart(2, '0')}` : ''} €`;
};

/** Spoken amounts written as «9,80 €», and the little word that linked them to the concept out. */
function writeAmount(text: string, g: Grammar): string {
  const tok = text.split(' ');
  const found: Spoken[] = [];
  for (let i = 0; i < tok.length; i++) {
    const spoken = readAmount(tok, i, g);
    if (spoken) {
      found.push(spoken);
      i = spoken.end - 1;
    }
  }
  const explicit = found.filter((s) => s.explicit);
  // Without euros or cents, a number in words is the amount only when no digits were said.
  const chosen = explicit.length
    ? explicit[explicit.length - 1]
    : /\d/.test(text)
      ? undefined
      : found.filter((s) => readNumber(tok, s.start, g)?.words).pop();
  if (!chosen) return text;
  const start = g.edge.includes(tok[chosen.start - 1]) ? chosen.start - 1 : chosen.start;
  return [...tok.slice(0, start), euros(chosen.value), ...tok.slice(chosen.end)].join(' ');
}

/** The amount as the person would type it: «0,50», «9,80», «1200». */
const typed = (amount: number): string => {
  const cents = Math.round(amount * 100);
  const rest = cents % 100;
  return `${Math.floor(cents / 100)}${rest ? `,${String(rest).padStart(2, '0')}` : ''}`;
};

/** The entry as a typed line («Café 0,50», «Nómina +1200»), to show it in the field and correct it. */
export function quickEntryText(entry: QuickEntry): string {
  return `${entry.description} ${entry.type === 'INCOME' ? '+' : ''}${typed(entry.amount)}`;
}

/**
 * What was said as an entry; null when no amount (or nothing to note) can be understood. An
 * expense unless an income phrase is said («he cobrado», «me han ingresado», «ingreso de»).
 */
export function parseVoiceEntry(speech: string, lang: VoiceLang): QuickEntry | null {
  const g = GRAMMAR[lang];
  let text = speech
    .toLowerCase()
    .replace(/^[¡¿\s]+|[.!?\s]+$/g, '')
    .replace(/(\p{L}),(?=\s|$)/gu, '$1')
    .replace(/(\d)\s*([€$])/g, '$1 $2')
    .replace(/(\p{L})-(?=\p{L})/gu, '$1 ')
    .replace(/\s+/g, ' ');
  const said = g.income.exec(text);
  if (said) text = `${text.slice(0, said.index)} ${text.slice(said.index + said[0].length)}`.trim();
  for (let before = ''; before !== text;) {
    before = text;
    text = text.replace(g.filler, '').trim();
  }
  text = writeAmount(text.replace(/\s+/g, ' '), g);
  const income = !!said;
  const kind = income ? g.fallback.income : g.fallback.expense;
  const entry = parseQuickEntry(text) ?? parseQuickEntry(`${kind} ${text}`);
  if (!entry) return null;
  const words = entry.description.split(' ');
  while (words.length && g.edge.includes(plain(words[0]).toLowerCase())) words.shift();
  while (words.length && g.edge.includes(plain(words[words.length - 1]).toLowerCase())) words.pop();
  const description = words.join(' ') || kind;
  return {
    description: description.charAt(0).toUpperCase() + description.slice(1),
    amount: entry.amount,
    type: income || entry.type === 'INCOME' ? 'INCOME' : 'EXPENSE',
  };
}
