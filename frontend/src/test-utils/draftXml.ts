/**
 * Invented files of the modelo 100 with the structure Renta WEB downloads (root <Declaracion
 * modelo="100">, ISO-8859-1): every NIF, name, date and IBAN here is made up.
 */
export const FAKE = {
  nif: '00000001R',
  name: 'PRUEBA FICTICIA, ANA',
  born: '20/06/1994',
  spouseNif: '00000002W',
  spouseName: 'PRUEBA FICTICIA, LUIS',
  spouseBorn: '02/02/1960',
  childNif: '00000003A',
  childName: 'PRUEBA FICTICIA, SOL',
  iban: 'ES9121000418450200051332',
  payerNif: 'B00000000',
};

/** One person's data (TomaDatosAmpliada) for `titular` 2 (declarant) or 3 (spouse). */
export const person = (titular: string, inner: string, ccaa = '17', nif = FAKE.nif) =>
  `<TomaDatosAmpliada codigoCA="${ccaa}" titular="${titular}" nif="${nif}">${inner}</TomaDatosAmpliada>`;

/** Pay from one payer and the totals of the boxes. */
export const work = (gross: number, withheld: number, ss: number, payers = 1) => {
  const each = (n: number) => (n / payers).toFixed(2);
  const lines = Array.from(
    { length: payers },
    () =>
      `<RendimientoTrabajo><NIFPAG>${FAKE.payerNif}</NIFPAG><IDII>${each(gross)}</IDII><IDRE>${each(
        withheld
      )}</IDRE><GSS>${each(ss)}</GSS></RendimientoTrabajo>`
  ).join('');
  return `<RdtoTrabajo>${lines}<TPDIN>${gross.toFixed(2)}</TPDIN><TPING>${gross.toFixed(
    2
  )}</TPING><TPGSS>${ss.toFixed(2)}</TPGSS><TPRNP>${(gross - ss).toFixed(2)}</TPRNP></RdtoTrabajo>`;
};

export function draftXml({
  exercise = 2025,
  ccaa = '17',
  joint = false,
  marital = '1',
  people = [person('2', work(20000, 2500, 1300))],
  results = '<Resultados><CalculoImpuestoRes><RetencionesRes><PAGOS>2500.00</PAGOS></RetencionesRes><RESULTADO>-100.00</RESULTADO></CalculoImpuestoRes></Resultados>',
  family = '',
  disability = '',
  encoding = 'ISO-8859-1',
}: {
  exercise?: number;
  ccaa?: string;
  joint?: boolean;
  marital?: string;
  people?: string[];
  results?: string;
  family?: string;
  disability?: string;
  encoding?: string;
} = {}): string {
  return (
    `<?xml version="1.0" encoding="${encoding}" standalone="yes"?>` +
    `<Declaracion modelo="100" ejercicio="${exercise}" periodo="0A" versionxsd="1.02" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="Renta${exercise}.xsd">` +
    `<Aux><Idioma>E</Idioma><VERSION>1.00</VERSION><NIF_EEDD>${FAKE.payerNif}</NIF_EEDD></Aux>` +
    `<DatosIdentificativos><Declarante><DPNIF_D>${FAKE.nif}</DPNIF_D><DP_APENOM_D>${FAKE.name}</DP_APENOM_D>` +
    `<ECIVIL>${marital}</ECIVIL><DPFNAC_D>${FAKE.born}</DPFNAC_D>${disability}<SEXO_D>M</SEXO_D></Declarante>` +
    (joint
      ? `<Conyuge><DPNIF_C>${FAKE.spouseNif}</DPNIF_C><DP_APENOM_C>${FAKE.spouseName}</DP_APENOM_C><DPFNAC_C>${FAKE.spouseBorn}</DPFNAC_C><DPGMIN_C>3</DPGMIN_C></Conyuge>`
      : '') +
    family +
    `</DatosIdentificativos>` +
    `<AsignacionTributaria><IGLESIA>0</IGLESIA><FINESSOCIALES>1</FINESSOCIALES></AsignacionTributaria>` +
    `<DatosEconomicos codigoCADeclaracion="${ccaa}" TIPOTRIBUTACION="${
      joint ? 2 : 1
    }">${people.join('')}${results}</DatosEconomicos>` +
    `<DatosIngresoDevolucion><TIPODECLARACION>I</TIPODECLARACION><AINGRESAR><PAGOFRACC><ING_IMPORTE_PF1>60.00</ING_IMPORTE_PF1><ING_IMPORTE_PF2>40.00</ING_IMPORTE_PF2><ING_DOMICILIA_PF2>SI</ING_DOMICILIA_PF2><ING_CUENTACORRIENTE_PF1>${FAKE.iban}</ING_CUENTACORRIENTE_PF1></PAGOFRACC></AINGRESAR></DatosIngresoDevolucion>` +
    `</Declaracion>`
  );
}

/** The bytes of a text in ISO-8859-1 (every character below 256 is one byte). */
export const latin1 = (text: string): Uint8Array =>
  Uint8Array.from(Array.from(text), (c) => c.charCodeAt(0));

/**
 * The verification draft of rentaDraft.test.ts (Comunitat Valenciana 2025, result 394,69 € to pay),
 * as the Agency's file: the same boxes, with invented personal data.
 */
export const VALENCIA = draftXml({
  people: [
    person(
      '2',
      '<RdtoTrabajo><RendimientoTrabajo><IDII>30774.34</IDII><IDRE>5167.14</IDRE><IEVA>94.20</IEVA><GSS>2032.02</GSS></RendimientoTrabajo>' +
        '<TPDIN>30774.34</TPDIN><TPVA>94.20</TPVA><TPESP>94.20</TPESP><TPING>30868.54</TPING><TPGSS>2032.02</TPGSS><TPRNP>28836.52</TPRNP></RdtoTrabajo>' +
        '<RdtoCapitalMobiliario><RdtoCapitalMobiliarioAhorro><B11 valor="0.96"><RegistroB11><IMP1DB11>0.96</IMP1DB11><IMP2DB11>0.18</IMP2DB11></RegistroB11></B11><B1II>0.96</B1II><B1RN>0.96</B1RN><B1RNR>0.96</B1RNR></RdtoCapitalMobiliarioAhorro></RdtoCapitalMobiliario>' +
        '<Inmuebles><Inmueble><PC>100.00</PC><RC>0000000AA0000A0001AA</RC><CDIRECCION>CALLE FICTICIA 1</CDIRECCION><ViviendaHabitual><USOHAB>1</USOHAB><C_DIASVH>365</C_DIASVH></ViviendaHabitual></Inmueble></Inmuebles>' +
        `<GPFondos><Fondo><NIFFIN>${FAKE.payerNif}</NIFFIN><VT1>12981.64</VT1><VAD1>10000.00</VAD1><G2VTTF>12981.64</G2VTTF><G2VATF>10000.00</G2VATF><G2GANF>2981.64</G2GANF><G2A_R0>2981.64</G2A_R0></Fondo></GPFondos>` +
        '<DeduccionAutonomica><CValenciana><VA41><DesgloseVA41><NIFPSVA41>B00000001</NIFPSVA41><IMPPSVA41>139.00</IMPPSVA41></DesgloseVA41></VA41></CValenciana></DeduccionAutonomica>'
    ),
  ],
  results:
    '<Resultados><RdtoTrabajoRes><SUMTPRNP>28836.52</SUMTPRNP><TPOGD>2000.00</TPOGD><TPRDTO>26836.52</TPRDTO><TPTOTAL>26836.52</TPTOTAL></RdtoTrabajoRes>' +
    '<GPFondosRes><G2A_RT0>2981.64</G2A_RT0></GPFondosRes><IntegracionRes><GPPatrimonialesRes><SUMAGA>2981.64</SUMAGA><GPAHOG>2981.64</GPAHOG></GPPatrimonialesRes></IntegracionRes>' +
    '<BaseImponibleRes><BIGRALH>26836.52</BIGRALH><BIAHOH>2982.60</BIAHOH></BaseImponibleRes>' +
    '<CalculoImpuestoRes><GravamenesRes><SUMADEDAUT>41.70</SUMADEDAUT></GravamenesRes><RetencionesRes><RET1>5167.14</RET1><RET2>0.18</RET2><PAGOS>5167.32</PAGOS></RetencionesRes><CuotaDiferencialRes><CDIF>394.69</CDIF></CuotaDiferencialRes><RESULTADO>394.69</RESULTADO></CalculoImpuestoRes>' +
    '<DeduccionAutonomicaRes><CValencianaRes><VA41>41.70</VA41><DEDAUTVA>41.70</DEDAUTVA></CValencianaRes></DeduccionAutonomicaRes>' +
    '<IngresoDevolucionRes><RESINGDEV>394.69</RESINGDEV></IngresoDevolucionRes></Resultados>',
});
