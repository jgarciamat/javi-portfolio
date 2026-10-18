import type { ChapterInfo } from './types';

/**
 * The Premium chapters of «Learn to invest» (the third on): only what the catalogue shows. Their
 * text is not part of the app; the API sends it to Premium users (`learnApi.chapter`).
 */
export const PREMIUM_CHAPTERS: ChapterInfo[] = [
  {
    id: 'fondos-indexados',
    emoji: '🧺',
    color: '#10b981',
    title: 'Fondos indexados: qué son y por qué los eligen tantos inversores',
    titleEn: 'Index funds: what they are and why so many investors choose them',
    summary:
      'Una cesta que copia un índice completo, con comisiones bajas y diversificación automática. Con sus ventajas y sus riesgos.',
    summaryEn:
      'A basket that copies a whole index, with low fees and automatic diversification. With its pros and its risks.',
    level: 1,
    topic: 'funds',
    minutes: 4,
    withCalc: true,
    premium: true,
  },
  {
    id: 'etf-vs-fondos',
    emoji: '⚖️',
    color: '#06b6d4',
    title: 'ETF frente a fondos de inversión: qué cambia de verdad',
    titleEn: 'ETFs vs mutual funds: what really changes',
    summary:
      'Dos formas de comprar la misma cesta. Cómo se compran, qué cuestan y cómo tributan en España.',
    summaryEn:
      'Two ways of buying the same basket: how they trade, what they cost and how they are taxed in Spain.',
    level: 2,
    topic: 'funds',
    minutes: 2,
    withCalc: true,
    premium: true,
  },
  {
    id: 'interes-compuesto-fondos',
    emoji: '❄️',
    color: '#8b5cf6',
    title: 'Interés compuesto con fondos indexados: el tiempo trabaja para ti',
    titleEn: 'Compound growth with index funds: time works for you',
    summary:
      'Por qué empezar pronto pesa más que aportar mucho, qué hacen las comisiones y la inflación, y una calculadora para probarlo.',
    summaryEn:
      'Why starting early beats saving more, what fees and inflation do, with a calculator to try it.',
    level: 1,
    topic: 'funds',
    minutes: 2,
    withCalc: true,
    premium: true,
  },
  {
    id: 'renta-fija-bonos',
    emoji: '🏛️',
    color: '#0284c7',
    title: 'Renta fija y bonos: precio, rentabilidad y tipos de interés',
    titleEn: 'Fixed income and bonds: price, yield and interest rates',
    summary:
      'Por qué el precio de un bono baja cuando suben los tipos, qué es la TIR y la duración, y por qué rinde menos pero es más seguro.',
    summaryEn:
      'Why a bond price falls when rates rise, what yield and duration are, and why bonds yield less but are safer.',
    level: 2,
    topic: 'bonds',
    minutes: 3,
    withCalc: true,
    premium: true,
  },
  {
    id: 'cuanto-tributa',
    emoji: '🧾',
    color: '#64748b',
    title: '¿Cuánto tributa mi ganancia? La base del ahorro en España',
    titleEn: 'How much tax will my gain pay? Spain’s savings base',
    summary:
      'La escala del ahorro, qué se suma, cómo se compensan las pérdidas y una calculadora de la cuota.',
    summaryEn: 'The savings scale, what is added up, how losses offset gains and a tax calculator.',
    level: 1,
    topic: 'tax',
    minutes: 1,
    withCalc: true,
    premium: true,
  },
  {
    id: 'cripto-y-blockchain',
    emoji: '⛓️',
    color: '#f59e0b',
    title: 'Criptomonedas y blockchain: qué son y cómo funcionan',
    titleEn: 'Crypto and blockchain: what they are and how they work',
    summary:
      'Bloques, nodos, minería, prueba de trabajo y de participación, wallets y claves, explicado desde cero.',
    summaryEn:
      'Blocks, nodes, mining, proof of work and proof of stake, wallets and keys, explained from scratch.',
    level: 2,
    topic: 'crypto',
    minutes: 3,
    withCalc: false,
    premium: true,
  },
  {
    id: 'cripto-volatilidad-apalancamiento',
    emoji: '🎰',
    color: '#ef4444',
    title: 'Volatilidad y apalancamiento: por qué se pierde dinero tan rápido',
    titleEn: 'Volatility and leverage: why money is lost so fast',
    summary:
      'Cómo se mueven las criptomonedas, qué es el margen, la liquidación y ejemplos numéricos de apalancamiento.',
    summaryEn:
      'How crypto prices swing, what margin and liquidation are, with worked leverage examples.',
    level: 3,
    topic: 'crypto',
    minutes: 3,
    withCalc: true,
    premium: true,
  },
  {
    id: 'cripto-monedas-y-proyectos',
    emoji: '🧩',
    color: '#d97706',
    title: 'Las monedas principales y los proyectos que hay detrás',
    titleEn: 'The main coins and the projects behind them',
    summary:
      'Bitcoin, Ethereum, BNB, Solana, XRP, Cardano y las stablecoins USDT y USDC: qué hace cada proyecto y qué riesgos tiene.',
    summaryEn:
      'Bitcoin, Ethereum, BNB, Solana, XRP, Cardano and the USDT and USDC stablecoins: what each project does and its risks.',
    level: 2,
    topic: 'crypto',
    minutes: 4,
    withCalc: false,
    premium: true,
  },
  {
    id: 'cripto-riesgos-estafas-mica',
    emoji: '🛡️',
    color: '#be123c',
    title: 'Riesgos, estafas comunes y regulación (MiCA)',
    titleEn: 'Risks, common scams and regulation (MiCA)',
    summary:
      'Las trampas más frecuentes, cómo reconocerlas, cómo comprobar una plataforma y qué cambia con el reglamento europeo MiCA.',
    summaryEn:
      'The most common traps, how to spot them, how to check a platform and what the EU’s MiCA regulation changes.',
    level: 2,
    topic: 'crypto',
    minutes: 3,
    withCalc: false,
    premium: true,
  },
];
