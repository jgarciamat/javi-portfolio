import {
  appliedDeductions,
  boxesOf,
  isRelevant,
  mentionedIn,
  missingDeductions,
  normalize,
  parseAmount,
  readDraft,
} from '@modules/tools/domain/rentaDraft';
import type { Deduction } from '@modules/tools/domain/rentaData';
import { computeRenta } from '@modules/tools/domain/rentaCalc';
import { emptyForm, toInput } from '@modules/tools/domain/rentaForm';
import { workReductionOf } from '@modules/tools/domain/rentaWork';
import { CCAA_OPTIONS, loadCcaa } from '@modules/tools/data/renta';
import { rentaWorkExtras } from '@modules/tools/data/renta/estado-extra';
import { rentaProperty } from '@modules/tools/data/renta/inmuebles';
import { rentaState } from '@modules/tools/data/renta/state';

const d = (id: string, title: string, group: Deduction['group'] = 'other'): Deduction => ({
  id,
  group,
  title,
  summary: 's',
  kind: 'fixed',
  amount: 100,
  requirements: 'r',
  url: 'u',
});
const situation = { childAges: [], ascendants: 0, disability: false, rents: false };

/** The layout of the official PDF: label, value, box number. */
export const SAMPLE = `Fecha de nacimiento   20/06/1994   0010
  Comunitat Valenciana
  Retribuciones dinerarias   30.774,34   0003
  Total ingresos íntegros computables [(03)+(07)]   30.868,54   0012
  Cotizac. Seguridad Social, Mutualidad   2.032,02   0013
  Fecha de nacimiento   12/03/2023   0077
  Fecha de nacimiento   05/01/2015   0077
  Fecha de nacimiento   01/01/1940   0092
  Base imponible del ahorro   2.982,60   0460
  Deducciones autonómicas de la Comunitat Valenciana
  Por cantidades satisfechas en gastos asociados a la práctica del deporte y actividades saludables   41,70   1960
  Suma de deducciones autonómicas   41,70   0564
  Total pagos a cuenta   5.167,32   0609`;

describe('reading a draft', () => {
  it('reads Spanish amounts', () => {
    expect(parseAmount('1.234,56')).toBe(1234.56);
  });

  it('pairs each value with the box that follows it', () => {
    expect(boxesOf('a 1.234,56 0003 b 12/03/2023 0077 c 5 0001')).toEqual({
      '0003': ['1.234,56'],
      '0077': ['12/03/2023'],
    });
  });

  it('reads the figures, the community, the age and the family from the official layout', () => {
    const r = readDraft(SAMPLE, {
      year: 2025,
      communities: [{ id: 'comunitat-valenciana', name: 'Comunitat Valenciana' }],
    });
    expect(r).toMatchObject({
      ccaaId: 'comunitat-valenciana',
      gross: 30868.54,
      socialSecurity: 2032.02,
      withheld: 5167.32,
      savings: 2982.6,
      childAges: [2, 10],
      ascendantAges: [85],
      age: 31,
      ownsHome: false,
    });
    expect(r.applied).toEqual([
      {
        label:
          'Por cantidades satisfechas en gastos asociados a la práctica del deporte y actividades saludables',
        amount: 41.7,
      },
    ]);
  });

  it('reads pension plan and rent by their label, and the main home', () => {
    const r = readDraft(
      'Reducción por aportaciones y contribuciones 1.500,00 0492 Ingresos íntegros computables 9.000,00 0100 Vivienda habitual en 2025 X',
      { year: 2025, communities: [] }
    );
    expect(r).toMatchObject({ pension: 1500, rentalIncome: 9000, ownsHome: true });
  });

  it('leaves unknown things empty', () => {
    const r = readDraft('nada de nada', { year: 2025, communities: [] });
    expect(r).toMatchObject({
      gross: null,
      ccaaId: null,
      age: null,
      childAges: [],
      ascendantAges: [],
      applied: [],
      pension: null,
    });
    expect(
      readDraft('Retribuciones dinerarias 0003', { year: 2025, communities: [] }).gross
    ).toBeNull();
    expect(
      readDraft('ingresos íntegros computables', { year: 2025, communities: [] }).rentalIncome
    ).toBeNull();
    expect(appliedDeductions('deducciones autonomicas de x sin cierre')).toEqual([]);
    expect(appliedDeductions('sin deducciones')).toEqual([]);
    expect(normalize('Áé  Z')).toBe('ae z');
    expect(normalize('Áé  Z')).toBe('ae z');
  });

  it('knows which deductions the draft already applies', () => {
    const list = [
      d('a', 'Por deporte y actividades saludables'),
      d('b', 'Cuidado de ascendientes'),
      d('c', 'Corto'),
    ];
    const applied = [
      {
        label:
          'Por cantidades satisfechas en gastos de la práctica del deporte y actividades saludables',
      },
    ];
    expect(mentionedIn(applied, list)).toEqual(['a']);
  });
});

describe('what to ask', () => {
  it('asks about the deductions that fit the situation', () => {
    const kids = { ...situation, childAges: [1, 8] };
    expect(isRelevant(d('x', 'Familia numerosa'), kids)).toBe(true);
    expect(isRelevant(d('x', 'Familia numerosa'), situation)).toBe(false);
    expect(isRelevant(d('x', 'Por maternidad'), kids)).toBe(true);
    expect(isRelevant(d('x', 'Por maternidad'), { ...situation, childAges: [9] })).toBe(false);
    expect(isRelevant(d('x', 'Por nacimiento o adopción'), kids)).toBe(true);
    expect(isRelevant(d('x', 'Por nacimiento o adopción'), { ...situation, childAges: [5] })).toBe(
      false
    );
    expect(isRelevant(d('x', 'Gastos de hijos'), kids)).toBe(true);
    expect(isRelevant(d('x', 'Gastos de hijos'), situation)).toBe(false);
    expect(isRelevant(d('x', 'Ascendientes mayores'), { ...situation, ascendants: 1 })).toBe(true);
    expect(isRelevant(d('x', 'Ascendientes mayores'), situation)).toBe(false);
    expect(isRelevant(d('x', 'Con discapacidad'), { ...situation, disability: true })).toBe(true);
    expect(isRelevant(d('x', 'Con discapacidad'), situation)).toBe(false);
    expect(isRelevant(d('x', 'Alquiler de vivienda'), { ...situation, rents: true })).toBe(true);
    expect(isRelevant(d('x', 'Alquiler de vivienda'), situation)).toBe(false);
    expect(isRelevant(d('x', 'Dentista', 'health'), situation)).toBe(true);
    expect(isRelevant(d('x', 'Otra cosa', 'other'), situation)).toBe(false);
  });

  it('asks about a large family only with two children or more, a single-parent one with one', () => {
    // Ley 40/2003, art. 2: three children in general, two in the special cases; never one.
    const one = { ...situation, childAges: [6] };
    const two = { ...situation, childAges: [6, 9] };
    expect(isRelevant(d('x', 'Por familia numerosa de categoría general'), one)).toBe(false);
    expect(isRelevant(d('x', 'Por familia numerosa de categoría general'), two)).toBe(true);
    expect(isRelevant(d('x', 'Por separado o sin matrimonio con dos hijos'), one)).toBe(false);
    expect(isRelevant(d('x', 'Por separado o sin matrimonio con dos hijos'), two)).toBe(true);
    expect(isRelevant(d('x', 'Para familias monoparentales'), one)).toBe(true);
    expect(isRelevant(d('x', 'Para familias monoparentales'), situation)).toBe(false);
    // «Familia numerosa o monoparental» (Comunitat Valenciana): the single-parent part fits one child.
    expect(isRelevant(d('x', 'Por familia numerosa o monoparental'), one)).toBe(true);
  });

  it('leaves out the ones the draft already has', () => {
    const list = [d('a', 'Dentista', 'health'), d('b', 'Gafas', 'health')];
    expect(missingDeductions(list, ['a'], situation).map((x) => x.id)).toEqual(['b']);
  });
});

describe('a real draft (2025, Comunitat Valenciana)', () => {
  // Boxes of an official PDF, the way it is printed, with the identifying data left out.
  const REAL = `Fecha de nacimiento 20/06/1994 0010 COMUNITAT VALENCIANA 0070
    Retribuciones dinerarias 30.774,34 0003 Valoración retribución en especie 94,20 0004
    Total ingresos íntegros computables [(03)+(07)+(08)+(24)+(09)+(10)-(11)-(58)] 30.868,54 0012
    Cotizac. Seguridad Social, Mutualidad Funcionarios, detracciones derechos pasivos y Coleg. Huérfanos 2.032,02 0013
    Otros gastos deducibles 2.000,00 0019 Rendimiento neto reducido 26.836,52 0025
    Intereses de cuentas, depósitos y de activos financieros en general 0,96 0027
    Vivienda habitual en 2025 X 0070
    Saldo neto positivo de ganan./pérd. patrimoniales 2.981,64 0424
    Base imponible del ahorro 2.982,60 0460
    Deducciones autonómicas de la Comunitat Valenciana
    Por cantidades satisfechas en gastos asociados a la práctica del deporte y actividades saludables 41,70 1960
    Suma de deducciones autonómicas 41,70 0564
    Por rendimientos del trabajo 5.167,14 0596 Por rendimientos del capital mobiliario 0,18 0597
    Total pagos a cuenta 5.167,32 0609 Resultado de la declaración 394,69 0670`;

  it('is read, and the calculator gives the same result as the Tax Agency', async () => {
    const reading = readDraft(REAL, { year: 2025, communities: CCAA_OPTIONS });
    expect(reading).toMatchObject({
      ccaaId: 'comunitat-valenciana',
      gross: 30868.54,
      socialSecurity: 2032.02,
      withheld: 5167.32,
      savings: 2982.6,
      age: 31,
      ownsHome: true,
      childAges: [],
    });

    const ccaa = await loadCcaa('comunitat-valenciana');
    const all = [...rentaState.deductions, ...ccaa.deductions];
    const mentioned = mentionedIn(reading.applied, all);
    expect(mentioned).toEqual(['comunitat-valenciana-practica-deporte']);
    const missing = missingDeductions(all, mentioned, {
      childAges: [],
      ascendants: 0,
      disability: false,
      rents: false,
    }).map((x) => x.title);
    expect(missing).toEqual(
      expect.arrayContaining(['Dentista y salud bucodental', 'Gafas y lentillas'])
    );
    expect(missing).not.toContain('Por deporte y actividades saludables');

    const form = {
      ...emptyForm(String(reading.gross)),
      ccaaId: 'comunitat-valenciana',
      age: String(reading.age),
      socialSecurity: String(reading.socialSecurity),
      withheld: String(reading.withheld),
      savings: String(reading.savings),
      choices: {
        'comunitat-valenciana-practica-deporte': {
          on: true,
          amount: '139.01',
          units: '',
          // Its requirements, answered: gym or club fees, with an invoice and paid by card.
          checks: { deporte: 'yes' as const, factura: 'yes' as const },
        },
      },
    };
    const result = computeRenta(
      toInput(form, {
        state: rentaState,
        ccaa,
        extras: rentaWorkExtras,
        property: rentaProperty,
        workReduction: workReductionOf(rentaState),
      })
    );
    // Figures printed in the draft.
    expect(result).toMatchObject({
      taxBase: 26836.52,
      savingsBase: 2982.6,
      stateQuota: 2864.33,
      regionalQuota: 2739.38,
      regionalDeductions: 41.7,
      netQuota: 5562.01,
      result: 394.69,
    });
  });
});
