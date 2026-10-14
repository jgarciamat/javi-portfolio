import type { TaxBracket } from '../../domain/rentaData';
import type { RentaWorkExtras } from '../../domain/rentaExtras';

/**
 * Reglas estatales de Renta 2025 (campaña 2026) que completan `state.ts`.
 * Fuente: Manual práctico de Renta 2025, parte 1 (AEAT), contrastado con la Ley 35/2006 (BOE, texto consolidado).
 * https://sede.agenciatributaria.gob.es/Sede/Ayuda/25Manual/100.html
 */
const MANUAL =
  'https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025';
const GASTOS = `${MANUAL}/c03-rendimientos-trabajo/rendimiento-neto-trabajo-integrar-base-imponible/fase-2-determinacion-rendimiento-neto`;
const C13 = `${MANUAL}/c13-determinacion-renta-contribuyente-sujeta-gravamen/reducciones-base-imponible-general`;
const PREVISION = `${C13}/reducciones-aportaciones-contribuciones-sistemas-prevision-social`;
const AHORRO = `${MANUAL}/c15-calculo-impuesto-determinacion-cuotas-integras/gravamen-base-liquidable-ahorro`;

/** Escala de la base liquidable del ahorro 2025: la misma para la parte estatal (art. 66) y la autonómica (art. 76). */
const savingsHalfScale: TaxBracket[] = [
  { from: 0, rate: 9.5 },
  { from: 6000, rate: 10.5 },
  { from: 50000, rate: 11.5 },
  { from: 200000, rate: 13.5 },
  { from: 300000, rate: 15 },
];

export const rentaWorkExtras: RentaWorkExtras = {
  workExpenses: [
    {
      id: 'cotizaciones-seguridad-social',
      title: 'Cotizaciones a la Seguridad Social o a mutualidades obligatorias',
      summary:
        'Lo que te descuentan de la nómina por Seguridad Social, o por la mutualidad obligatoria de funcionarios, se resta entero del rendimiento del trabajo. No tiene límite.',
      url: `${GASTOS}/gastos-deducibles-articulo-19-ley-irpf.html`,
    },
    {
      id: 'derechos-pasivos-huerfanos',
      title: 'Derechos pasivos y colegios de huérfanos',
      summary:
        'Las detracciones por derechos pasivos y las cotizaciones a colegios de huérfanos o entidades parecidas también se restan enteras, sin límite.',
      url: `${GASTOS}/gastos-deducibles-articulo-19-ley-irpf.html`,
    },
    {
      id: 'cuotas-sindicales',
      title: 'Cuotas a sindicatos',
      summary:
        'Las cuotas que pagas a un sindicato se restan del rendimiento del trabajo. El manual no fija un máximo en euros para los sindicatos.',
      url: `${GASTOS}/gastos-deducibles-articulo-19-ley-irpf.html`,
    },
    {
      id: 'cuotas-colegios-profesionales',
      title: 'Cuotas a colegios profesionales',
      summary:
        'Solo si la colegiación es obligatoria para ejercer tu trabajo, y solo la parte de fines esenciales del colegio. Máximo 500 euros al año (art. 10 del Reglamento del IRPF).',
      max: 500,
      url: `${GASTOS}/gastos-deducibles-articulo-19-ley-irpf.html`,
    },
    {
      id: 'defensa-juridica',
      title: 'Gastos de defensa jurídica contra quien te paga',
      summary:
        'Honorarios de abogado o procurador por litigios con tu empleador (por ejemplo, un despido). Máximo 300 euros al año.',
      max: 300,
      url: `${GASTOS}/gastos-deducibles-articulo-19-ley-irpf.html`,
    },
  ],
  geographicMobilityExtra: 2000,
  baseReductions: [
    {
      id: 'planes-pensiones-limite-general',
      title: 'Planes de pensiones y similares: límite general',
      summary:
        'Aportaciones propias a planes de pensiones, mutualidades, planes de previsión asegurados, planes de previsión social empresarial y seguros de dependencia severa: hasta 1.500 euros al año y el 30 % de tus rendimientos.',
      max: 1500,
      url: `${PREVISION}/normas-comunes-aplicables-aportaciones-sistemas-social/limites-exceso-aportaciones.html`,
    },
    {
      id: 'planes-pensiones-empresa',
      title: 'Planes de empleo: aumento por contribuciones de la empresa',
      summary:
        'Hasta 8.500 euros más si viene de contribuciones de tu empresa o de aportaciones tuyas al mismo plan dentro de la tabla del art. 52 (si cobras más de 60.000 euros de ella, tanto como ella aporte).',
      max: 8500,
      url: `${PREVISION}/normas-comunes-aplicables-aportaciones-sistemas-social/cuadro-reducciones-aportaciones-contribuciones-sps.html`,
    },
    {
      id: 'planes-pensiones-autonomos',
      title: 'Autónomos: aumento por aportaciones propias a planes de empleo',
      summary:
        'Hasta 4.250 euros más por aportaciones propias de autónomos a planes sectoriales o simplificados, o como promotor y partícipe. Junto con el de empresa, el aumento total es como máximo 8.500 euros.',
      max: 4250,
      url: `${PREVISION}/normas-comunes-aplicables-aportaciones-sistemas-social/cuadro-reducciones-aportaciones-contribuciones-sps.html`,
    },
    {
      id: 'seguros-colectivos-dependencia-empresa',
      title: 'Seguros colectivos de dependencia pagados por la empresa',
      summary:
        'Las primas que paga tu empresa a un seguro colectivo de dependencia tienen un límite propio de 5.000 euros al año, aparte de los 1.500 y 8.500 euros anteriores.',
      max: 5000,
      url: `${PREVISION}/normas-comunes-aplicables-aportaciones-sistemas-social/limites-exceso-aportaciones.html`,
    },
    {
      id: 'aportaciones-conyuge',
      title: 'Aportaciones a sistemas de previsión social de tu cónyuge',
      summary:
        'Hasta 1.000 euros al año si tu cónyuge gana menos de 8.000 euros netos entre trabajo y actividades. Va aparte de tus propios límites y sin dejar tu base liquidable en negativo.',
      max: 1000,
      url: `${PREVISION}/aportaciones-sistemas-prevision-social-conyuge.html`,
    },
    {
      id: 'prevision-discapacidad-propia',
      title: 'Sistemas de previsión a favor de una persona con discapacidad: aportaciones propias',
      summary:
        'Si tú tienes discapacidad (33 % psíquica o 65 % física o sensorial), hasta 24.250 euros al año en tu plan para personas con discapacidad. Exceso aplicable 5 años.',
      max: 24250,
      url: `${C13}/reducciones-aportaciones-contribuciones-personas-discapacidad/limites-exceso-aportaciones.html`,
    },
    {
      id: 'prevision-discapacidad-familiares',
      title: 'Plan de una persona con discapacidad: aportaciones de familiares',
      summary:
        'Parientes hasta tercer grado, cónyuge o tutor que aportan al plan de la persona con discapacidad: hasta 10.000 euros al año cada uno. Entre todos, 24.250 euros por persona. Exceso aplicable 5 años.',
      max: 10000,
      url: `${C13}/reducciones-aportaciones-contribuciones-personas-discapacidad/limites-exceso-aportaciones.html`,
    },
    {
      id: 'patrimonio-protegido',
      title: 'Aportaciones a un patrimonio protegido de una persona con discapacidad',
      summary:
        'Hasta 10.000 euros al año por aportante para el conjunto de patrimonios protegidos, y 24.250 euros entre todos los aportantes de un mismo patrimonio. Exceso aplicable 4 años.',
      max: 10000,
      url: `${C13}/reducciones-aportaciones-patrimonios-protegidos/limites-maximos-exceso-aportaciones-realizadas.html`,
    },
    {
      id: 'pension-compensatoria-conyuge',
      title: 'Pensión compensatoria al cónyuge y alimentos a otras personas (no hijos)',
      summary:
        'Se resta entera la pensión compensatoria fijada por un juez o por convenio regulador, y los alimentos a personas que no sean tus hijos. Sin máximo. El sobrante resta de la base del ahorro.',
      url: `${C13}/reducciones-pensiones-compensatorias.html`,
    },
    {
      id: 'tributacion-conjunta-matrimonio',
      title: 'Declaración conjunta: matrimonio',
      summary:
        'La base imponible baja 3.400 euros si declaráis juntos los dos cónyuges no separados (con los hijos menores que convivan). El sobrante, si lo hay, resta de la base del ahorro.',
      max: 3400,
      url: `${C13}/reduccion-tributacion-conjunta.html`,
    },
    {
      id: 'tributacion-conjunta-monoparental',
      title: 'Declaración conjunta: familia monoparental',
      summary:
        'La base imponible baja 2.150 euros si declaras junto a tus hijos siendo padre o madre separado o sin vínculo matrimonial, y no vives con el otro progenitor de ningún hijo.',
      max: 2150,
      url: `${C13}/reduccion-tributacion-conjunta.html`,
    },
    {
      id: 'mutualidad-deportistas',
      title: 'Mutualidad de previsión social de deportistas profesionales y de alto nivel',
      summary:
        'Aportaciones a la mutualidad a prima fija de deportistas profesionales o de alto nivel: hasta 24.250 euros al año, sin pasar de la suma de tus rendimientos netos de trabajo y actividades.',
      max: 24250,
      url: `${C13}/reducciones-aportaciones-mutualidad-deportistas-alto-nivel.html`,
    },
  ],
  savingsScale: {
    state: savingsHalfScale,
    regional: savingsHalfScale,
    notes:
      'Escala 2025 de la base liquidable del ahorro (intereses, dividendos y ganancias de transmisiones). Cada mitad es la misma: 9,5 % hasta 6.000 euros, 10,5 % de 6.000 a 50.000, 11,5 % de 50.000 a 200.000, 13,5 % de 200.000 a 300.000 y 15 % desde 300.000. Sumando Estado y comunidad salen 19, 21, 23, 27 y 30 %. Es novedad de 2025: el manual indica que se modificaron los arts. 66 y 76 con efectos desde el 1-1-2025.',
    url: `${AHORRO}/gravamen-estatal.html`,
  },
  notes: [
    'Orden general del cálculo: rentas del trabajo, capital y actividades; integración y compensación; base imponible general y del ahorro; reducciones; base liquidable; escalas estatal y autonómica por separado; cuotas íntegras; deducciones; cuota líquida; deducciones abonables y retenciones; resultado.',
    'La renta general y la del ahorro se integran y compensan cada una por su lado: no se pueden mezclar pérdidas de una con ganancias de la otra, salvo las compensaciones limitadas al 25 % que se explican abajo.',
    'En la base general, el saldo negativo de ganancias y pérdidas patrimoniales que no vienen de vender bienes solo compensa hasta el 25 % del saldo positivo de rendimientos e imputaciones. El resto se arrastra 4 años.',
    'En la base del ahorro, el saldo negativo de rendimientos del capital mobiliario compensa hasta el 25 % del saldo positivo de ganancias por ventas, y al revés. Lo que sobra se arrastra 4 años y los saldos de años anteriores comparten el mismo 25 %.',
    'Si la base liquidable general sale negativa, no se aplica ninguna reducción y esa cantidad se compensa con bases liquidables generales positivas de los 4 años siguientes.',
    'Orden de las reducciones de la base imponible general: 1) tributación conjunta, 2) planes de pensiones y similares, 3) previsión social de personas con discapacidad, 4) patrimonios protegidos, 5) pensiones compensatorias y alimentos que no son a hijos, 6) mutualidad de deportistas. La base nunca puede quedar negativa por reducciones.',
    'El sobrante de la reducción por tributación conjunta y de las pensiones compensatorias (o alimentos a no hijos) que no cabe en la base general resta de la base imponible del ahorro, sin dejarla negativa. Las demás reducciones solo afectan a la base general.',
    'Gastos del trabajo: los 2.000 euros generales, la movilidad geográfica (2.000 más, solo desempleados inscritos que cambian de municipio, en el año del cambio y el siguiente) y el aumento por discapacidad de trabajador activo (3.500 o 7.750) tienen como tope el rendimiento íntegro menos el resto de gastos.',
    'En declaración conjunta los 2.000 euros de gastos se aplican una sola vez por unidad familiar, y el aumento por discapacidad es el del miembro con mayor grado. El aumento por movilidad tampoco se suma: son 2.000 en total.',
    'La reducción por rendimientos del trabajo (hasta 7.302 euros) se calcula sobre el rendimiento neto tras los gastos a) a e) del art. 19, no tras los 2.000 euros, y solo si las otras rentas, sin las exentas, no superan 6.500 euros. Nunca deja el rendimiento negativo.',
    'Tope de las aportaciones a planes de pensiones: la menor de estas dos cantidades, el 30 % de los rendimientos netos del trabajo y de actividades o 1.500 euros más los aumentos que correspondan (8.500 de empresa, 4.250 de autónomos con total máximo de 8.500 entre ambos, y 5.000 de seguros colectivos de dependencia). Así lo aplica el manual de la AEAT. Además, la base general no puede quedar negativa.',
    'Si aportas más de lo que cabe, el exceso se puede reducir en los 5 ejercicios siguientes, y el exceso de años anteriores se aplica antes que las aportaciones del año. Para patrimonios protegidos el plazo es de 4 años.',
    'Si la persona con discapacidad hace aportaciones a su plan especial y a planes generales, el límite conjunto es el mayor de los dos individuales, no la suma.',
    'El mínimo personal y familiar no baja la base: se mide con la escala a tipo normal y esa cuota se resta. Cuota general = escala sobre toda la base liquidable general menos escala sobre el mínimo. Se hace por separado para el Estado y para la comunidad, que puede tener su propio mínimo y su propia escala.',
    'Si el mínimo personal y familiar es mayor que la base liquidable general, la parte que no cabe (el remanente) se resta de la base liquidable del ahorro: cuota del ahorro = escala del ahorro sobre la base menos escala del ahorro sobre ese remanente (empieza en el 9,5 %). Por prudencia, nunca se toma una cuota negativa.',
    'Mínimo por descendientes: se numera por edad empezando por el mayor (2.400, 2.700, 4.000, 4.500 euros) y los menores de 3 años suman 2.800 euros. Se ve la situación a 31 de diciembre. Si dos padres tienen derecho, cada uno aplica la mitad.',
    'En custodia compartida el mínimo por descendientes se reparte al 50 % entre los dos progenitores, convivan o no con el hijo a fin de año. El padre o madre que paga alimentos por sentencia sin custodia no aplica el mínimo, pero sí las escalas separadas del art. 64 para esas anualidades.',
    'Si hay ascendientes y descendientes de distinto grado (padres y abuelos), el mínimo es solo de los más cercanos, salvo que estos tengan rentas de más de 8.000 euros: entonces pasa a los siguientes. Con el mismo grado se divide a partes iguales.',
    'Límites de renta de los familiares: para dar derecho al mínimo, el descendiente o ascendiente no puede tener rentas anuales (sin exentas) de más de 8.000 euros, ni presentar declaración con rentas de más de 1.800 euros. Para el cónyuge con discapacidad de la deducción, solo cuenta el límite de 8.000 euros.',
    'Descendientes: menores de 25 años (cualquier edad si tienen discapacidad del 33 % o más) que convivan contigo. Ascendientes: mayores de 65 años o con discapacidad del 33 % o más, que convivan contigo al menos la mitad del año. El mínimo por discapacidad solo se suma si el familiar da derecho a su mínimo base.',
    'En tributación conjunta el mínimo del contribuyente es de 5.550 euros una sola vez, aunque sean dos cónyuges. Cada cónyuge suma su incremento por edad o discapacidad, y los hijos no dan derecho a un segundo mínimo personal.',
    'Orden sobre la cuota íntegra estatal: primero vivienda transitoria (tramo estatal) y empresas de nueva creación; luego la mitad estatal de incentivos empresariales, donativos, Ceuta y Melilla, La Palma, patrimonio histórico y alquiler transitorio; al final eficiencia energética y vehículos eléctricos. Las autonómicas solo restan de la cuota autonómica.',
    'Deducciones del art. 68 de la Ley (incentivos empresariales, donativos, Ceuta y Melilla, La Palma, patrimonio histórico y alquiler transitorio): el importe total se reparte al 50 % entre cuota estatal y autonómica. Las de eficiencia energética, vehículos eléctricos y empresas de nueva creación son 100 % estatales.',
    'Las deducciones de la cuota no pueden dejar la cuota líquida en negativo. Lo que no cabe en la cuota estatal no pasa a la autonómica, ni al revés, y no se arrastra al año siguiente (salvo el exceso de la rehabilitación de edificios, que sí se aplaza).',
    'Donativos, patrimonio histórico y partidos: la base conjunta que da derecho a deducción no puede pasar del 10 % de la base liquidable (15 % para actividades prioritarias de mecenazgo). Si tienes bases negativas de años anteriores, el 10 % se calcula con la base liquidable general sometida a gravamen.',
    'Son abonables (se cobran aunque no haya cuota, porque restan de la cuota diferencial): maternidad, incremento por guardería, descendiente con discapacidad, ascendiente con discapacidad, cónyuge con discapacidad, familia numerosa y ascendiente separado con dos hijos. Pueden cobrarse a plazos con el modelo 140 o el 143.',
    'Las deducciones familiares abonables (salvo maternidad) tienen como tope lo cotizado a la Seguridad Social tras cumplir los requisitos, si trabajas; no se aplica a quien cobra paro o pensión. Se cuentan los meses completos con situación a fin de mes y se reparten a partes iguales entre quienes tengan derecho.',
    'Maternidad: solo la madre, salvo fallecimiento de la madre o custodia exclusiva del padre. 100 euros por mes (hijo menor de 3 años) y 150 euros más el mes en que se cumplen 30 días cotizados si el alta es posterior al parto. El incremento de guardería lo pide la madre pero cuenta también lo pagado por el otro progenitor.',
    'Familia numerosa y ascendiente separado con dos hijos son incompatibles. La de cónyuge con discapacidad es incompatible con las de hijo o padre con discapacidad por la misma persona. Los familiares con discapacidad necesitan NIF.',
    'La deducción de 340 euros por rendimientos del trabajo bajos se aplica a la cuota líquida total (ya restada la de doble imposición internacional), no es abonable y no puede superar la parte de la cuota íntegra que corresponde a esos rendimientos netos del trabajo.',
    'La reducción por rendimientos del trabajo (hasta 7.302 euros, sobre la base) y la deducción nueva de 340 euros (sobre la cuota) se pueden aplicar a la vez: no se sustituyen.',
    'La deducción de vivienda transitoria obliga a presentar declaración y no se puede empezar en 2025; la de alquiler transitorio tampoco. El alquiler transitorio baja con la base imponible total (general más ahorro): 9.040 - 1,4125 x (base - 17.707,20) euros de base máxima, y cero desde 24.107,20.',
  ],
  source: 'https://sede.agenciatributaria.gob.es/Sede/Ayuda/25Manual/100.html',
};
