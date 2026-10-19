import { boxAmounts, disabilityIn, normalize, readDraft } from '@modules/tools/domain/rentaDraft';

/** The lines of a draft as the PDF prints them (round, made-up amounts). */
const LINES = [
  'Modelo 100   Ejercicio 2025',
  'Fecha de nacimiento   15/03/1960   0010',
  'Grado de discapacidad   (1) Igual o superior al 33 % e inferior al 65 %   0011',
  'Retribuciones dinerarias   18.000,00   0003',
  'Total ingresos íntegros computables [(03)+(07)+(08)-(11)]   18.000,00   0012',
  'Porcentaje de propiedad.   50,00   0063',
  'Nº de días a disposición del contribuyente.   365   0085',
  'Valor catastral del inmueble   2.000,00   0083',
  'Renta inmobiliaria imputada.   40,00   0089',
  'Nº de días a disposición del contribuyente.   183   0085',
  'Valor catastral del inmueble   10.000,00   0083',
  'Renta inmobiliaria imputada.   55,00   0089',
  'Valor catastral del inmueble   3.000,00   0083',
  'Base imponible general [(420)-(431)]   11.000,00   0435',
  'Base imponible general [(420)-(431)]   99,00   0435',
  'Cuota diferencial [(595)-(609)]   -900,00   0610',
];

describe('reading the boxes of a draft', () => {
  it('takes every amount followed by its box, refunds with their sign', () => {
    const boxes = boxAmounts(LINES);
    expect(boxes['0003']).toEqual([18000]);
    expect(boxes['0435']).toEqual([11000, 99]);
    expect(boxes['0610']).toEqual([-900]);
    // Days and dates have no cents: they are not amounts.
    expect(boxes['0085']).toBeUndefined();
    expect(boxes['0010']).toBeUndefined();
    expect(boxAmounts(['Retribuciones 1.000,00 0003 Cotizaciones 63,50 0013'])).toEqual({
      '0003': [1000],
      '0013': [63.5],
    });
  });

  it('keeps the first amount of each box, the year and the properties at the owner’s disposal', () => {
    const r = readDraft(LINES.join('\n'), { year: 2025, communities: [], lines: LINES });
    expect(r.boxes['0435']).toBe(11000);
    expect(r.exercise).toBe(2025);
    expect(r.disability).toBe(33);
    expect(r.age).toBe(65);
    // 40 of 2,000 is 2 % (not revised); 55 of 10,000 is 0.55 % (revised, half the year);
    // the last one has no imputed income: it is not at the owner's disposal.
    expect(r.unrented).toEqual([
      { value: 2000, revised: false, months: 12 },
      { value: 10000, revised: true, months: 6 },
    ]);
  });

  it('reads the lines of pasted text, and knows when a draft says nothing', () => {
    const r = readDraft('Retribuciones dinerarias 1.000,00 0003\nCuota diferencial 5,00 0610', {
      year: 2025,
      communities: [],
    });
    expect(r.boxes).toEqual({ '0003': 1000, '0610': 5 });
    expect(r.exercise).toBeNull();
    expect(r.disability).toBeNull();
    expect(r.unrented).toEqual([]);
    // Without the days, the whole year.
    const year = readDraft('Valor catastral 1.000,00 0083\nRenta imputada 20,00 0089', {
      year: 2025,
      communities: [],
    });
    expect(year.unrented).toEqual([{ value: 1000, revised: false, months: 12 }]);
  });

  it('reads the degree of disability from its words', () => {
    const of = (text: string) => disabilityIn(normalize(text));
    expect(of('Grado de discapacidad (3) Igual o superior al 65 % 0011')).toBe(65);
    expect(of('Grado de discapacidad (1) Igual o superior al 33 % e inferior al 65 % 0011')).toBe(
      33
    );
    expect(of('Grado de discapacidad Sin discapacidad 0011 Igual o superior al 65 %')).toBe(0);
    expect(of('Grado de discapacidad (1) igual o superior al 33 %')).toBe(33);
    expect(of('Sin datos')).toBeNull();
  });
});
