import { rentaWorkExtras } from '@modules/tools/data/renta/estado-extra';

/**
 * "IRPF and IVA at a glance". The savings scale comes from the app's own tax data
 * (`rentaWorkExtras.savingsScale`); the rest are general rules written from the tax law
 * and need to be checked by a tax adviser before relying on them.
 */
export interface GlanceRow {
  concept: string;
  rule: string;
  where: string;
}

export const SAVINGS_SCALE_SOURCE = rentaWorkExtras.savingsScale.url;

export const IRPF_GLANCE: GlanceRow[] = [
  {
    concept: 'Intereses (cuentas, depósitos, bonos)',
    rule: 'Rendimiento del capital mobiliario. Base del ahorro. Retención del 19 % en bancos españoles.',
    where: 'Casilla 0027',
  },
  {
    concept: 'Dividendos',
    rule: 'Rendimiento del capital mobiliario. Base del ahorro. Retención del 19 % en España; en el extranjero, la del país de origen (con deducción por doble imposición).',
    where: 'Casilla 0029',
  },
  {
    concept: 'Ganancias al vender (acciones, ETF, fondos, cripto, oro, derivados)',
    rule: 'Ganancia patrimonial. Base del ahorro. Los fondos españoles retienen un 19 % de la ganancia al reembolsar; los demás no retienen.',
    where: 'Apartado de ganancias y pérdidas patrimoniales',
  },
  {
    concept: 'Pérdidas',
    rule: 'Compensan ganancias del mismo año y, si sobran, se arrastran 4 años. El saldo negativo de ventas compensa hasta el 25 % de los intereses y dividendos (y al revés).',
    where: 'Base del ahorro',
  },
  {
    concept: 'Regla de los dos meses',
    rule: 'No cuenta la pérdida si recompras el mismo valor cotizado en los dos meses anteriores o posteriores (un año si no cotiza, como los fondos).',
    where: 'Ley del IRPF',
  },
  {
    concept: 'Traspaso entre fondos',
    rule: 'No tributa mientras no retires el dinero. Los ETF no tienen traspaso.',
    where: 'Fondos de inversión',
  },
  {
    concept: 'Alquileres e inmuebles',
    rule: 'El alquiler va a la base general (hasta el 47 %). La venta con ganancia, a la base del ahorro.',
    where: 'Capital inmobiliario / patrimonial',
  },
  {
    concept: 'Planes de pensiones',
    rule: 'La aportación reduce la base general. El rescate tributa como rendimiento del trabajo.',
    where: 'Base general',
  },
  {
    concept: 'Cuándo se declara',
    rule: 'Modelo 100 (la Renta): normalmente de abril a finales de junio del año siguiente. Fechas oficiales cada campaña.',
    where: 'Agencia Tributaria',
  },
  {
    concept: 'Activos en el extranjero',
    rule: 'Modelo 720: cuentas, valores e inmuebles fuera de España por más de 50.000 € por categoría a 31 de diciembre. Modelo 721: criptomonedas en plataformas extranjeras (mismo umbral). Ambos se presentan de enero a marzo.',
    where: 'Modelos 720 y 721',
  },
];

export const IVA_GLANCE: GlanceRow[] = [
  {
    concept: 'Servicios financieros y seguros',
    rule: 'Exentos de IVA: comisiones de fondos, intereses, operaciones de bolsa, seguros.',
    where: 'Ley del IVA',
  },
  {
    concept: 'Oro de inversión',
    rule: 'Exento (lingotes de 995 milésimas o más, y monedas de oro de 900 milésimas o más que cumplan los requisitos). Joyería: 21 %.',
    where: 'Ley del IVA',
  },
  {
    concept: 'Plata, cobre, platino físicos',
    rule: 'IVA general del 21 %.',
    where: 'Ley del IVA',
  },
  {
    concept: 'Criptomonedas',
    rule: 'El cambio por dinero u otras monedas está exento de IVA.',
    where: 'Doctrina del TJUE y de la DGT',
  },
  {
    concept: 'Vivienda nueva',
    rule: 'IVA del 10 % más AJD (cada comunidad fija el tipo).',
    where: 'IVA y AJD',
  },
  {
    concept: 'Locales, oficinas, garajes sueltos, terrenos edificables',
    rule: 'IVA del 21 % en primera transmisión.',
    where: 'IVA',
  },
  {
    concept: 'Vivienda de segunda mano',
    rule: 'Sin IVA: ITP, que fija cada comunidad (en general entre el 6 % y el 10 %).',
    where: 'ITP',
  },
  {
    concept: 'Compra de acciones españolas grandes',
    rule: 'Impuesto sobre las Transacciones Financieras: 0,2 % si la empresa vale más de 1.000 millones de euros.',
    where: 'ITF',
  },
];
