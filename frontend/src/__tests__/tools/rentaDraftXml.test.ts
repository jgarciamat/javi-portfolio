import {
  CCAA_CODES,
  NotADraftXml,
  declaredEncoding,
  isDraftXml,
  readDraftXml,
  sumBoxes,
  xmlExercise,
  type XmlMap,
} from '@modules/tools/domain/rentaDraftXml';
import { applyReading, withDraftDeductions } from '@modules/tools/domain/rentaDraftApply';
import { computeRenta } from '@modules/tools/domain/rentaCalc';
import { emptyForm, toInput } from '@modules/tools/domain/rentaForm';
import { workReductionOf } from '@modules/tools/domain/rentaWork';
import { CCAA_OPTIONS, loadCcaa } from '@modules/tools/data/renta';
import { rentaWorkExtras } from '@modules/tools/data/renta/estado-extra';
import { rentaProperty } from '@modules/tools/data/renta/inmuebles';
import { rentaState } from '@modules/tools/data/renta/state';
import map2025 from '@modules/tools/data/renta/xml/casillas-2025.json';
import map2024 from '@modules/tools/data/renta/xml/casillas-2024.json';
import { FAKE, VALENCIA, draftXml, person, work } from '@test-utils/draftXml';

const MAP: XmlMap = { exercise: 2025, boxes: map2025.casillas as unknown as XmlMap['boxes'] };
const MAP24: XmlMap = { exercise: 2024, boxes: map2024.casillas as unknown as XmlMap['boxes'] };
const read = (xml: string, map = MAP, year = 2025) => readDraftXml(xml, { year, map });

describe('the Agency file of the modelo 100', () => {
  it('is told apart by its root, with its exercise and encoding', () => {
    expect(isDraftXml(VALENCIA)).toBe(true);
    expect(isDraftXml('<Declaracion modelo="303" ejercicio="2025">')).toBe(false);
    expect(isDraftXml('Modelo 100 Ejercicio 2025')).toBe(false);
    expect(xmlExercise(draftXml({ exercise: 2023 }))).toBe(2023);
    expect(xmlExercise('<Declaracion modelo="100">')).toBeNull();
    expect(xmlExercise('nada')).toBeNull();
    expect(declaredEncoding('<?xml version="1.0" encoding="ISO-8859-1"?>')).toBe('iso-8859-1');
    expect(declaredEncoding("<?xml version='1.0' encoding='UTF-8'?>")).toBe('utf-8');
    expect(declaredEncoding('<Declaracion/>')).toBe('utf-8');
  });

  it('lists the boxes of a sum, ranges included', () => {
    expect(sumBoxes('(suma de las casillas [0801] + [1083] a [1085] + [1959])')).toEqual([
      '0801',
      '1083',
      '1084',
      '1085',
      '1959',
    ]);
  });

  it('maps every community code of the schema to the app', () => {
    const ids = CCAA_OPTIONS.map((c) => c.id);
    expect(Object.values(CCAA_CODES).every((id) => ids.includes(id))).toBe(true);
    expect(Object.keys(CCAA_CODES)).toHaveLength(17);
  });

  it('reads the draft into the same reading as the PDF, and the planner gives its result', async () => {
    const r = read(VALENCIA);
    expect(r).toMatchObject({
      format: 'xml',
      ccaaId: 'comunitat-valenciana',
      gross: 30868.54,
      socialSecurity: 2032.02,
      withheld: 5167.32,
      savings: 2982.6,
      age: 31,
      ownsHome: true,
      exercise: 2025,
      joint: false,
      married: false,
      partner: null,
      mapExercise: 2025,
      disability: null,
      childAges: [],
      unrented: [],
    });
    expect(r.boxes).toMatchObject({
      '0003': 30774.34,
      '0004': 94.2,
      '0012': 30868.54,
      '0019': 2000,
      '0025': 26836.52,
      '0027': 0.96,
      '0312': 12981.64,
      '0424': 2981.64,
      '0460': 2982.6,
      '0564': 41.7,
      '0609': 5167.32,
      '0670': 394.69,
      '1960': 41.7,
    });
    expect(r.applied).toEqual([
      {
        label:
          'Por cantidades satisfechas en gastos asociados a la práctica del deporte y actividades saludables',
        amount: 41.7,
        box: '1960',
        bases: { 'comunitat-valenciana-practica-deporte': 139 },
      },
    ]);

    // The draft's deduction is marked with what was spent, and the planner gives the draft's result.
    const ccaa = await loadCcaa('comunitat-valenciana');
    const base = emptyForm('');
    const filled = { ...base, ...applyReading(base, r) };
    const { choices, marked } = withDraftDeductions(filled, r.applied, [
      ...rentaState.deductions,
      ...ccaa.deductions,
    ]);
    expect(marked).toEqual(['comunitat-valenciana-practica-deporte']);
    const result = computeRenta(
      toInput(
        { ...filled, choices },
        {
          state: rentaState,
          ccaa,
          extras: rentaWorkExtras,
          property: rentaProperty,
          workReduction: workReductionOf(rentaState),
        }
      )
    );
    expect(result).toMatchObject({ regionalDeductions: 41.7, result: 394.69 });
  });

  it('never returns the personal data it reads', () => {
    const r = read(
      draftXml({
        joint: true,
        marital: '2',
        people: [
          person('2', work(30000, 4000, 1900)),
          person('3', work(9000, 300, 570), '17', FAKE.spouseNif),
        ],
        family: `<Hijos><Hijo><NIFDLG>${FAKE.childNif}</NIFDLG><APENOMDLG>${FAKE.childName}</APENOMDLG><FNACDLG>12/03/2023</FNACDLG></Hijo></Hijos>`,
      })
    );
    const text = JSON.stringify(r);
    for (const secret of [
      FAKE.nif,
      FAKE.name,
      FAKE.born,
      FAKE.spouseNif,
      FAKE.spouseName,
      FAKE.spouseBorn,
      FAKE.childNif,
      FAKE.childName,
      FAKE.iban,
      FAKE.payerNif,
      '12/03/2023',
      'FICTICIA',
    ])
      expect(text).not.toContain(secret);
    expect(r.childAges).toEqual([2]);
  });

  it('reads a joint return: the spouse is the partner, with their own withholdings', () => {
    const r = read(
      draftXml({
        joint: true,
        marital: '2',
        people: [
          person('3', work(9000, 300, 570), '12', FAKE.spouseNif),
          person('2', work(30000, 4000, 1900, 2), '12'),
        ],
        ccaa: '12',
        results:
          '<Resultados><CalculoImpuestoRes><RetencionesRes><PAGOS>4300.00</PAGOS></RetencionesRes><RESULTADO>-250.00</RESULTADO></CalculoImpuestoRes></Resultados>',
      })
    );
    expect(r).toMatchObject({
      ccaaId: 'madrid',
      joint: true,
      married: true,
      gross: 30000,
      socialSecurity: 1900,
      withheld: 4000,
      partner: {
        gross: 9000,
        socialSecurity: 570,
        withheld: 300,
        age: 65,
        disability: 65,
        pension: null,
      },
    });
    expect(r.boxes['0670']).toBe(-250);
    // The planner gets the spouse and the joint return to compare.
    const form = applyReading(emptyForm(''), r);
    expect(form).toMatchObject({
      joint: 'couple',
      partner: expect.objectContaining({
        gross: '9000',
        withheld: '300',
        age: '65',
        disability: 65,
      }),
    });
  });

  it('reads a joint return whose spouse has no data of their own', () => {
    const r = read(
      draftXml({
        joint: true,
        people: [person('2', work(30000, 4000, 1900)), person('3', '', '17', FAKE.spouseNif)],
      })
    );
    expect(r.partner).toMatchObject({ gross: null, withheld: null });
    expect(r.withheld).toBe(2500);
    const blank = read(
      draftXml({ joint: true, people: [person('2', ''), person('3', '')] }).replace(
        /<DPFNAC_C>[^<]*<\/DPFNAC_C><DPGMIN_C>3<\/DPGMIN_C>/,
        ''
      )
    );
    expect(blank.partner).toMatchObject({ age: null, disability: null });
  });

  it('reads properties, rents, pension plans, the family and the disability', () => {
    const property = (value: string, imputed: string, days: string) =>
      `<Inmueble><PC>100.00</PC><DisposicionTitulares><USODISP>1</USODISP><C_VC>${value}</C_VC><C_DIAS>${days}</C_DIAS><C_RII>${imputed}</C_RII></DisposicionTitulares></Inmueble>`;
    const r = read(
      draftXml({
        ccaa: '01',
        disability: '<DPGMIN_D>1</DPGMIN_D>',
        family:
          '<Hijos><Hijo><FNACDLG>05/01/2015</FNACDLG></Hijo><Hijo><FNACDLG>roto</FNACDLG></Hijo><Hijo><APENOMDLG>SIN FECHA</APENOMDLG></Hijo></Hijos>' +
          '<Ascendientes><Ascendiente><ANOASDLG>01/01/1940</ANOASDLG><PCTMINASDLG>3</PCTMINASDLG></Ascendiente></Ascendientes>',
        people: [
          person(
            '2',
            work(25000, 3000, 1600) +
              `<Inmuebles>${property('50000.00', '550.00', '365')}${property(
                '40000.00',
                '800.00',
                '100'
              )}${property('0.00', '0.00', '365')}` +
              '<Inmueble><InmuebleArrendado><USOARR>1</USOARR></InmuebleArrendado><C_IIC>6000.00</C_IIC></Inmueble><Inmueble><C_IIC>3000.50</C_IIC></Inmueble></Inmuebles>' +
              '<RedBaseImponible><RedPrevisionSocial><RedRegimenGeneral><RGAP>1500.00</RGAP></RedRegimenGeneral></RedPrevisionSocial></RedBaseImponible>' +
              '<RegEstimaDirecta><Actividad><ED_INGRESOS>no</ED_INGRESOS></Actividad></RegEstimaDirecta>',
            '01'
          ),
        ],
      })
    );
    expect(r).toMatchObject({
      ccaaId: 'andalucia',
      disability: 33,
      childAges: [10],
      ascendantAges: [85],
      pension: 1500,
      rentalIncome: 9000.5,
      ownsHome: false,
      unrented: [
        { value: 50000, revised: true, days: 365 },
        { value: 40000, revised: false, days: 100 },
      ],
    });
    const form = applyReading(emptyForm(''), r);
    expect(form).toMatchObject({ pension: '1500', rentalOn: true, rentalIncome: '9000.5' });
  });

  it('knows each degree of disability of the schema', () => {
    const degree = (code: string) =>
      read(draftXml({ disability: `<DPGMIN_D>${code}</DPGMIN_D>` })).disability;
    expect(degree('2')).toBe(33);
    expect(degree('4')).toBe(65);
    expect(degree('9')).toBe(0);
  });

  it('reads the regional deductions of each community and the State ones by their boxes', () => {
    const r = read(
      draftXml({
        ccaa: '12',
        people: [person('2', work(40000, 6000, 2500), '12')],
        results:
          '<Resultados><CalculoImpuestoRes><GravamenesRes><DED3E>40.00</DED3E><DED3A>40.00</DED3A><DED9E>0.00</DED9E></GravamenesRes><RESULTADO>10.00</RESULTADO></CalculoImpuestoRes>' +
          '<DeduccionAutonomicaRes><MadridRes><M3>0.00</M3><M5>1000.00</M5><CANTM26>5.00</CANTM26><DEDAUTM>1000.00</DEDAUTM></MadridRes></DeduccionAutonomicaRes></Resultados>',
      })
    );
    expect(r.applied.map((a) => [a.box, a.amount, a.id ?? null])).toEqual([
      ['0552', 80, 'estado-donativos-ley-49-2002'],
      ['1043', 1000, null],
    ]);
    expect(r.applied[1].label).toBe('Por arrendamiento de vivienda habitual');
  });

  it('takes every regional amount when the sum does not list its boxes', () => {
    const boxes = {
      ...MAP.boxes,
      'DatosEconomicos/Resultados/DeduccionAutonomicaRes/CValencianaRes/DEDAUTVA': [
        '0564',
        'P102',
        'Total',
      ],
    } as XmlMap['boxes'];
    const r = read(
      draftXml({
        results:
          '<Resultados><DeduccionAutonomicaRes><CValencianaRes><VA41>10.00</VA41><DEDAUTVA>10.00</DEDAUTVA></CValencianaRes></DeduccionAutonomicaRes></Resultados>',
      }),
      { exercise: 2025, boxes }
    );
    expect(r.applied.map((a) => a.amount)).toEqual([10]);
    const none = read(
      draftXml({
        results:
          '<Resultados><DeduccionAutonomicaRes><CValencianaRes><VA41>10.00</VA41></CValencianaRes></DeduccionAutonomicaRes></Resultados>',
      })
    );
    expect(none.applied.map((a) => a.amount)).toEqual([10]);
  });

  it('reads another exercise with its own map, the ages for the year being prepared', () => {
    const r = read(draftXml({ exercise: 2024 }), MAP24, 2025);
    expect(r).toMatchObject({ exercise: 2024, mapExercise: 2024, age: 31, gross: 20000 });
  });

  it('tolerates a file with no economic data or no declarant', () => {
    const empty = read(
      '<?xml version="1.0"?><Declaracion modelo="100" ejercicio="2025"><Aux/></Declaracion>'
    );
    expect(empty).toMatchObject({
      ccaaId: null,
      gross: null,
      withheld: null,
      applied: [],
      age: null,
    });
    const onlySpouse = read(draftXml({ people: [person('3', work(1000, 10, 50))] }));
    expect(onlySpouse.gross).toBe(1000);
    const noTitular = read(
      draftXml({
        people: [
          '<TomaDatosAmpliada><RdtoTrabajo><TPING>5.00</TPING></RdtoTrabajo></TomaDatosAmpliada>',
          '<TomaDatosAmpliada/>',
        ],
      }).replace(' codigoCADeclaracion="17"', '')
    );
    expect(noTitular).toMatchObject({ gross: 5, ccaaId: null });
    const ccaaOfPerson = read(
      draftXml({ people: [person('2', '', '09')] }).replace(' codigoCADeclaracion="17"', '')
    );
    expect(ccaaOfPerson.ccaaId).toBe('cataluna');
  });

  it('ignores empty or unreadable amounts and elements without a box', () => {
    const r = read(
      draftXml({
        people: [
          person(
            '2',
            '<RdtoTrabajo><TPDIN></TPDIN><TPING>abc</TPING><TPGSS>10.00</TPGSS></RdtoTrabajo><RdtoCapitalMobiliario><RdtoCapitalMobiliarioAhorro><B11 valor=""/></RdtoCapitalMobiliarioAhorro></RdtoCapitalMobiliario>'
          ),
        ],
      })
    );
    expect(r.boxes['0003']).toBeUndefined();
    expect(r.boxes['0012']).toBeUndefined();
    expect(r.boxes['0027']).toBeUndefined();
    expect(r.socialSecurity).toBe(10);
  });

  it('refuses what is not a modelo 100', () => {
    expect(() => read('Modelo 100 en texto')).toThrow(NotADraftXml);
    expect(() => read('<Otro><Declaracion modelo="100"/></Otro>')).toThrow(NotADraftXml);
  });
});
