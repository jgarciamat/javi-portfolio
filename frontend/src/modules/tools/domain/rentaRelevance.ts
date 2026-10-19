import type { Disability } from './rentaCalc';
import type { Deduction } from './rentaData';

/**
 * What is known about the person to tell which deductions could apply. `null` (or a missing field)
 * means "not asked": the deduction is still worth asking about, so none is forgotten.
 */
export interface DraftSituation {
  childAges: number[];
  ascendants: number;
  /** Any disability in the family. */
  disability: boolean;
  /** The person rents the home they live in. */
  rents: boolean | null;
  /** The person's age on 31 December. */
  age?: number | null;
  /** The person's own degree of disability. */
  ownDisability?: Disability;
  childDisability?: boolean;
  ascendantDisability?: boolean;
  ascendantOver75?: boolean;
  /** Spouse with a disability (known only for a joint return with them). */
  spouseDisability?: boolean | null;
  /** Pays the mortgage of a home bought before 2013 (the transitional regime). */
  mortgage?: boolean | null;
  /** Rents out a property, or has one at their disposal that could be rented. */
  landlord?: boolean;
  /** Has pay from a job (not only a pension or benefits). */
  works?: boolean | null;
  /** Gross pay of the year. */
  gross?: number;
  /** Lives in a family unit with the children only (no spouse). */
  singleParent?: boolean | null;
  /** Gets unemployment or other benefits. */
  benefits?: boolean | null;
  ccaaId?: string;
}

/** Lower case, without accents and with single spaces. */
export const normalize = (text: string) =>
  text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ');

/** Anything that tells whether a text matches: a regular expression, or a function. */
type Matcher = { test: (text: string) => boolean };
type Rule = [Matcher, (s: DraftSituation, text: string) => boolean];

/** Not asked (null or missing) counts as "it could be". */
const maybe = (known: boolean | null | undefined) => known !== false;
const kids = (s: DraftSituation) => s.childAges.length;
const childUnder = (s: DraftSituation, age: number) => s.childAges.some((a) => a < age);
/** Age rules with the age not given pass: the age is always asked, but a draft may not have it. */
const ageFrom = (s: DraftSituation, min: number) => s.age == null || s.age >= min;
const ageBelow = (s: DraftSituation, max: number) => s.age == null || s.age < max;
const own = (s: DraftSituation, min: number) =>
  s.ownDisability === undefined ? s.disability : s.ownDisability >= min;
const childDisability = (s: DraftSituation) => s.childDisability ?? s.disability;
const ascendantDisability = (s: DraftSituation) => s.ascendantDisability ?? s.disability;
const familyDisability = (s: DraftSituation) => childDisability(s) || ascendantDisability(s);
const works = (s: DraftSituation) => maybe(s.works);
/** Not a pure renter: an owner can do works or have a mortgage. */
const owner = (s: DraftSituation) => s.mortgage === true || s.rents !== true;

/**
 * Situations the app does not ask about (where the person lives inside the community, being a
 * widow, fostering, an illness, a disaster, investing...): those deductions are not suggested,
 * the full list below still has them.
 */
const UNASKED =
  /terroris|violencia|\bela\b|esclerosis|celiac|talidomida|viud|dacion|ocupada|desahucio|\bdana\b|incendio|emergencia|la-palma|doble-imposicion|actividades-economicas|covid|erte|deportistas|nuevos-contribuyentes|nuevos residentes|traslad|despobla|riesgo|rural|pueblos|pequeno|municipios|concejos|aldeas|isla|autoocupacion|autonomo|autoempleo|agrari|forestal|pagador|dificil cobertura|-ue\b|acogimiento[ -](familiar|de menores|menores|no|sin|mayores)|acoger|accidente laboral|centros historicos|interes cultural/;

/** The age a deduction for children is for: "menores de 3 años", "hasta 14 años", "0-3". */
function childAgeLimit(text: string): number {
  const under = /menores?[ -]de[ -](\d{1,2})\b/.exec(text);
  if (under) return Number(under[1]);
  const upTo = /hasta[ -](\d{1,2})\b/.exec(text);
  if (upTo) return Number(upTo[1]) + 1;
  if (/maternidad|guarder|custodia|escuela|infantil|0-3|0 a 3/.test(text)) return 3;
  if (/nacimiento|nacido|adopci|parto/.test(text)) return 2;
  return Infinity;
}

/** Ages of a young person ("menores de 36", "hasta 35 años", "jóvenes"), not of children. */
const YOUNG =
  /jovenes|menores?[ -]de[ -](?:1[89]|[2-9]\d)\b|hasta[ -](?:1[89]|[2-9]\d)[ -]anos|menores-(?:1[89]|[2-9]\d)\b/;

function youngEnough(s: DraftSituation, text: string): boolean {
  const under = /menores?[ -]de[ -](\d{2})|menores-(\d{2})/.exec(text);
  if (under) return ageBelow(s, Number(under[1] ?? under[2]));
  const upTo = /hasta[ -](\d{2})[ -]anos/.exec(text);
  return ageBelow(s, upTo ? Number(upTo[1]) + 1 : 36);
}

/** Words of a deduction about children (the ages of a young person are taken out first). */
export const CHILD_WORDS =
  /hij|nacimiento|nacido|adopci|guarder|maternidad|descend|menor|nino|escolar|libros|educati|educacion|estudios|idiomas|extraescolar|clases|conciliaci|parto|custodia|escuela|infantil|0-3|numerosa|monoparental/;

const YOUNG_ALL = new RegExp(YOUNG.source, 'g');
const isChildText = (text: string) => CHILD_WORDS.test(text.replace(YOUNG_ALL, ' '));

/** "Mayores de 70": the person's own age. */
const ELDER = /mayor(?:es)?[ -](?:de[ -])?([6-9]\d)\b/;

/** Who a deduction is for: the first rule that matches decides. */
const PERSON: Rule[] = [
  // «Familia numerosa o monoparental» (Comunitat Valenciana): either part.
  [/numerosa o monoparental/, (s) => kids(s) >= 2 || (kids(s) > 0 && maybe(s.singleParent))],
  [/(nacimiento|nacido|adopci).*discapacid/, (s) => childUnder(s, 2) && childDisability(s)],
  [/tercer/, (s) => kids(s) >= 3 && childUnder(s, 2)],
  [/multiples/, (s) => s.childAges.filter((a) => a < 2).length >= 2],
  // A large family (Ley 40/2003, art. 2) has at least two children (three in general, two in the
  // special cases), as does the separated parent with two.
  [/numerosa|dos hijos|dos-hijos|dos o mas|dos-o-mas|dos-descendientes/, (s) => kids(s) >= 2],
  [/monoparental/, (s) => kids(s) > 0 && maybe(s.singleParent)],
  [/(hij|descend|menores).*discapacid|discapacid.*(hij|descend)/, (s) => childDisability(s)],
  [{ test: isChildText }, (s, text) => childUnder(s, childAgeLimit(text))],
  // A draft does not say whether there is a spouse: the family's disability tells.
  [/conyuge/, (s) => (s.spouseDisability === undefined ? s.disability : maybe(s.spouseDisability))],
  [/ascend.*discapacid|discapacid.*ascend|padre o madre con discapacidad/, ascendantDisability],
  [/ascend.*75|75.*ascend/, (s) => s.ascendantOver75 ?? s.ascendants > 0],
  [/ascend|padre o madre/, (s) => s.ascendants > 0],
  [
    /(contribuyente|declarante).*discapacid|discapacid.*(contribuyente|declarante)/,
    (s) => own(s, 33),
  ],
  [/discapacid/, (s) => s.disability],
  [ELDER, (s, text) => ageFrom(s, Number((ELDER.exec(text) as RegExpExecArray)[1]))],
  [YOUNG, youngEnough],
  [/desemplead/, (s) => maybe(s.benefits)],
  [/trabaj|laboral/, works],
  // Expenses anyone can have, like health: always worth a question.
  [/deporte|ejercicio|veterinari|mascotas|internet|enfermedad|abonos/, () => true],
];

/** What a deduction asks of the home: being a landlord, a tenant or an owner. */
const HOME: Rule[] = [
  [
    /arrendador|propietarios|puesta|vacias|vacio|alquilarla|seguros|impago|gastos-arrendamiento|alquiladas|vivienda social|asequible/,
    (s) => s.landlord ?? true,
  ],
  [/alquiler|arrendamiento|arrendatario/, (s) => maybe(s.rents)],
  [/transitori|tramo-autonomico|regimen antiguo|antes de 2013/, (s) => maybe(s.mortgage)],
  // Any mortgage of the home (also after 2013, which the app does not ask about).
  [
    /hipoteca|intereses-prestamos-vivienda|costes-financiacion|intereses-vivienda|intereses-primera/,
    owner,
  ],
  [
    /eficiencia|rehabilitaci|obras|sostenibilidad|renovable|autoconsumo|ahorro-agua|climatizacion/,
    owner,
  ],
];

/** Deductions whose conditions are in the requirements, not in the title (by id). */
const BY_ID: Record<string, (s: DraftSituation) => boolean> = {
  'estado-ceuta-melilla': (s) => s.ccaaId === undefined || ['ceuta', 'melilla'].includes(s.ccaaId),
  'estado-ascendiente-separado-dos-hijos': (s) => kids(s) >= 2 && maybe(s.singleParent),
  'castilla-y-leon-familia-numerosa-discapacidad': (s) => kids(s) >= 2 && s.disability,
  'baleares-discapacidad-contribuyente-descendientes': (s) => s.disability,
  'castilla-la-mancha-discapacidad-ascendientes-descendientes': familyDisability,
  'aragon-cuidado-dependientes': (s) => !!s.ascendantOver75 || familyDisability(s),
  'cantabria-cuidado-familiares': (s) =>
    childUnder(s, 3) || s.ascendants > 0 || familyDisability(s),
  'canarias-familiares-dependientes-discapacidad': familyDisability,
  'extremadura-cuidado-familiares-discapacidad': familyDisability,
  'madrid-cuidado-hijos-dependientes-discapacidad': (s) =>
    childUnder(s, 3) || s.ascendants > 0 || s.disability,
  'baleares-gastos-mayores-discapacidad': (s) => s.ascendants > 0 || s.disability || ageFrom(s, 65),
  'comunitat-valenciana-ascendientes-mayores': (s) => !!s.ascendantOver75 || ascendantDisability(s),
  'comunitat-valenciana-empleados-hogar-indefinido': (s) =>
    works(s) && (childUnder(s, 5) || s.ascendants > 0),
  'comunitat-valenciana-conciliacion': (s) => works(s) && s.childAges.some((a) => a >= 3 && a < 5),
  'murcia-conciliacion': (s) => works(s) && (childUnder(s, 12) || s.ascendants > 0),
  'murcia-mujeres-trabajadoras': (s) => works(s) && (childUnder(s, 18) || s.ascendants > 0),
  'murcia-cristales-lentes': (s) => childUnder(s, 12),
  'murcia-internet': () => false,
  'castilla-y-leon-cuotas-seguridad-social-hogar': (s) => childUnder(s, 4),
  'extremadura-cuidado-hijos-hasta-14': (s) => works(s) && childUnder(s, 15),
  'canarias-empleados-hogar': (s) =>
    (kids(s) > 0 && works(s)) || ageFrom(s, 75) || (ageFrom(s, 65) && own(s, 33)),
  'andalucia-ayuda-domestica': (s) => (kids(s) > 0 && works(s)) || ageFrom(s, 75),
  'cantabria-ayuda-domestica': (s) => (kids(s) > 0 && works(s)) || ageFrom(s, 75),
  'canarias-discapacidad-mayores-65': (s) => own(s, 33) || ageFrom(s, 65),
  'castilla-y-leon-discapacidad-contribuyente-mayor-65': (s) => ageFrom(s, 65) && own(s, 65),
  'comunitat-valenciana-contribuyentes-discapacidad-65': (s) => ageFrom(s, 65) && own(s, 33),
  'galicia-discapacidad-65-ayuda-terceros': (s) => ageFrom(s, 65) && own(s, 65),
  'extremadura-trabajo-dependiente': (s) => works(s) && (s.gross ?? 0) <= 12000,
  'murcia-vivienda-jovenes': (s) => ageBelow(s, 41),
  'extremadura-vivienda-jovenes-victimas-terrorismo': (s) => ageBelow(s, 36),
  'castilla-la-mancha-perros-asistencia': (s) => s.disability,
  'canarias-inversion-vivienda-habitual': (s) => maybe(s.mortgage),
  'andalucia-vivienda-protegida-jovenes': (s) => maybe(s.mortgage),
  // The rent of the home, for the profiles each community names in its requirements.
  'andalucia-alquiler-vivienda-habitual': (s) =>
    maybe(s.rents) && (ageBelow(s, 35) || ageFrom(s, 66) || own(s, 33)),
  'baleares-alquiler-vivienda-habitual': (s) =>
    maybe(s.rents) && (ageBelow(s, 36) || ageFrom(s, 66) || own(s, 33) || kids(s) > 0),
  'cantabria-alquiler-vivienda-habitual': (s) =>
    maybe(s.rents) && (ageBelow(s, 36) || ageFrom(s, 65) || own(s, 65)),
  'cataluna-alquiler-vivienda-habitual': (s) =>
    maybe(s.rents) &&
    (ageBelow(s, 36) || ageFrom(s, 65) || own(s, 65) || kids(s) > 0 || !!s.benefits),
  'extremadura-alquiler-vivienda-habitual': (s) =>
    maybe(s.rents) && (ageBelow(s, 36) || kids(s) >= 2 || own(s, 65)),
  'galicia-alquiler-vivienda-habitual': (s) => maybe(s.rents) && ageBelow(s, 36),
  'madrid-arrendamiento-vivienda-habitual': (s) => maybe(s.rents) && ageBelow(s, 40),
  'murcia-arrendamiento-vivienda-habitual': (s) =>
    maybe(s.rents) && (ageBelow(s, 41) || kids(s) >= 2 || own(s, 65)),
};

/** Groups worth asking about whatever the situation. */
const ALWAYS: Deduction['group'][] = ['housing', 'health', 'education', 'donations'];

/** Whether a deduction is worth asking about, given the person's situation. */
export function isRelevant(d: Deduction, s: DraftSituation): boolean {
  // Donations are about who receives them ("a foundation for disability"), never about the person.
  if (d.group === 'donations') return true;
  const special = BY_ID[d.id];
  if (special) return special(s);
  const text = normalize(`${d.id} ${d.title}`);
  if (UNASKED.test(text)) return false;
  const person = PERSON.find(([words]) => words.test(text));
  const home = HOME.find(([words]) => words.test(text));
  if (!person && !home) return ALWAYS.includes(d.group);
  return (!person || person[1](s, text)) && (!home || home[1](s, text));
}

/** The ids with their own rule: a test checks that each one still exists in the data. */
export const SPECIAL_IDS = Object.keys(BY_ID);
