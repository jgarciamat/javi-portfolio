/** The public calculators: route and the key of their texts (`tools.<key>.title / .description`). */
export const TOOL_PAGES = [
  { path: '/calculadora-50-30-20', key: 'rule' },
  { path: '/simulador-ahorro', key: 'savings' },
  { path: '/calculadora-hipoteca', key: 'loan' },
  { path: '/calculadora-iva', key: 'vat' },
  { path: '/calculadora-inflacion', key: 'inflation' },
  { path: '/calculadora-objetivo-ahorro', key: 'goal' },
] as const;
