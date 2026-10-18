import type { Chapter } from './types';

/** The chapter about risk and volatility (free). Educational, not advice. */
export const CHAPTER_RISK: Chapter = {
  id: 'riesgo-y-volatilidad',
  emoji: '🎢',
  color: '#f43f5e',
  title: 'Riesgo, volatilidad y horizonte: por qué los precios se mueven',
  titleEn: 'Risk, volatility and time horizon: why prices move',
  summary:
    'Qué significan volatilidad y caída máxima, y cómo cambia el abanico de resultados según el plazo.',
  summaryEn:
    'What volatility and drawdown mean, and how the range of outcomes changes with your time horizon.',
  level: 1,
  topic: 'basics',
  blocks: [
    {
      k: 'p',
      t: 'Los precios de los activos no suben en línea recta. Suben y bajan por noticias, resultados de las empresas, tipos de interés, miedo y euforia. Eso es la volatilidad: cuánto se mueve el precio. Una cuenta de ahorro casi no se mueve; la bolsa se mueve bastante; las criptomonedas, muchísimo.',
    },
    { k: 'chart', id: 'volatility' },
    {
      k: 'key',
      title: 'Riesgo no es solo volatilidad',
      t: 'Riesgo es la posibilidad de perder dinero de forma permanente o de tener que vender en el peor momento. La volatilidad es solo una parte: lo que más daña es necesitar el dinero justo cuando el precio está bajo.',
    },
    { k: 'h', t: 'La caída máxima (drawdown)' },
    {
      k: 'p',
      t: 'El drawdown mide cuánto ha caído un activo desde su máximo anterior. Una caída del 50 % exige una subida del 100 % para volver al punto de partida. Cuanto más profunda es la caída, más cuesta recuperarla.',
    },
    {
      k: 'table',
      head: ['Caída', 'Subida necesaria para recuperarte'],
      rows: [
        ['−10 %', '+11 %'],
        ['−20 %', '+25 %'],
        ['−33 %', '+50 %'],
        ['−50 %', '+100 %'],
        ['−80 %', '+400 %'],
      ],
    },
    { k: 'chart', id: 'drawdown' },
    { k: 'h', t: 'El plazo cambia el abanico de resultados' },
    {
      k: 'p',
      t: 'En un año, la bolsa puede terminar muy por debajo o muy por encima de donde empezó. Con más años, las subidas y bajadas se compensan en parte y el rango de resultados se vuelve menos extremo, aunque sigue habiendo incertidumbre. Esto no es una garantía: hay periodos largos de rentabilidad pobre.',
    },
    { k: 'chart', id: 'horizon' },
    {
      k: 'warn',
      title: 'Esto es una simulación',
      t: 'Los gráficos de esta pestaña se generan con números aleatorios con una semilla fija: sirven para entender el mecanismo, no para predecir nada. No son datos reales de ningún activo.',
    },
    { k: 'h', t: 'Cómo se gestiona el riesgo, en pocas ideas' },
    {
      k: 'ul',
      items: [
        'Diversificar entre muchos activos y entre tipos de activo.',
        'Ajustar el plazo: el dinero que necesitarás en menos de 3-5 años no debería estar en activos muy volátiles.',
        'Tener un fondo de emergencia aparte (3-6 meses de gastos).',
        'Invertir de forma periódica en lugar de todo de golpe reduce el riesgo de elegir un mal momento.',
        'Conocer tu tolerancia real: ¿cómo reaccionarías si tu inversión cayera un 30 %?',
      ],
    },
  ],
  glossary: [
    {
      term: 'Volatilidad',
      def: 'Cuánto fluctúa el precio de un activo; se mide con la desviación típica de sus rentabilidades.',
    },
    { term: 'Drawdown', def: 'Caída porcentual desde el último máximo hasta el punto más bajo.' },
    {
      term: 'Horizonte temporal',
      def: 'Tiempo durante el que piensas mantener la inversión antes de necesitar el dinero.',
    },
    {
      term: 'Tolerancia al riesgo',
      def: 'Cuánta pérdida temporal puedes soportar sin tomar malas decisiones.',
    },
    {
      term: 'Simulación de Monte Carlo',
      def: 'Técnica que repite miles de escenarios aleatorios para ver el abanico de resultados posibles.',
    },
  ],
};
